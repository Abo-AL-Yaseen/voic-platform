import type { Lang } from "../../i18n";

export type ProductListScope = {
  locale: Lang;
  search?: string;
  category?: string[];
  use?: string[];
  sort?: string;
  page?: number;
};

export const productKeys = {
  public: ["products", "public"] as const,
  lists: () => [...productKeys.public, "list"] as const,
  list: (scope: ProductListScope) => [...productKeys.lists(), scope] as const,
  detail: (slug: string, locale: Lang) => [...productKeys.public, "detail", slug, locale] as const,
  admin: (scope: object) => ["products", "admin", scope] as const,
};
