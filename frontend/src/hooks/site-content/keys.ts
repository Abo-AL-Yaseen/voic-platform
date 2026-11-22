import type { Lang } from "../../i18n";

export const siteContentKeys = {
  public: (page: string, locale: Lang) => ["site-content", "public", page, locale] as const,
  admin: (page: string) => ["site-content", "admin", page] as const,
};
