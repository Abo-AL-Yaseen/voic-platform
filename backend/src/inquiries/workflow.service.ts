import { hasPermission } from "../security/permissions.js";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { type DataSource, type EntityManager } from "typeorm";
import { AuthService, type AuthRequest } from "../auth/auth.service.js";
import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.config.js";
import { AuthRateLimit } from "../auth/rate-limit.js";
import { DATABASE_SOURCE } from "../database/database.service.js";
import { CustomerInquiry, InquiryHistory, InquiryNotification } from "./inquiry.entities.js";
import {
  InquiryAction,
  InquiryAudit,
  InquiryInternalNote,
  InquiryMessage,
  submittedStatuses,
} from "./workflow.entities.js";
import { InquiryService, detailPages } from "./inquiry.service.js";
import { CustomerReplyDto, WorkflowActionDto, workflowTransitions } from "./workflow.dto.js";
import { WORKFLOW_CONFIG, type WorkflowConfig } from "./workflow.config.js";
import { correlation } from "../security/audit.js";

@Injectable()
export class InquiryWorkflowService {
  constructor(
    @Inject(DATABASE_SOURCE) private readonly source: DataSource,
    private readonly auth: AuthService,
    private readonly inquiries: InquiryService,
    private readonly limits: AuthRateLimit,
    @Inject(AUTH_CONFIG) private readonly mail: AuthConfig,
    @Inject(WORKFLOW_CONFIG) private readonly config: WorkflowConfig,
  ) {}
  staff(req: AuthRequest) {
    return this.auth.permission(req, "inquiries:manage");
  }
  private async record(m: EntityManager, id: string, owner?: string, lock = false) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new NotFoundException();
    const q = m
      .getRepository(CustomerInquiry)
      .createQueryBuilder("i")
      .where("i.id=:id", { id })
      .andWhere("i.status <> 'draft' AND i.submittedAt IS NOT NULL");
    if (owner) q.andWhere("i.userId=:owner", { owner });
    if (lock) q.setLock("pessimistic_write");
    const row = await q.getOne();
    if (!row) throw new NotFoundException();
    return row;
  }
  private allowed(i: CustomerInquiry, verified = true) {
    const open = !["draft", "closed", "cancelled"].includes(i.status),
      enabled = this.config.writesEnabled && verified;
    return {
      writesEnabled: enabled,
      canMessage: enabled && open,
      canNote: enabled && open,
      transitions: enabled ? workflowTransitions(i.status) : [],
    };
  }
  private async staffProject(
    m: EntityManager,
    i: CustomerInquiry,
    pages = { messagePage: 1, historyPage: 1, notePage: 1 },
    verified = true,
  ) {
    const record = await this.inquiries.project(m, i, pages);
    const [notes, total] = await m.findAndCount(InquiryInternalNote, {
      where: { inquiryId: i.id },
      order: { createdAt: "DESC", id: "DESC" },
      take: 20,
      skip: (pages.notePage - 1) * 20,
    });
    return {
      ...record,
      internalNotes: notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt })),
      notePagination: {
        page: pages.notePage,
        total,
        totalPages: Math.max(1, Math.ceil(total / 20)),
      },
      permissions: this.allowed(i, verified),
    };
  }
  async detail(req: AuthRequest, id: string) {
    const user = this.staff(req);
    const pages = detailPages(req.query, true);
    return this.source.transaction("REPEATABLE READ", async (m) =>
      this.staffProject(m, await this.record(m, id), pages, !!user.emailVerifiedAt),
    );
  }
  async stats(req: AuthRequest) {
    this.staff(req);
    if (Object.keys(req.query).length) throw new BadRequestException();
    const rows = await this.source
      .getRepository(CustomerInquiry)
      .createQueryBuilder("i")
      .select("i.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("i.status <> 'draft' AND i.submittedAt IS NOT NULL")
      .groupBy("i.status")
      .getRawMany();
    const byStatus = Object.fromEntries(
      submittedStatuses.map((s) => [s, Number(rows.find((r) => r.status === s)?.count || 0)]),
    );
    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus,
      scope: "all_submitted_inquiries" as const,
      writesEnabled: this.config.writesEnabled,
    };
  }
  async list(req: AuthRequest) {
    this.staff(req);
    const query = req.query;
    if (
      Object.keys(query).some(
        (k) => !["q", "status", "destination", "sort", "page", "pageSize"].includes(k),
      ) ||
      Object.values(query).some((v) => typeof v !== "string")
    )
      throw new BadRequestException();
    const q = String(query.q || "").trim(),
      status = String(query.status || ""),
      destination = String(query.destination || "").trim(),
      sort = String(query.sort || "desc"),
      page = Number(query.page || 1),
      pageSize = Number(query.pageSize || 10);
    if (
      q.length > 100 ||
      /[\x00-\x1f\x7f]/.test(q + destination) ||
      destination.length > 200 ||
      !["", ...submittedStatuses].includes(status) ||
      !["asc", "desc"].includes(sort) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    )
      throw new BadRequestException();
    return this.source.transaction("REPEATABLE READ", async (m) => {
      const b = m
        .getRepository(CustomerInquiry)
        .createQueryBuilder("i")
        .where("i.status <> 'draft' AND i.submittedAt IS NOT NULL");
      if (q)
        b.andWhere(
          "(i.reference LIKE :q ESCAPE '!' OR i.contactEmail LIKE :q ESCAPE '!' OR JSON_UNQUOTE(JSON_EXTRACT(i.fields,'$.name')) LIKE :q ESCAPE '!' OR JSON_UNQUOTE(JSON_EXTRACT(i.fields,'$.company')) LIKE :q ESCAPE '!')",
          { q: `%${q.replace(/[!%_]/g, "!$&")}%` },
        );
      if (status) b.andWhere("i.status=:status", { status });
      if (destination)
        b.andWhere("JSON_UNQUOTE(JSON_EXTRACT(i.fields,'$.destination'))=:destination", {
          destination,
        });
      const [rows, total] = await b
        .orderBy("i.submittedAt", sort === "asc" ? "ASC" : "DESC")
        .addOrderBy("i.id", sort === "asc" ? "ASC" : "DESC")
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();
      return {
        items: rows.map((i) => ({
          id: i.id,
          reference: i.reference,
          status: i.status,
          submittedAt: i.submittedAt,
          destination: i.fields.destination,
          customer: { name: i.fields.name, company: i.fields.company, email: i.contactEmail },
        })),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    });
  }
  private fingerprint(id: string, dto: WorkflowActionDto | CustomerReplyDto, type: string) {
    return createHash("sha256")
      .update(
        JSON.stringify({
          id,
          type,
          revision: dto.revision,
          status: "status" in dto ? dto.status : undefined,
          text: dto.text?.trim() || "",
        }),
      )
      .digest("hex");
  }
  async act(
    req: AuthRequest,
    id: string,
    dto: WorkflowActionDto | CustomerReplyDto,
    customer = false,
  ) {
    const current = customer ? this.auth.require(req, ["customer"]) : this.staff(req);
    if (!customer && !this.config.writesEnabled)
      throw new ForbiddenException({ code: "STAFF_WRITES_DISABLED" });
    await this.limits.take(customer ? "inquiry-reply" : "staff-inquiry-action", current.id, 60);
    const type = customer ? "reply" : (dto as WorkflowActionDto).type,
      fingerprint = this.fingerprint(id, dto, type),
      text = dto.text?.trim() || "";
    if (
      (type !== "status" && !text) ||
      (type !== "status" && "status" in dto && dto.status) ||
      text.length > 4000 ||
      /\x00/.test(text)
    )
      throw new BadRequestException({ code: "WORKFLOW_FIELDS" });
    return this.source.transaction(async (m) => {
      const user = await this.auth.lockCurrent(m, req, current.id);
      if (customer ? user.role !== "customer" : !hasPermission(user.role, "inquiries:manage"))
        throw new ForbiddenException({ code: "STAFF_FORBIDDEN" });
      if (!user.emailVerifiedAt) throw new ForbiddenException({ code: "EMAIL_UNVERIFIED" });
      const i = await this.record(m, id, customer ? user.id : undefined, true);
      const old = await m.findOneBy(InquiryAction, { actorId: user.id, key: dto.key });
      if (old) {
        if (old.inquiryId !== id || old.fingerprint !== fingerprint)
          throw new ConflictException({ code: "IDEMPOTENCY_CONFLICT" });
        return this.result(m, i, old, customer);
      }
      if (i.revision !== dto.revision) throw new ConflictException({ code: "INQUIRY_CONFLICT" });
      if (["closed", "cancelled"].includes(i.status))
        throw new ConflictException({ code: "WORKFLOW_CLOSED" });
      const from = i.status;
      let to = from;
      if (type === "status") {
        const status = (dto as WorkflowActionDto).status;
        if (!status || !workflowTransitions(from).includes(status))
          throw new BadRequestException({ code: "WORKFLOW_TRANSITION" });
        if (["awaiting_customer", "responded", "closed"].includes(status) && !text)
          throw new BadRequestException({ code: "WORKFLOW_FIELDS" });
        to = status;
      } else if (customer && from === "awaiting_customer") to = "under_review";
      const now = new Date(),
        action = m.create(InquiryAction, {
          id: randomUUID(),
          inquiryId: id,
          actorId: user.id,
          key: dto.key,
          fingerprint,
          type,
          revision: i.revision + 1,
          createdAt: now,
        });
      await m.insert(InquiryAction, action);
      if (type === "note")
        await m.insert(InquiryInternalNote, {
          id: randomUUID(),
          inquiryId: id,
          actionId: action.id,
          text,
          createdAt: now,
        });
      else if (text)
        await m.insert(InquiryMessage, {
          id: randomUUID(),
          inquiryId: id,
          actionId: action.id,
          sender: customer ? "customer" : "staff",
          text,
          createdAt: now,
        });
      if (from !== to)
        await m.insert(InquiryHistory, {
          id: randomUUID(),
          inquiryId: id,
          status: to as (typeof submittedStatuses)[number],
          occurredAt: now,
        });
      i.status = to;
      i.revision++;
      i.updatedAt = now;
      await m.save(i);
      await m.insert(InquiryAudit, {
        requestId: correlation(req),
        id: randomUUID(),
        inquiryId: id,
        actionId: action.id,
        actorId: user.id,
        actorRole: user.role,
        action: type,
        metadata: { from, to, revision: i.revision },
        createdAt: now,
      });
      if (type !== "note")
        await m.insert(InquiryNotification, {
          id: randomUUID(),
          inquiryId: id,
          eventId: action.id,
          kind: customer ? "customer_reply" : "staff_update",
          audience: customer ? "company" : "customer",
          recipient: customer ? this.mail.inquiryInbox : i.contactEmail,
          state: "pending",
          attempts: 0,
          nextAttemptAt: now,
        });
      return this.result(m, i, action, customer);
    });
  }
  private async result(
    m: EntityManager,
    i: CustomerInquiry,
    action: InquiryAction,
    customer: boolean,
    verified = true,
  ) {
    return {
      record: customer
        ? await this.inquiries.project(m, i)
        : await this.staffProject(m, i, undefined, verified),
      actionId: action.id,
      appliedRevision: action.revision,
    };
  }
  async resolve(req: AuthRequest, id: string, key: string, customer = false) {
    if (Object.keys(req.query).length || !/^[a-f0-9-]{36}$/.test(key))
      throw new BadRequestException();
    const u = customer ? this.auth.require(req, ["customer"]) : this.staff(req);
    return this.source.transaction("REPEATABLE READ", async (m) => {
      const i = await this.record(m, id, customer ? u.id : undefined);
      const action = await m.findOneBy(InquiryAction, { inquiryId: id, actorId: u.id, key });
      if (!action || (customer && action.type !== "reply")) throw new NotFoundException();
      return this.result(m, i, action, customer, !!u.emailVerifiedAt);
    });
  }
}
