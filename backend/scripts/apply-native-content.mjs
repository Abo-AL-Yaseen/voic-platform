import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { DataSource } from "typeorm";
import { NestFactory } from "@nestjs/core";
import { loadEnvironment } from "../.tmp/content-build/config/environment.js";
import { databaseOptions } from "../.tmp/content-build/database/options.js";
import { AppModule } from "../.tmp/content-build/app.module.js";
import { configureHttp } from "../.tmp/content-build/http/configure-http.js";
import { InquiryNotifications } from "../.tmp/content-build/inquiries/notifications.service.js";
import { importDevelopmentContent } from "../.tmp/content-build/content/import.js";
let source,
  app,
  stage = "disposable verification evidence";
try {
  for (const scope of ["content", "staff", "regression"]) {
    const r = JSON.parse(fs.readFileSync(`.tmp/${scope}-verification.json`, "utf8"));
    assert.equal(r.passed, true);
    const age = Date.now() - Date.parse(r.checkedAt);
    assert.ok(Number.isFinite(age) && age >= 0 && age < 2 * 60 * 60_000);
    assert.equal(r.contentResult.passed, true);
    assert.equal(r.catalogBrowserTests, 9);
    if (scope === "content") assert.equal(r.contentBrowserResult.passed, true);
    if (scope === "staff") assert.equal(r.staffBrowserResult.passed, true);
    if (scope === "regression") {
      assert.equal(r.browserResult.passed, true);
      assert.equal(r.inquiryBrowserResult.passed, true);
    }
  }
  stage = "native target and additive migration preconditions";
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "development");
  assert.equal(env.dbHost, "127.0.0.1");
  assert.equal(env.dbPort, 3306);
  assert.equal(env.dbDatabase, "voic_development");
  assert.equal(env.dbUsername, "voic_app");
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  const expected = [
    "PublicCatalog1795435200000",
    "CustomerAccounts1795478400000",
    "CustomerInquiries1795521600000",
    "StaffInquiryWorkflow1795525200000",
    "ContentWorkspace1795532400000",
  ];
  const applied = (await source.query("SELECT name FROM voic_migrations ORDER BY id")).map(
    (r) => r.name,
  );
  assert.ok([4, 5].includes(applied.length));
  assert.deepEqual(applied, expected.slice(0, applied.length));
  assert.deepEqual(
    source.migrations.map((m) => m.name || m.constructor.name).sort(),
    [...expected].sort(),
  );
  const tables = [
    "catalog_products",
    "catalog_translations",
    "catalog_packages",
    "catalog_terms",
    "auth_users",
    "auth_sessions",
    "auth_action_tokens",
    "customer_inquiries",
    "customer_inquiry_lines",
    "customer_inquiry_history",
    "inquiry_notifications",
    "inquiry_actions",
    "inquiry_messages",
    "inquiry_internal_notes",
    "inquiry_audit_events",
  ];
  const fingerprint = async () => {
    const r = {};
    for (const t of tables) {
      const rows = await source.query(`SELECT * FROM ${t}`);
      r[t] = {
        count: rows.length,
        digest: createHash("sha256")
          .update(JSON.stringify(rows.map((x) => JSON.stringify(x)).sort()))
          .digest("hex"),
      };
    }
    return r;
  };
  const before = await fingerprint();
  assert.equal(before.catalog_products.count, 11);
  stage = "additive content migration and insert-only import";
  const migrations = await source.runMigrations();
  assert.ok(
    migrations.length === 0 || (migrations.length === 1 && migrations[0].name === expected[4]),
  );
  assert.equal((await source.runMigrations()).length, 0);
  const imported = await importDevelopmentContent(source);
  const repeat = await importDevelopmentContent(source);
  assert.equal(repeat.inserted, 0);
  assert.deepEqual(await fingerprint(), before);
  stage = "isolated real API readiness and published baseline";
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  configureHttp(app, env);
  await app.init();
  await app.get(InquiryNotifications).beforeApplicationShutdown();
  await app.listen(0, "127.0.0.1");
  const base = (await app.getUrl()) + "/api/v1";
  for (const kind of ["live", "ready"])
    assert.equal((await fetch(base + "/health/" + kind)).status, 200);
  assert.equal((await (await fetch(base + "/products?pageSize=50")).json()).total, 11);
  assert.equal((await (await fetch(base + "/recipes?pageSize=50")).json()).total, 4);
  assert.equal((await fetch(base + "/staff/content/products")).status, 401);
  for (const page of ["home", "shared", "header", "about", "business", "contact", "privacy"])
    assert.equal((await fetch(base + "/content/" + page)).status, 200);
  assert.deepEqual(await fingerprint(), before);
  fs.writeFileSync(
    ".tmp/content-development-verification.json",
    JSON.stringify({
      passed: true,
      checkedAt: new Date().toISOString(),
      applied: migrations.length,
      imported,
      repeatNoop: true,
      preservedTables: tables.length,
      products: 11,
      recipes: 4,
      pages: 7,
      readiness: 200,
      staffGuard: 401,
      actualStaffCreated: false,
    }),
  );
  console.log(
    "PASS: additive native content migration/import, existing data preserved, repeat no-op, real readiness 200, 11 products, four recipes and seven structured pages.",
  );
} catch {
  process.stderr.write(
    `Native content update stopped during: ${stage}. No reset or rollback attempted.\n`,
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  if (source?.isInitialized) await source.destroy();
}
