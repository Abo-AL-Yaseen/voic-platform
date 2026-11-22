import type { Lang } from "../../i18n";

export const categoryKeys = {
  public: (locale: Lang) => ["categories", "public", locale] as const,
  admin: (filters: object) => ["categories", "admin", filters] as const,
};
