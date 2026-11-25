import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import type { AuthRequest } from "../auth/auth.service.js";
import { StaffAudit, StaffAdministrationLock } from "./security.entities.js";
export const correlation = (req?: AuthRequest) =>
  String(req?.res?.getHeader("X-Request-Id") || randomUUID());
export async function administrationLock(m: EntityManager) {
  await m.findOneOrFail(StaffAdministrationLock, {
    where: { id: 1 },
    lock: { mode: "pessimistic_write" },
  });
}
export async function audit(
  m: EntityManager,
  actor: { id: string; role: string } | null,
  action: string,
  target: string,
  changes: StaffAudit["changes"] = {},
  req?: AuthRequest,
  receipt?: { key: string; fingerprint: string },
) {
  await m.insert(StaffAudit, {
    id: randomUUID(),
    actorId: actor?.id || null,
    actorRole: actor?.role || "operator",
    action,
    target,
    changes,
    requestId: correlation(req),
    requestKey: receipt?.key || null,
    fingerprint: receipt?.fingerprint || null,
    createdAt: new Date(),
  });
}
