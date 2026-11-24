import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { DataSource } from "typeorm";
import * as argon2 from "argon2";
import { NestFactory } from "@nestjs/core";
import { loadEnvironment } from "../.tmp/auth-build/config/environment.js";
import { databaseOptions } from "../.tmp/auth-build/database/options.js";
import { AppModule } from "../.tmp/auth-build/app.module.js";
import { configureHttp } from "../.tmp/auth-build/http/configure-http.js";
import { seedCatalog } from "../.tmp/auth-build/catalog/seed.js";
import { AuthUser, AuthActionToken, AuthSession } from "../.tmp/auth-build/auth/auth.entities.js";
import { AuthService, hashToken, passwordOptions } from "../.tmp/auth-build/auth/auth.service.js";
import { AuthRateLimit } from "../.tmp/auth-build/auth/rate-limit.js";
import { authConfiguration } from "../.tmp/auth-build/auth/auth.config.js";
import { DatabaseService } from "../.tmp/auth-build/database/database.service.js";
import {
  CustomerInquiry,
  InquiryLine,
  InquiryHistory,
  InquiryNotification,
} from "../.tmp/auth-build/inquiries/inquiry.entities.js";
import { checkStaffWorkflow } from "./check-staff-workflow.mjs";
import { runStaffUi } from "../../frontend/e2e/staff-workflow.mjs";
import { checkInquiries } from "./check-inquiries.mjs";
import { runInquiryUi } from "../../frontend/e2e/inquiries-flow.mjs";
import { runAuthUi } from "../../frontend/e2e/auth-flow.mjs";

let source,
  app,
  webProcess,
  stage = "target validation";
const front = "http://127.0.0.1:8444";
const scope = fs.existsSync(".tmp/verification-scope.json")
  ? JSON.parse(fs.readFileSync(".tmp/verification-scope.json", "utf8")).scope
  : "all";
if (!["all", "staff", "regression"].includes(scope)) throw new Error("Invalid verification scope");
process.env.APP_URL = front;
process.env.CORS_ORIGINS = front;
process.env.MAIL_MODE = "capture";
process.env.STAFF_INQUIRY_WRITES = "true";
process.env.MAIL_CAPTURE_NAME = `auth-test-${randomBytes(6).toString("hex")}`;
const mailDir = path.resolve(".tmp", process.env.MAIL_CAPTURE_NAME);
const password = "test-only long password 2026";
const profile = { name: "Test customer", kind: "individual", country: "Palestine" };
function captured(email, purpose) {
  const entries = fs
    .readdirSync(mailDir)
    .map((name) => ({
      file: path.join(mailDir, name),
      time: fs.statSync(path.join(mailDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);
  for (const { file } of entries) {
    const message = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
      JSON.stringify(message.to).includes(email) &&
      message.text.includes(purpose === "verify" ? "/verify-email" : "/reset-password")
    ) {
      const url = new URL(message.text.split("\n").find((line) => line.startsWith(front)));
      assert.equal(url.origin, front);
      return { url: url.href, token: new URLSearchParams(url.hash.slice(1)).get("token") };
    }
  }
  throw new Error("Expected captured message missing");
}
try {
  const env = loadEnvironment();
  assert.equal(env.nodeEnv, "test");
  assert.match(env.dbDatabase, /^voic_test_[a-f0-9]{16}$/);
  assert.equal(env.dbUsername, env.dbDatabase);
  assert.equal(process.env.CONFIRM_DISPOSABLE_DATABASE, "yes");
  fs.rmSync(".tmp/auth-verification.json", { force: true });
  source = new DataSource(databaseOptions(env));
  await source.initialize();
  // Reruns are confined to the fresh database owned by the interactive helper. Refuse
  // any unknown table instead of adopting/resetting an existing unrelated database.
  const names = (
    await source.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE()",
    )
  ).map((r) => r.name);
  const owned = [
    "inquiry_audit_events",
    "inquiry_internal_notes",
    "inquiry_messages",
    "inquiry_actions",
    "inquiry_notifications",
    "customer_inquiry_history",
    "customer_inquiry_lines",
    "customer_inquiries",
    "auth_action_tokens",
    "auth_sessions",
    "auth_users",
    "catalog_packages",
    "catalog_translations",
    "catalog_terms",
    "catalog_products",
    "voic_migrations",
  ];
  assert.ok(names.every((n) => owned.includes(n)));
  for (const name of owned) if (names.includes(name)) await source.query(`DROP TABLE \`${name}\``);
  stage = "migrations and catalog preservation";
  assert.equal((await source.runMigrations()).length, 4);
  assert.equal((await source.runMigrations()).length, 0);
  assert.deepEqual(await seedCatalog(source), { inserted: 11, skipped: 0 });
  await source.query(
    "INSERT INTO auth_users (id,email,passwordHash,role,kind,name,company,country,phone,emailVerifiedAt,securityVersion,createdAt) VALUES ('00000000-0000-4000-8000-000000000001','preserved@example.test','test-only','customer','individual','Preserved',NULL,'PS',NULL,NULL,0,UTC_TIMESTAMP())",
  );
  const preserveId = "00000000-0000-4000-8000-000000000002",
    now = new Date("2026-01-01T00:00:00Z");
  await source
    .getRepository(CustomerInquiry)
    .insert({
      id: preserveId,
      userId: "00000000-0000-4000-8000-000000000001",
      creationKey: "00000000-0000-4000-8000-000000000003",
      reference: "VOIC-PRESERVED",
      status: "submitted",
      revision: 2,
      lang: "en",
      fields: {
        kind: "individual",
        name: "Preserved",
        company: "",
        destination: "PS",
        phone: "",
        notes: "Legacy request",
      },
      contactEmail: "preserved@example.test",
      submissionKey: "00000000-0000-4000-8000-000000000004",
      submittedRevision: 1,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
    });
  await source
    .getRepository(InquiryLine)
    .insert({
      id: "00000000-0000-4000-8000-000000000005",
      inquiryId: preserveId,
      position: 0,
      productId: "ghazal",
      packageId: null,
      quantity: "5",
      unit: "kg",
      requirements: "Legacy packaging discussion",
      snapshot: { name: "Legacy snapshot", description: "Preserved at submission", package: null },
    });
  await source
    .getRepository(InquiryHistory)
    .insert({
      id: "00000000-0000-4000-8000-000000000006",
      inquiryId: preserveId,
      status: "submitted",
      occurredAt: now,
    });
  await source
    .getRepository(InquiryNotification)
    .insert({
      id: "00000000-0000-4000-8000-000000000007",
      inquiryId: preserveId,
      audience: "customer",
      recipient: "preserved@example.test",
      state: "captured",
      attempts: 1,
      nextAttemptAt: now,
    });
  const legacyBefore = JSON.stringify(
    await source.getRepository(CustomerInquiry).findOneBy({ id: preserveId }),
  );
  const snapshotBefore = JSON.stringify(
    await source.getRepository(InquiryLine).findOneBy({ inquiryId: preserveId }),
  );
  await source.undoLastMigration();
  assert.equal(Number((await source.query("SELECT COUNT(*) AS n FROM auth_users"))[0].n), 1);
  assert.equal(Number((await source.query("SELECT COUNT(*) AS n FROM catalog_products"))[0].n), 11);
  assert.equal((await source.runMigrations()).length, 1);
  assert.equal(
    JSON.stringify(await source.getRepository(CustomerInquiry).findOneBy({ id: preserveId })),
    legacyBefore,
  );
  assert.equal(
    JSON.stringify(await source.getRepository(InquiryLine).findOneBy({ inquiryId: preserveId })),
    snapshotBefore,
  );
  assert.equal(await source.getRepository(InquiryHistory).countBy({ inquiryId: preserveId }), 1);
  assert.equal(
    await source.getRepository(InquiryNotification).countBy({ inquiryId: preserveId }),
    1,
  );
  await source.getRepository(CustomerInquiry).delete({ id: preserveId });
  await source.query("DELETE FROM auth_users WHERE id='00000000-0000-4000-8000-000000000001'");
  assert.deepEqual(await seedCatalog(source), { inserted: 0, skipped: 11 });
  async function openApp(port = 0) {
    app = await NestFactory.create(AppModule, {
      bodyParser: false,
      logger: false,
      abortOnError: false,
    });
    configureHttp(app, env);
    await app.listen(port, "127.0.0.1");
    return `${await app.getUrl()}/api/v1`;
  }
  let base = await openApp();
  const client = () => ({
    cookie: "",
    csrf: "",
    async request(route, body, expected = body === undefined ? 200 : 201, extra = {}) {
      const response = await fetch(base + route, {
        method: body === undefined ? "GET" : route === "/account/profile" ? "PATCH" : "POST",
        headers: {
          Origin: front,
          ...(this.cookie ? { Cookie: this.cookie } : {}),
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json", "X-CSRF-Token": this.csrf }),
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      for (const c of response.headers.getSetCookie())
        if (c.startsWith("voic_session=")) this.cookie = c.split(";")[0];
      assert.equal(response.status, expected);
      const result = await response.json();
      if (result.csrfToken) this.csrf = result.csrfToken;
      return result;
    },
  });
  const a = client(),
    b = client(),
    c = client();
  const bootstrap = await a.request("/auth/session");
  assert.equal(bootstrap.user, null);
  assert.match(bootstrap.csrfToken, /^[a-f0-9]{64}$/);
  await b.request("/auth/session");
  await c.request("/auth/session");
  await a.request("/account/profile", undefined, 401);
  await a.request("/auth/login", { email: "none@example.test", password }, 403, {
    "X-CSRF-Token": "",
  });
  await a.request("/auth/login", { email: "none@example.test", password }, 403, { Origin: "" });
  await a.request("/auth/login", { email: "none@example.test", password }, 403, {
    Origin: "https://attacker.invalid",
  });
  stage = "registration and concurrent unique identity";
  const email = "concurrent@example.test";
  const dto = {
    ...profile,
    email,
    password,
    lang: "en",
    returnTo: "/inquiries/new?products=ghazal,nabateen",
  };
  await a.request("/auth/register", { ...dto, role: "administrator" }, 400);
  const registration = await Promise.all([
    a.request("/auth/register", dto),
    b.request("/auth/register", { ...dto, email: "CONCURRENT@example.test" }),
  ]);
  assert.deepEqual(registration, [{ accepted: true }, { accepted: true }]);
  const users = source.getRepository(AuthUser),
    tokens = source.getRepository(AuthActionToken),
    sessions = source.getRepository(AuthSession);
  assert.equal(await users.countBy({ email }), 1);
  let u = await users
    .createQueryBuilder("u")
    .addSelect("u.passwordHash")
    .where("u.email=:email", { email })
    .getOneOrFail();
  assert.equal(u.role, "customer");
  assert.match(u.passwordHash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert.ok(await argon2.verify(u.passwordHash, password));
  const verification = captured(email, "verify");
  assert.equal(
    new URL(verification.url).searchParams.get("returnTo"),
    "/inquiries/new?products=ghazal%2Cnabateen",
  );
  assert.ok(await tokens.findOneBy({ tokenHash: hashToken(verification.token) }));
  stage = "sessions rotation csrf and ownership";
  const anonymous = { ...a };
  let session = await a.request("/auth/login", { email, password });
  assert.equal(session.user.emailVerified, false);
  assert.equal(session.user.role, "customer");
  assert.ok(!/password|tokenHash|securityVersion|createdAt/.test(JSON.stringify(session.user)));
  const saved = await sessions.findOneByOrFail({ tokenHash: hashToken(a.cookie.split("=")[1]) });
  assert.notEqual(saved.tokenHash, a.cookie.split("=")[1]);
  await anonymous.request("/auth/logout", {}, 403);
  const old = { ...a };
  await a.request("/auth/login", { email, password });
  await old.request("/account/profile", undefined, 401);
  await a.request("/auth/logout", {}, 403, { "X-CSRF-Token": old.csrf });
  await a.request("/staff/access", undefined, 403);
  await a.request("/account/profile", { ...profile, id: "another-user" }, 400);
  await a.request("/account/profile", { ...profile, role: "sales" }, 400);
  await a.request("/account/profile/another-user", undefined, 404);
  await a.request("/account/profile?userId=another-user", undefined, 400);
  const updated = await a.request(
    "/account/profile",
    {
      name: "Edited customer",
      kind: "company",
      company: "Test company",
      country: "Palestine",
      phone: "123",
    },
    200,
  );
  assert.equal(updated.id, u.id);
  assert.equal(updated.company, "Test company");
  await c.request("/auth/register", { ...dto, email: "second@example.test" });
  await c.request("/auth/login", { email: "second@example.test", password });
  assert.notEqual((await c.request("/account/profile")).id, u.id);
  assert.equal((await a.request("/account/profile")).name, "Edited customer");
  stage = "verification expiry atomic use and resend";
  await tokens.update(
    { tokenHash: hashToken(verification.token) },
    { expiresAt: new Date(Date.now() - 60000) },
  );
  await a.request("/auth/verification/confirm", { token: verification.token }, 400);
  await a.request("/auth/verification/resend", { email, lang: "en", returnTo: dto.returnTo });
  const fresh = captured(email, "verify");
  const results = await Promise.all(
    [a, b].map(async (cl) => {
      const response = await fetch(base + "/auth/verification/confirm", {
        method: "POST",
        headers: {
          Origin: front,
          Cookie: cl.cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": cl.csrf,
        },
        body: JSON.stringify({ token: fresh.token }),
      });
      return response.status;
    }),
  );
  assert.deepEqual(results.sort(), [201, 400]);
  await a.request("/auth/verification/confirm", { token: fresh.token }, 400);
  assert.equal((await a.request("/auth/session")).user.emailVerified, true);
  app
    .get(AuthService)
    .requireVerified({ auth: { user: await users.findOneByOrFail({ id: u.id }) } });
  assert.throws(() =>
    app
      .get(AuthService)
      .requireVerified({ auth: { user: { role: "customer", emailVerifiedAt: null } } }),
  );
  stage = "password recovery and revocation";
  const forgot = await a.request("/auth/password/forgot", { email, lang: "en" });
  assert.deepEqual(
    forgot,
    await a.request("/auth/password/forgot", { email: "absent@example.test", lang: "en" }),
  );
  const expiredReset = captured(email, "reset");
  await tokens.update(
    { tokenHash: hashToken(expiredReset.token) },
    { expiresAt: new Date(Date.now() - 60000) },
  );
  await b.request(
    "/auth/password/reset",
    { token: expiredReset.token, password: "a new long test password" },
    400,
  );
  await a.request("/auth/password/forgot", { email, lang: "en" });
  const reset = captured(email, "reset"),
    nextPassword = "new test password 2026";
  await b.request("/auth/password/reset", { token: reset.token, password: nextPassword });
  await b.request("/auth/password/reset", { token: reset.token, password: nextPassword }, 400);
  await a.request("/account/profile", undefined, 401);
  await a.request("/auth/session");
  await a.request("/auth/login", { email, password }, 401);
  await a.request("/auth/login", { email, password: nextPassword });
  await b.request("/auth/login", { email, password: nextPassword });
  await a.request("/account/password", { currentPassword: "wrong", password }, 400);
  await a.request("/account/profile");
  await a.request("/account/password", { currentPassword: nextPassword, password });
  await b.request("/account/profile", undefined, 401);
  await a.request("/account/profile", undefined, 401);
  await a.request("/auth/session");
  await a.request("/auth/login", { email, password });
  const beforeLogout = { ...a };
  await a.request("/auth/logout", {});
  await beforeLogout.request("/account/profile", undefined, 401);
  await a.request("/auth/session");
  await a.request("/auth/login", { email, password });
  await sessions.update(
    { tokenHash: hashToken(a.cookie.split("=")[1]) },
    { expiresAt: new Date(Date.now() - 60000) },
  );
  await a.request("/account/profile", undefined, 401);
  stage = "roles cookies and rate limits";
  await users.update({ id: u.id }, { role: "sales" });
  await a.request("/auth/session");
  await a.request("/auth/login", { email, password });
  assert.equal((await a.request("/staff/access")).role, "sales");
  await a.request("/account/profile", undefined, 403);
  await users.update({ id: u.id }, { role: "customer" });
  const conf = authConfiguration(env);
  let cookieOptions;
  const production = new AuthService(
    source,
    new DatabaseService(source, env),
    { ...conf, production: true },
    null,
    new AuthRateLimit(),
  );
  await production.current(
    { socket: { remoteAddress: "test-production" } },
    {
      cookie(name, value, options) {
        assert.equal(name, "__Host-voic_session");
        cookieOptions = options;
      },
    },
  );
  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.secure, true);
  assert.equal(cookieOptions.sameSite, "lax");
  assert.equal(cookieOptions.path, "/");
  assert.equal(cookieOptions.domain, undefined);
  const rate = client();
  await rate.request("/auth/session");
  for (let i = 0; i < 10; i++)
    await rate.request("/auth/login", { email: "limited@example.test", password }, 401);
  await rate.request("/auth/login", { email: "limited@example.test", password }, 429);
  for (let i = 0; i < 3; i++)
    await rate.request("/auth/verification/resend", { email: "limited-resend@example.test" });
  await rate.request("/auth/verification/resend", { email: "limited-resend@example.test" }, 429);
  for (let i = 0; i < 3; i++)
    await rate.request("/auth/password/forgot", { email: "limited-forgot@example.test" });
  await rate.request("/auth/password/forgot", { email: "limited-forgot@example.test" }, 429);
  stage = "inquiry ownership concurrency snapshots and notifications";
  await app.close();
  app = undefined;
  base = await openApp();
  const inquiryResult = await checkInquiries({ app, source, base, front, password, captured });
  stage = "staff workflow security and persistence";
  const staffResult = await checkStaffWorkflow({ app, source, base, front, password, captured });
  stage = "real browser flows and private cache isolation";
  // New app resets only its in-memory limits. The disposable database remains intact.
  await app.close();
  app = undefined;
  base = await openApp();
  assert.equal((await (await fetch(base + "/products?pageSize=50")).json()).total, 11);
  const frontendDir = path.resolve("../frontend");
  const checkPort = await import("node:net");
  await new Promise((resolve, reject) => {
    const probe = checkPort.createServer();
    probe.once("error", reject);
    probe.listen(8444, "127.0.0.1", () => probe.close(resolve));
  });
  const output = fs.openSync(".tmp/auth-web.log", "w");
  webProcess = spawn("cmd.exe", ["/c", "pnpm.cmd dev --host 127.0.0.1 --port 8444"], {
    cwd: frontendDir,
    env: { ...process.env, VITE_API_BASE_URL: base.replace(/\/api\/v1$/, ""), PORT: "8444" },
    stdio: ["ignore", output, output],
    windowsHide: true,
  });
  fs.closeSync(output);
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(front)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  const browserResult =
    scope === "staff"
      ? undefined
      : await runAuthUi({
          front,
          base,
          mailDir,
          captured,
          password,
          source,
          AuthSession,
          AuthUser,
        });
  await app.close();
  app = undefined;
  base = await openApp(Number(new URL(base).port));
  stage = "real inquiry browser flows";
  const inquiryBrowserResult =
    scope === "staff"
      ? undefined
      : await runInquiryUi({
          front,
          base,
          captured,
          password,
          source,
          AuthUser,
        });
  await app.close();
  app = undefined;
  base = await openApp(Number(new URL(base).port));
  stage = "staff customer browser workflow";
  const staffBrowserResult =
    scope === "regression"
      ? undefined
      : await runStaffUi({ front, base, password, source, AuthUser });
  stage = "public catalog browser regression";
  await new Promise((resolve, reject) => {
    const runner = spawn(
      process.execPath,
      [
        path.join(frontendDir, "node_modules/@playwright/test/cli.js"),
        "test",
        "e2e/catalog.spec.ts",
      ],
      {
        cwd: frontendDir,
        env: {
          ...process.env,
          VOIC_E2E_EXTERNAL_SERVERS: "yes",
          VOIC_E2E_FRONTEND_URL: front,
          VOIC_E2E_API_URL: base.replace(/\/api\/v1$/, ""),
        },
        stdio: "ignore",
        windowsHide: true,
      },
    );
    runner.once("error", reject);
    runner.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("Catalog regression failed")),
    );
  });
  fs.writeFileSync(
    ".tmp/auth-verification.json",
    JSON.stringify({
      passed: true,
      checkedAt: new Date().toISOString(),
      scope,
      browserResult,
      inquiryResult,
      inquiryBrowserResult,
      staffResult,
      staffBrowserResult,
      catalogBrowserTests: 9,
    }),
  );
  fs.copyFileSync(".tmp/auth-verification.json", `.tmp/${scope}-verification.json`);
  fs.rmSync(".tmp/auth-failure.json", { force: true });
  fs.rmSync(".tmp/auth-ui-failure.json", { force: true });
  fs.rmSync(".tmp/inquiry-ui-failure.json", { force: true });
  fs.rmSync(".tmp/staff-ui-failure.json", { force: true });
  process.stdout.write(
    "PASS: disposable auth migrations, unique registration, Argon2id, sessions/CSRF/roles/ownership, token expiry/single use, capture email, recovery/password/session revocation, rate limits and real browser flows.\n",
  );
} catch (error) {
  fs.writeFileSync(
    ".tmp/auth-failure.json",
    JSON.stringify({
      stage,
      kind: error?.name,
      ...(typeof error?.actual === "number" ? { actual: error.actual } : {}),
      ...(typeof error?.expected === "number" ? { expected: error.expected } : {}),
    }),
  );
  process.stderr.write(
    `Disposable auth verification failed during: ${stage}. Secrets and SQL are not logged.\n`,
  );
  process.exitCode = 1;
} finally {
  if (webProcess?.pid && webProcess.exitCode === null) {
    try {
      execFileSync("taskkill.exe", ["/PID", String(webProcess.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {}
  }
  if (app) await app.close();
  if (source?.isInitialized) await source.destroy();
}
