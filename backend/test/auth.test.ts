import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as argon2 from "argon2";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { authConfiguration, safeReturnPath } from "../src/auth/auth.config.js";
import { csrfToken, hashToken, passwordOptions, publicUser } from "../src/auth/auth.service.js";
import { AuthRateLimit } from "../src/auth/rate-limit.js";
import { RegisterDto, ProfileDto } from "../src/auth/auth.dto.js";
import { validateEnvironment } from "../src/config/environment.js";
const environment = validateEnvironment({
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: "3001",
  CORS_ORIGINS: "http://127.0.0.1:8444",
  DB_HOST: "127.0.0.1",
  DB_PORT: "3306",
  DB_DATABASE: "voic_test",
  DB_USERNAME: "voic_test",
  DB_PASSWORD: "test-only-not-real-password",
  DB_TIMEOUT_MS: "500",
});
test("auth configuration fails closed in production and rejects untrusted URL components", () => {
  for (const input of [
    { APP_URL: "https://name:private@example.test" },
    { APP_URL: "https://example.test/path" },
    { APP_URL: "javascript:alert(1)" },
    { MAIL_CAPTURE_NAME: "../public" },
  ])
    assert.throws(() => authConfiguration(environment, input));
  assert.throws(() => authConfiguration({ ...environment, nodeEnv: "production" }, {}));
  assert.throws(() =>
    authConfiguration(
      { ...environment, nodeEnv: "production", corsOrigins: ["https://voic.example"] },
      { APP_URL: "https://voic.example", MAIL_MODE: "capture" },
    ),
  );
  const cfg = authConfiguration(
    { ...environment, nodeEnv: "production", corsOrigins: ["https://voic.example"] },
    {
      APP_URL: "https://voic.example",
      MAIL_MODE: "smtp",
      MAIL_FROM: "VOIC <no-reply@voic.example>",
      SMTP_HOST: "smtp.example",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      INQUIRY_COMPANY_EMAIL: "inquiries@voic.example",
    },
  );
  assert.equal(cfg.production, true);
  assert.equal(cfg.smtpSecure, true);
});
test("return destinations allow only application routes and public selection context", () => {
  for (const v of [
    "//attacker.invalid",
    "/\\evil",
    "https://evil.invalid",
    "/login?returnTo=/staff",
    "/%2f%2fevil",
    "/account\n",
    "/account/../login",
  ])
    assert.equal(safeReturnPath(v), "/account");
  assert.equal(
    safeReturnPath("/inquiries/new?products=ghazal,nabateen&password=secret#private"),
    "/inquiries/new?products=ghazal%2Cnabateen",
  );
});
test("hashes and CSRF derivation are one way, bounded and bound to each session", async () => {
  assert.equal(hashToken("a"), hashToken("a"));
  assert.notEqual(csrfToken("a"), csrfToken("b"));
  assert.notEqual(csrfToken("a"), hashToken("a"));
  const hash = await argon2.hash("test password with 15+ characters", passwordOptions);
  assert.match(hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert.ok(await argon2.verify(hash, "test password with 15+ characters"));
  assert.equal(await argon2.verify(hash, "wrong"), false);
});
test("registration/profile reject privilege, identity and unknown field injection", async () => {
  const dto = {
    name: "Name",
    kind: "individual",
    country: "Palestine",
    email: "test@example.test",
    password: "test-only fifteen chars",
  };
  assert.equal(
    (
      await validate(plainToInstance(RegisterDto, dto), {
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    ).length,
    0,
  );
  for (const property of [
    "role",
    "permissions",
    "id",
    "emailVerifiedAt",
    "passwordHash",
    "securityVersion",
  ]) {
    assert.ok(
      (
        await validate(plainToInstance(RegisterDto, { ...dto, [property]: "administrator" }), {
          whitelist: true,
          forbidNonWhitelisted: true,
        })
      ).length > 0,
    );
  }
  assert.ok(
    (
      await validate(
        plainToInstance(ProfileDto, {
          name: "Name",
          kind: "individual",
          country: "PS",
          email: "other@example.test",
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      )
    ).length > 0,
  );
});
test("public user projection cannot expose internal fields and rate counters are bounded", () => {
  const value = publicUser({
    id: "id",
    email: "a@example.test",
    name: "N",
    kind: "individual",
    company: null,
    country: "PS",
    phone: null,
    role: "customer",
    emailVerifiedAt: null,
    passwordHash: "private",
    securityVersion: 2,
    suspendedAt: null,
    staffRevision: 0,
    createdAt: new Date(),
  });
  assert.equal(value.emailVerified, false);
  assert.ok(!JSON.stringify(value).includes("private"));
  assert.ok(!("securityVersion" in value));
  const limiter = new AuthRateLimit();
  limiter.take("a", "id", 2);
  limiter.take("a", "id", 2);
  assert.throws(() => limiter.take("a", "id", 2));
  limiter.take("a", "different", 2);
});
