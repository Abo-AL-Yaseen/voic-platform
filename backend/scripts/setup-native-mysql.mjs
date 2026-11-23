import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { execFileSync } from "node:child_process";
import mysql from "mysql2/promise";

// Run locally in an interactive terminal. Never accept an administrator secret in argv,
// environment variables or a file. No Docker commands or global server changes occur here.
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stderr.write("Run this command yourself in an interactive local terminal.\n");
  process.exit(1);
}
if (!fs.existsSync("dist/database/manage.js")) {
  process.stderr.write("Run pnpm.cmd build from backend/ first.\n");
  process.exit(1);
}
if (Object.keys(process.env).some((key) => key.startsWith("DB_") || key === "NODE_ENV")) {
  process.stderr.write("Use a fresh terminal without exported DB_* or NODE_ENV overrides.\n");
  process.exit(1);
}

const catalogTest = process.argv.slice(2).join(" ") === "--catalog-test";
const testOnly = catalogTest || process.argv.slice(2).join(" ") === "--test-only";
if (process.argv.length > 2 && !testOnly) {
  process.stderr.write("Only --test-only or --catalog-test is supported.\n");
  process.exit(1);
}
const original = fs.readFileSync(".env", "utf8");
const local = parseEnv(original);
const database = "voic_development";
const user = "voic_app";
const host = "127.0.0.1";
const port = 3306;
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const prompt = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
let admin;
let stage = "administrator login";
let createdDatabase = false;
let createdUser = false;
let testDatabaseCreated = false;
let testUserCreated = false;
const testName = `voic_test_${randomBytes(8).toString("hex")}`;
try {
  const adminUser =
    (await prompt.question("MySQL administrator username [root]: ")).trim() || "root";
  process.stdout.write("MySQL administrator password (hidden, never saved): ");
  muted = true;
  let adminPassword = await prompt.question("");
  muted = false;
  process.stdout.write("\n");
  prompt.close();
  admin = await mysql.createConnection({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    connectTimeout: 5000,
    multipleStatements: false,
  });
  adminPassword = undefined;
  stage = "server preflight";
  const [[server]] = await admin.query(
    "SELECT VERSION() AS version, @@port AS port, @@default_storage_engine AS engine, @@partial_revokes AS partialRevokes",
  );
  if (server.port !== port || server.engine.toLowerCase() !== "innodb")
    throw new Error("Unsupported server configuration");
  process.stdout.write(`Native server: MySQL ${server.version}, port ${server.port}, InnoDB.\n`);
  // Underscores must be literal in database-level grants, including when partial revokes
  // are disabled. Never change the server's global partial_revokes setting.
  const grantTarget = (name) =>
    Number(server.partialRevokes) ? name : name.replaceAll("_", "\\_");
  async function assertAbsent(name, account) {
    const [[schema]] = await admin.query(
      "SELECT COUNT(*) AS total FROM information_schema.schemata WHERE schema_name = ?",
      [name],
    );
    const [[accounts]] = await admin.query(
      "SELECT COUNT(*) AS total FROM mysql.user WHERE User = ?",
      [account],
    );
    if (Number(schema.total) || Number(accounts.total)) throw new Error("Name collision");
  }
  if (!testOnly) {
    stage = "development database/user collision check";
    await assertAbsent(database, user);
    const password = local.DB_PASSWORD;
    if (!password || password.length < 16 || !/^[a-f0-9]{64}$/.test(password))
      throw new Error("Initialize .env with init-local-env.mjs first");
    stage = "development database provisioning";
    await admin.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    createdDatabase = true;
    await admin.query(`CREATE USER '${user}'@'localhost' IDENTIFIED BY '${password}'`);
    createdUser = true;
    await admin.query(
      `GRANT ALL PRIVILEGES ON \`${grantTarget(database)}\`.* TO '${user}'@'localhost'`,
    );
    const values = {
      DB_HOST: host,
      DB_PORT: String(port),
      DB_DATABASE: database,
      DB_USERNAME: user,
    };
    let updated = original;
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`^${key}=.*$`, "m");
      updated = pattern.test(updated)
        ? updated.replace(pattern, `${key}=${value}`)
        : `${updated}\n${key}=${value}\n`;
    }
    // Preserve the existing VOIC password and unrelated local settings. Refuse a concurrent edit.
    if (fs.readFileSync(".env", "utf8") !== original) throw new Error("Local file changed");
    fs.writeFileSync(".env", updated);
    process.stdout.write(
      "Created voic_development and voic_app@localhost; updated ignored .env. No secret values displayed.\n",
    );
  }
  stage = "development connection verification";
  const env = { ...process.env, ...parseEnv(fs.readFileSync(".env", "utf8")) };
  if (
    env.DB_HOST !== host ||
    env.DB_PORT !== String(port) ||
    env.DB_DATABASE !== database ||
    env.DB_USERNAME !== user
  )
    throw new Error("Native development configuration required");
  const run = (args, overrides = {}) => {
    // Capture failures so neither SQL nor connection details escape in exception output.
    try {
      const result = execFileSync(process.execPath, args, {
        env: { ...env, ...overrides },
        stdio: "pipe",
        timeout: 120000,
      });
      process.stdout.write(result);
    } catch (error) {
      const safeStage = error.stderr
        ?.toString()
        .match(/Disposable catalog verification failed during: [a-z /()-]+\./)?.[0];
      if (safeStage) process.stderr.write(`${safeStage}\n`);
      throw new Error("Child verification failed");
    }
  };
  run(["dist/database/manage.js", "check"]);
  run(["scripts/check-native-readiness.mjs"]);
  stage = "disposable database/user provisioning";
  await assertAbsent(testName, testName);
  const testPassword = randomBytes(32).toString("hex");
  await admin.query(
    `CREATE DATABASE \`${testName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  testDatabaseCreated = true;
  await admin.query(`CREATE USER '${testName}'@'localhost' IDENTIFIED BY '${testPassword}'`);
  testUserCreated = true;
  await admin.query(
    `GRANT ALL PRIVILEGES ON \`${grantTarget(testName)}\`.* TO '${testName}'@'localhost'`,
  );
  stage = "disposable database migration verification";
  run([catalogTest ? "scripts/check-catalog.mjs" : "scripts/check-database.mjs"], {
    NODE_ENV: "test",
    DB_DATABASE: testName,
    DB_USERNAME: testName,
    DB_PASSWORD: testPassword,
    CONFIRM_DISPOSABLE_DATABASE: "yes",
  });
  process.stdout.write("Native setup and disposable migration verification passed.\n");
} catch {
  muted = false;
  process.stderr.write(
    `Native setup stopped during: ${stage}. No existing database/user was replaced or reset.\n`,
  );
  if (createdDatabase || createdUser)
    process.stderr.write(
      "New VOIC development resources are retained. Inspect voic_development / voic_app locally before retrying; do not reset them.\n",
    );
  process.exitCode = 1;
} finally {
  prompt.close();
  if (admin) {
    try {
      // Only resources successfully created by this invocation can be removed.
      if (testDatabaseCreated) await admin.query(`DROP DATABASE \`${testName}\``);
      if (testUserCreated) await admin.query(`DROP USER '${testName}'@'localhost'`);
      if (testDatabaseCreated || testUserCreated)
        process.stdout.write("Removed only this invocation's disposable test database/user.\n");
    } catch {
      process.stderr.write(
        `Disposable cleanup needs local administrator attention: ${testName}.\n`,
      );
      process.exitCode = 1;
    }
    await admin.end();
  }
}
