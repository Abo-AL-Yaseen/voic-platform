import type { Lang } from "../../i18n";

export const recipeKeys = {
  public: ["recipes", "public"] as const,
  list: (locale: Lang, filters: object = {}) =>
    [...recipeKeys.public, "list", locale, filters] as const,
  detail: (slug: string, locale: Lang) => [...recipeKeys.public, "detail", slug, locale] as const,
  admin: (scope: object) => ["recipes", "admin", scope] as const,
};
