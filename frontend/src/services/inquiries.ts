import { apiRequest } from "./api";
export type InquiryFields = {
  kind: "individual" | "company";
  name: string;
  company: string;
  destination: string;
  phone: string;
  notes: string;
};
export type InquiryItem = {
  productId: string;
  packageId: string | null;
  quantity: number | null;
  unit: "packages" | "kg" | "L" | null;
  requirements: string;
  snapshot?: { name: string; description: string; package: string | null } | null;
};
export type Inquiry = {
  id: string;
  reference: string;
  status: "draft" | "submitted";
  revision: number;
  lang: "ar" | "en";
  fields: InquiryFields;
  contactEmail: string;
  items: InquiryItem[];
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  history: { status: "submitted"; occurredAt: string }[];
  notifications: {
    audience: "customer" | "company";
    state: "pending" | "sending" | "captured" | "sent" | "failed";
  }[];
};
export type InquirySummary = Pick<
  Inquiry,
  "id" | "reference" | "status" | "createdAt" | "submittedAt"
> & { destination: string };
export type InquiryFilters = {
  q: string;
  status: "" | "draft" | "submitted";
  sort: "asc" | "desc";
  page: number;
  pageSize: number;
};
export type InquiryList = {
  items: InquirySummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type InquiryCounts = { draft: number; submitted: number; total: number };
export type SaveInquiry = Pick<Inquiry, "revision" | "lang" | "fields"> & { items: InquiryItem[] };
const base = () => import.meta.env.VITE_API_BASE_URL || window.location.origin;
const path = "/api/v1/account/inquiries";
export const readInquiries = (filters: InquiryFilters, signal?: AbortSignal) =>
  apiRequest<InquiryList>(
    base(),
    `${path}?${new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)]))}`,
    { signal },
  );
export const readInquiry = (id: string, signal?: AbortSignal) =>
  apiRequest<Inquiry>(base(), `${path}/${encodeURIComponent(id)}`, { signal });
export const readInquiryCounts = (signal?: AbortSignal) =>
  apiRequest<InquiryCounts>(base(), `${path}/counts`, { signal });
export function writeInquiry(
  suffix: string,
  body: unknown,
  csrf: string,
  signal: AbortSignal,
  method = "POST",
) {
  return apiRequest<Inquiry>(base(), path + suffix, {
    method,
    body,
    signal,
    headers: { "X-CSRF-Token": csrf },
  });
}
