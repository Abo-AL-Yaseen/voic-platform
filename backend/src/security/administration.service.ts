import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { type DataSource, type EntityManager, IsNull, In } from "typeorm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { isEmail } from "class-validator";
import { DATABASE_SOURCE } from "../database/database.service.js";
import { AuthService, hashToken, passwordOptions, type AuthRequest } from "../auth/auth.service.js";
import { AuthUser, AuthSession, type Role } from "../auth/auth.entities.js";
import { MailService } from "../auth/mail.service.js";
import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.config.js";
import { AuthRateLimit } from "../auth/rate-limit.js";
import { StaffAudit, StaffFactor, StaffRecovery, StaffInvitation } from "./security.entities.js";
import { administrationLock, audit } from "./audit.js";
import { hasPermission } from "./permissions.js";
import { exact, text, bad } from "../content/content.validation.js";
const uuid = (v: unknown) =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const roles = ["administrator", "sales", "content_editor"];
export async function preserveLastAdministrator(
  m: EntityManager,
  user: AuthUser,
  nextRole: Role,
  suspended: boolean,
) {
  if (
    user.role === "administrator" &&
    !user.suspendedAt &&
    (nextRole !== "administrator" || suspended) &&
    (await m.countBy(AuthUser, { role: "administrator", suspendedAt: IsNull() })) <= 1
  )
    throw new ConflictException({ code: "LAST_ADMINISTRATOR" });
}
@Injectable()
export class AdministrationService {
  constructor(
    @Inject(DATABASE_SOURCE) readonly source: DataSource,
    readonly auth: AuthService,
    readonly mail: MailService,
    readonly limits: AuthRateLimit,
    @Inject(AUTH_CONFIG) readonly config: AuthConfig,
  ) {}
  filters(query: any, allowed: string[]) {
    exact(query, allowed);
    const integer = (k: string, fallback: number, max: number) => {
      const v = query[k] ?? String(fallback);
      if (typeof v !== "string" || !/^[1-9]\d*$/.test(v) || Number(v) > max) bad();
      return Number(v);
    };
    return { page: integer("page", 1, 10000), pageSize: integer("pageSize", 20, 50) };
  }
  private email(v: unknown) {
    text(v, 254);
    if (typeof v !== "string" || !isEmail(v.trim())) bad();
    return (v as string).trim().toLowerCase();
  }
  private reason(v: unknown) {
    text(v, 500);
    if (typeof v !== "string" || v.trim().length < 10) bad();
    return (v as string).trim();
  }
  private async employee(m: EntityManager, u: AuthUser, enrolled?: boolean) {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      suspendedAt: u.suspendedAt,
      version: u.staffRevision,
      emailVerified: !!u.emailVerifiedAt,
      mfaEnrolled: enrolled ?? !!(await m.findOneBy(StaffFactor, { userId: u.id }))?.confirmedAt,
    };
  }
  async list(req: AuthRequest) {
    this.auth.permission(req, "employees:manage");
    const q = req.query as any,
      f = this.filters(q, ["q", "role", "status", "page", "pageSize"]);
    if (q.role && !roles.includes(q.role)) bad();
    if (q.status && !["active", "suspended"].includes(q.status)) bad();
    if (q.q !== undefined) text(q.q, 100);
    const b = this.source
      .getRepository(AuthUser)
      .createQueryBuilder("u")
      .where("u.role IN (:...roles)", { roles });
    if (q.q)
      b.andWhere("(u.email LIKE :q ESCAPE '!' OR u.name LIKE :q ESCAPE '!')", {
        q: `%${q.q.replace(/[%_!]/g, "!$&")}%`,
      });
    if (q.role) b.andWhere("u.role=:role", { role: q.role });
    if (q.status)
      b.andWhere(q.status === "active" ? "u.suspendedAt IS NULL" : "u.suspendedAt IS NOT NULL");
    const [rows, total] = await b
      .orderBy("u.createdAt", "DESC")
      .addOrderBy("u.id", "ASC")
      .skip((f.page - 1) * f.pageSize)
      .take(f.pageSize)
      .getManyAndCount();
    const factors = rows.length
      ? await this.source
          .getRepository(StaffFactor)
          .find({ where: { userId: In(rows.map((u) => u.id)) } })
      : [];
    const enrolled = new Set(factors.filter((f) => f.confirmedAt).map((f) => f.userId));
    return {
      ...f,
      total,
      totalPages: Math.max(1, Math.ceil(total / f.pageSize)),
      items: await Promise.all(
        rows.map((u) => this.employee(this.source.manager, u, enrolled.has(u.id))),
      ),
    };
  }
  async detail(req: AuthRequest, id: string) {
    this.auth.permission(req, "employees:manage");
    if (!uuid(id)) throw new NotFoundException();
    if (Object.keys(req.query).length) bad();
    const u = await this.source.getRepository(AuthUser).findOneBy({ id });
    if (!u || u.role === "customer") throw new NotFoundException();
    return this.employee(this.source.manager, u);
  }
  async lookup(req: AuthRequest) {
    this.auth.permission(req, "employees:manage");
    exact(req.query, ["email"]);
    const email = this.email(req.query.email),
      u = await this.source.getRepository(AuthUser).findOneBy({ email });
    if (!u) throw new NotFoundException();
    return this.employee(this.source.manager, u);
  }
  private async write(
    req: AuthRequest,
    input: any,
    target: string,
    fn: (m: EntityManager, actor: AuthUser, reason: string) => Promise<any>,
  ) {
    const actor = this.auth.permission(req, "employees:manage");
    this.auth.recent(req);
    if (!uuid(input.key)) bad();
    const reason = this.reason(input.reason);
    await this.limits.take("administration-write", actor.id, 30);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ target, input }))
      .digest("hex");
    return this.source.transaction("READ COMMITTED", async (m) => {
      await administrationLock(m);
      const locked = await this.auth.lockCurrent(m, req, actor.id);
      if (!hasPermission(locked.role, "employees:manage")) throw new ForbiddenException();
      this.auth.recent(req);
      const old = await m
        .getRepository(StaffAudit)
        .createQueryBuilder("a")
        .addSelect("a.fingerprint")
        .where("a.actorId=:id AND a.requestKey=:key", { id: actor.id, key: input.key })
        .getOne();
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw new ConflictException({ code: "IDEMPOTENCY_CONFLICT" });
        return { completed: true, repeated: true };
      }
      const result = await fn(m, locked, reason);
      await audit(
        m,
        locked,
        `employees.${input.action || "invite"}`,
        result.auditTarget || target,
        { reason, ...result.audit },
        req,
        { key: input.key, fingerprint },
      );
      const { audit: _, auditTarget: _target, ...response } = result;
      return response;
    });
  }
  async mutate(req: AuthRequest, id: string, input: any) {
    exact(input, ["key", "version", "action", "role", "expectedRole", "reason"]);
    if (
      !uuid(id) ||
      !Number.isInteger(input.version) ||
      input.version < 0 ||
      !["role", "promote", "suspend", "activate", "revoke_sessions", "reset_mfa"].includes(
        input.action,
      )
    )
      bad();
    if (["role", "promote"].includes(input.action) && !roles.includes(input.role)) bad();
    return this.write(req, input, id, async (m, actor) => {
      const u = await m.findOne(AuthUser, { where: { id }, lock: { mode: "pessimistic_write" } });
      if (!u) throw new NotFoundException();
      if (u.staffRevision !== input.version)
        throw new ConflictException({ code: "EMPLOYEE_CONFLICT" });
      if (
        input.action === "promote"
          ? u.role !== "customer" ||
            input.expectedRole !== "customer" ||
            !roles.includes(input.role)
          : u.role === "customer"
      )
        throw new ConflictException({ code: "EMPLOYEE_CONFLICT" });
      if (input.action === "reset_mfa" && u.id === actor.id)
        throw new BadRequestException({ code: "MFA_SELF_RESET" });
      const before = u.role;
      await preserveLastAdministrator(
        m,
        u,
        ["role", "promote"].includes(input.action) ? input.role : u.role,
        input.action === "suspend" ? true : !!u.suspendedAt,
      );
      if (["role", "promote"].includes(input.action)) u.role = input.role;
      if (input.action === "suspend") u.suspendedAt = new Date();
      if (input.action === "activate") u.suspendedAt = null;
      if (input.action === "reset_mfa") {
        await m.delete(StaffRecovery, { userId: id });
        await m.delete(StaffFactor, { userId: id });
        await audit(m, actor, "security.mfa_reset", id, { reason: input.reason }, req);
      }
      u.securityVersion =
        (
          await m
            .getRepository(AuthUser)
            .createQueryBuilder("u")
            .addSelect("u.securityVersion")
            .where("u.id=:id", { id })
            .getOneOrFail()
        ).securityVersion + 1;
      u.staffRevision++;
      await m.update(
        AuthUser,
        { id },
        {
          role: u.role,
          suspendedAt: u.suspendedAt,
          staffRevision: u.staffRevision,
          securityVersion: u.securityVersion,
        },
      );
      await m.delete(AuthSession, { userId: id });
      return {
        employee: await this.employee(m, u),
        audit: {
          fromRole: before,
          toRole: u.role,
          suspended: !!u.suspendedAt,
          revision: u.staffRevision,
        },
      };
    });
  }
  async invitations(req: AuthRequest) {
    this.auth.permission(req, "employees:manage");
    const f = this.filters(req.query, ["page", "pageSize"]);
    const [items, total] = await this.source.getRepository(StaffInvitation).findAndCount({
      order: { createdAt: "DESC", id: "ASC" },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    });
    return { ...f, items, total, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) };
  }
  private async deliver(invite: StaffInvitation, token: string, lang: string) {
    const link = new URL("/staff-invitation", this.config.appUrl);
    link.searchParams.set("lang", lang === "en" ? "en" : "ar");
    link.hash = new URLSearchParams({ token }).toString();
    try {
      return await this.mail.deliver({
        to: invite.email,
        subject: "VOIC: staff invitation / دعوة موظف",
        text: `VOIC\n${link.href}\nSet your own password. Staff MFA enrollment is mandatory. / عيّن كلمة مرورك ثم فعّل التحقق بخطوتين.`,
      });
    } catch {
      return "failed";
    }
  }
  async invite(req: AuthRequest, input: any) {
    exact(input, ["key", "email", "role", "reason", "lang"]);
    const email = this.email(input.email);
    if (!roles.includes(input.role)) bad();
    await this.limits.take("staff-invite", this.auth.require(req).id, 10);
    const token = randomBytes(32).toString("hex"),
      id = randomUUID();
    const result = await this.write(req, input, "invitation", async (m, actor) => {
      if (
        (await m.existsBy(AuthUser, { email })) ||
        (await m
          .getRepository(StaffInvitation)
          .createQueryBuilder("i")
          .where(
            "i.email=:email AND i.consumedAt IS NULL AND i.revokedAt IS NULL AND i.expiresAt>:now",
            { email, now: new Date() },
          )
          .getExists())
      )
        throw new ConflictException({ code: "INVITATION_EXISTS" });
      const invitation = m.create(StaffInvitation, {
        id,
        email,
        role: input.role,
        tokenHash: hashToken(token),
        createdBy: actor.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        consumedAt: null,
        revokedAt: null,
      });
      await m.insert(StaffInvitation, invitation);
      const { tokenHash: _, ...safe } = invitation;
      return {
        invitation: safe,
        auditTarget: `invitation:${id}`,
        audit: { role: invitation.role, invitationId: id },
      };
    });
    return {
      ...result,
      ...(result.invitation
        ? { delivery: await this.deliver(result.invitation, token, input.lang) }
        : {}),
    };
  }
  async invitationAction(req: AuthRequest, id: string, input: any) {
    exact(input, ["key", "action", "reason", "lang"]);
    if (!uuid(id) || !["resend", "revoke"].includes(input.action)) bad();
    await this.limits.take("staff-invite", this.auth.require(req).id, 10);
    const token = randomBytes(32).toString("hex");
    const result = await this.write(req, input, `invitation:${id}`, async (m) => {
      const invitation = await m.findOneBy(StaffInvitation, { id });
      if (!invitation) throw new NotFoundException();
      if (
        invitation.consumedAt ||
        invitation.revokedAt ||
        (await m.existsBy(AuthUser, { email: invitation.email }))
      )
        throw new ConflictException({ code: "INVITATION_EXISTS" });
      if (input.action === "revoke") invitation.revokedAt = new Date();
      else {
        invitation.tokenHash = hashToken(token);
        invitation.expiresAt = new Date(Date.now() + 24 * 60 * 60_000);
      }
      await m.update(
        StaffInvitation,
        { id },
        {
          tokenHash: invitation.tokenHash,
          expiresAt: invitation.expiresAt,
          revokedAt: invitation.revokedAt,
        },
      );
      const { tokenHash: _, ...safe } = invitation;
      return { invitation: safe, audit: { invitationId: id } };
    });
    return {
      ...result,
      ...(input.action === "resend" && result.invitation
        ? { delivery: await this.deliver(result.invitation, token, input.lang) }
        : {}),
    };
  }
  async accept(req: AuthRequest, input: any) {
    exact(input, ["token", "password", "name", "country"]);
    text(input.token, 64);
    text(input.password, 128);
    text(input.name, 100);
    text(input.country, 100);
    if (
      !/^[a-f0-9]{64}$/.test(input.token) ||
      input.password.length < 15 ||
      !input.name.trim() ||
      !input.country.trim()
    )
      bad();
    await this.limits.take(
      "invitation-accept",
      req.ip || req.socket.remoteAddress || "unknown",
      10,
    );
    const passwordHash = await argon2.hash(input.password, passwordOptions);
    try {
      return await this.source.transaction("READ COMMITTED", async (m) => {
        await administrationLock(m);
        const invite = await m
          .getRepository(StaffInvitation)
          .createQueryBuilder("i")
          .where("i.tokenHash=:hash", { hash: hashToken(input.token) })
          .getOne();
        if (!invite || invite.revokedAt) throw new BadRequestException({ code: "TOKEN_INVALID" });
        if (invite.consumedAt) throw new BadRequestException({ code: "TOKEN_USED" });
        if (invite.expiresAt.getTime() <= Date.now())
          throw new BadRequestException({ code: "TOKEN_EXPIRED" });
        if (await m.existsBy(AuthUser, { email: invite.email }))
          throw new ConflictException({ code: "INVITATION_EXISTS" });
        const id = randomUUID();
        await m.insert(AuthUser, {
          id,
          email: invite.email,
          passwordHash,
          name: input.name.trim(),
          country: input.country.trim(),
          kind: "individual",
          company: null,
          phone: null,
          role: invite.role,
          emailVerifiedAt: new Date(),
          securityVersion: 0,
          createdAt: new Date(),
          suspendedAt: null,
          staffRevision: 0,
        });
        await m.update(StaffInvitation, { id: invite.id }, { consumedAt: new Date() });
        await audit(
          m,
          { id, role: invite.role },
          "employees.invitation_accepted",
          id,
          { invitationId: invite.id },
          req,
        );
        return { accepted: true };
      });
    } catch (e) {
      if ((e as any)?.driverError?.code === "ER_DUP_ENTRY")
        throw new ConflictException({ code: "INVITATION_EXISTS" });
      throw e;
    }
  }
}
