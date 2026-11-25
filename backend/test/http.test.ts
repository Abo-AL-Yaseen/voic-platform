import "reflect-metadata";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { Body, Controller, Get, Post } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { IsString, MinLength } from "class-validator";
import { AppModule } from "../src/app.module.js";
import { ENVIRONMENT } from "../src/config/configuration.module.js";
import { validateEnvironment } from "../src/config/environment.js";
import { DATABASE_SOURCE } from "../src/database/database.service.js";
import { configureHttp } from "../src/http/configure-http.js";
import { randomBytes } from "node:crypto";
import { MFA_KEY } from "../src/security/mfa.service.js";

class ProbeDto {
  @IsString() @MinLength(2) name!: string;
}

// These routes exist ONLY in the test module, never in AppModule or production builds.
@Controller("_test")
class TestController {
  @Post("dto") dto(@Body() body: ProbeDto) {
    return { name: body.name };
  }
  @Get("failure") failure() {
    throw new Error("SELECT password FROM users; cookie=secret; DB_PASSWORD=secret");
  }
}

let app: NestExpressApplication;
let base: string;
let available = false;
let destroyed = false;
const env = validateEnvironment({
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: "3000",
  CORS_ORIGINS: "http://localhost:8443",
  DB_HOST: "127.0.0.1",
  DB_PORT: "3307",
  DB_DATABASE: "voic_test",
  DB_USERNAME: "voic_test",
  DB_PASSWORD: "test-only-secret-not-a-real-credential",
  DB_TIMEOUT_MS: "500",
});

before(async () => {
  const source = {
    isInitialized: true,
    async query() {
      if (!available) throw new Error("database secret");
      return [{ value: 1 }];
    },
    async destroy() {
      destroyed = true;
      this.isInitialized = false;
    },
  };
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [TestController],
  })
    .overrideProvider(ENVIRONMENT)
    .useValue(env)
    .overrideProvider(DATABASE_SOURCE)
    .useValue(source)
    .overrideProvider(MFA_KEY)
    .useValue(randomBytes(32))
    .compile();
  app = module.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
  configureHttp(app, env);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
  assert.equal(destroyed, true);
});

test("liveness is independent of the database; readiness recovers and uses minimal responses", async () => {
  available = false;
  let result = await fetch(base + "/api/v1/health/live");
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { status: "ok" });
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(result.headers.get("x-content-type-options"), "nosniff");
  assert.equal(result.headers.has("x-powered-by"), false);
  result = await fetch(base + "/api/v1/health/ready");
  assert.equal(result.status, 503);
  const error = await result.json();
  assert.deepEqual(Object.keys(error).sort(), ["code", "message", "requestId", "statusCode"]);
  assert.equal(error.code, "SERVICE_UNAVAILABLE");
  available = true;
  result = await fetch(base + "/api/v1/health/ready");
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { status: "ok" });
  assert.equal((await fetch(base + "/health/live")).status, 404);
});

test("DTO validation rejects invalid values and unexpected fields without echoing input", async () => {
  for (const body of [
    { name: "x" },
    { name: 123 },
    { name: "VOIC", password: "sensitive-sentinel" },
    {},
  ]) {
    const result = await fetch(base + "/api/v1/_test/dto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(result.status, 400);
    const error = await result.json();
    assert.equal(error.code, "BAD_REQUEST");
    assert.ok(!JSON.stringify(error).includes("sensitive-sentinel"));
  }
  const result = await fetch(base + "/api/v1/_test/dto", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "VOIC" }),
  });
  assert.equal(result.status, 201);
  assert.deepEqual(await result.json(), { name: "VOIC" });
});

test("parser errors and oversized JSON and form bodies use the same safe error envelope", async () => {
  for (const [contentType, body, status] of [
    ["application/json", '{"broken":', 400],
    ["application/json", JSON.stringify({ name: "x".repeat(70_000) }), 413],
    ["application/x-www-form-urlencoded", "name=" + "x".repeat(70_000), 413],
  ] as const) {
    const result = await fetch(base + "/api/v1/_test/dto", {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    });
    assert.equal(result.status, status);
    assert.deepEqual(Object.keys(await result.json()).sort(), [
      "code",
      "message",
      "requestId",
      "statusCode",
    ]);
  }
});

test("CORS credentials are allowed only for an exact configured origin", async () => {
  const result = await fetch(base + "/api/v1/health/live", {
    headers: { origin: "http://localhost:8443" },
  });
  assert.equal(result.headers.get("access-control-allow-origin"), "http://localhost:8443");
  assert.equal(result.headers.get("access-control-allow-credentials"), "true");
  for (const origin of ["http://evil.example", "http://localhost:8443.evil.example"]) {
    const denied = await fetch(base + "/api/v1/health/live", { headers: { origin } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.has("access-control-allow-origin"), false);
    assert.equal((await denied.json()).code, "FORBIDDEN");
  }
  const preflight = await fetch(base + "/api/v1/health/live", {
    method: "OPTIONS",
    headers: { origin: "http://localhost:8443", "access-control-request-method": "GET" },
  });
  assert.equal(preflight.status, 204);
});

test("unexpected and not-found errors do not expose exception details or sensitive request data", async () => {
  const logs: string[] = [];
  const original = process.stderr.write;
  process.stderr.write = ((value: string | Uint8Array) => {
    logs.push(value.toString());
    return true;
  }) as typeof process.stderr.write;
  try {
    const result = await fetch(base + "/api/v1/_test/failure?password=sensitive-sentinel", {
      headers: { authorization: "Bearer sensitive-sentinel", cookie: "session=sensitive-sentinel" },
    });
    assert.equal(result.status, 500);
    const body = await result.json();
    assert.equal(body.code, "INTERNAL_ERROR");
    assert.equal(body.requestId, result.headers.get("x-request-id"));
    assert.ok(!JSON.stringify(body).match(/SELECT|password|secret|stack|sensitive-sentinel/));
    assert.deepEqual(
      logs.map((line) => JSON.parse(line)),
      [{ event: "request_failed", statusCode: 500 }],
    );
    const missing = await fetch(base + "/api/v1/missing?secret=sensitive-sentinel");
    assert.equal(missing.status, 404);
    assert.ok(!JSON.stringify(await missing.json()).includes("sensitive-sentinel"));
  } finally {
    process.stderr.write = original;
  }
});
