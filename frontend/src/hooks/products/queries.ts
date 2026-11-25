import { useQueries, useQuery } from "@tanstack/react-query";
import { ApiError } from "../../services/api";
import {
  getProducts,
  getProduct,
  getFeatured,
  getRelated,
  getFilters,
  lookupProducts,
  getAllProducts,
  type ProductScope,
} from "../../services/products";
import type { Lang } from "../../i18n";
import { productKeys } from "./keys";

const policy = {
  staleTime: 30_000,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
  retry: (count: number, error: Error) =>
    !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
};
export const useProducts = (scope: ProductScope) =>
  useQuery({
    ...policy,
    queryKey: productKeys.list(scope),
    queryFn: ({ signal }) => getProducts(scope, signal),
  });
export const useProduct = (id: string, locale: Lang) =>
  useQuery({
    ...policy,
    queryKey: productKeys.detail(id, locale),
    queryFn: ({ signal }) => getProduct(id, locale, signal),
    enabled: !!id,
  });
export const useFeaturedProducts = (locale: Lang) =>
  useQuery({
    ...policy,
    queryKey: productKeys.featured(locale),
    queryFn: ({ signal }) => getFeatured(locale, signal),
  });
export const useRelatedProducts = (id: string, locale: Lang) =>
  useQuery({
    ...policy,
    queryKey: productKeys.related(id, locale),
    queryFn: ({ signal }) => getRelated(id, locale, signal),
    enabled: !!id,
  });
export const useProductFilters = (locale: Lang, use?: string) =>
  useQuery({
    ...policy,
    queryKey: productKeys.filters(locale, use),
    queryFn: ({ signal }) => getFilters(locale, use, signal),
  });
export const useProductLookup = (ids: string[], locale: Lang) =>
  useQuery({
    ...policy,
    queryKey: productKeys.lookup(ids, locale),
    queryFn: ({ signal }) => lookupProducts(ids, locale, signal),
  });
export const useAllProducts = (scope: ProductScope) =>
  useQuery({
    ...policy,
    queryKey: productKeys.all(scope),
    queryFn: ({ signal }) => getAllProducts(scope, signal),
  });
export const useSelectedProducts = (ids: string[], locale: Lang) =>
  useQueries({
    queries: ids.map((id) => ({
      ...policy,
      queryKey: productKeys.detail(id, locale),
      queryFn: ({ signal }: { signal: AbortSignal }) => getProduct(id, locale, signal),
    })),
  });
export const isMissingProduct = (error: unknown) =>
  error instanceof ApiError && error.status === 404;
export function visibleData<T>(query: { data?: T; error: unknown }): T | undefined {
  return isMissingProduct(query.error) ? undefined : query.data;
}
