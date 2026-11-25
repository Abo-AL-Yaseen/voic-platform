import { hasPermission } from "../security/permissions.js";
import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { In, type DataSource, type EntityManager } from "typeorm";
import { DATABASE_SOURCE, DatabaseService } from "../database/database.service.js";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";
import { AuthService, type AuthRequest } from "../auth/auth.service.js";
import { AuthRateLimit } from "../auth/rate-limit.js";
import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.config.js";
import { workflowConfiguration } from "../inquiries/workflow.config.js";
import {
  CatalogProduct,
  CatalogTranslation,
  CatalogPackage,
  CatalogTerm,
} from "../catalog/catalog.entities.js";
import {
  ContentDocument,
  ContentRevision,
  ContentMedia,
  ContentMediaUsage,
  ContentWriteLock,
  EditorialEvent,
  contentKinds,
  type ContentKind,
  type ContentBody,
} from "./content.entities.js";
import { bad, exact, identifier, validateContent, mediaUrls } from "./content.validation.js";
import { correlation } from "../security/audit.js";
export const contentKey = (kind: string, id: string) => `${kind}:${id}`;
export async function editorLock(m: EntityManager) {
  await m.findOneOrFail(ContentWriteLock, {
    where: { id: 1 },
    lock: { mode: "pessimistic_write" },
  });
}
export async function recordRevision(
  m: EntityManager,
  d: ContentDocument,
  body: ContentBody,
  actorId: string | null,
) {
  const r = m.create(ContentRevision, {
    id: randomUUID(),
    documentKey: d.key,
    number: d.version,
    body,
    actorId,
    createdAt: new Date(),
  });
  await m.insert(ContentRevision, r);
  for (const url of mediaUrls(body)) {
    const media = await m.findOneBy(ContentMedia, { url });
    if (!media || media.archived) throw new BadRequestException({ code: "CONTENT_MEDIA" });
    await m.insert(ContentMediaUsage, { mediaId: media.id, revisionId: r.id, documentKey: d.key });
  }
  return r;
}
@Injectable()
export class ContentService {
  constructor(
    @Inject(DATABASE_SOURCE) readonly source: DataSource,
    private readonly database: DatabaseService,
    readonly auth: AuthService,
    readonly limits: AuthRateLimit,
    @Inject(ENVIRONMENT) readonly env: Environment,
    @Inject(AUTH_CONFIG) readonly mail: AuthConfig,
  ) {}
  staff(req: AuthRequest) {
    return this.auth.permission(req, "content:edit");
  }
  async ready() {
    if (!(await this.database.isReady())) throw new ServiceUnavailableException();
  }
  kind(value: string): ContentKind {
    if (!(contentKinds as readonly string[]).includes(value)) throw new NotFoundException();
    return value as ContentKind;
  }
  permissions(req: AuthRequest) {
    const u = this.staff(req);
    return {
      canWrite:
        !!u.emailVerifiedAt &&
        workflowConfiguration(this.env, process.env, this.mail.mode).writesEnabled,
      canPublish: hasPermission(u.role, "content:publish"),
      productionWrites: false,
    };
  }
  async write(
    req: AuthRequest,
    fn: (m: EntityManager, u: ReturnType<AuthService["require"]>) => Promise<any>,
  ) {
    const u = this.staff(req);
    if (!this.permissions(req).canWrite)
      throw new ForbiddenException({
        code: !u.emailVerifiedAt ? "EMAIL_UNVERIFIED" : "STAFF_WRITES_DISABLED",
      });
    await this.limits.take("content-write", u.id, 60);
    try {
      // Authentication reads precede the editorial lock. READ COMMITTED prevents their
      // earlier snapshot from hiding a concurrent commit after we acquire that lock.
      return await this.source.transaction("READ COMMITTED", async (m) => {
        const locked = await this.auth.lockCurrent(m, req, u.id);
        if (!hasPermission(locked.role, "content:edit") || !locked.emailVerifiedAt)
          throw new ForbiddenException({ code: "CONTENT_FORBIDDEN" });
        await editorLock(m);
        return fn(m, locked);
      });
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") throw new ConflictException({ code: "CONTENT_UNIQUE" });
      throw e;
    }
  }
  async dto(m: EntityManager, d: ContentDocument, req: AuthRequest) {
    const draft = await m.findOneByOrFail(ContentRevision, { id: d.draftId });
    const published = d.publishedId
      ? await m.findOneByOrFail(ContentRevision, { id: d.publishedId })
      : null;
    return {
      ...d,
      draft: { id: draft.id, number: draft.number, body: draft.body },
      published: published
        ? { id: published.id, number: published.number, body: published.body }
        : null,
      permissions: this.permissions(req),
    };
  }
  async detail(req: AuthRequest, kind: ContentKind, id: string) {
    this.staff(req);
    if (Object.keys(req.query).length) bad();
    if (!identifier(id)) throw new NotFoundException();
    return this.source.transaction("REPEATABLE READ", async (m) => {
      const d = await m.findOneBy(ContentDocument, { key: contentKey(kind, id) });
      if (!d) throw new NotFoundException();
      return this.dto(m, d, req);
    });
  }
  async list(req: AuthRequest, kind: ContentKind) {
    this.staff(req);
    if (Object.keys(req.query).some((k) => !["q", "status", "page", "pageSize"].includes(k))) bad();
    const { page, pageSize, q, status } = this.filters(req.query);
    const b = this.source
      .getRepository(ContentDocument)
      .createQueryBuilder("d")
      .where("d.kind=:kind", { kind });
    if (q)
      b.andWhere("(d.id LIKE :q ESCAPE '!' OR d.slug LIKE :q ESCAPE '!')", {
        q: `%${q.replace(/[!%_]/g, "!$&")}%`,
      });
    if (status === "archived") b.andWhere("d.archived=1");
    else if (status === "review") b.andWhere("d.reviewId IS NOT NULL");
    else if (status === "published") b.andWhere("d.publishedId IS NOT NULL");
    else if (status === "draft") b.andWhere("(d.publishedId IS NULL OR d.draftId<>d.publishedId)");
    const [rows, total] = await b
      .orderBy("d.updatedAt", "DESC")
      .addOrderBy("d.key", "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      items: rows.map((d) => ({
        id: d.id,
        slug: d.slug,
        version: d.version,
        archived: d.archived,
        published: !!d.publishedId,
        review: !!d.reviewId,
        changed: d.draftId !== d.publishedId,
        updatedAt: d.updatedAt,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
  filters(query: any) {
    if (
      Object.keys(query).some(
        (k) => !["q", "page", "pageSize", "status", "lang", "category", "productId"].includes(k),
      ) ||
      Object.values(query).some((v) => typeof v !== "string")
    )
      bad();
    const page = Number(query.page || 1),
      pageSize = Number(query.pageSize || 10),
      q = String(query.q || "").trim(),
      status = String(query.status || "");
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50 ||
      q.length > 100 ||
      !["", "draft", "review", "published", "archived"].includes(status)
    )
      bad();
    return { page, pageSize, q, status };
  }
  fingerprint(target: string, body: any) {
    return createHash("sha256").update(JSON.stringify({ target, body })).digest("hex");
  }
  async receipt(m: EntityManager, actorId: string, key: string, fingerprint: string) {
    if (
      typeof key !== "string" ||
      !/^([a-f0-9]{8})-([a-f0-9]{4})-4([a-f0-9]{3})-[89ab]([a-f0-9]{3})-([a-f0-9]{12})$/.test(key)
    )
      bad();
    const old = await m.findOneBy(EditorialEvent, { actorId, requestKey: key });
    if (old && old.fingerprint !== fingerprint)
      throw new ConflictException({ code: "IDEMPOTENCY_CONFLICT" });
    return old;
  }
  async audit(
    m: EntityManager,
    u: any,
    target: string,
    input: any,
    version: number,
    revisionId: string | null,
    requestId?: string,
  ) {
    await m.insert(EditorialEvent, {
      id: randomUUID(),
      actorId: u.id,
      actorRole: u.role,
      requestKey: input.key,
      fingerprint: this.fingerprint(target, input),
      target,
      action: input.action,
      version,
      revisionId,
      createdAt: new Date(),
      requestId: requestId || null,
    });
  }
  async mutate(req: AuthRequest, kind: ContentKind, id: string, input: any) {
    exact(input, [
      "key",
      "version",
      "action",
      "body",
      "approveForProduction",
      "legalApproval",
      "confirmation",
    ]);
    if (
      !identifier(id) ||
      !Number.isInteger(input.version) ||
      input.version < 0 ||
      input.version > 1000000 ||
      !["create", "save", "review", "publish", "unpublish", "archive"].includes(input.action)
    )
      bad();
    const target = contentKey(kind, id),
      fingerprint = this.fingerprint(target, input);
    return this.write(req, async (m, u) => {
      let d = await m.findOneBy(ContentDocument, { key: target });
      const old = await this.receipt(m, u.id, input.key, fingerprint);
      if (old) {
        if (!d) throw new NotFoundException();
        return this.dto(m, d, req);
      }
      if (input.action === "create") {
        if (d || input.version !== 0) throw new ConflictException({ code: "CONTENT_UNIQUE" });
        if (kind === "pages") bad();
        validateContent(kind, input.body);
        if (input.body.id !== id) bad();
        d = m.create(ContentDocument, {
          key: target,
          kind,
          id,
          slug: input.body.slug,
          version: 1,
          draftId: randomUUID(),
          publishedId: null,
          reviewId: null,
          approvedBy: null,
          approvalScope: "development",
          archived: false,
          updatedAt: new Date(),
        });
        await m.insert(ContentDocument, d);
        await this.relationships(m, d, input.body, false);
        const r = await recordRevision(m, d, input.body, u.id);
        d.draftId = r.id;
      } else {
        if (!d) throw new NotFoundException();
        if (input.version !== d.version) throw new ConflictException({ code: "CONTENT_CONFLICT" });
        const previous = await m.findOneByOrFail(ContentRevision, { id: d.draftId });
        if (input.action === "save") {
          validateContent(kind, input.body);
          if (input.body.id !== d.id || input.body.slug !== d.slug) bad();
          if (
            kind === "pages" &&
            (JSON.stringify(Object.keys(input.body.texts).sort()) !==
              JSON.stringify(Object.keys(previous.body.texts).sort()) ||
              JSON.stringify(Object.keys(input.body.links).sort()) !==
                JSON.stringify(Object.keys(previous.body.links).sort()) ||
              JSON.stringify(Object.keys(input.body.images).sort()) !==
                JSON.stringify(Object.keys(previous.body.images).sort()) ||
              input.body.rows.length !== previous.body.rows.length)
          )
            bad();
          await this.relationships(m, d, input.body, false);
          d.version++;
          const r = await recordRevision(m, d, input.body, u.id);
          d.draftId = r.id;
          d.reviewId = null;
          d.archived = false;
        } else if (input.action === "review") {
          if (d.archived) bad();
          validateContent(kind, previous.body, true);
          await this.relationships(m, d, previous.body, true);
          d.reviewId = d.draftId;
          d.version++;
        } else {
          if (!hasPermission(u.role, "content:publish"))
            throw new ForbiddenException({ code: "CONTENT_FORBIDDEN" });
          if (input.action === "publish") {
            if (d.archived || d.reviewId !== d.draftId)
              throw new ConflictException({ code: "CONTENT_REVIEW" });
            validateContent(kind, previous.body, true);
            await this.relationships(m, d, previous.body, true);
            if (
              input.approveForProduction !== undefined &&
              typeof input.approveForProduction !== "boolean"
            )
              bad();
            if (
              input.approveForProduction &&
              (input.confirmation !== "APPROVE BOTH LOCALES" ||
                (kind === "pages" &&
                  id === "privacy" &&
                  input.legalApproval !== "LEGAL REVIEW COMPLETE"))
            )
              throw new BadRequestException({ code: "CONTENT_APPROVAL" });
            const scope = input.approveForProduction ? "approved" : "development";
            await this.materialize(m, d, previous.body, true, scope);
            d.publishedId = d.draftId;
            d.reviewId = null;
            d.approvedBy = u.id;
            d.approvalScope = scope;
            d.archived = false;
            d.version++;
          } else {
            await this.assertUnpublishable(m, d);
            await this.materialize(m, d, previous.body, false, d.approvalScope);
            d.publishedId = null;
            d.reviewId = null;
            d.archived = input.action === "archive";
            d.version++;
          }
        }
      }
      d.updatedAt = new Date();
      await m.save(d);
      await this.audit(m, u, target, input, d.version, d.draftId, correlation(req));
      return this.dto(m, d, req);
    });
  }
  async relationships(m: EntityManager, d: ContentDocument, b: ContentBody, publish: boolean) {
    if (d.kind === "products") {
      for (const [kind, id] of [
        ["brand", b.brandKey],
        ["category", b.categoryKey],
        ...b.useKeys.map((id: string) => ["usage", id]),
        ...b.displayUseKeys.map((id: string) => ["usage", id]),
      ]) {
        const term = await m.findOneBy(CatalogTerm, { kind, id } as any);
        if (!term || (publish && !term.published))
          throw new BadRequestException({ code: "CONTENT_REFERENCE" });
      }
      const current = await m.find(CatalogPackage, { where: { productId: d.id } });
      for (const p of b.packages) {
        const existing = await m.findOneBy(CatalogPackage, { id: p.id });
        if (existing && existing.productId !== d.id)
          throw new ConflictException({ code: "CONTENT_UNIQUE" });
      }
      if (current.some((p) => !b.packages.some((x: any) => x.id === p.id)))
        throw new ConflictException({ code: "CONTENT_REFERENCE" });
      if (publish && b.featuredOrder !== null) {
        const other = await m.findOne(CatalogProduct, {
          where: { featuredOrder: b.featuredOrder, published: true },
        });
        if (other && other.id !== d.id) throw new ConflictException({ code: "CONTENT_REFERENCE" });
      }
    }
    if (d.kind === "recipes" || (d.kind === "pages" && b.featuredProductIds.length))
      for (const id of d.kind === "recipes" ? b.productIds : b.featuredProductIds) {
        const p = await m.findOneBy(CatalogProduct, { id });
        if (!p || (publish && !p.published))
          throw new BadRequestException({ code: "CONTENT_REFERENCE" });
      }
    if (publish) for (const url of mediaUrls(b)) await this.approvedMedia(m, url);
  }
  async approvedMedia(m: EntityManager, url: string) {
    const r = await m.findOneBy(ContentMedia, { url });
    if (!r || r.archived || !r.altAr.trim() || !r.altEn.trim())
      throw new BadRequestException({ code: "CONTENT_MEDIA" });
  }
  async assertUnpublishable(m: EntityManager, d: ContentDocument) {
    if (["categories", "uses"].includes(d.kind)) {
      const docs = await m.find(ContentRevision);
      const linked = docs.some(
        (r) =>
          r.documentKey !== d.key &&
          (d.kind === "categories"
            ? r.body.categoryKey === d.id
            : [...(r.body.useKeys || []), ...(r.body.displayUseKeys || [])].includes(d.id)),
      );
      const products = await m.find(CatalogProduct);
      if (
        linked ||
        products.some((p) =>
          d.kind === "categories"
            ? p.categoryKey === d.id
            : [...p.useKeys, ...p.displayUseKeys].includes(d.id),
        )
      )
        throw new ConflictException({ code: "CONTENT_REFERENCE" });
    }
  }
  async materialize(
    m: EntityManager,
    d: ContentDocument,
    b: ContentBody,
    published: boolean,
    scope: string,
  ) {
    if (d.kind === "products") {
      if (!published) {
        await m.update(CatalogProduct, { id: d.id }, { published: false });
        return;
      }
      const old = await m.findOneBy(CatalogProduct, { id: d.id });
      const p = {
        id: d.id,
        slug: d.slug,
        brandKey: b.brandKey,
        categoryKey: b.categoryKey,
        useKeys: b.useKeys,
        displayUseKeys: b.displayUseKeys,
        referenceOrder: b.referenceOrder,
        featuredOrder: b.featuredOrder,
        published: true,
        approvalScope: scope as any,
        image: b.image || null,
        imagePublished: !!b.image,
      };
      if (old) await m.update(CatalogProduct, { id: d.id }, p);
      else await m.insert(CatalogProduct, { ...p, privateNotes: null });
      for (const locale of ["ar", "en"] as const) {
        const ar = locale === "ar";
        const f = (value: string | null, enabled = true) => ({
          value: value || null,
          published: !!value && enabled,
        });
        const prior = await m.findOneBy(CatalogTranslation, { productId: d.id, locale });
        const fields = {
          name: f(ar ? b.nameAr : b.nameEn),
          description: f(ar ? b.descriptionAr : b.descriptionEn),
          ingredients: f(ar ? b.ingredientsAr : b.ingredientsEn, b.ingredientsApproved),
          aliases: prior?.fields.aliases || { value: [], published: false },
        };
        const tr = { productId: d.id, locale, published: true, fields };
        if (prior) await m.update(CatalogTranslation, { productId: d.id, locale }, tr);
        else await m.insert(CatalogTranslation, tr);
      }
      for (const pack of b.packages) {
        const exists = await m.existsBy(CatalogPackage, { id: pack.id });
        if (exists) await m.update(CatalogPackage, { id: pack.id }, { ...pack, productId: d.id });
        else await m.insert(CatalogPackage, { ...pack, productId: d.id });
      }
    } else if (d.kind === "categories" || d.kind === "uses") {
      const kind = d.kind === "categories" ? "category" : "usage";
      const r = { kind, id: d.id, ar: b.ar, en: b.en, published } as CatalogTerm;
      if (await m.existsBy(CatalogTerm, { kind, id: d.id }))
        await m.update(CatalogTerm, { kind, id: d.id }, r);
      else await m.insert(CatalogTerm, r);
    } else if (d.kind === "pages" && d.id === "home" && published) {
      await m.createQueryBuilder().update(CatalogProduct).set({ featuredOrder: null }).execute();
      for (const [order, id] of b.featuredProductIds.entries())
        await m.update(CatalogProduct, { id }, { featuredOrder: order });
    }
  }
  async publicDocs(kind: "recipes" | "pages", query: any, id?: string) {
    await this.ready();
    if (id && Object.keys(query).some((k) => k !== "lang")) bad();
    const f = this.filters(query);
    const lang = query.lang === "en" ? "en" : "ar";
    if (query.category && !["sweets-baking", "main-dishes"].includes(query.category)) bad();
    if (query.productId && !identifier(query.productId)) bad();
    if (query.status) bad();
    return this.source.transaction("REPEATABLE READ", async (m) => {
      const docs = await m.find(ContentDocument, {
        where: { kind, archived: false },
        order: { id: "ASC" },
      });
      const visible = docs.filter(
        (d) =>
          d.publishedId && (this.env.nodeEnv !== "production" || d.approvalScope === "approved"),
      );
      const revisions = visible.length
        ? await m.find(ContentRevision, { where: { id: In(visible.map((d) => d.publishedId!)) } })
        : [];
      const records: ContentBody[] = visible.flatMap((d) => {
        const r = revisions.find((r) => r.id === d.publishedId);
        if (!r) return [];
        const body = structuredClone(r.body);
        if (kind === "recipes") {
          if (
            !body[lang === "ar" ? "titleAr" : "titleEn"]?.trim() ||
            !body[lang === "ar" ? "descriptionAr" : "descriptionEn"]?.trim()
          )
            return [];
          delete body.id;
          for (const ingredient of body.ingredients)
            for (const k of ["amount", "unitAr", "unitEn"])
              if (ingredient[k] === null) delete ingredient[k];
          for (const k of ["temperatureC", "knownTimeAr", "knownTimeEn"])
            if (body[k] === null) delete body[k];
        }
        return [{ ...body, publishedRevision: r.id }];
      });
      if (id) {
        const r = records.find((r) => r.id === id || r.slug === id);
        if (!r) throw new NotFoundException();
        return r;
      }
      const q = f.q.toLocaleLowerCase();
      const matching = records.filter(
        (r) =>
          (!q ||
            [r.titleAr, r.titleEn, r.descriptionAr, r.descriptionEn]
              .join(" ")
              .toLocaleLowerCase()
              .includes(q)) &&
          (!query.category || r.category === query.category) &&
          (!query.productId || r.productIds?.includes(query.productId)),
      );
      return {
        items: matching.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
        page: f.page,
        pageSize: f.pageSize,
        total: matching.length,
        totalPages: Math.max(1, Math.ceil(matching.length / f.pageSize)),
      };
    });
  }
  async metadata(req: AuthRequest) {
    this.staff(req);
    if (Object.keys(req.query).length) bad();
    return {
      brands: await this.source.getRepository(CatalogTerm).find({
        where: { kind: "brand", published: true },
        select: { id: true, ar: true, en: true },
      }),
      permissions: this.permissions(req),
    };
  }
}
