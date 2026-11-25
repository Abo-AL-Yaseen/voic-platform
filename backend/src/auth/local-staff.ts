import * as argon2 from "argon2";
import { randomUUID, randomBytes } from "node:crypto";
import { isEmail } from "class-validator";
import type { DataSource } from "typeorm";
import type { Environment } from "../config/environment.js";
import { AuthUser, AuthSession, AuthActionToken } from "./auth.entities.js";
import { passwordOptions, hashToken } from "./auth.service.js";
export type LocalStaffInput = {
  mode: "create" | "promote";
  email: string;
  role: "administrator" | "sales" | "content_editor";
  name?: string;
  country?: string;
  password?: string;
  verifyDevelopment: boolean;
  expectedId?: string;
  expectedRole?: string;
};
export async function provisionLocalStaff(
  source: DataSource,
  env: Environment,
  input: LocalStaffInput,
) {
  const development =
    env.nodeEnv === "development" &&
    env.dbHost === "127.0.0.1" &&
    env.dbPort === 3306 &&
    env.dbDatabase === "voic_development" &&
    env.dbUsername === "voic_app";
  const disposable =
    env.nodeEnv === "test" &&
    /^voic_test_[a-f0-9]{16}$/.test(env.dbDatabase) &&
    env.dbUsername === env.dbDatabase &&
    process.env.CONFIRM_DISPOSABLE_DATABASE === "yes";
  if (!development && !disposable) throw new Error("Local target required");
  const email = input.email.trim().toLowerCase();
  if (
    !["create", "promote"].includes(input.mode) ||
    !isEmail(email) ||
    email.length > 254 ||
    !["administrator", "sales", "content_editor"].includes(input.role)
  )
    throw new Error("Invalid local staff identity");
  if (
    input.mode === "create" &&
    (!input.name?.trim() ||
      input.name.length > 100 ||
      !input.country?.trim() ||
      input.country.length > 100 ||
      !input.password ||
      input.password.length < 15 ||
      input.password.length > 128)
  )
    throw new Error("Invalid new staff profile");
  const passwordHash =
    input.mode === "create" ? await argon2.hash(input.password!, passwordOptions) : undefined;
  return source.transaction(async (m) => {
    let user = await m
      .getRepository(AuthUser)
      .findOne({ where: { email }, lock: { mode: "pessimistic_write" } });
    const now = new Date();
    if (input.mode === "create") {
      if (user) throw new Error("Account already exists; no overwrite permitted");
      user = m.create(AuthUser, {
        id: randomUUID(),
        email,
        passwordHash,
        role: input.role,
        kind: "individual",
        name: input.name!.trim(),
        company: null,
        country: input.country!.trim(),
        phone: null,
        emailVerifiedAt: input.verifyDevelopment ? now : null,
        securityVersion: 0,
        createdAt: now,
      });
      await m.insert(AuthUser, user);
    } else {
      if (!user || user.id !== input.expectedId || user.role !== input.expectedRole)
        throw new Error("Identity changed; review again");
      // Explicit updates never save the omitted password hash or alter profile fields.
      await m.getRepository(AuthUser).increment({ id: user.id }, "securityVersion", 1);
      await m.update(
        AuthUser,
        { id: user.id },
        { role: input.role, ...(input.verifyDevelopment ? { emailVerifiedAt: now } : {}) },
      );
      await m.delete(AuthSession, { userId: user.id });
      await m.delete(AuthActionToken, { userId: user.id });
      user.role = input.role;
      if (input.verifyDevelopment) user.emailVerifiedAt = now;
    }
    let verificationToken: string | null = null;
    if (!user.emailVerifiedAt) {
      verificationToken = randomBytes(32).toString("hex");
      await m.insert(AuthActionToken, {
        tokenHash: hashToken(verificationToken),
        userId: user.id,
        purpose: "verify",
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        consumedAt: null,
      });
    }
    return { id: user.id, role: user.role, verified: !!user.emailVerifiedAt, verificationToken };
  });
}
