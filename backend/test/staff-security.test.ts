import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { generate } from "otplib";
import {
  encryptionKey,
  encryptSecret,
  decryptSecret,
  acceptedStep,
  newFactor,
} from "../src/security/crypto.js";
import { permissionMatrix, hasPermission } from "../src/security/permissions.js";
test("TOTP uses bounded past tolerance and rejects accepted or older steps", async () => {
  const secret = newFactor(),
    epoch = 1800000000,
    code = await generate({ strategy: "totp", secret, epoch });
  assert.equal(await acceptedStep(secret, code, null, epoch), String(epoch / 30));
  assert.equal(await acceptedStep(secret, code, String(epoch / 30), epoch), null);
  assert.equal(await acceptedStep(secret, code, null, epoch - 30), null);
  assert.equal(await acceptedStep(secret, code, null, epoch + 60), null);
  assert.equal(await acceptedStep(secret, "1234567", null, epoch), null);
});
test("MFA key fails closed and AES-GCM protects user binding and integrity", () => {
  assert.throws(() => encryptionKey({}), /MFA_ENCRYPTION_KEY/);
  assert.throws(() => encryptionKey({ MFA_ENCRYPTION_KEY: "bad" }), /MFA_ENCRYPTION_KEY/);
  const key = encryptionKey({ MFA_ENCRYPTION_KEY: randomBytes(32).toString("base64") }),
    secret = newFactor(),
    encrypted = encryptSecret(secret, "one", key);
  assert.ok(!encrypted.includes(secret));
  assert.equal(decryptSecret(encrypted, "one", key), secret);
  assert.throws(() => decryptSecret(encrypted, "two", key));
  assert.throws(() => decryptSecret(encrypted, "one", randomBytes(32)));
  assert.notEqual(encrypted, encryptSecret(secret, "one", key));
});
test("one permission matrix separates staff business and administrator privileges", () => {
  assert.ok(hasPermission("administrator", "employees:manage"));
  assert.ok(hasPermission("administrator", "content:publish"));
  assert.deepEqual(permissionMatrix.customer, []);
  assert.ok(!hasPermission("sales", "content:edit"));
  assert.ok(!hasPermission("content_editor", "inquiries:manage"));
  assert.ok(!hasPermission("content_editor", "content:publish"));
});
