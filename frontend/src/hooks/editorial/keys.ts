export const editorialKeys = {
  scope: (id: string, role: string, epoch: number) => ["editorial", id, role, epoch] as const,
  lists: (id: string, role: string, epoch: number, kind: string) =>
    [...editorialKeys.scope(id, role, epoch), kind, "list"] as const,
  detail: (id: string, role: string, epoch: number, kind: string, key: string) =>
    [...editorialKeys.scope(id, role, epoch), kind, "detail", key] as const,
};
