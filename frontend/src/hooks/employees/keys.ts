export const employeeKeys = {
  list: (filters: object) => ["employees", "staff", "list", filters] as const,
  detail: (id: string) => ["employees", "staff", "detail", id] as const,
};
