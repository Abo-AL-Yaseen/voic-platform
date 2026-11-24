import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../.tmp/auth-build/config/environment.js";
import { databaseOptions } from "../.tmp/auth-build/database/options.js";
import { AppModule } from "../.tmp/auth-build/app.module.js";
import { configureHttp } from "../.tmp/auth-build/http/configure-http.js";

// Additive migration only, after a successful isolated test. Never rollback/reset development.
let source,
  app,
  stage = "target validation";
try {
  const evidence = JSON.parse(fs.readFileSync(".tmp/auth-verification.json", "utf8"));
  assert.equal(evidence.passed, true);
  assert.equal(evidence.inquiryResult.passed, true);
  assert.equal(evidence.inquiryBrowserResult.passed, true);
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "development");
  assert.equal(env.dbHost, "127.0.0.1");
  assert.equal(env.dbPort, 3306);
  assert.equal(env.dbDatabase, "voic_development");
  assert.equal(env.dbUsername, "voic_app");
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  const [server] = await source.query("SELECT VERSION() version, @@port port");
  const tables = [
    "catalog_products",
    "catalog_packages",
    "catalog_translations",
    "catalog_terms",
    "auth_users",
    "auth_sessions",
    "auth_action_tokens",
  ];
  const fingerprint = async () => {
    const result = {};
    for (const table of tables) {
      const rows = await source.query(`SELECT * FROM ${table}`);
      const serialized = rows.map((row) => JSON.stringify(row)).sort();
      result[table] = {
        count: rows.length,
        digest: createHash("sha256").update(JSON.stringify(serialized)).digest("hex"),
      };
    }
    return result;
  };
  stage = "migration preconditions";
  const applied = await source.query("SELECT name FROM voic_migrations ORDER BY id");
  assert.deepEqual(applied.map((x) => x.name).slice(0, 2), [
    "PublicCatalog1795435200000",
    "CustomerAccounts1795478400000",
  ]);
  assert.ok(
    applied.length === 2 ||
      (applied.length === 3 && applied[2].name === "CustomerInquiries1795521600000"),
  );
  assert.ok(
    source.migrations
      .map((m) => m.name || m.constructor.name)
      .filter((name) => !applied.some((a) => a.name === name))
      .every((name) => name === "CustomerInquiries1795521600000"),
  );
  const before = await fingerprint();
  stage = "additive inquiry migration";
  const migrations = await source.runMigrations();
  assert.ok(
    migrations.length === 0 ||
      (migrations.length === 1 && migrations[0].name === "CustomerInquiries1795521600000"),
  );
  assert.equal((await source.runMigrations()).length, 0);
  const after = await fingerprint();
  const preserved = JSON.stringify(before) === JSON.stringify(after);
  assert.ok(preserved);
  stage = "isolated application readiness";
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  configureHttp(app, env);
  await app.listen(0, "127.0.0.1");
  const base = `${await app.getUrl()}/api/v1`;
  for (const health of ["live", "ready"])
    assert.equal((await fetch(`${base}/health/${health}`)).status, 200);
  const catalog = await (await fetch(`${base}/products?pageSize=50&lang=ar`)).json();
  assert.equal(catalog.total, before.catalog_products.count);
  assert.ok(catalog.items.every((p) => Array.isArray(p.packageOptions)));
  assert.equal((await fetch(`${base}/account/inquiries`)).status, 401);
  fs.writeFileSync(
    ".tmp/inquiry-development-verification.json",
    JSON.stringify({
      passed: true,
      checkedAt: new Date().toISOString(),
      applied: migrations.length,
      preservedExistingTables: preserved,
      existingCatalogProducts: before.catalog_products.count,
      mysqlVersion: server.version,
      port: Number(server.port),
      readiness: 200,
      newApiGuard: 401,
    }),
  );
  process.stdout.write(
    "PASS: additive inquiry migration, all existing catalog/auth rows preserved, repeat no-op, isolated NestJS readiness 200 and inquiry guard 401.\n",
  );
} catch {
  process.stderr.write(
    `Native inquiry update stopped during: ${stage}. No reset or revert was attempted.\n`,
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  if (source?.isInitialized) await source.destroy();
}
