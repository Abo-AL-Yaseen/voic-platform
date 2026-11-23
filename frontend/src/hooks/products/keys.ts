import type { Lang } from "../../i18n";
import type { ProductScope } from "../../services/products";

export type ProductListScope = ProductScope;

export const productKeys = {
  public: ["products", "public"] as const,
  lists: () => [...productKeys.public, "list"] as const,
  list: (scope: ProductListScope) => [...productKeys.lists(), scope] as const,
  detail: (slug: string, locale: Lang) => [...productKeys.public, "detail", slug, locale] as const,
  filters: (locale: Lang, use?: string) =>
    [...productKeys.public, "filters", locale, use ?? ""] as const,
  featured: (locale: Lang) => [...productKeys.public, "featured", locale] as const,
  related: (id: string, locale: Lang) => [...productKeys.public, "related", id, locale] as const,
  lookup: (ids: string[], locale: Lang) => [...productKeys.public, "lookup", ids, locale] as const,
  all: (scope: ProductScope) => [...productKeys.public, "all", scope] as const,
  admin: (scope: object) => ["products", "admin", scope] as const,
};
