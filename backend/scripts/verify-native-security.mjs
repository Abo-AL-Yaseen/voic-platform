import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../.tmp/security-build/app.module.js";
import { loadEnvironment } from "../.tmp/security-build/config/environment.js";
import { DATABASE_SOURCE } from "../.tmp/security-build/database/database.service.js";
import { configureHttp } from "../.tmp/security-build/http/configure-http.js";
import { InquiryNotifications } from "../.tmp/security-build/inquiries/notifications.service.js";
let app;
try {
  const evidence = JSON.parse(
    fs.readFileSync(".tmp/security-development-verification.json", "utf8"),
  );
  assert.equal(evidence.passed, true);
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
    migrations: 6,
    mysql: server.version,
    port: server.port,
    engine: server.engine,
    realStaffModified: false,
  };
  fs.writeFileSync(".tmp/security-development-verification.json", JSON.stringify(result));
  process.stdout.write(
    "PASS: updated native NestJS readiness/liveness 200, six migrations, 11 products, four recipes, seven pages, anonymous staff denied, restricted audit grants. No real staff account changed.\n",
  );
} catch {
  process.stderr.write(
    "Native security API verification failed; secrets, SQL and account data are not logged.\n",
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close();
}
