import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import { ConfigurationError } from "../config/environment.js";
export function encryptionKey(input = process.env) {
  const value = input.MFA_ENCRYPTION_KEY || "";
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new ConfigurationError(
      "MFA_ENCRYPTION_KEY must be a canonical base64-encoded random 32-byte key, stored privately.",
    );
  return key;
}
export function encryptSecret(secret: string, userId: string, key: Buffer) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`voic-totp:v1:${userId}`));
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    data.toString("base64"),
  ].join(".");
}
export function decryptSecret(value: string, userId: string, key: Buffer) {
  const [version, iv, tag, data, ...rest] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data || rest.length)
    throw new Error("Invalid protected factor");
  const cipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  cipher.setAAD(Buffer.from(`voic-totp:v1:${userId}`));
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([cipher.update(Buffer.from(data, "base64")), cipher.final()]).toString(
    "utf8",
  );
}
export const newFactor = () => generateSecret({ length: 20 });
export const factorUri = (secret: string, email: string) =>
  generateURI({ issuer: "VOIC", label: email, secret, algorithm: "sha1", digits: 6, period: 30 });
export async function acceptedStep(
  secret: string,
  token: string,
  lastStep: string | null,
  epoch = Math.floor(Date.now() / 1000),
) {
  if (!/^\d{6}$/.test(token)) return null;
  const result = await verify({
    strategy: "totp",
    secret,
    token,
    epoch,
    epochTolerance: [30, 0],
    algorithm: "sha1",
    digits: 6,
    period: 30,
  });
  if (!result.valid || !("timeStep" in result)) return null;
  const step = result.timeStep;
  return lastStep !== null && step <= Number(lastStep) ? null : String(step);
}
