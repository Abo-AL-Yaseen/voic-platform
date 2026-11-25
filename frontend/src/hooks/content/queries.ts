import { useQuery } from "@tanstack/react-query";
import { readPage, readRecipe, readRecipes } from "../../services/content";
const policy = {
  staleTime: 15000,
  refetchInterval: 30000,
  retry: false,
  refetchOnWindowFocus: true,
} as const;
export const publishedKeys = {
  scope: ["published-content"] as const,
  page: (id: string, lang: string) => ["published-content", "pages", id, lang] as const,
  recipes: (filters: object) => ["published-content", "recipes", filters] as const,
  recipe: (id: string, lang: string) => ["published-content", "recipe", id, lang] as const,
};
export const usePublishedPage = (id: string, lang: string) =>
  useQuery({
    ...policy,
    queryKey: publishedKeys.page(id, lang),
    queryFn: ({ signal }) => readPage(id, lang, signal),
  });
export const useRecipes = (filters: Record<string, string | number>) =>
  useQuery({
    ...policy,
    queryKey: publishedKeys.recipes(filters),
    queryFn: ({ signal }) => readRecipes(filters, signal),
  });
export const useRecipe = (id: string, lang: string) =>
  useQuery({
    ...policy,
    queryKey: publishedKeys.recipe(id, lang),
    queryFn: ({ signal }) => readRecipe(id, lang, signal),
  });
