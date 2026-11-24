import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  WorkflowActionDto,
  CustomerReplyDto,
  workflowTransitions,
} from "../src/inquiries/workflow.dto.js";
import { workflowConfiguration } from "../src/inquiries/workflow.config.js";
import { validateEnvironment } from "../src/config/environment.js";
const env = validateEnvironment({
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
test("staff writes fail closed without local opt-in, reject production settings and external development mail", () => {
  assert.equal(workflowConfiguration(env, {}).writesEnabled, false);
  assert.equal(
    workflowConfiguration(env, { STAFF_INQUIRY_WRITES: "true" }, "capture").writesEnabled,
    true,
  );
  assert.throws(() => workflowConfiguration(env, { STAFF_INQUIRY_WRITES: "true" }, "smtp"));
  for (const flag of ["true", "false", "unexpected"])
    assert.throws(() =>
      workflowConfiguration({ ...env, nodeEnv: "production" }, { STAFF_INQUIRY_WRITES: flag }),
    );
  assert.equal(workflowConfiguration({ ...env, nodeEnv: "production" }, {}).writesEnabled, false);
});
test("canonical workflow has no customer-controlled transition, no closed reopen and bounded injection-resistant actions", async () => {
  assert.deepEqual(workflowTransitions("submitted"), ["under_review"]);
  assert.deepEqual(workflowTransitions("under_review"), [
    "awaiting_customer",
    "responded",
    "closed",
  ]);
  assert.deepEqual(workflowTransitions("awaiting_customer"), []);
  assert.deepEqual(workflowTransitions("closed"), []);
  const body = {
    key: "a4618f2b-1567-41fb-bfda-d45195236911",
    revision: 2,
    type: "message",
    text: "A plain message",
  };
  const check = (value: object) =>
    validate(plainToInstance(WorkflowActionDto, value), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  assert.equal((await check(body)).length, 0);
  for (const patch of [
    { actorId: "other" },
    { permissions: [] },
    { createdAt: "now" },
    { revision: 0 },
    { revision: 1.5 },
    { text: "x".repeat(4001) },
    { type: "delete" },
    { status: "cancelled" },
  ])
    assert.ok((await check({ ...body, ...patch })).length > 0);
  assert.ok(
    (
      await validate(
        plainToInstance(CustomerReplyDto, {
          key: body.key,
          revision: 2,
          text: "Clarification",
          status: "closed",
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      )
    ).length > 0,
  );
});
