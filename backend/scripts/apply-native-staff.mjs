import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { loadEnvironment } from "../.tmp/staff-build/config/environment.js";
import { databaseOptions } from "../.tmp/staff-build/database/options.js";
import { AppModule } from "../.tmp/staff-build/app.module.js";
import { configureHttp } from "../.tmp/staff-build/http/configure-http.js";
import { authConfiguration } from "../.tmp/staff-build/auth/auth.config.js";
import { InquiryNotifications } from "../.tmp/staff-build/inquiries/notifications.service.js";

// Apply only the additive, verified workflow migration. No seeding, rollback or reset.
let source,
  app,
  stage = "test evidence";
try {
  const staff = JSON.parse(fs.readFileSync(".tmp/staff-verification.json", "utf8"));
  const regression = JSON.parse(fs.readFileSync(".tmp/regression-verification.json", "utf8"));
  for (const evidence of [staff, regression]) {
    assert.equal(evidence.passed, true);
    assert.equal(evidence.staffResult.passed, true);
    assert.equal(evidence.catalogBrowserTests, 9);
  }
  assert.equal(staff.staffBrowserResult.passed, true);
  assert.equal(regression.inquiryBrowserResult.passed, true);
  assert.equal(regression.browserResult.passed, true);
  stage = "native target validation";
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "development");
  assert.equal(env.dbHost, "127.0.0.1");
  assert.equal(env.dbPort, 3306);
  assert.equal(env.dbDatabase, "voic_development");
  assert.equal(env.dbUsername, "voic_app");
  assert.equal(authConfiguration(env).mode, "capture");
  const originalEnv = fs.readFileSync(".env", "utf8");
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  stage = "migration preconditions";
  const expected = [
    "PublicCatalog1795435200000",
    "CustomerAccounts1795478400000",
    "CustomerInquiries1795521600000",
    "StaffInquiryWorkflow1795525200000",
  ];
  const applied = (await source.query("SELECT name FROM voic_migrations ORDER BY id")).map(
    (r) => r.name,
  );
  assert.ok(applied.length === 3 || applied.length === 4);
  assert.deepEqual(applied, expected.slice(0, applied.length));
  assert.deepEqual(
    source.migrations.map((m) => m.name || m.constructor.name).sort(),
    [...expected].sort(),
  );
  const tables = [
    "catalog_products",
    "catalog_packages",
    "catalog_translations",
    "catalog_terms",
    "auth_users",
    "auth_sessions",
    "auth_action_tokens",
    "customer_inquiries",
    "customer_inquiry_lines",
    "customer_inquiry_history",
    "inquiry_notifications",
  ];
  // Only new outbox metadata is excluded. Every existing value remains covered in memory.
  const fingerprint = async () => {
    const result = {};
    for (const table of tables) {
      const rows = await source.query(`SELECT * FROM ${table}`);
      const normalized = rows
        .map((row) => {
          if (table === "inquiry_notifications") {
            delete row.eventId;
            delete row.kind;
          }
          return JSON.stringify(
            Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))),
          );
        })
        .sort();
      result[table] = {
        count: rows.length,
        digest: createHash("sha256").update(JSON.stringify(normalized)).digest("hex"),
      };
    }
    return result;
  };
  const before = await fingerprint();
  assert.equal(before.catalog_products.count, 11);
  stage = "additive migration and row preservation";
  const migrations = await source.runMigrations();
  assert.ok(
    migrations.length === 0 || (migrations.length === 1 && migrations[0].name === expected[3]),
  );
  assert.equal((await source.runMigrations()).length, 0);
  assert.deepEqual(await fingerprint(), before);
  stage = "development-only write setting";
  assert.equal(fs.readFileSync(".env", "utf8"), originalEnv);
  const setting = /^STAFF_INQUIRY_WRITES=.*$/m;
  const updated = setting.test(originalEnv)
    ? originalEnv.replace(setting, "STAFF_INQUIRY_WRITES=true")
    : originalEnv.trimEnd() + "\nSTAFF_INQUIRY_WRITES=true\n";
  if (updated !== originalEnv) fs.writeFileSync(".env", updated, { mode: 0o600 });
  process.env.STAFF_INQUIRY_WRITES = "true";
  stage = "isolated NestJS readiness";
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  configureHttp(app, env);
  await app.init();
  // A readiness probe must not process existing development outbox jobs.
  await app.get(InquiryNotifications).beforeApplicationShutdown();
  await app.listen(0, "127.0.0.1");
  const base = `${await app.getUrl()}/api/v1`;
  for (const kind of ["live", "ready"])
    assert.equal((await fetch(`${base}/health/${kind}`)).status, 200);
  assert.equal((await (await fetch(`${base}/products?lang=ar&pageSize=50`)).json()).total, 11);
  assert.equal((await fetch(`${base}/staff/inquiries`)).status, 401);
  assert.deepEqual(await fingerprint(), before);
  const [server] = await source.query("SELECT VERSION() version, @@port port");
  fs.writeFileSync(
    ".tmp/staff-development-verification.json",
    JSON.stringify({
      passed: true,
      checkedAt: new Date().toISOString(),
      applied: migrations.length,
      preservedExistingTables: tables.length,
      existingCatalogProducts: 11,
      readiness: 200,
      staffGuard: 401,
      mysqlVersion: server.version,
      port: Number(server.port),
      developmentWritesEnabled: true,
      actualStaffCreated: false,
    }),
  );
  process.stdout.write(
    "PASS: native additive staff migration, all existing rows preserved, repeat no-op, readiness 200, staff guard 401. No staff account created.\n",
  );
} catch {
  process.stderr.write(
    `Native staff update stopped during: ${stage}. No reset or rollback attempted.\n`,
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  if (source?.isInitialized) await source.destroy();
}
