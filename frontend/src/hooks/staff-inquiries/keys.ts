import type { StaffFilters, StaffPages } from "../../services/staffInquiries";
export const staffInquiryKeys = {
  scope: (id: string, role: string, epoch: number) => ["staff-inquiries", id, role, epoch] as const,
  lists: (id: string, role: string, epoch: number) =>
    [...staffInquiryKeys.scope(id, role, epoch), "list"] as const,
  list: (id: string, role: string, epoch: number, f: StaffFilters) =>
    [...staffInquiryKeys.lists(id, role, epoch), f] as const,
  stats: (id: string, role: string, epoch: number) =>
    [...staffInquiryKeys.scope(id, role, epoch), "stats"] as const,
  detailPrefix: (id: string, role: string, epoch: number, inquiry: string) =>
    [...staffInquiryKeys.scope(id, role, epoch), "detail", inquiry] as const,
  detail: (
    id: string,
    role: string,
    epoch: number,
    inquiry: string,
    p: StaffPages = { messagePage: 1, historyPage: 1, notePage: 1 },
  ) => [...staffInquiryKeys.detailPrefix(id, role, epoch, inquiry), p] as const,
};
