import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { loadEnvironment } from "../dist/config/environment.js";

try {
  loadEnvironment();
} catch {
  process.stderr.write(
    "Invalid local environment. Review the required settings in .env.example.\n",
  );
  process.exit(1);
}
const suffix = randomBytes(8).toString("hex");
const database = `voic_test_${suffix}`;
const user = `voic_test_${suffix}`;
const password = randomBytes(32).toString("hex");
let created = false;
let userCreated = false;
const sql = (input) =>
  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "mysql",
      "sh",
      "-c",
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --batch --skip-column-names',
    ],
    { input, stdio: ["pipe", "pipe", "pipe"] },
  );
try {
  // No IF NOT EXISTS: a collision aborts without deleting any existing database.
  sql(`CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  created = true;
  sql(`CREATE USER '${user}'@'%' IDENTIFIED BY '${password}';`);
  userCreated = true;
  sql(`GRANT ALL PRIVILEGES ON ${database}.* TO '${user}'@'%';`);
  const result = execFileSync(process.execPath, ["scripts/check-database.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      DB_DATABASE: database,
      DB_USERNAME: user,
      DB_PASSWORD: password,
      CONFIRM_DISPOSABLE_DATABASE: "yes",
    },
    stdio: "pipe",
  });
  process.stdout.write(result);
} catch {
  process.stderr.write(
    "Compose database verification failed; check Docker, the local environment and MySQL readiness.\n",
  );
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      sql(`DROP DATABASE ${database};`);
      if (userCreated) sql(`DROP USER '${user}'@'%';`);
    } catch {
      process.stderr.write(
        "Disposable test cleanup failed; inspect only the generated voic_test_ database/user.\n",
      );
      process.exitCode = 1;
    }
  }
}
