import type { StaffFilters } from "../services/staffInquiries";
export function staffInquiryFilters(search: string): StaffFilters {
  const p = new URLSearchParams(search);
  return {
    q: p.get("q") || "",
    status: p.get("status") || "",
    destination: p.get("destination") || "",
    sort: p.get("sort") || "desc",
    page: Number(p.get("page") || 1),
    pageSize: Number(p.get("pageSize") || 10),
  };
}
export function staffInquiryLocation(filters: StaffFilters) {
  return `/staff/inquiries?${new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => [k, String(v)]),
  )}`;
}
