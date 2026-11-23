import type { Lang } from "../i18n";
import type { ProductScope } from "../services/products";

export function scopeFromSearch(search: string, locale: Lang): ProductScope {
  const p = new URLSearchParams(search);
  return {
    locale,
    q: p.get("q") || "",
    category: p.getAll("category"),
    brand: p.getAll("brand"),
    usage: p.getAll("usage"),
    size: p.getAll("size"),
    sort: p.get("sort") === "desc" ? "desc" : "asc",
    page: Number(p.get("page") || 1),
    pageSize: 6,
  };
}
export function uniqueProductIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export function decodeRouteSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "invalid/route";
  }
}
