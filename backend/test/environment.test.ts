import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEnvironment, ConfigurationError } from "../src/config/environment.js";
import { databaseOptions } from "../src/database/options.js";

export const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: "3000",
  CORS_ORIGINS: "http://localhost:8443,http://127.0.0.1:8443",
  DB_HOST: "127.0.0.1",
  DB_PORT: "3307",
  DB_DATABASE: "voic_test",
  DB_USERNAME: "voic_test",
  DB_PASSWORD: "test-only-secret-not-a-real-credential",
  DB_TIMEOUT_MS: "500",
};

test("required configuration fails clearly without including supplied secrets", () => {
  assert.throws(() => validateEnvironment({}), ConfigurationError);
  for (const patch of [
    { DB_HOST: "" },
    { DB_USERNAME: "root" },
    { DB_PASSWORD: "replace-with-a-password" },
    { DB_PORT: "invalid-secret-sentinel" },
    { DB_PORT: "65536" },
    { PORT: "0" },
    { DB_DATABASE: "invalid-name" },
    { DB_TIMEOUT_MS: "999999" },
    { NODE_ENV: "unknown" },
    { CORS_ORIGINS: "*" },
    { CORS_ORIGINS: "https://*.example.com" },
    { CORS_ORIGINS: "https://user:secret@example.com" },
    { CORS_ORIGINS: "http://localhost:8443/path" },
    { TRUST_PROXY_CIDRS: "0.0.0.0/0" },
    { TRUST_PROXY_CIDRS: "true" },
    { TRUST_PROXY_CIDRS: "127.0.0.1/99" },
    { DB_TLS: "false-unsafe" },
    { DB_TLS_CA_FILE: "missing-private-ca-sentinel" },
    { MEDIA_ROOT: "relative-unsafe-root" },
  ]) {
    assert.throws(
      () => validateEnvironment({ ...validEnvironment, ...patch }),
      (error) => {
        assert.ok(error instanceof ConfigurationError);
        assert.ok(!error.message.includes("invalid-secret-sentinel"));
        assert.ok(!error.message.includes(validEnvironment.DB_PASSWORD!));
        assert.ok(!error.message.includes("user:secret"));
        return true;
      },
    );
  }
});

test("production remote databases require verified TLS and proxy trust stays explicit", () => {
  assert.throws(() =>
    validateEnvironment({
      ...validEnvironment,
      NODE_ENV: "production",
      MEDIA_ROOT: tmpdir(),
      DB_HOST: "192.0.2.10",
      DB_TLS: "true",
    }),
  );
  assert.throws(() =>
    validateEnvironment({
      ...validEnvironment,
      NODE_ENV: "production",
      MEDIA_ROOT: tmpdir(),
      DB_HOST: "mysql.example",
    }),
  );
  const env = validateEnvironment({
    ...validEnvironment,
    NODE_ENV: "production",
    MEDIA_ROOT: tmpdir(),
    DB_HOST: "mysql.example",
    DB_TLS: "true",
    TRUST_PROXY_CIDRS: "127.0.0.1,::1/128",
  });
  assert.deepEqual(env.trustProxy, ["127.0.0.1", "::1/128"]);
  assert.deepEqual(
    databaseOptions(env).type === "mysql" && (databaseOptions(env) as { ssl?: unknown }).ssl,
    { rejectUnauthorized: true, verifyIdentity: true },
  );
});

test("database options never synchronize or run migrations on startup", () => {
  const options = databaseOptions(validateEnvironment(validEnvironment));
  assert.equal(options.type, "mysql");
  assert.equal(options.synchronize, false);
  assert.equal(options.dropSchema, false);
  assert.equal(options.migrationsRun, false);
  assert.equal(options.logging, false);
  assert.equal((options.entities as unknown[]).length, 26);
});

test("the real bootstrap exits on invalid configuration without leaking supplied values", () => {
  const cwd = mkdtempSync(join(tmpdir(), "voic-config-test-"));
  try {
    const env = { ...process.env };
    for (const key of Object.keys(validEnvironment)) delete env[key];
    env.DB_PORT = "invalid-private-sentinel";
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../src/main.js", import.meta.url))],
      { cwd, env, encoding: "utf8", timeout: 30_000 },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid environment settings/);
    assert.match(result.stderr, /DB_PASSWORD is required/);
    assert.ok(!result.stderr.includes("invalid-private-sentinel"));
    assert.doesNotMatch(result.stderr, /^\s+at\s+/m);
  } finally {
    rmdirSync(cwd);
  }
});

test("production bootstrap fails closed without an external MFA key before listening", () => {
  const cwd = mkdtempSync(join(tmpdir(), "voic-mfa-config-test-"));
  try {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...validEnvironment,
      NODE_ENV: "production",
      MEDIA_ROOT: cwd,
      APP_URL: "https://voic.example",
      CORS_ORIGINS: "https://voic.example",
      MAIL_MODE: "smtp",
      MAIL_FROM: "VOIC <no-reply@voic.example>",
      SMTP_HOST: "mail.voic.example",
      INQUIRY_COMPANY_EMAIL: "sales@voic.example",
    };
    delete env.MFA_ENCRYPTION_KEY;
    delete env.STAFF_INQUIRY_WRITES;
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../src/main.js", import.meta.url))],
      { cwd, env, encoding: "utf8", timeout: 30000 },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /MFA_ENCRYPTION_KEY/);
    assert.ok(!result.stderr.includes(validEnvironment.DB_PASSWORD!));
    assert.ok(!result.stdout.includes("listening"));
  } finally {
    rmdirSync(cwd);
  }
});
