import { apiRequest } from "./api";
import type { Product } from "../catalog";
import type { Lang } from "../i18n";

export type ProductScope = {
  locale: Lang;
  q?: string;
  category?: string[];
  brand?: string[];
  usage?: string[];
  size?: string[];
  use?: string[];
  sort?: string;
  page?: number;
  pageSize?: number;
};
export type ProductList = {
  items: Product[];
  total: number;
  totalPublished: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nextPage: number | null;
  invalidPage: boolean;
};
export type FilterKey = "brand" | "category" | "usage" | "size";
export type FilterChoice = { value: string; label: string; legacyValues: string[] };
export type ProductFilters = {
  groups: { key: FilterKey; choices: FilterChoice[] }[];
  recommendationUses: FilterChoice[];
};
export type ProductLookup = { items: Product[]; unavailableIds: string[] };
const request = <T>(path: string, signal?: AbortSignal) =>
  apiRequest<T>(
    import.meta.env.VITE_API_BASE_URL || window.location.origin,
    `/api/v1/products${path}`,
    { signal },
  );
export function productParams(scope: ProductScope) {
  const params = new URLSearchParams({ lang: scope.locale });
  for (const [key, value] of Object.entries(scope)) {
    if (key === "locale" || value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, String(value));
  }
  return params;
}
export const getProducts = (scope: ProductScope, signal?: AbortSignal) =>
  request<ProductList>(`?${productParams(scope)}`, signal);
export const getProduct = (id: string, locale: Lang, signal?: AbortSignal) =>
  request<Product>(`/${encodeURIComponent(id)}?lang=${locale}`, signal);
export const getFeatured = (locale: Lang, signal?: AbortSignal) =>
  request<{ items: Product[] }>(`/featured?lang=${locale}`, signal);
export const getRelated = (id: string, locale: Lang, signal?: AbortSignal) =>
  request<{ items: Product[] }>(`/${encodeURIComponent(id)}/related?lang=${locale}`, signal);
export const getFilters = (locale: Lang, use?: string, signal?: AbortSignal) =>
  request<ProductFilters>(
    `/filters?${productParams({ locale, use: use ? [use] : undefined })}`,
    signal,
  );
export async function lookupProducts(
  ids: string[],
  locale: Lang,
  signal?: AbortSignal,
): Promise<ProductLookup> {
  const unique = [...new Set(ids)],
    result: ProductLookup = { items: [], unavailableIds: [] };
  for (let i = 0; i < unique.length; i += 50) {
    const p = new URLSearchParams({ lang: locale });
    unique.slice(i, i + 50).forEach((id) => p.append("ids", id));
    const part = await request<ProductLookup>(`/lookup?${p}`, signal);
    result.items.push(...part.items);
    result.unavailableIds.push(...part.unavailableIds);
  }
  return result;
}
// A whole-catalog consumer explicitly follows every bounded response; no assumption that
// one list page contains the catalog, and no local record fallback.
export async function getAllProducts(scope: ProductScope, signal?: AbortSignal) {
  const items: Product[] = [];
  let page: number | null = 1;
  while (page !== null) {
    const response: ProductList = await getProducts(
      { ...scope, sort: "reference", page, pageSize: 50 },
      signal,
    );
    items.push(...response.items);
    page = response.nextPage;
  }
  return [...new Map(items.map((p) => [p.id, p])).values()];
}
