import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  HttpException,
} from "@nestjs/common";
import { type DataSource, type EntityManager, IsNull } from "typeorm";
import type { Response } from "express";
import * as argon2 from "argon2";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { DATABASE_SOURCE } from "../database/database.service.js";
import { AuthService, hashToken, passwordOptions, type AuthRequest } from "../auth/auth.service.js";
import { AuthUser, AuthSession } from "../auth/auth.entities.js";
import { AuthRateLimit } from "../auth/rate-limit.js";
import { StaffFactor, StaffRecovery } from "./security.entities.js";
import { acceptedStep, decryptSecret, encryptSecret, newFactor, factorUri } from "./crypto.js";
import { audit } from "./audit.js";
import { exact, text, bad } from "../content/content.validation.js";
export const MFA_KEY = Symbol("MFA_KEY");
export type FactorProof = { code?: string; recoveryCode?: string };
@Injectable()
export class MfaService {
  constructor(
    @Inject(DATABASE_SOURCE) readonly source: DataSource,
    readonly auth: AuthService,
    readonly limits: AuthRateLimit,
    @Inject(MFA_KEY) readonly key: Buffer,
  ) {}
  staffIdentity(req: AuthRequest) {
    const u = this.auth.identity(req);
    if (u.role === "customer") throw new ForbiddenException();
    return u;
  }
  async status(req: AuthRequest) {
    const u = this.staffIdentity(req),
      f = await this.source.getRepository(StaffFactor).findOneBy({ userId: u.id });
    return {
      enrolled: !!f?.confirmedAt,
      restricted: req.auth!.session.assurance !== "mfa",
      challengeExpiresAt: req.auth!.session.expiresAt,
      recoveryRemaining: await this.source
        .getRepository(StaffRecovery)
        .countBy({ userId: u.id, consumedAt: IsNull() }),
      recent:
        !!req.auth!.session.mfaAt &&
        !!req.auth!.session.authenticatedAt &&
        Math.min(req.auth!.session.mfaAt.getTime(), req.auth!.session.authenticatedAt.getTime()) >
          Date.now() - 5 * 60_000,
    };
  }
  private async factor(m: EntityManager, id: string) {
    let f = await m
      .getRepository(StaffFactor)
      .createQueryBuilder("f")
      .addSelect(["f.secret", "f.pending", "f.pendingSession"])
      .where("f.userId=:id", { id })
      .getOne();
    if (!f) {
      f = m.create(StaffFactor, {
        userId: id,
        secret: null,
        confirmedAt: null,
        lastStep: null,
        pending: null,
        pendingSession: null,
        pendingUntil: null,
        failures: 0,
        windowStarted: null,
      });
      await m.insert(StaffFactor, f);
    }
    return f;
  }
  private password(value: unknown) {
    text(value, 128);
    if (typeof value !== "string" || value.length < 1) bad();
    return value as string;
  }
  private async operation(
    req: AuthRequest,
    flow: string,
    fn: (m: EntityManager, u: AuthUser, f: StaffFactor) => Promise<any>,
  ) {
    const current = this.staffIdentity(req);
    this.limits.take("mfa-operation", current.id, 40);
    const result = await this.source.transaction("READ COMMITTED", async (m) => {
      const u = await this.auth.lockCurrent(m, req, current.id, true);
      if (u.role === "customer") throw new ForbiddenException();
      const f = await this.factor(m, u.id);
      if (!f.windowStarted || f.windowStarted.getTime() < Date.now() - 15 * 60_000) {
        f.failures = 0;
        f.windowStarted = new Date();
      }
      if (f.failures >= 10) throw new HttpException("Too many requests", 429);
      const r = await fn(m, u, f);
      if (r?.factorError) {
        f.failures++;
        if (req.auth!.session.assurance !== "mfa") {
          req.auth!.session.attempts++;
          if (req.auth!.session.attempts >= 5) req.auth!.session.expiresAt = new Date(0);
          await m.save(AuthSession, req.auth!.session);
        }
        await audit(m, u, "security.factor_rejected", u.id, { flow }, req);
      } else f.failures = 0;
      await m.save(StaffFactor, f);
      return r;
    });
    if (result?.factorError) throw new BadRequestException({ code: result.factorError });
    return result;
  }
  async proof(m: EntityManager, u: AuthUser, f: StaffFactor, input: FactorProof, req: AuthRequest) {
    if (!!input.code === !!input.recoveryCode || !f.confirmedAt || !f.secret) return false;
    if (input.code) {
      if (typeof input.code !== "string") return false;
      const step = await acceptedStep(
        decryptSecret(f.secret, u.id, this.key),
        input.code,
        f.lastStep,
      );
      if (step === null) return false;
      f.lastStep = step;
      return true;
    }
    if (
      typeof input.recoveryCode !== "string" ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/.test(input.recoveryCode)
    )
      return false;
    const result = await m
      .createQueryBuilder()
      .update(StaffRecovery)
      .set({ consumedAt: new Date() })
      .where("userId=:id AND hash=:hash AND consumedAt IS NULL", {
        id: u.id,
        hash: hashToken(input.recoveryCode),
      })
      .execute();
    if (result.affected !== 1) return false;
    await audit(m, u, "security.recovery_used", u.id, {}, req);
    return true;
  }
  private async codes(m: EntityManager, u: AuthUser) {
    await m.delete(StaffRecovery, { userId: u.id });
    const codes = Array.from({ length: 10 }, () =>
      randomBytes(16).toString("hex").match(/.{8}/g)!.join("-"),
    );
    await m.insert(
      StaffRecovery,
      codes.map((code) => ({ userId: u.id, hash: hashToken(code), consumedAt: null })),
    );
    return codes;
  }
  private async rotate(
    m: EntityManager,
    u: AuthUser,
    req: AuthRequest,
    revoke = false,
    passwordAt = new Date(),
  ) {
    if (revoke) {
      u.securityVersion++;
      u.staffRevision++;
      await m.update(
        AuthUser,
        { id: u.id },
        { securityVersion: u.securityVersion, staffRevision: u.staffRevision },
      );
      await m.delete(AuthSession, { userId: u.id });
    }
    const context = await this.auth.newSession(m, u, req.auth, "mfa");
    // MFA must not invent a newer password-verification time.
    context.session.authenticatedAt = passwordAt;
    await m.update(
      AuthSession,
      { tokenHash: context.session.tokenHash },
      { authenticatedAt: passwordAt },
    );
    return context;
  }
  async begin(req: AuthRequest, input: any) {
    exact(input, ["password", "code", "recoveryCode"]);
    this.password(input.password);
    return this.operation(req, "enrollment", async (m, u, f) => {
      if (!u.emailVerifiedAt) throw new ForbiddenException({ code: "EMAIL_UNVERIFIED" });
      if (!(await argon2.verify(u.passwordHash, input.password)))
        return { factorError: "INVALID_CURRENT_PASSWORD" };
      if (f.confirmedAt && !(await this.proof(m, u, f, input, req)))
        return { factorError: "MFA_INVALID" };
      const secret = newFactor(),
        uri = factorUri(secret, u.email);
      f.pending = encryptSecret(secret, u.id, this.key);
      f.pendingSession = req.auth!.session.tokenHash;
      f.pendingUntil = new Date(Date.now() + 5 * 60_000);
      await audit(m, u, "security.enrollment_started", u.id, { replacement: !!f.confirmedAt }, req);
      return {
        secret,
        uri,
        qr: await QRCode.toDataURL(uri, {
          type: "image/png",
          width: 260,
          errorCorrectionLevel: "M",
        }),
        expiresAt: f.pendingUntil,
      };
    });
  }
  async confirm(req: AuthRequest, res: Response, input: any) {
    exact(input, ["code"]);
    text(input.code, 6);
    const result = await this.operation(req, "confirmation", async (m, u, f) => {
      if (
        !f.pending ||
        !f.pendingUntil ||
        f.pendingUntil.getTime() <= Date.now() ||
        f.pendingSession !== req.auth!.session.tokenHash
      )
        return { factorError: "MFA_EXPIRED" };
      const secret = decryptSecret(f.pending, u.id, this.key),
        step = await acceptedStep(secret, input.code, null);
      if (step === null) return { factorError: "MFA_INVALID" };
      const replaced = !!f.confirmedAt,
        passwordAt = new Date(f.pendingUntil.getTime() - 5 * 60_000);
      f.secret = f.pending;
      f.confirmedAt = new Date();
      f.lastStep = step;
      f.pending = null;
      f.pendingUntil = null;
      f.pendingSession = null;
      const recoveryCodes = await this.codes(m, u),
        context = await this.rotate(m, u, req, true, passwordAt);
      await audit(
        m,
        u,
        replaced ? "security.mfa_replaced" : "security.mfa_enrolled",
        u.id,
        {},
        req,
      );
      return { recoveryCodes, context };
    });
    return {
      session: await this.auth.finishSession(req, res, result.context),
      recoveryCodes: result.recoveryCodes,
    };
  }
  async challenge(req: AuthRequest, res: Response, input: any) {
    exact(input, ["code", "recoveryCode"]);
    if (req.auth?.session.assurance === "mfa") throw new BadRequestException();
    const result = await this.operation(req, "challenge", async (m, u, f) => {
      const passwordAt = req.auth!.session.authenticatedAt;
      if (!passwordAt || passwordAt.getTime() <= Date.now() - 5 * 60_000)
        return { factorError: "MFA_EXPIRED" };
      if (!(await this.proof(m, u, f, input, req))) return { factorError: "MFA_INVALID" };
      const context = await this.rotate(m, u, req, false, passwordAt);
      await audit(m, u, "security.mfa_authenticated", u.id, {}, req);
      return { context };
    });
    return this.auth.finishSession(req, res, result.context);
  }
  async sensitive(
    req: AuthRequest,
    res: Response,
    input: any,
    action: "reauthenticate" | "recovery" | "password",
  ) {
    exact(input, [
      "password",
      "code",
      "recoveryCode",
      ...(action === "password" ? ["newPassword"] : []),
    ]);
    this.password(input.password);
    this.auth.require(req);
    if (action === "password") {
      text(input.newPassword, 128);
      if (input.newPassword.length < 15) bad();
    }
    const result = await this.operation(req, action, async (m, u, f) => {
      if (!(await argon2.verify(u.passwordHash, input.password)))
        return { factorError: "INVALID_CURRENT_PASSWORD" };
      if (!(await this.proof(m, u, f, input, req))) return { factorError: "MFA_INVALID" };
      let recoveryCodes;
      if (action === "recovery") recoveryCodes = await this.codes(m, u);
      if (action === "password")
        await m.update(
          AuthUser,
          { id: u.id },
          { passwordHash: await argon2.hash(input.newPassword, passwordOptions) },
        );
      const context = await this.rotate(m, u, req, action !== "reauthenticate");
      await audit(m, u, `security.${action}`, u.id, {}, req);
      return { context, recoveryCodes };
    });
    return {
      session: await this.auth.finishSession(req, res, result.context),
      ...(result.recoveryCodes ? { recoveryCodes: result.recoveryCodes } : {}),
    };
  }
}
