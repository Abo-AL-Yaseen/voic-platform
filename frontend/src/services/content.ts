import { resolvePublicMedia } from "../utils/publicMedia";
import { apiRequest } from "./api";
import type { Recipe } from "../recipes";
export type PageContent = {
  id: string;
  slug: string;
  texts: Record<string, { ar: string; en: string }>;
  images: Record<string, string>;
  links: Record<string, string>;
  rows: string[][];
  featuredProductIds: string[];
  publishedRevision: string;
};
export type ContentList<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
const base = () => import.meta.env.VITE_API_BASE_URL || window.location.origin;
export const contentRequest = async <T>(url: string, signal?: AbortSignal) =>
  resolvePublicMedia(await apiRequest<T>(base(), "/api/v1/" + url, { signal }), base());
export const readPage = (id: string, lang: string, signal?: AbortSignal) =>
  contentRequest<PageContent>(`content/${encodeURIComponent(id)}?lang=${lang}`, signal);
export const readRecipes = (filters: Record<string, string | number>, signal?: AbortSignal) =>
  contentRequest<ContentList<Recipe>>(
    `recipes?${new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)]))}`,
    signal,
  );
export const readRecipe = (id: string, lang: string, signal?: AbortSignal) =>
  contentRequest<Recipe>(`recipes/${encodeURIComponent(id)}?lang=${lang}`, signal);
