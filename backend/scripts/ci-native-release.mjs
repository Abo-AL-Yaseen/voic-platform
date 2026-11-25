import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
// Only an ephemeral Linux CI runner, never a developer/operator credential path.
assert.equal(process.env.CI, "true");
assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.platform, "linux");
const names = Array.from({ length: 3 }, () => `voic_test_${randomBytes(8).toString("hex")}`),
  passwords = names.map(() => randomBytes(32).toString("hex"));
const sql = (statement) =>
  execFileSync("mysql", ["--host=127.0.0.1", "--user=root", "--batch"], {
    // The public default of the disposable GitHub Ubuntu runner, never a local credential.
    env: { ...process.env, MYSQL_PWD: "root" },
    input: statement,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 30000,
  });
const created = [];
let connection;
try {
  for (let i = 0; i < names.length; i++) {
    sql(`CREATE DATABASE \`${names[i]}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    const owned = { name: names[i], userCreated: false };
    created.push(owned);
    sql(`CREATE USER '${names[i]}'@'localhost' IDENTIFIED BY '${passwords[i]}';`);
    owned.userCreated = true;
    sql(
      `GRANT ALL PRIVILEGES ON \`${names[i].replaceAll("_", "\\_")}\`.* TO '${names[i]}'@'localhost';`,
    );
  }
  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(".tmp/verification-scope.json", JSON.stringify({ scope: "all" }));
  execFileSync(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--outDir", ".tmp/auth-build"],
    { stdio: "inherit", timeout: 120000 },
  );
  execFileSync(process.execPath, ["scripts/check-auth.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "3000",
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_DATABASE: names[0],
      DB_USERNAME: names[0],
      DB_PASSWORD: passwords[0],
      DB_TIMEOUT_MS: "3000",
      CONFIRM_DISPOSABLE_DATABASE: "yes",
      RELEASE_VERIFICATION: "yes",
      MFA_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
      RESTORE_DB_OWNED: "yes",
      RESTORE_DB_DATABASE: names[1],
      RESTORE_DB_USERNAME: names[1],
      RESTORE_DB_PASSWORD: passwords[1],
    },
    stdio: "inherit",
    timeout: 1200000,
  });
  // Keep the standalone catalog/migration command reproducible on another empty schema.
  execFileSync(process.execPath, ["scripts/check-catalog.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "3000",
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_TIMEOUT_MS: "3000",
      DB_DATABASE: names[2],
      DB_USERNAME: names[2],
      DB_PASSWORD: passwords[2],
      CONFIRM_DISPOSABLE_DATABASE: "yes",
      APP_URL: "http://127.0.0.1:8444",
      CORS_ORIGINS: "http://127.0.0.1:8444",
      MAIL_MODE: "capture",
      MFA_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    },
    stdio: "inherit",
    timeout: 120000,
  });
  connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: names[0],
    password: passwords[0],
    database: names[0],
  });
  const [tables] = await connection.query("SHOW TABLES");
  for (const row of tables) {
    const name = Object.values(row)[0];
    assert.match(name, /^[a-z_]+$/);
    const grants = [
      "inquiry_audit_events",
      "staff_editorial_events",
      "staff_audit_events",
    ].includes(name)
      ? "SELECT,INSERT"
      : name === "voic_migrations"
        ? "SELECT"
        : "SELECT,INSERT,UPDATE,DELETE";
    sql(`GRANT ${grants} ON \`${names[0]}\`.\`${name}\` TO '${names[0]}'@'localhost';`);
  }
  sql(
    `REVOKE ALL PRIVILEGES ON \`${names[0].replaceAll("_", "\\_")}\`.* FROM '${names[0]}'@'localhost';`,
  );
  await connection.end();
  connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: names[0],
    password: passwords[0],
    database: names[0],
  });
  for (const name of ["inquiry_audit_events", "staff_editorial_events", "staff_audit_events"])
    for (const operation of [`UPDATE ${name} SET id=id WHERE 1=0`, `DELETE FROM ${name} WHERE 1=0`])
      await assert.rejects(
        connection.query(operation),
        (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR",
      );
  await assert.rejects(
    connection.query("CREATE TABLE forbidden_runtime_ddl(id int)"),
    (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR",
  );
  const proof = JSON.parse(fs.readFileSync(".tmp/all-verification.json", "utf8"));
  console.log(
    JSON.stringify({
      event: "release_ci_summary",
      checkedAt: proof.checkedAt,
      load: proof.releaseResult.load,
      restore: proof.releaseResult.restore,
      publicBrowser: proof.releaseBrowserResult,
      restrictedAuditGrants: true,
    }),
  );
  console.log("PASS: isolated native CI release suite, restore and runtime audit grants.");
} catch {
  console.error(
    "Native CI release verification failed. Inspect safe stage records; no credentials or SQL are logged.",
  );
  process.exitCode = 1;
} finally {
  try {
    if (connection) await connection.end();
  } catch {
    process.exitCode = 1;
  }
  for (const { name, userCreated } of created) {
    try {
      sql(`DROP DATABASE \`${name}\`;`);
      if (userCreated) sql(`DROP USER '${name}'@'localhost';`);
    } catch {
      console.error(
        "CI cleanup failed for an owned disposable resource; no SQL or credentials logged.",
      );
      process.exitCode = 1;
    }
  }
}
