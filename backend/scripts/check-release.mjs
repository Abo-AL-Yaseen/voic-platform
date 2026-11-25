import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { DataSource } from "typeorm";
import { NestFactory } from "@nestjs/core";
import * as argon2 from "argon2";
import { AppModule } from "../.tmp/auth-build/app.module.js";
import { validateEnvironment } from "../.tmp/auth-build/config/environment.js";
import { databaseOptions } from "../.tmp/auth-build/database/options.js";
import { configureHttp } from "../.tmp/auth-build/http/configure-http.js";
import { AuthRateLimit } from "../.tmp/auth-build/auth/rate-limit.js";
import { AuthUser } from "../.tmp/auth-build/auth/auth.entities.js";
import { passwordOptions } from "../.tmp/auth-build/auth/auth.service.js";
import { InquiryNotifications } from "../.tmp/auth-build/inquiries/notifications.service.js";
import { DATABASE_SOURCE } from "../.tmp/auth-build/database/database.service.js";
import {
  CustomerInquiry,
  InquiryNotification,
} from "../.tmp/auth-build/inquiries/inquiry.entities.js";
import { AUTH_CONFIG } from "../.tmp/auth-build/auth/auth.config.js";
import { cleanupExpiredSecurity } from "../.tmp/auth-build/operations/cleanup.js";
import { StaffSecurity1795608000000 } from "../.tmp/auth-build/database/migrations/1795608000000-StaffSecurity.js";
import { OperationalLimits1795611600000 } from "../.tmp/auth-build/database/migrations/1795611600000-OperationalLimits.js";
import { decryptSecret, encryptionKey } from "../.tmp/auth-build/security/crypto.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
async function bounded(tasks, concurrency) {
  let next = 0;
  const failures = [];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < tasks.length) {
        try {
          await tasks[next++]();
        } catch (error) {
          failures.push(error);
        }
      }
    }),
  );
  if (failures.length) throw failures[0];
}
function metrics(samples, elapsed) {
  const times = samples.map((x) => x.ms).sort((a, b) => a - b),
    n = times.length;
  return {
    requests: n,
    durationSeconds: +(elapsed / 1000).toFixed(3),
    requestsPerSecond: +((n * 1000) / elapsed).toFixed(2),
    p50Ms: +times[Math.ceil(n * 0.5) - 1].toFixed(2),
    p95Ms: +times[Math.ceil(n * 0.95) - 1].toFixed(2),
    p99Ms: +times[Math.ceil(n * 0.99) - 1].toFixed(2),
    unexpectedErrors: samples.filter((x) => !x.ok).length,
  };
}
async function fingerprints(source) {
  const tables = await source.query(
    "SELECT TABLE_NAME name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME",
  );
  const result = {};
  for (const { name } of tables) {
    assert.match(name, /^[a-z_]+$/);
    const rows = await source.query(`SELECT * FROM \`${name}\``);
    result[name] = {
      rows: rows.length,
      hash: digest(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort())),
    };
  }
  return result;
}
function mysqlTool(name) {
  const dir =
    process.env.MYSQL_BIN ||
    (process.platform === "win32" ? "C:/Program Files/MySQL/MySQL Server 8.0/bin" : "");
  return dir ? path.join(dir, name + (process.platform === "win32" ? ".exe" : "")) : name;
}
async function restoreRehearsal(source, mediaRoot, password, customer) {
  const database = process.env.RESTORE_DB_DATABASE,
    user = process.env.RESTORE_DB_USERNAME;
  assert.equal(process.env.RESTORE_DB_OWNED, "yes");
  assert.match(database || "", /^voic_test_[a-f0-9]{16}$/);
  assert.equal(database, user);
  assert.notEqual(database, source.options.database);
  const restored = new DataSource({
    ...source.options,
    database,
    username: user,
    password: process.env.RESTORE_DB_PASSWORD,
  });
  const root = fs.mkdtempSync(path.resolve(".tmp/release-rehearsal-"));
  assert.equal(path.dirname(root), path.resolve(".tmp"));
  try {
    await restored.initialize();
    assert.equal((await restored.query("SHOW TABLES")).length, 0);
    const before = await fingerprints(source);
    for (const table of [
      "auth_users",
      "content_documents",
      "content_revisions",
      "customer_inquiries",
      "customer_inquiry_history",
      "staff_audit_events",
      "content_media_usage",
    ])
      assert.ok(before[table].rows > 0);
    const args = [
      "--default-character-set=utf8mb4",
      "--host=127.0.0.1",
      `--port=${source.options.port}`,
      `--user=${source.options.username}`,
    ];
    const dump = execFileSync(
      mysqlTool("mysqldump"),
      [
        ...args,
        "--single-transaction",
        "--quick",
        "--no-tablespaces",
        "--set-gtid-purged=OFF",
        "--skip-add-drop-table",
        "--skip-add-locks",
        "--skip-comments",
        "--hex-blob",
        "--skip-lock-tables",
        source.options.database,
      ],
      {
        env: { ...process.env, MYSQL_PWD: source.options.password },
        windowsHide: true,
        timeout: 60000,
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    fs.writeFileSync(path.join(root, "database.sql"), dump, { mode: 0o600 });
    execFileSync(
      mysqlTool("mysql"),
      [
        "--host=127.0.0.1",
        "--default-character-set=utf8mb4",
        `--port=${source.options.port}`,
        `--user=${user}`,
        "--binary-mode",
        database,
      ],
      {
        input: dump,
        env: { ...process.env, MYSQL_PWD: process.env.RESTORE_DB_PASSWORD },
        windowsHide: true,
        timeout: 60000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    assert.deepEqual(await fingerprints(restored), before);
    const account = await restored
      .getRepository(AuthUser)
      .createQueryBuilder("u")
      .addSelect("u.passwordHash")
      .where("u.id=:id", { id: customer })
      .getOneOrFail();
    assert.equal(await argon2.verify(account.passwordHash, password), true);
    const [factor] = await restored.query(
      "SELECT userId,secret FROM staff_mfa_factors WHERE confirmedAt IS NOT NULL LIMIT 1",
    );
    assert.ok(factor);
    assert.match(decryptSecret(factor.secret, factor.userId, encryptionKey()), /^[A-Z2-7]+$/);
    for (const sql of [
      "SELECT COUNT(*) n FROM content_documents d LEFT JOIN content_revisions r ON r.id=d.publishedId WHERE d.publishedId IS NOT NULL AND r.id IS NULL",
      "SELECT COUNT(*) n FROM customer_inquiry_lines l LEFT JOIN customer_inquiries i ON i.id=l.inquiryId WHERE i.id IS NULL",
      "SELECT COUNT(*) n FROM staff_audit_events a LEFT JOIN auth_users u ON u.id=a.actorId WHERE a.actorId IS NOT NULL AND u.id IS NULL",
      "SELECT COUNT(*) n FROM content_media_usage x LEFT JOIN content_media m ON m.id=x.mediaId WHERE m.id IS NULL",
    ])
      assert.equal(Number((await restored.query(sql))[0].n), 0);
    const copy = path.join(root, "restored-media");
    fs.mkdirSync(copy);
    let files = 0;
    for (const entry of fs.readdirSync(mediaRoot, { withFileTypes: true })) {
      assert.ok(entry.isFile());
      const original = path.join(mediaRoot, entry.name);
      assert.equal(fs.realpathSync(original), original);
      fs.copyFileSync(original, path.join(copy, entry.name));
      assert.equal(
        digest(fs.readFileSync(original)),
        digest(fs.readFileSync(path.join(copy, entry.name))),
      );
      files++;
    }
    assert.ok(files > 0);
    const media = await restored.query("SELECT filename FROM content_media WHERE source='upload'");
    for (const row of media) assert.equal(fs.existsSync(path.join(copy, row.filename)), true);
    return {
      passed: true,
      tables: Object.keys(before).length,
      migrations: before.voic_migrations.rows,
      mediaFiles: files,
      dumpBytes: dump.length,
      accountsAndRelations: true,
      factorDecryptsWithPairedKey: true,
      version: execFileSync(mysqlTool("mysqldump"), ["--version"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim(),
    };
  } finally {
    if (restored.isInitialized) await restored.destroy();
    assert.equal(fs.realpathSync(root), root);
    assert.equal(path.dirname(root), path.resolve(".tmp"));
    fs.rmSync(root, { recursive: true });
  }
}

export async function checkRelease({
  app,
  source,
  base,
  front,
  password,
  mediaRoot,
  restoreRequired = true,
}) {
  assert.equal(process.env.CONFIRM_DISPOSABLE_DATABASE, "yes");
  assert.match(source.options.database, /^voic_test_[a-f0-9]{16}$/);
  await app.get(InquiryNotifications).beforeApplicationShutdown();
  let stage = "bounded public and authenticated load",
    production;
  const databaseErrors = [],
    httpFailures = [];
  const logger = app.get(DATABASE_SOURCE).logger;
  const originalQueryError = logger.logQueryError;
  logger.logQueryError = (error) => {
    const code = typeof error === "object" ? error?.code : undefined;
    if (typeof code === "string" && /^[A-Z0-9_]+$/.test(code)) databaseErrors.push(code);
  };
  try {
    const clients = [];
    for (let index = 0; index < 4; index++) {
      const id = randomUUID(),
        email = `release-${id}@example.test`;
      await source.getRepository(AuthUser).insert({
        id,
        email,
        passwordHash: await argon2.hash(password, passwordOptions),
        role: "customer",
        kind: "individual",
        name: "Release fixture",
        company: null,
        country: "PS",
        phone: null,
        emailVerifiedAt: new Date(),
        securityVersion: 0,
        createdAt: new Date(),
      });
      const bootstrap = await fetch(base + "/auth/session"),
        anonymous = await bootstrap.json();
      let cookie = bootstrap.headers.getSetCookie()[0].split(";")[0];
      const login = await fetch(base + "/auth/login", {
        method: "POST",
        headers: {
          Origin: front,
          Cookie: cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": anonymous.csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(login.status, 201);
      const session = await login.json();
      cookie = login.headers.getSetCookie()[0].split(";")[0];
      clients.push({
        id,
        call: async (route, body, method = body ? "POST" : "GET") =>
          fetch(base + route, {
            method,
            headers: {
              Origin: front,
              Cookie: cookie,
              "Content-Type": "application/json",
              "X-CSRF-Token": session.csrfToken,
            },
            body: body ? JSON.stringify(body) : undefined,
          }),
      });
    }
    stage = "concurrent empty-draft line replacement";
    const raceIds = new Set();
    for (let index = 0; index < clients.length; index++) {
      const id = `ffffffff-ffff-4fff-8fff-${String(index).padStart(12, "0")}`;
      raceIds.add(id);
      await source.getRepository(CustomerInquiry).insert({
        id,
        userId: clients[index].id,
        creationKey: randomUUID(),
        reference: `VOIC-RACE-${randomUUID().replaceAll("-", "").slice(0, 20)}`,
        status: "draft",
        revision: 1,
        lang: "en",
        fields: {
          kind: "individual",
          name: "Race fixture",
          company: "",
          destination: "PS",
          phone: "",
          notes: "",
        },
        contactEmail: "race@qa.invalid",
        submissionKey: null,
        submittedRevision: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedAt: null,
      });
    }
    // Real HTTP/SQL: make four empty-range deletes overlap deterministically. Only owned
    // test rows are paused, for at most five seconds; no query or parameter is recorded.
    const apiSource = app.get(DATABASE_SOURCE),
      originalRunner = apiSource.createQueryRunner;
    let arrived = 0,
      release;
    const barrier = new Promise((resolve) => {
      release = resolve;
    });
    const timer = setTimeout(() => release(), 5000);
    apiSource.createQueryRunner = function (...args) {
      const runner = originalRunner.apply(this, args),
        query = runner.query.bind(runner);
      runner.query = async (...call) => {
        const result = await query(...call);
        if (
          /^DELETE FROM `customer_inquiry_lines` /.test(call[0]) &&
          call[1]?.some((v) => raceIds.has(v))
        ) {
          arrived++;
          if (arrived === 4) release();
          await barrier;
        }
        return result;
      };
      return runner;
    };
    try {
      const responses = await Promise.all(
        clients.map((client, index) =>
          client.call(
            `/account/inquiries/${[...raceIds][index]}`,
            {
              revision: 1,
              lang: "en",
              fields: {
                kind: "individual",
                name: "Race fixture",
                company: "",
                destination: "PS",
                phone: "",
                notes: "",
              },
              items: [
                {
                  productId: "ghazal",
                  packageId: null,
                  quantity: 10,
                  unit: "kg",
                  requirements: "Discuss packaging",
                },
              ],
            },
            "PATCH",
          ),
        ),
      );
      for (const response of responses) {
        await response.arrayBuffer();
        assert.equal(response.status, 200);
      }
      assert.equal(arrived, 4);
    } finally {
      release();
      clearTimeout(timer);
      apiSource.createQueryRunner = originalRunner;
    }
    stage = "bounded public and authenticated load";
    const samples = [],
      tasks = [],
      urls = [
        "/products?lang=ar&pageSize=6",
        "/products/ghazal?lang=en",
        "/products/filters?lang=ar",
        "/recipes?lang=en",
        "/content/home?lang=ar",
      ];
    let inFlight = 0,
      peakInFlight = 0;
    const measured = async (request) => {
      const started = performance.now();
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      try {
        const response = await request();
        const body = await response.text();
        return { response, body, ms: performance.now() - started };
      } finally {
        inFlight--;
      }
    };
    for (let i = 0; i < 180; i++)
      tasks.push(async () => {
        const { response, ms } = await measured(() =>
          fetch(base + urls[i % urls.length], { signal: AbortSignal.timeout(10000) }),
        );
        samples.push({ kind: "public", ms, ok: response.status === 200 });
      });
    for (const cl of clients)
      for (let n = 0; n < 4; n++)
        tasks.push(async () => {
          const measure = async (route, body, method, expected = 201) => {
            const {
              response: r,
              body: raw,
              ms,
            } = await measured(() => cl.call(route, body, method));
            samples.push({
              kind: "authenticated",
              ms,
              ok: r.status === expected,
            });
            if (r.status !== expected)
              httpFailures.push({
                operation: method || "POST",
                route: route.replace(/[a-f0-9-]{36}/g, ":id"),
                status: r.status,
                expected,
              });
            assert.equal(r.status, expected);
            return JSON.parse(raw);
          };
          let d = await measure("/account/inquiries", { creationKey: randomUUID(), lang: "en" });
          d = await measure(
            `/account/inquiries/${d.id}`,
            {
              revision: d.revision,
              lang: "en",
              fields: { ...d.fields, destination: "Synthetic QA destination" },
              items: [
                {
                  productId: "ghazal",
                  packageId: null,
                  quantity: 10,
                  unit: "kg",
                  requirements: "Discuss packaging",
                },
              ],
            },
            "PATCH",
            200,
          );
          const body = { key: randomUUID(), revision: d.revision };
          const pair = await Promise.all([
            measure(`/account/inquiries/${d.id}/submit`, body),
            measure(`/account/inquiries/${d.id}/submit`, body),
          ]);
          assert.deepEqual(pair[0], pair[1]);
        });
    const start = performance.now();
    const rounds = restoreRequired ? 1 : 3;
    for (let round = 0; round < rounds; round++) await bounded(tasks, 6);
    const elapsed = performance.now() - start;
    const load = {
      ...metrics(samples, elapsed),
      taskWorkers: 6,
      rounds,
      peakInFlight,
      public: metrics(
        samples.filter((x) => x.kind === "public"),
        elapsed,
      ),
      authenticated: metrics(
        samples.filter((x) => x.kind === "authenticated"),
        elapsed,
      ),
      duplicateSubmissions: 16 * rounds,
      datasetProducts: 11,
      customers: 4,
      cpu: os.cpus()[0]?.model,
      logicalCpus: os.cpus().length,
      memoryGiB: +(os.totalmem() / 2 ** 30).toFixed(1),
      node: process.version,
      platform: process.platform,
    };
    assert.equal(load.unexpectedErrors, 0);
    stage = "shared production limiter";
    const env = validateEnvironment({
      ...process.env,
      NODE_ENV: "production",
      MEDIA_ROOT: mediaRoot,
      CORS_ORIGINS: "https://qa.invalid",
    });
    const a = new AuthRateLimit(source, env),
      b = new AuthRateLimit(source, env),
      identity = randomUUID();
    const attempts = [];
    await bounded(
      Array.from({ length: 24 }, (_, i) => async () => {
        try {
          await (i % 2 ? a : b).take("release-concurrent", identity, 10);
          attempts.push(200);
        } catch (e) {
          attempts.push(e.getStatus());
        }
      }),
      6,
    );
    assert.equal(attempts.filter((x) => x === 200).length, 10);
    assert.equal(attempts.filter((x) => x === 429).length, 14);
    await source.query(
      "UPDATE operational_rate_limits SET expiresAt=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND)",
    );
    await a.take("release-concurrent", identity, 10);
    await assert.rejects(
      new AuthRateLimit({ isInitialized: false }, env).take("test", "id", 1),
      (e) => e.getStatus() === 503,
    );
    stage = "production configuration HTTP and publication gates";
    const saved = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.MEDIA_ROOT = mediaRoot;
      process.env.APP_URL = "https://qa.invalid";
      process.env.CORS_ORIGINS = "https://qa.invalid";
      process.env.MAIL_MODE = "smtp";
      process.env.MAIL_FROM = "QA <no-reply@qa.invalid>";
      process.env.SMTP_HOST = "127.0.0.1";
      process.env.SMTP_PORT = "9";
      process.env.INQUIRY_COMPANY_EMAIL = "qa@qa.invalid";
      // Empty overrides prevent Node's .env loader from reintroducing local-only settings.
      process.env.STAFF_INQUIRY_WRITES = "";
      process.env.SMTP_USER = "";
      process.env.SMTP_PASSWORD = "";
      stage = "production application creation";
      production = await NestFactory.create(AppModule, {
        logger: false,
        bodyParser: false,
        abortOnError: false,
      });
      stage = "production HTTP configuration";
      configureHttp(production, env);
      stage = "production application initialization";
      await production.init();
      await production.get(InquiryNotifications).beforeApplicationShutdown();
      await production.listen(0, "127.0.0.1");
      stage = "production HTTP assertions";
      const url = (await production.getUrl()) + "/api/v1";
      assert.equal((await fetch(url + "/health/live")).status, 200);
      assert.equal((await fetch(url + "/health/ready")).status, 200);
      const res = await fetch(url + "/auth/session"),
        session = await res.json();
      assert.equal(res.status, 200);
      const cookie = res.headers.getSetCookie()[0];
      assert.match(cookie, /^__Host-voic_session=/);
      for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"])
        assert.ok(cookie.includes(flag));
      assert.ok(!cookie.includes("Domain="));
      assert.equal(res.headers.get("cache-control"), "no-store");
      assert.ok(res.headers.get("x-request-id"));
      assert.equal((await fetch(url + "/products?unknown=1")).status, 400);
      assert.equal((await fetch(url + "/staff/employees")).status, 401);
      assert.equal(
        (await fetch(url + "/products", { headers: { Origin: "https://attacker.invalid" } }))
          .status,
        403,
      );
      assert.equal(
        (
          await fetch(url + "/auth/login", {
            method: "POST",
            headers: {
              Origin: "https://qa.invalid",
              Cookie: cookie.split(";")[0],
              "Content-Type": "application/json",
            },
            body: "{}",
          })
        ).status,
        403,
      );
      assert.equal((await fetch(url + "/content/privacy")).status, 404);
      const products = await (await fetch(url + "/products?pageSize=50")).json();
      const eligible = Number(
        (
          await source.query(
            "SELECT COUNT(*) n FROM catalog_products WHERE published=1 AND approvalScope='approved'",
          )
        )[0].n,
      );
      assert.equal(products.total, eligible);
      assert.ok(eligible < 11);
      assert.ok(session.csrfToken);
    } finally {
      if (production) await production.close();
      production = undefined;
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    }
    stage = "notification lease crash recovery and concurrent claims";
    const [{ id: inquiryId }] = await source.query(
      "SELECT id FROM customer_inquiries WHERE status='submitted' LIMIT 1",
    );
    const jobId = randomUUID(),
      delivered = [];
    await source.getRepository(InquiryNotification).insert({
      id: jobId,
      inquiryId,
      audience: "customer",
      eventId: randomUUID(),
      kind: "staff_update",
      recipient: "qa@qa.invalid",
      state: "sending",
      attempts: 1,
      nextAttemptAt: new Date(Date.now() + 600000),
    });
    const stub = {
      deliver: async (message) => {
        delivered.push(message.messageId);
        await new Promise((r) => setTimeout(r, 20));
        return "captured";
      },
    };
    const worker1 = new InquiryNotifications(source, stub, app.get(AUTH_CONFIG)),
      worker2 = new InquiryNotifications(source, stub, app.get(AUTH_CONFIG));
    await Promise.all([worker1.tick(), worker2.tick()]);
    assert.ok(!delivered.includes(`<inquiry-${jobId}@voic.local>`));
    await source
      .getRepository(InquiryNotification)
      .update({ id: jobId }, { nextAttemptAt: new Date(0) });
    await Promise.all([worker1.tick(), worker2.tick()]);
    assert.equal(delivered.filter((x) => x === `<inquiry-${jobId}@voic.local>`).length, 1);
    assert.equal(
      (await source.getRepository(InquiryNotification).findOneByOrFail({ id: jobId })).attempts,
      2,
    );
    const failedId = randomUUID();
    await source.getRepository(InquiryNotification).insert({
      id: failedId,
      inquiryId,
      audience: "customer",
      eventId: randomUUID(),
      kind: "staff_update",
      recipient: "qa@qa.invalid",
      state: "pending",
      attempts: 4,
      nextAttemptAt: new Date(0),
    });
    const failing = new InquiryNotifications(
      source,
      {
        deliver: async () => {
          throw new Error("synthetic delivery failure");
        },
      },
      app.get(AUTH_CONFIG),
    );
    await failing.tick();
    assert.equal(
      (await source.getRepository(InquiryNotification).findOneByOrFail({ id: failedId })).state,
      "failed",
    );
    await Promise.all([
      worker1.beforeApplicationShutdown(),
      worker2.beforeApplicationShutdown(),
      failing.beforeApplicationShutdown(),
    ]);
    stage = "bounded expiry cleanup and destructive rollback guards";
    const expired = digest(randomUUID()),
      live = digest(randomUUID());
    for (const [token, seconds] of [
      [expired, -60],
      [live, 600],
    ])
      await source.query(
        "INSERT INTO auth_sessions(tokenHash,userId,securityVersion,expiresAt) VALUES(?,NULL,0,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND))",
        [token, seconds],
      );
    assert.ok((await cleanupExpiredSecurity(source)).counts.auth_sessions.expired > 0);
    assert.equal(
      Number(
        (await source.query("SELECT COUNT(*) n FROM auth_sessions WHERE tokenHash=?", [expired]))[0]
          .n,
      ),
      1,
    );
    await cleanupExpiredSecurity(source, true);
    assert.equal(
      Number(
        (await source.query("SELECT COUNT(*) n FROM auth_sessions WHERE tokenHash=?", [expired]))[0]
          .n,
      ),
      0,
    );
    assert.equal(
      Number(
        (await source.query("SELECT COUNT(*) n FROM auth_sessions WHERE tokenHash=?", [live]))[0].n,
      ),
      1,
    );
    const runner = { query: (sql, params) => source.query(sql, params) };
    await assert.rejects(new StaffSecurity1795608000000().down(runner));
    await assert.rejects(new OperationalLimits1795611600000().down(runner));
    stage = "query plans";
    const plans = [];
    const [liveSession] = await source.query(
      "SELECT tokenHash FROM auth_sessions WHERE userId=? LIMIT 1",
      [clients[0].id],
    );
    assert.ok(liveSession);
    for (const [sql, params] of [
      ["SELECT tokenHash FROM auth_sessions WHERE tokenHash=?", [liveSession.tokenHash]],
      [
        "SELECT id FROM customer_inquiries WHERE userId=? ORDER BY createdAt DESC,id DESC LIMIT 20",
        [clients[0].id],
      ],
      [
        "SELECT id FROM inquiry_notifications WHERE state IN ('pending','sending') AND nextAttemptAt<=UTC_TIMESTAMP() ORDER BY nextAttemptAt,id LIMIT 1",
        [],
      ],
    ])
      plans.push(
        (await source.query("EXPLAIN " + sql, params)).map((r) => ({
          table: r.table,
          type: r.type,
          key: r.key,
          rows: r.rows,
          extra: r.Extra,
        })),
      );
    stage = "backup and actual restore";
    const restore = restoreRequired
      ? await restoreRehearsal(source, mediaRoot, password, clients[0].id)
      : { passed: false, skippedForDiagnosticProbe: true };
    const result = {
      passed: true,
      checkedAt: new Date().toISOString(),
      load,
      concurrentEmptyDraftSaves: 4,
      sharedLimiter: {
        passed: true,
        replicas: 2,
        concurrentAttempts: 24,
        accepted: 10,
        rejected: 14,
        failClosed: true,
      },
      production: {
        passed: true,
        readiness: 200,
        secureCookies: true,
        sameOrigin: true,
        unapprovedContentHidden: true,
        externalMailSent: false,
      },
      plans,
      notifications: {
        passed: true,
        leaseExpiryRecovery: true,
        concurrentClaim: true,
        boundedDeadLetter: true,
      },
      cleanup: {
        passed: true,
        dryRunPreserves: true,
        expiredOnly: true,
        liveSessionPreserved: true,
      },
      restore,
    };
    fs.writeFileSync(".tmp/release-verification.json", JSON.stringify(result));
    if (restoreRequired) fs.rmSync(".tmp/release-failure.json", { force: true });
    return result;
  } catch (error) {
    fs.writeFileSync(
      ".tmp/release-failure.json",
      JSON.stringify({
        stage,
        kind: error.name,
        errorClass: error.constructor?.name,
        frames: error.stack
          ?.split("\n")
          .filter((line) => /^\s+at /.test(line))
          .slice(0, 5),
        databaseErrors: [...new Set(databaseErrors)],
        httpFailures,
        actual: typeof error.actual === "number" ? error.actual : undefined,
        expected: typeof error.expected === "number" ? error.expected : undefined,
      }),
    );
    throw new Error(`Release verification failed during ${stage}`);
  } finally {
    logger.logQueryError = originalQueryError;
    if (production) await production.close();
  }
}
