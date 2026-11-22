import { test } from "node:test";
import assert from "node:assert/strict";
import type { DataSource } from "typeorm";
import { DatabaseService } from "../src/database/database.service.js";
import { validateEnvironment } from "../src/config/environment.js";

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

test("readiness retries after connection failure and cleans up the connection at shutdown", async () => {
  let attempts = 0;
  let destroyed = false;
  const source = {
    isInitialized: false,
    async initialize() {
      if (++attempts === 1) throw new Error("SQL password secret");
      this.isInitialized = true;
    },
    async query() {
      return [{ value: 1 }];
    },
    async destroy() {
      destroyed = true;
      this.isInitialized = false;
    },
  };
  const database = new DatabaseService(source as unknown as DataSource, env);
  assert.equal(await database.isReady(), false);
  assert.equal(await database.isReady(), true);
  await database.onApplicationShutdown();
  assert.equal(destroyed, true);
  assert.equal(await database.isReady(), false);
});

test("concurrent and timed-out readiness probes share one bounded database operation", async () => {
  let release!: () => void;
  let queries = 0;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const source = {
    isInitialized: true,
    async query() {
      queries++;
      await waiting;
    },
    async destroy() {},
  };
  const database = new DatabaseService(source as unknown as DataSource, env);
  const statuses = await Promise.all([database.isReady(), database.isReady(), database.isReady()]);
  assert.deepEqual(statuses, [false, false, false]);
  assert.equal(queries, 1);
  const final = database.isReady();
  assert.equal(queries, 1);
  release();
  assert.equal(await final, true);
  await database.onApplicationShutdown();
});
