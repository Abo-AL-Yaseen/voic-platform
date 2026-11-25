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

// Mutation responses may seed a detail before its query component mounts.
queryClient.setQueryDefaults(["inquiries", "customer"], { meta: { private: true } });
queryClient.setQueryDefaults(["staff-inquiries"], { meta: { private: true } });

export async function clearPrivateQueries(userScope?: string) {
  await queryClient.cancelQueries({ predicate: (query) => query.meta?.private === true });
  for (const mutation of queryClient.getMutationCache().getAll()) {
    if (mutation.meta?.private === true) queryClient.getMutationCache().remove(mutation);
  }
  queryClient.removeQueries({
    predicate: (query) =>
      query.meta?.private === true &&
      (!userScope || query.queryKey.some((part) => part === userScope)),
  });
}

queryClient.setQueryDefaults(["editorial"], { meta: { private: true } });
