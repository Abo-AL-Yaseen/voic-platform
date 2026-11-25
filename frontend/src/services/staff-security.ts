import { apiRequest } from "./api";
import type { Session, User } from "./auth";
const base = () => import.meta.env.VITE_API_BASE_URL || window.location.origin;
export const securityGet = <T>(path: string, signal?: AbortSignal) =>
  apiRequest<T>(base(), `/api/v1/${path}`, { signal });
export const securityWrite = <T>(path: string, body: unknown, csrf: string, signal?: AbortSignal) =>
  apiRequest<T>(base(), `/api/v1/${path}`, {
    method: "POST",
    body,
    signal,
    headers: { "X-CSRF-Token": csrf },
  });
export type SecurityStatus = {
  enrolled: boolean;
  restricted: boolean;
  challengeExpiresAt: string;
  recoveryRemaining: number;
  recent: boolean;
};
export type Enrollment = { secret: string; uri: string; qr: string; expiresAt: string };
export type SecurityResult = { session: Session; recoveryCodes?: string[] };
export type Employee = {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  suspendedAt: string | null;
  version: number;
  emailVerified: boolean;
  mfaEnrolled: boolean;
};
export type Invitation = {
  id: string;
  email: string;
  role: User["role"];
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export type AuditEvent = {
  id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  target: string;
  requestId: string | null;
  changes: Record<string, string | number | boolean | null>;
  createdAt: string;
};
export function params(filters: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}
