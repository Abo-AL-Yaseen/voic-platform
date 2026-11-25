import {InquiryNotifications} from "../dist/inquiries/notifications.service.js";
import "reflect-metadata";
import assert from "node:assert/strict";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../dist/app.module.js";
import { loadEnvironment } from "../dist/config/environment.js";
import { DATABASE_SOURCE } from "../dist/database/database.service.js";
import { configureHttp } from "../dist/http/configure-http.js";

let app;
try {
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "development");
  assert.equal(env.dbHost, "127.0.0.1");
  assert.equal(env.dbPort, 3306);
  assert.equal(env.dbDatabase, "voic_development");
  assert.equal(env.dbUsername, "voic_app");
  app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  configureHttp(app, env);
  // An ephemeral localhost port avoids disturbing an existing API or another project.
  await app.init();
  await app.get(InquiryNotifications).beforeApplicationShutdown();
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  for (const route of ["live", "ready"]) {
    const response = await fetch(`${base}/api/v1/health/${route}`, {
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  }
  const source = app.get(DATABASE_SOURCE);
  const [server] = await source.query(
    "SELECT VERSION() AS version, @@port AS port, @@default_storage_engine AS engine",
  );
  assert.equal(Number(server.port), 3306);
  assert.equal(server.engine.toLowerCase(), "innodb");
  const [schema] = await source.query(
    "SELECT DEFAULT_CHARACTER_SET_NAME AS charset, DEFAULT_COLLATION_NAME AS collation FROM information_schema.schemata WHERE schema_name = DATABASE()",
  );
  assert.equal(schema.charset, "utf8mb4");
  assert.equal(schema.collation, "utf8mb4_unicode_ci");
  const [account] = await source.query("SELECT CURRENT_USER() AS account");
  assert.equal(account.account, "voic_app@localhost");
  const grants = await source.query("SHOW GRANTS FOR CURRENT_USER");
  assert.ok(grants.some((row) => /^GRANT USAGE ON \*\.\* TO /.test(Object.values(row)[0])));
  for (const row of grants) {
    const grant = Object.values(row)[0].replaceAll("\\_", "_");
    assert.ok(
      /^GRANT USAGE ON \*\.\* TO /.test(grant) || grant.includes(" ON `voic_development`."),
    );
    assert.ok(!grant.includes("WITH GRANT OPTION"));
  }
  await assert.rejects(source.query("SELECT User FROM mysql.user"));
  process.stdout.write(
    `PASS: native MySQL ${server.version}:3306, utf8mb4/InnoDB, database-only grants, NestJS liveness/readiness HTTP 200.\n`,
  );
} catch {
  process.stderr.write(
    "Native development readiness verification failed; no connection details or SQL are logged.\n",
  );
  process.exitCode = 1;
} finally {
  if (app) await app.close();
}
