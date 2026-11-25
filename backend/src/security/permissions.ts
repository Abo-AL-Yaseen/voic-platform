import type { Role } from "../auth/auth.entities.js";
export const permissionMatrix = {
  administrator: [
    "staff:access",
    "inquiries:manage",
    "content:edit",
    "content:publish",
    "employees:manage",
    "audit:read",
  ],
  sales: ["staff:access", "inquiries:manage"],
  content_editor: ["staff:access", "content:edit"],
  customer: [],
} as const satisfies Record<Role, readonly string[]>;
export type Permission = (typeof permissionMatrix.administrator)[number];
export const hasPermission = (role: Role, permission: Permission) =>
  (permissionMatrix[role] as readonly string[]).includes(permission);
