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
const authTest = [
  "--auth-test",
  "--inquiries-test",
  "--staff-test",
  "--content-test",
  "--administration-test",
].includes(process.argv.slice(2).join(" "));
const testOnly = authTest || catalogTest || process.argv.slice(2).join(" ") === "--test-only";
if (process.argv.length > 2 && !testOnly) {
  process.stderr.write(
    "Only --test-only, --catalog-test, --auth-test, --inquiries-test, --staff-test --content-test or --administration-test is supported.\n",
  );
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
        timeout: authTest ? 600000 : 120000,
      });
      process.stdout.write(result);
    } catch (error) {
      const safeStage = error.stderr
        ?.toString()
        .match(/Disposable (?:catalog|auth) verification failed during: [a-z /()-]+\./)?.[0];
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
  const testOverrides = {
    NODE_ENV: "test",
    DB_DATABASE: testName,
    DB_USERNAME: testName,
    DB_PASSWORD: testPassword,
    CONFIRM_DISPOSABLE_DATABASE: "yes",
  };
  if (authTest) {
    // An interactive operator grants access once. Credentials stay only in this process
    // and its test children. Safe file signals allow reruns without asking for a password.
    fs.mkdirSync(".tmp", { recursive: true });
    const readyPath = ".tmp/auth-operator-ready.json",
      commandPath = ".tmp/auth-operator-command.json";
    if (fs.existsSync(readyPath)) {
      const previous = JSON.parse(fs.readFileSync(readyPath, "utf8"));
      let alive = false;
      try {
        process.kill(previous.pid, 0);
        alive = true;
      } catch {}
      if (alive) throw new Error("Another auth verification operator is active");
    }
    fs.rmSync(commandPath, { force: true });
    fs.writeFileSync(
      readyPath,
      JSON.stringify({ pid: process.pid, ready: true, startedAt: new Date().toISOString() }),
    );
    process.stdout.write(
      "Auth test operator ready. Leave this terminal open; no password is saved. Only the new disposable database/user are in use.\n",
    );
    let stopping = false;
    const stop = () => {
      stopping = true;
    };
    process.on("SIGINT", stop);
    const until = Date.now() + 45 * 60_000;
    try {
      while (!stopping && Date.now() < until) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!fs.existsSync(commandPath)) continue;
        let command;
        try {
          command = JSON.parse(fs.readFileSync(commandPath, "utf8").replace(/^\uFEFF/, ""));
        } catch {
          fs.rmSync(commandPath, { force: true });
          continue;
        }
        fs.rmSync(commandPath, { force: true });
        if (command.action === "finish") break;
        if (command.action === "apply-security") {
          try {
            const { applyNativeSecurity } = await import("./native-security-administration.mjs");
            await applyNativeSecurity(admin, {
              local: parseEnv(fs.readFileSync(".env", "utf8")),
              grantTarget,
            });
          } catch {
            process.stderr.write(
              "Native security apply stopped. Review verification evidence, migration state and VOIC-only grants locally. No reset attempted.\n",
            );
          }
          continue;
        }
        if (command.action === "audit-grants") {
          try {
            const { auditWriterGrants } = await import("./native-security-administration.mjs");
            const result = await auditWriterGrants(admin, {
              database: testName,
              user: testName,
              grantTarget,
              local: { DB_PASSWORD: testPassword },
            });
            fs.writeFileSync(
              ".tmp/audit-grants-verification.json",
              JSON.stringify({ ...result, passed: true, checkedAt: new Date().toISOString() }),
            );
            process.stdout.write(
              "PASS: disposable audit writer cannot UPDATE/DELETE audits or run DDL.\n",
            );
          } catch {
            process.stderr.write("Disposable audit grant check failed.\n");
          }
          continue;
        }
        if (command.action !== "run") continue;
        // Restore DDL only on this invocation's disposable database for a corrected rerun.
        await admin.query(
          `GRANT ALL PRIVILEGES ON \`${grantTarget(testName)}\`.* TO '${testName}'@'localhost'`,
        );

        let passed = false;
        try {
          run([
            "node_modules/typescript/bin/tsc",
            "-p",
            "tsconfig.json",
            "--outDir",
            ".tmp/auth-build",
          ]);
          run(["scripts/check-auth.mjs"], testOverrides);
          passed = true;
        } catch {
          process.stderr.write(
            "Auth verification failed; safe stage details are above. The disposable operator remains open for a corrected rerun.\n",
          );
        }
        fs.writeFileSync(
          ".tmp/auth-operator-result.json",
          JSON.stringify({ passed, checkedAt: new Date().toISOString() }),
        );
      }
    } finally {
      process.removeListener("SIGINT", stop);
      fs.rmSync(readyPath, { force: true });
    }
  } else
    run([catalogTest ? "scripts/check-catalog.mjs" : "scripts/check-database.mjs"], testOverrides);
  process.stdout.write(
    authTest
      ? "Auth test operator closed. Review its recorded verification result.\n"
      : "Native setup and disposable migration verification passed.\n",
  );
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
