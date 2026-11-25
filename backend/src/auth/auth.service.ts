import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { type DataSource, type EntityManager } from "typeorm";
import * as argon2 from "argon2";
import type { Request, Response } from "express";
import { DATABASE_SOURCE, DatabaseService } from "../database/database.service.js";
import { AuthUser, AuthSession, AuthActionToken, type Role } from "./auth.entities.js";
import { AUTH_CONFIG, type AuthConfig } from "./auth.config.js";
import { MailService } from "./mail.service.js";
import { AuthRateLimit } from "./rate-limit.js";
import { StaffFactor } from "../security/security.entities.js";
import { hasPermission, permissionMatrix, type Permission } from "../security/permissions.js";
import type {
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  ProfileDto,
  RegisterDto,
  ResetDto,
} from "./auth.dto.js";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const csrfToken = (token: string) =>
  createHmac("sha256", token).update("voic-csrf-v1").digest("hex");
export const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;
export const publicUser = (u: AuthUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  kind: u.kind,
  company: u.company,
  country: u.country,
  phone: u.phone,
  role: u.role,
  emailVerified: !!u.emailVerifiedAt,
});
export type AuthContext = { token: string; session: AuthSession; user: AuthUser | null };
export type AuthRequest = Request & { auth?: AuthContext; sessionExpired?: boolean };
const emailIdentity = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  readonly cookieName: string;
  private readonly dummyHash = argon2.hash(randomBytes(32), passwordOptions);
  constructor(
    @Inject(DATABASE_SOURCE) private readonly source: DataSource,
    private readonly database: DatabaseService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    private readonly mail: MailService,
    private readonly limits: AuthRateLimit,
  ) {
    this.cookieName = config.production ? "__Host-voic_session" : "voic_session";
  }
  private async ready() {
    if (!(await this.database.isReady())) throw new ServiceUnavailableException();
  }
  private userQuery(manager: EntityManager, id: string, password = false) {
    const q = manager
      .getRepository(AuthUser)
      .createQueryBuilder("u")
      .addSelect("u.securityVersion")
      .where("u.id = :id", { id });
    if (password) q.addSelect("u.passwordHash");
    return q;
  }
  async boundary(req: AuthRequest, allowQuery = false) {
    await this.ready();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    await this.limits.take("all", ip, 1000);
    if (!allowQuery && Object.keys(req.query).length) throw new BadRequestException();
    const raw = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .filter((c) => c.startsWith(`${this.cookieName}=`));
    const token = raw?.length === 1 ? raw[0]!.slice(this.cookieName.length + 1) : "";
    if (/^[a-f0-9]{64}$/.test(token)) {
      const session = await this.source
        .getRepository(AuthSession)
        .findOneBy({ tokenHash: hashToken(token) });
      if (session && session.expiresAt.getTime() > Date.now()) {
        const user = session.userId
          ? await this.userQuery(this.source.manager, session.userId).getOne()
          : null;
        if (!session.userId || (user && user.securityVersion === session.securityVersion))
          req.auth = { token, session, user };
      }
    }
    req.sessionExpired = !!raw?.length && !req.auth;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const supplied = req.get("X-CSRF-Token") || "";
      if (
        !req.auth ||
        !/^[a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(csrfToken(req.auth.token))) ||
        !this.config.origins.includes(req.get("Origin") || "") ||
        !req.is("application/json")
      )
        throw new ForbiddenException();
    }
  }
  identity(req: AuthRequest) {
    const user = req.auth?.user;
    if (!user) throw new UnauthorizedException();
    if (user.suspendedAt) throw new ForbiddenException({ code: "STAFF_SUSPENDED" });
    return user;
  }
  staffSession(user: AuthUser, session: AuthSession) {
    if (user.suspendedAt) throw new ForbiddenException({ code: "STAFF_SUSPENDED" });
    if (session.assurance !== "mfa" || !session.mfaAt || !session.authenticatedAt)
      throw new ForbiddenException({ code: "MFA_REQUIRED" });
  }
  require(req: AuthRequest, roles?: readonly Role[]) {
    const user = this.identity(req);
    if (user.role !== "customer") this.staffSession(user, req.auth!.session);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException();
    return user;
  }
  permission(req: AuthRequest, permission: Permission) {
    const u = this.require(req);
    if (!hasPermission(u.role, permission))
      throw new ForbiddenException({ code: "STAFF_FORBIDDEN" });
    return u;
  }
  recent(req: AuthRequest) {
    this.permission(req, "employees:manage");
    const session = req.auth!.session;
    if (
      !session.authenticatedAt ||
      !session.mfaAt ||
      Math.min(session.authenticatedAt.getTime(), session.mfaAt.getTime()) < Date.now() - 5 * 60_000
    )
      throw new ForbiddenException({ code: "REAUTH_REQUIRED" });
  }
  requireVerified(req: AuthRequest) {
    const user = this.require(req, ["customer"]);
    if (!user.emailVerifiedAt) throw new ForbiddenException();
    return user;
  }
  private cookie(res: Response, token: string, maxAge: number) {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.config.production,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }
  async newSession(
    manager: EntityManager,
    user: AuthUser | null,
    old?: AuthContext,
    assurance: "password" | "mfa" = "password",
  ) {
    const token = randomBytes(32).toString("hex");
    const maxAge = user
      ? user.role !== "customer" && assurance !== "mfa"
        ? 5 * 60_000
        : 12 * 60 * 60_000
      : 30 * 60_000;
    if (old) await manager.delete(AuthSession, { tokenHash: old.session.tokenHash });
    const session = manager.create(AuthSession, {
      tokenHash: hashToken(token),
      userId: user?.id ?? null,
      securityVersion: user?.securityVersion ?? 0,
      expiresAt: new Date(Date.now() + maxAge),
      assurance: user ? assurance : "anonymous",
      authenticatedAt: user ? new Date() : null,
      mfaAt: assurance === "mfa" ? new Date() : null,
      attempts: 0,
    });
    await manager.insert(AuthSession, session);
    return { token, maxAge, session, user };
  }
  async sessionView(context: AuthContext, sessionExpired = false) {
    const user = context.user;
    const enrolled =
      user && user.role !== "customer"
        ? !!(await this.source.getRepository(StaffFactor).findOneBy({ userId: user.id }))
            ?.confirmedAt
        : false;
    return {
      user: user ? publicUser(user) : null,
      csrfToken: csrfToken(context.token),
      sessionExpired,
      staffAuth:
        !user || user.role === "customer"
          ? "none"
          : user.suspendedAt
            ? "suspended"
            : !user.emailVerifiedAt
              ? "verify_email"
              : context.session.assurance === "mfa" &&
                  !!context.session.mfaAt &&
                  !!context.session.authenticatedAt
                ? "complete"
                : enrolled
                  ? "challenge"
                  : "enroll",
      permissions:
        user &&
        user.role !== "customer" &&
        !user.suspendedAt &&
        context.session.assurance === "mfa" &&
        !!context.session.mfaAt &&
        !!context.session.authenticatedAt
          ? permissionMatrix[user.role]
          : [],
    };
  }
  async finishSession(
    req: AuthRequest,
    res: Response,
    context: Awaited<ReturnType<AuthService["newSession"]>>,
  ) {
    this.cookie(res, context.token, context.maxAge);
    req.auth = context;
    return this.sessionView(context);
  }
  async current(req: AuthRequest, res: Response) {
    if (!req.auth) {
      await this.limits.take("session", req.ip || req.socket.remoteAddress || "unknown", 120);
      // Bounded indexed expiry cleanup; no existing user/catalog data is touched.
      await this.source.query(
        "DELETE FROM auth_sessions WHERE expiresAt < UTC_TIMESTAMP() LIMIT 100",
      );
      const context = await this.newSession(this.source.manager, null);
      this.cookie(res, context.token, context.maxAge);
      req.auth = context;
    }
    return this.sessionView(req.auth, !!req.sessionExpired);
  }
  private async rate(req: Request, action: string, email: string, perIp: number, perEmail: number) {
    await this.limits.take(`${action}:ip`, req.ip || req.socket.remoteAddress || "unknown", perIp);
    await this.limits.take(`${action}:email`, emailIdentity(email), perEmail);
  }
  private profile(dto: ProfileDto) {
    if (dto.kind === "company" && !dto.company?.trim()) throw new BadRequestException();
    return {
      name: dto.name.trim(),
      kind: dto.kind,
      company: dto.kind === "company" ? dto.company!.trim() : null,
      country: dto.country.trim(),
      phone: dto.phone?.trim() || null,
    };
  }
  private async issue(manager: EntityManager, userId: string, purpose: "verify" | "reset") {
    const token = randomBytes(32).toString("hex");
    await manager.delete(AuthActionToken, { userId, purpose });
    await manager.insert(AuthActionToken, {
      tokenHash: hashToken(token),
      userId,
      purpose,
      expiresAt: new Date(Date.now() + (purpose === "verify" ? 24 * 60 : 30) * 60_000),
      consumedAt: null,
    });
    return token;
  }
  async register(req: AuthRequest, dto: RegisterDto) {
    const email = emailIdentity(dto.email);
    await this.rate(req, "register", email, 10, 5);
    const profile = this.profile(dto);
    const passwordHash = await argon2.hash(dto.password, passwordOptions);
    const id = randomUUID();
    let token: string;
    try {
      token = await this.source.transaction(async (manager) => {
        await manager.insert(AuthUser, {
          id,
          email,
          passwordHash,
          ...profile,
          role: "customer",
          emailVerifiedAt: null,
          securityVersion: 0,
          createdAt: new Date(),
        });
        return this.issue(manager, id, "verify");
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "driverError" in error &&
        (error.driverError as { code?: string }).code === "ER_DUP_ENTRY"
      )
        return { accepted: true };
      throw error;
    }
    await this.mail.send(email, "verify", token, dto.lang, dto.returnTo);
    return { accepted: true };
  }
  async login(req: AuthRequest, res: Response, dto: LoginDto) {
    const email = emailIdentity(dto.email);
    await this.rate(req, "login", email, 30, 10);
    const found = await this.source.getRepository(AuthUser).findOneBy({ email });
    if (!found) {
      await argon2.verify(await this.dummyHash, dto.password);
      throw new UnauthorizedException();
    }
    const context = await this.source.transaction(async (manager) => {
      const user = await this.userQuery(manager, found.id, true)
        .setLock("pessimistic_write")
        .getOne();
      if (!user || !(await argon2.verify(user.passwordHash, dto.password)))
        throw new UnauthorizedException();
      if (user.suspendedAt) throw new ForbiddenException({ code: "STAFF_SUSPENDED" });
      return this.newSession(manager, user, req.auth);
    });
    return this.finishSession(req, res, context);
  }
  async logout(req: AuthRequest, res: Response) {
    if (req.body && Object.keys(req.body).length) throw new BadRequestException();
    await this.source.getRepository(AuthSession).delete({ tokenHash: req.auth!.session.tokenHash });
    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.config.production,
      sameSite: "lax",
      path: "/",
    });
    return { ok: true };
  }
  async requestMail(req: AuthRequest, dto: EmailDto, purpose: "verify" | "reset") {
    const email = emailIdentity(dto.email);
    await this.rate(req, purpose, email, 10, 3);
    const found = await this.source.getRepository(AuthUser).findOneBy({ email });
    if (found) {
      const token = await this.source.transaction(async (manager) => {
        const user = await this.userQuery(manager, found.id).setLock("pessimistic_write").getOne();
        if (!user || (purpose === "verify" && user.emailVerifiedAt)) return null;
        return this.issue(manager, user.id, purpose);
      });
      if (token) await this.mail.send(email, purpose, token, dto.lang, dto.returnTo);
    }
    return { accepted: true };
  }
  private async consume(
    token: string,
    purpose: "verify" | "reset",
    action: (manager: EntityManager, user: AuthUser) => Promise<void>,
  ) {
    const tokenHash = hashToken(token);
    const found = await this.source
      .getRepository(AuthActionToken)
      .findOneBy({ tokenHash, purpose });
    if (!found) throw new BadRequestException({ code: "TOKEN_INVALID" });
    await this.source.transaction(async (manager) => {
      const user = await this.userQuery(manager, found.userId)
        .setLock("pessimistic_write")
        .getOne();
      if (!user) throw new BadRequestException();
      const consumed = await manager
        .getRepository(AuthActionToken)
        .createQueryBuilder()
        .update()
        .set({ consumedAt: new Date() })
        .where(
          "tokenHash = :tokenHash AND purpose = :purpose AND consumedAt IS NULL AND expiresAt > :now",
          { tokenHash, purpose, now: new Date() },
        )
        .execute();
      if (consumed.affected !== 1) {
        const state = await manager.findOneBy(AuthActionToken, { tokenHash, purpose });
        throw new BadRequestException({
          code: state?.consumedAt
            ? "TOKEN_USED"
            : state && state.expiresAt.getTime() <= Date.now()
              ? "TOKEN_EXPIRED"
              : "TOKEN_INVALID",
        });
      }
      await action(manager, user);
    });
  }
  async verify(req: AuthRequest, token: string) {
    await this.limits.take("verify-token", req.ip || req.socket.remoteAddress || "unknown", 30);
    await this.consume(token, "verify", async (manager, user) => {
      await manager.update(AuthUser, { id: user.id }, { emailVerifiedAt: new Date() });
    });
    return { ok: true };
  }
  async reset(req: AuthRequest, dto: ResetDto) {
    await this.limits.take("reset-token", req.ip || req.socket.remoteAddress || "unknown", 10);
    const passwordHash = await argon2.hash(dto.password, passwordOptions);
    await this.consume(dto.token, "reset", async (manager, user) => {
      await manager.update(
        AuthUser,
        { id: user.id },
        { passwordHash, securityVersion: user.securityVersion + 1 },
      );
      await manager.delete(AuthSession, { userId: user.id });
      await manager.update(
        AuthActionToken,
        { userId: user.id, purpose: "reset" },
        { consumedAt: new Date() },
      );
    });
    return { ok: true };
  }
  profileRead(req: AuthRequest) {
    return publicUser(this.require(req, ["customer"]));
  }
  async profileUpdate(req: AuthRequest, dto: ProfileDto) {
    const current = this.require(req, ["customer"]);
    const fields = this.profile(dto);
    return this.source.transaction(async (manager) => {
      const user = await this.lockCurrent(manager, req, current.id);
      await manager.update(AuthUser, { id: user.id }, fields);
      return publicUser(Object.assign(user, fields));
    });
  }
  async lockCurrent(manager: EntityManager, req: AuthRequest, id: string, allowRestricted = false) {
    const user = await this.userQuery(manager, id, true).setLock("pessimistic_write").getOne();
    const session = await manager.findOneBy(AuthSession, {
      tokenHash: req.auth!.session.tokenHash,
    });
    if (
      !user ||
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      user.securityVersion !== session.securityVersion
    )
      throw new UnauthorizedException();
    if (user.suspendedAt) throw new ForbiddenException({ code: "STAFF_SUSPENDED" });
    if (user.role !== "customer" && !allowRestricted) this.staffSession(user, session);
    req.auth!.session = session;
    return user;
  }
  async changePassword(req: AuthRequest, dto: ChangePasswordDto, res: Response) {
    const current = this.require(req, ["customer"]);
    await this.limits.take("password", current.id, 5);
    await this.source.transaction(async (manager) => {
      const user = await this.lockCurrent(manager, req, current.id);
      if (!(await argon2.verify(user.passwordHash, dto.currentPassword)))
        throw new BadRequestException({ code: "INVALID_CURRENT_PASSWORD" });
      const passwordHash = await argon2.hash(dto.password, passwordOptions);
      await manager.update(
        AuthUser,
        { id: user.id },
        { passwordHash, securityVersion: user.securityVersion + 1 },
      );
      await manager.delete(AuthSession, { userId: user.id });
      await manager.delete(AuthActionToken, { userId: user.id, purpose: "reset" });
    });
    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.config.production,
      sameSite: "lax",
      path: "/",
    });
    return { ok: true };
  }
}
