import { apiRequest } from "./api";
import type { Inquiry, InquiryStatus, PageInfo, DetailPages } from "./inquiries";
export type StaffFilters = {
  q: string;
  status: string;
  destination: string;
  sort: string;
  page: number;
  pageSize: number;
};
export type StaffPages = DetailPages & { notePage: number };
export type StaffInquiry = Inquiry & {
  internalNotes: { id: string; text: string; createdAt: string }[];
  notePagination: PageInfo;
  permissions: {
    writesEnabled: boolean;
    canMessage: boolean;
    canNote: boolean;
    transitions: InquiryStatus[];
  };
};
export type StaffList = {
  items: {
    id: string;
    reference: string;
    status: InquiryStatus;
    submittedAt: string;
    destination: string;
    customer: { name: string; company: string; email: string };
  }[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};
export type StaffStats = {
  total: number;
  byStatus: Record<Exclude<InquiryStatus, "draft">, number>;
  scope: "all_submitted_inquiries";
  writesEnabled: boolean;
};
export type StaffAction = {
  key: string;
  revision: number;
  type: "status" | "message" | "note";
  status?: InquiryStatus;
  text?: string;
};
export type Reply = { key: string; revision: number; text: string };
export type ActionResult<T = StaffInquiry> = {
  record: T;
  actionId: string;
  appliedRevision: number;
};
const base = () => import.meta.env.VITE_API_BASE_URL || window.location.origin;
const params = (values: object) =>
  new URLSearchParams(Object.entries(values).map(([k, v]) => [k, String(v)]));
export const readStaffList = (filters: StaffFilters, signal?: AbortSignal) =>
  apiRequest<StaffList>(base(), `/api/v1/staff/inquiries?${params(filters)}`, { signal });
export const readStaffStats = (signal?: AbortSignal) =>
  apiRequest<StaffStats>(base(), "/api/v1/staff/inquiries/stats", { signal });
export const readStaffInquiry = (id: string, pages: StaffPages, signal?: AbortSignal) =>
  apiRequest<StaffInquiry>(
    base(),
    `/api/v1/staff/inquiries/${encodeURIComponent(id)}?${params(pages)}`,
    { signal },
  );
export function workflowRequest<T>(
  id: string,
  staff: boolean,
  body: StaffAction | Reply | { key: string },
  csrf: string,
  signal: AbortSignal,
  resolve = false,
) {
  return apiRequest<ActionResult<T>>(
    base(),
    `/api/v1/${staff ? "staff" : "account"}/inquiries/${encodeURIComponent(id)}/${resolve ? `actions/${encodeURIComponent(body.key)}` : staff ? "actions" : "replies"}`,
    {
      method: resolve ? "GET" : "POST",
      ...(resolve ? {} : { body, headers: { "X-CSRF-Token": csrf } }),
      signal,
    },
  );
}
