import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { type DataSource, type EntityManager } from "typeorm";
import { DATABASE_SOURCE } from "../database/database.service.js";
import { AuthService, type AuthRequest } from "../auth/auth.service.js";
import { AuthRateLimit } from "../auth/rate-limit.js";
import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.config.js";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";
import {
  CatalogPackage,
  CatalogProduct,
  CatalogTerm,
  CatalogTranslation,
} from "../catalog/catalog.entities.js";
import {
  CustomerInquiry,
  InquiryLine,
  InquiryHistory,
  InquiryNotification,
  type InquiryLineInput,
} from "./inquiry.entities.js";
import type { CreateInquiryDto, SaveInquiryDto, SubmitInquiryDto } from "./inquiry.dto.js";

@Injectable()
export class InquiryService {
  constructor(
    @Inject(DATABASE_SOURCE) private readonly source: DataSource,
    private readonly auth: AuthService,
    private readonly limits: AuthRateLimit,
    @Inject(AUTH_CONFIG) private readonly mailConfig: AuthConfig,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  private id(value: string) {
    if (!/^[a-f0-9-]{36}$/.test(value)) throw new NotFoundException();
    return value;
  }
  private async current(m: EntityManager, req: AuthRequest) {
    const u = await this.auth.lockCurrent(m, req, this.auth.require(req, ["customer"]).id);
    if (u.role !== "customer") throw new ForbiddenException();
    return u;
  }
  private async owned(m: EntityManager, id: string, userId: string, lock = false) {
    const q = m
      .getRepository(CustomerInquiry)
      .createQueryBuilder("i")
      .where("i.id = :id AND i.userId = :userId", { id: this.id(id), userId });
    if (lock) q.setLock("pessimistic_write");
    const i = await q.getOne();
    if (!i) throw new NotFoundException();
    return i;
  }
  private writeLimit(req: AuthRequest) {
    this.limits.take("inquiry-write", this.auth.require(req, ["customer"]).id, 120);
  }
  async create(req: AuthRequest, dto: CreateInquiryDto) {
    this.writeLimit(req);
    return this.source.transaction(async (m) => {
      const u = await this.current(m, req);
      const old = await m.findOneBy(CustomerInquiry, {
        userId: u.id,
        creationKey: dto.creationKey,
      });
      if (old) return this.project(m, old);
      this.limits.take("inquiry-create", u.id, 30);
      const now = new Date(),
        id = randomUUID();
      const i = m.create(CustomerInquiry, {
        id,
        userId: u.id,
        creationKey: dto.creationKey,
        reference: `VOIC-${id.replaceAll("-", "").slice(0, 20).toUpperCase()}`,
        status: "draft",
        revision: 1,
        lang: dto.lang,
        fields: {
          kind: u.kind,
          name: u.name,
          company: u.company || "",
          destination: u.country,
          phone: u.phone || "",
          notes: "",
        },
        contactEmail: u.email,
        submissionKey: null,
        submittedRevision: null,
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
      });
      await m.insert(CustomerInquiry, i);
      return this.project(m, i);
    });
  }
  // Current catalog descriptions are obtained under shared locks in the submission transaction.
  // This also locks publication/translation/term/package rows against concurrent editorial writes.
  private async validateLines(
    m: EntityManager,
    items: InquiryLineInput[],
    lang: "ar" | "en",
    freeze: boolean,
  ) {
    const snapshots = [];
    for (const line of [...items].sort((a, b) => a.productId.localeCompare(b.productId))) {
      const get = <T extends object>(entity: new () => T, where: object) =>
        m
          .getRepository(entity)
          .findOne({ where: where as never, lock: { mode: "pessimistic_read" } });
      const p = await get(CatalogProduct, { id: line.productId });
      const tr = await get(CatalogTranslation, { productId: line.productId, locale: lang });
      const brand = p && (await get(CatalogTerm, { kind: "brand", id: p.brandKey }));
      const category = p && (await get(CatalogTerm, { kind: "category", id: p.categoryKey }));
      if (
        !p?.published ||
        (this.env.nodeEnv === "production" && p.approvalScope !== "approved") ||
        !["approved", "development"].includes(p.approvalScope) ||
        !brand?.published ||
        !category?.published ||
        !tr?.published ||
        !tr.fields.name.published ||
        !tr.fields.name.value ||
        !tr.fields.description.published ||
        !tr.fields.description.value
      )
        throw new BadRequestException({ code: "INQUIRY_UNAVAILABLE" });
      let packageLabel: string | null = null;
      if (line.packageId) {
        const pack = await get(CatalogPackage, { id: line.packageId });
        if (
          !pack?.published ||
          pack.productId !== p.id ||
          !pack.amount ||
          !pack.unit ||
          !(lang === "ar" ? pack.sizeAr : pack.sizeEn)
        )
          throw new BadRequestException({ code: "INQUIRY_UNAVAILABLE" });
        if (
          line.unit !== "packages" ||
          !Number.isInteger(line.quantity) ||
          line.quantity! < 1 ||
          line.quantity! > 100000
        )
          throw new BadRequestException({ code: "INQUIRY_FIELDS" });
        packageLabel = [
          lang === "ar" ? pack.sizeAr : pack.sizeEn,
          pack.packagingPublished ? (lang === "ar" ? pack.packagingAr : pack.packagingEn) : null,
        ]
          .filter(Boolean)
          .join(" · ");
      } else if (line.quantity !== null && line.quantity !== undefined) {
        if (!["kg", "L"].includes(line.unit || "") || line.quantity <= 0 || line.quantity > 1000000)
          throw new BadRequestException({ code: "INQUIRY_FIELDS" });
      } else if (line.unit != null || (freeze && !line.requirements.trim()))
        throw new BadRequestException({ code: "INQUIRY_FIELDS" });
      snapshots.push({
        productId: line.productId,
        value: {
          name: tr.fields.name.value,
          description: tr.fields.description.value,
          package: packageLabel,
        },
      });
    }
    return snapshots;
  }
  async save(req: AuthRequest, id: string, dto: SaveInquiryDto) {
    this.writeLimit(req);
    return this.source.transaction(async (m) => {
      const u = await this.current(m, req),
        i = await this.owned(m, id, u.id, true);
      if (i.status !== "draft" || i.revision !== dto.revision)
        throw new ConflictException({ code: "INQUIRY_CONFLICT" });
      if (new Set(dto.items.map((x) => x.productId)).size !== dto.items.length)
        throw new BadRequestException({ code: "INQUIRY_FIELDS" });
      const items = dto.items.map((x) => ({
        ...x,
        packageId: x.packageId ?? null,
        quantity: x.quantity ?? null,
        unit: x.unit ?? null,
        requirements: x.requirements.trim(),
      }));
      await this.validateLines(m, items, dto.lang, false);
      i.fields = Object.fromEntries(
        Object.entries(dto.fields).map(([k, v]) => [k, v.trim()]),
      ) as typeof i.fields;
      if (i.fields.kind === "individual") i.fields.company = "";
      i.lang = dto.lang;
      i.revision++;
      i.updatedAt = new Date();
      await m.save(i);
      await m.delete(InquiryLine, { inquiryId: id });
      for (const [position, line] of items.entries())
        await m.insert(InquiryLine, {
          ...line,
          quantity: line.quantity == null ? null : String(line.quantity),
          id: randomUUID(),
          inquiryId: id,
          position,
          snapshot: null,
        });
      return this.project(m, i);
    });
  }
  async submit(req: AuthRequest, id: string, dto: SubmitInquiryDto) {
    this.writeLimit(req);
    return this.source.transaction(async (m) => {
      const u = await this.current(m, req);
      if (!u.emailVerifiedAt) throw new ForbiddenException({ code: "EMAIL_UNVERIFIED" });
      const i = await this.owned(m, id, u.id, true);
      const prior = await m.findOneBy(CustomerInquiry, { userId: u.id, submissionKey: dto.key });
      if (prior && (prior.id !== id || prior.submittedRevision !== dto.revision))
        throw new ConflictException({ code: "IDEMPOTENCY_CONFLICT" });
      if (i.status === "submitted") {
        if (i.submissionKey !== dto.key || i.submittedRevision !== dto.revision)
          throw new ConflictException({ code: "IDEMPOTENCY_CONFLICT" });
        return this.project(m, i);
      }
      if (i.revision !== dto.revision) throw new ConflictException({ code: "INQUIRY_CONFLICT" });
      const f = i.fields;
      if (!f.name || !f.destination || (f.kind === "company" && !f.company))
        throw new BadRequestException({ code: "INQUIRY_FIELDS" });
      const lines = await m.find(InquiryLine, {
        where: { inquiryId: id },
        order: { position: "ASC" },
      });
      if (!lines.length) throw new BadRequestException({ code: "INQUIRY_FIELDS" });
      const snapshots = await this.validateLines(
        m,
        lines.map((l) => ({ ...l, quantity: l.quantity == null ? null : Number(l.quantity) })),
        i.lang,
        true,
      );
      for (const line of lines)
        await m.update(
          InquiryLine,
          { id: line.id },
          { snapshot: snapshots.find((s) => s.productId === line.productId)!.value },
        );
      const now = new Date();
      i.status = "submitted";
      i.submissionKey = dto.key;
      i.submittedRevision = dto.revision;
      i.revision++;
      i.updatedAt = now;
      i.submittedAt = now;
      i.contactEmail = u.email;
      await m.save(i);
      await m.insert(InquiryHistory, {
        id: randomUUID(),
        inquiryId: id,
        status: "submitted",
        occurredAt: now,
      });
      for (const audience of ["customer", "company"] as const)
        await m.insert(InquiryNotification, {
          id: randomUUID(),
          inquiryId: id,
          audience,
          recipient: audience === "customer" ? u.email : this.mailConfig.inquiryInbox,
          state: "pending",
          attempts: 0,
          nextAttemptAt: now,
        });
      return this.project(m, i);
    });
  }
  private async project(m: EntityManager, i: CustomerInquiry) {
    const lines = await m.find(InquiryLine, {
      where: { inquiryId: i.id },
      order: { position: "ASC" },
    });
    const history = await m.find(InquiryHistory, {
      where: { inquiryId: i.id },
      order: { occurredAt: "ASC", id: "ASC" },
    });
    const notifications = await m.find(InquiryNotification, { where: { inquiryId: i.id } });
    return {
      id: i.id,
      reference: i.reference,
      status: i.status,
      revision: i.revision,
      lang: i.lang,
      fields: i.fields,
      contactEmail: i.contactEmail,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      submittedAt: i.submittedAt,
      items: lines.map((l) => ({
        productId: l.productId,
        packageId: l.packageId,
        quantity: l.quantity == null ? null : Number(l.quantity),
        unit: l.unit,
        requirements: l.requirements,
        snapshot: l.snapshot,
      })),
      history: history.map((h) => ({ status: h.status, occurredAt: h.occurredAt })),
      notifications: notifications.map((n) => ({ audience: n.audience, state: n.state })),
    };
  }
  async detail(req: AuthRequest, id: string) {
    if (Object.keys(req.query).length) throw new BadRequestException();
    const user = this.auth.require(req, ["customer"]);
    return this.source.transaction("REPEATABLE READ", async (m) =>
      this.project(m, await this.owned(m, id, user.id)),
    );
  }
  async counts(req: AuthRequest) {
    if (Object.keys(req.query).length) throw new BadRequestException();
    const user = this.auth.require(req, ["customer"]);
    const rows = await this.source
      .getRepository(CustomerInquiry)
      .createQueryBuilder("i")
      .select("i.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("i.userId = :userId", { userId: user.id })
      .groupBy("i.status")
      .getRawMany();
    const draft = Number(rows.find((r) => r.status === "draft")?.count || 0),
      submitted = Number(rows.find((r) => r.status === "submitted")?.count || 0);
    return { draft, submitted, total: draft + submitted };
  }
  async list(req: AuthRequest) {
    const user = this.auth.require(req, ["customer"]),
      query = req.query;
    if (
      Object.keys(query).some((k) => !["q", "status", "sort", "page", "pageSize"].includes(k)) ||
      Object.values(query).some((v) => typeof v !== "string")
    )
      throw new BadRequestException();
    const page = Number(query.page || 1),
      pageSize = Number(query.pageSize || 10),
      q = String(query.q || "").trim(),
      status = String(query.status || ""),
      sort = String(query.sort || "desc");
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50 ||
      !/^[A-Za-z0-9-]{0,32}$/.test(q) ||
      !["", "draft", "submitted"].includes(status) ||
      !["asc", "desc"].includes(sort)
    )
      throw new BadRequestException();
    return this.source.transaction("REPEATABLE READ", async (m) => {
      const b = m
        .getRepository(CustomerInquiry)
        .createQueryBuilder("i")
        .where("i.userId = :id", { id: user.id });
      if (q) b.andWhere("i.reference LIKE :q", { q: `%${q}%` });
      if (status) b.andWhere("i.status = :status", { status });
      const [rows, total] = await b
        .orderBy("i.createdAt", sort === "asc" ? "ASC" : "DESC")
        .addOrderBy("i.id", sort === "asc" ? "ASC" : "DESC")
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();
      return {
        items: rows.map((i) => ({
          id: i.id,
          reference: i.reference,
          status: i.status,
          destination: i.fields.destination,
          createdAt: i.createdAt,
          submittedAt: i.submittedAt,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    });
  }
}
