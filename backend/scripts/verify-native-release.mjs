import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../.tmp/release-build/app.module.js";
import { loadEnvironment } from "../.tmp/release-build/config/environment.js";
import { DATABASE_SOURCE } from "../.tmp/release-build/database/database.service.js";
import { configureHttp } from "../.tmp/release-build/http/configure-http.js";
import { InquiryNotifications } from "../.tmp/release-build/inquiries/notifications.service.js";
let app;
try {
  const evidence = JSON.parse(
    fs.readFileSync(".tmp/release-development-verification.json", "utf8"),
  );
  assert.equal(evidence.passed, true);
  assert.ok(Date.now() - Date.parse(evidence.checkedAt) < 2 * 60 * 60_000);
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "development");
  assert.equal(env.dbDatabase, "voic_development");
  assert.equal(env.dbUsername, "voic_app");
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  configureHttp(app, env);
  await app.init();
  await app.get(InquiryNotifications).beforeApplicationShutdown();
  await app.listen(0, "127.0.0.1");
  const base = (await app.getUrl()) + "/api/v1",
    source = app.get(DATABASE_SOURCE);
  for (const kind of ["live", "ready"])
    assert.equal((await fetch(base + "/health/" + kind)).status, 200);
  assert.equal((await (await fetch(base + "/products?pageSize=50")).json()).total, 11);
  assert.equal((await (await fetch(base + "/recipes?pageSize=50")).json()).total, 4);
  for (const p of ["home", "shared", "header", "about", "business", "contact", "privacy"])
    assert.equal((await fetch(base + "/content/" + p)).status, 200);
  for (const p of [
    "/staff/access",
    "/staff/inquiries",
    "/staff/content/products",
    "/staff/employees",
    "/staff/audit",
  ])
    assert.equal((await fetch(base + p)).status, 401);
  assert.equal(await source.showMigrations(), false);
  assert.equal(Number((await source.query("SELECT COUNT(*) n FROM voic_migrations"))[0].n), 7);
  for (const t of ["staff_audit_events", "staff_editorial_events", "inquiry_audit_events"]) {
    for (const sql of [`UPDATE ${t} SET id=id WHERE 1=0`, `DELETE FROM ${t} WHERE 1=0`])
      await assert.rejects(
        source.query(sql),
        (e) => e.driverError?.code === "ER_TABLEACCESS_DENIED_ERROR",
      );
  }
  const [server] = await source.query(
    "SELECT VERSION() version,@@port port,@@default_storage_engine engine",
  );
  const result = {
    ...evidence,
    apiCheckedAt: new Date().toISOString(),
    readiness: 200,
    products: 11,
    recipes: 4,
    pages: 7,
    anonymousStaff: 401,
    migrations: 7,
    mysql: server.version,
    port: server.port,
    engine: server.engine,
    realStaffModified: false,
  };
  fs.writeFileSync(".tmp/release-development-verification.json", JSON.stringify(result));
  process.stdout.write(
    "PASS: updated native NestJS readiness/liveness 200, seven migrations, 11 products, four recipes, seven pages, anonymous staff denied, restricted audit grants. No real staff account changed.\n",
  );
} catch {
  process.stderr.write(
    "Native release API verification failed; secrets, SQL and account data are not logged.\n",
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close();
}
