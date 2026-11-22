import "reflect-metadata";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { DataSource } from "typeorm";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../dist/app.module.js";
import { configureHttp } from "../dist/http/configure-http.js";
import { DATABASE_SOURCE } from "../dist/database/database.service.js";
import { loadEnvironment } from "../dist/config/environment.js";
import { databaseOptions } from "../dist/database/options.js";

// Only explicit disposable databases may run this DDL verification fixture.
let env;
try {
  env = loadEnvironment();
} catch {
  process.stderr.write("Invalid database test environment. Review .env.example.\n");
  process.exit(1);
}
if (
  env.nodeEnv !== "test" ||
  !/^voic_test_[a-f0-9]{16}$/.test(env.dbDatabase) ||
  process.env.CONFIRM_DISPOSABLE_DATABASE !== "yes"
) {
  process.stderr.write(
    "Refusing database test: an explicitly confirmed disposable test database is required.\n",
  );
  process.exit(1);
}

class FoundationProbe1700000000000 {
  name = "FoundationProbe1700000000000";
  transaction = false; // MySQL DDL implicitly commits; down() is explicitly verified.
  async up(runner) {
    await runner.query("CREATE TABLE voic_foundation_probe (id INT PRIMARY KEY) ENGINE=InnoDB");
  }
  async down(runner) {
    await runner.query("DROP TABLE voic_foundation_probe");
  }
}

const source = new DataSource({
  ...databaseOptions(env),
  migrations: [FoundationProbe1700000000000],
});
try {
  await source.initialize();
  const [engine] = await source.query("SELECT @@default_storage_engine AS engine");
  assert.equal(engine.engine.toLowerCase(), "innodb");
  const [tables] = await source.query(
    "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()",
  );
  assert.equal(Number(tables.total), 0, "The disposable database must start empty");
  // Exercise the actual operator commands against this disposable database only.
  for (const action of ["check", "show", "run"]) {
    execFileSync(process.execPath, ["dist/database/manage.js", action], {
      env: process.env,
      stdio: "pipe",
    });
  }
  assert.equal((await source.runMigrations()).length, 1);
  const [probe] = await source.query(
    "SELECT ENGINE AS engine FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'voic_foundation_probe'",
  );
  assert.equal(probe.engine, "InnoDB");
  assert.equal((await source.runMigrations()).length, 0);
  assert.equal(await source.showMigrations(), false);
  await source.undoLastMigration();
  const [remaining] = await source.query(
    "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'voic_foundation_probe'",
  );
  assert.equal(Number(remaining.total), 0);
  // The restricted user must not have access to MySQL's system database.
  await assert.rejects(source.query("SELECT User FROM mysql.user"));
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  try {
    configureHttp(app, env);
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    for (const route of ["live", "ready"]) {
      const response = await fetch(`${base}/api/v1/health/${route}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
    }
  } finally {
    await app.close();
  }
  assert.equal(app.get(DATABASE_SOURCE).isInitialized, false);
  process.stdout.write(
    "PASS: real MySQL connection, InnoDB, restricted grants, migration commands, apply/idempotence/revert, HTTP health and pool cleanup.\n",
  );
} catch {
  process.stderr.write(
    "Disposable database verification failed. No connection details are logged.\n",
  );
  process.exitCode = 1;
} finally {
  if (source.isInitialized) await source.destroy();
}
