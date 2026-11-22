export const inquiryKeys = {
  customer: (userId: string) => ["inquiries", "customer", userId] as const,
  customerList: (userId: string, filters: object) =>
    [...inquiryKeys.customer(userId), "list", filters] as const,
  customerDetail: (userId: string, id: string) =>
    [...inquiryKeys.customer(userId), "detail", id] as const,
  staffList: (filters: object) => ["inquiries", "staff", "list", filters] as const,
  staffDetail: (id: string) => ["inquiries", "staff", "detail", id] as const,
};
