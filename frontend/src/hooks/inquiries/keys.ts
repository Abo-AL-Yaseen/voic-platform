import type { InquiryFilters } from "../../services/inquiries";
export const inquiryKeys = {
  customer: (userId: string, epoch: number) => ["inquiries", "customer", userId, epoch] as const,
  lists: (userId: string, epoch: number) =>
    [...inquiryKeys.customer(userId, epoch), "list"] as const,
  customerList: (userId: string, epoch: number, filters: InquiryFilters) =>
    [...inquiryKeys.lists(userId, epoch), filters] as const,
  customerDetail: (userId: string, epoch: number, id: string) =>
    [...inquiryKeys.customer(userId, epoch), "detail", id] as const,
  counts: (userId: string, epoch: number) =>
    [...inquiryKeys.customer(userId, epoch), "counts"] as const,
};
