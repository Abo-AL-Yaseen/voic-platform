import { Inject, Injectable } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { DATABASE_SOURCE } from "../database/database.service.js";
import { AuthService, type AuthRequest } from "../auth/auth.service.js";
import { exact, text, bad } from "../content/content.validation.js";
// A read-only projection retains historical rows in their original tables.
const history = `SELECT id,actorId,actorRole,action,target,requestId,changes,createdAt FROM staff_audit_events
UNION ALL SELECT id,actorId,actorRole,CONCAT('inquiry.',action),inquiryId,requestId,metadata,createdAt FROM inquiry_audit_events
UNION ALL SELECT id,actorId,actorRole,CONCAT('content.',action),target,requestId,JSON_OBJECT('version',version,'revisionId',revisionId),createdAt FROM staff_editorial_events`;
@Injectable()
export class AuditService {
  constructor(
    @Inject(DATABASE_SOURCE) readonly source: DataSource,
    readonly auth: AuthService,
  ) {}
  async list(req: AuthRequest) {
    this.auth.permission(req, "audit:read");
    const q = req.query as Record<string, string>;
    exact(q, ["actor", "action", "target", "from", "to", "page", "pageSize"]);
    const n = (k: string, d: number, max: number) => {
      const v = q[k] ?? String(d);
      if (typeof v !== "string" || !/^\d+$/.test(v) || +v < 1 || +v > max) bad();
      return +v;
    };
    const page = n("page", 1, 10000),
      pageSize = n("pageSize", 20, 50),
      clauses: string[] = [],
      values: unknown[] = [];
    if (q.actor !== undefined) {
      text(q.actor, 36);
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(q.actor)) bad();
      clauses.push("actorId=?");
      values.push(q.actor);
    }
    if (q.action !== undefined) {
      text(q.action, 80);
      if (!/^[a-z][a-z0-9_.-]{1,79}$/.test(q.action)) bad();
      clauses.push("action=?");
      values.push(q.action);
    }
    if (q.target !== undefined) {
      text(q.target, 120);
      if (!/^[a-zA-Z0-9:_-]{1,120}$/.test(q.target)) bad();
      clauses.push("target=?");
      values.push(q.target);
    }
    for (const k of ["from", "to"]) {
      if (q[k] !== undefined) {
        if (
          typeof q[k] !== "string" ||
          !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(q[k]!) ||
          !Number.isFinite(Date.parse(q[k]!))
        )
          bad();
        const date=new Date(q[k]!),canonical=q[k]!.includes(".")?q[k]!:q[k]!.replace("Z",".000Z");
        if(date.getUTCFullYear()<1000 || date.toISOString()!==canonical)bad();
        clauses.push(`createdAt ${k === "from" ? ">=" : "<="} ?`);
        values.push(date);
      }
    }
    if (q.from && q.to && Date.parse(q.from) > Date.parse(q.to)) bad();
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const total = Number(
      (await this.source.query(`SELECT COUNT(*) n FROM (${history}) events${where}`, values))[0].n,
    );
    const rows = await this.source.query(
      `SELECT * FROM (${history}) events${where} ORDER BY createdAt DESC,id DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, (page - 1) * pageSize],
    );
    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: rows.map((r: any) => ({
        ...r,
        changes: typeof r.changes === "string" ? JSON.parse(r.changes) : r.changes,
      })),
    };
  }
}
