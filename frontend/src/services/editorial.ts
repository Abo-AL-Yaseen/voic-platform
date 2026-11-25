import { apiRequest } from "./api";
export type ContentKind = "products" | "categories" | "uses" | "recipes" | "pages";
export type Body = Record<string, any>;
export type EditorialRecord = {
  key: string;
  kind: ContentKind;
  id: string;
  slug: string;
  version: number;
  draftId: string;
  publishedId: string | null;
  reviewId: string | null;
  approvalScope: "development" | "approved";
  approvedBy: string | null;
  archived: boolean;
  draft: { id: string; number: number; body: Body };
  published: { id: string; number: number; body: Body } | null;
  permissions: { canWrite: boolean; canPublish: boolean; productionWrites: false };
};
export type EditorialFilters = { q: string; status: string; page: number; pageSize: number };
export type EditorialList = {
  items: {
    id: string;
    slug: string;
    version: number;
    archived: boolean;
    published: boolean;
    review: boolean;
    changed: boolean;
    updatedAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export type Media = {
  id: string;
  url: string;
  filename: string | null;
  source: "original" | "upload";
  altAr: string;
  altEn: string;
  version: number;
  archived: boolean;
  createdAt: string;
};
export const editorialBase = () => import.meta.env.VITE_API_BASE_URL || window.location.origin;
const root = "/api/v1/staff/content";
export const editorialGet = <T>(path: string, signal: AbortSignal) =>
  apiRequest<T>(editorialBase(), root + path, { signal });
export const filterParams = (f: object) =>
  new URLSearchParams(Object.entries(f).map(([k, v]) => [k, String(v)]));
export const editorialWrite = <T>(path: string, body: object, csrf: string, signal: AbortSignal) =>
  apiRequest<T>(editorialBase(), root + path, {
    method: "POST",
    body,
    signal,
    headers: { "X-CSRF-Token": csrf },
  });
export const mediaPreview = (m: Media) =>
  m.source === "original"
    ? m.url
    : new URL(`${root}/media/${encodeURIComponent(m.id)}/preview`, editorialBase()).href;
