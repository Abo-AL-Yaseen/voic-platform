import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status =
          typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
        return status >= 400 && status < 500 ? false : failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export async function clearPrivateQueries(userScope?: string) {
  await queryClient.cancelQueries({ predicate: (query) => query.meta?.private === true });
  queryClient.removeQueries({
    predicate: (query) =>
      query.meta?.private === true &&
      (!userScope || query.queryKey.some((part) => part === userScope)),
  });
}
