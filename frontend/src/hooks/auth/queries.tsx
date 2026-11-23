import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, clearPrivateQueries } from "../../services/queryClient";
import * as service from "../../services/auth";
import { ApiError } from "../../services/api";
import { authKeys } from "./keys";

type AuthState = {
  session?: service.Session;
  pending: boolean;
  error: Error | null;
  transitionError: Error | null;
  epoch: number;
  retry: () => void;
  csrf: () => Promise<string>;
  refresh: () => Promise<void>;
  transition: <T>(
    operation: () => Promise<T>,
    session?: (result: T) => service.Session | undefined,
  ) => Promise<T>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0);
  const [changing, setChanging] = useState(false);
  const [transitionError, setTransitionError] = useState<Error | null>(null);
  const generation = useRef(0);
  const previousUser = useRef<string | null | undefined>(undefined);
  const channel = useRef<BroadcastChannel | null>(null);
  const key = authKeys.current(epoch);
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const current = generation.current;
      const result = await service.readSession(signal);
      if (current !== generation.current) throw new DOMException("Session changed", "AbortError");
      return result;
    },
    meta: { private: true },
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    enabled: !changing,
  });
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: key, exact: true });
  }
  async function expire() {
    const current = ++generation.current;
    setChanging(true);
    await clearPrivateQueries();
    setEpoch(current);
    setChanging(false);
  }
  useEffect(() => {
    const listener = () => {
      void expire();
    };
    window.addEventListener("voic:session-expired", listener);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("voic-session");
      channel.current.onmessage = listener;
    }
    return () => {
      window.removeEventListener("voic:session-expired", listener);
      channel.current?.close();
    };
  }, []);
  const userId = query.data?.user?.id ?? null;
  useEffect(() => {
    if (!query.data) return;
    if (previousUser.current && previousUser.current !== userId) {
      const oldId = previousUser.current;
      const predicate = (q: { meta?: Record<string, unknown>; queryKey: readonly unknown[] }) =>
        q.meta?.private === true && q.queryKey.includes(oldId);
      void queryClient
        .cancelQueries({ predicate })
        .then(() => queryClient.removeQueries({ predicate }));
      for (const mutation of queryClient.getMutationCache().getAll()) {
        if (mutation.meta?.private === true) queryClient.getMutationCache().remove(mutation);
      }
    }
    previousUser.current = userId;
  }, [userId, query.data]);
  async function transition<T>(
    operation: () => Promise<T>,
    getSession?: (result: T) => service.Session | undefined,
  ) {
    const current = ++generation.current;
    setChanging(true);
    setTransitionError(null);
    await clearPrivateQueries();
    try {
      const result = await operation();
      await clearPrivateQueries();
      const next = getSession?.(result);
      if (next) queryClient.setQueryData(authKeys.current(current), next);
      channel.current?.postMessage("changed");
      return result;
    } catch (error) {
      setTransitionError(error instanceof Error ? error : new Error("Session transition failed"));
      throw error;
    } finally {
      setEpoch(current);
      setChanging(false);
    }
  }
  async function csrf() {
    if (query.data?.csrfToken) return query.data.csrfToken;
    return (
      await queryClient.fetchQuery({
        queryKey: key,
        queryFn: ({ signal }) => service.readSession(signal),
        meta: { private: true },
        retry: false,
      })
    ).csrfToken;
  }
  return (
    <AuthContext.Provider
      value={{
        session: changing || query.isError ? undefined : query.data,
        pending: changing || query.isPending,
        error: query.error,
        transitionError,
        epoch,
        retry: () => {
          void query.refetch();
        },
        csrf,
        refresh,
        transition,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
export function useLogin() {
  const auth = useAuth();
  return useMutation({
    meta: { private: true },
    retry: false,
    mutationFn: async (body: Parameters<typeof service.signIn>[0]) => {
      const csrf = await auth.csrf();
      return auth.transition(
        () => service.signIn(body, csrf),
        (value) => value,
      );
    },
  });
}
export function useLogout() {
  const auth = useAuth();
  return useMutation({
    meta: { private: true },
    retry: false,
    mutationFn: async () => {
      const csrf = await auth.csrf();
      return auth.transition(() => service.signOut(csrf));
    },
  });
}
export function useAuthAction<T, R>(
  action: (input: T, csrf: string) => Promise<R>,
  refresh = false,
) {
  const auth = useAuth();
  return useMutation({
    meta: { private: true },
    retry: false,
    mutationFn: async (input: T) => {
      const result = await action(input, await auth.csrf());
      if (refresh) await auth.refresh();
      return result;
    },
  });
}
export function usePasswordChange() {
  const auth = useAuth();
  return useMutation({
    meta: { private: true },
    retry: false,
    mutationFn: async (body: Parameters<typeof service.changePassword>[0]) => {
      const result = await service.changePassword(body, await auth.csrf());
      return auth.transition(async () => result);
    },
  });
}
export function authFailure(error: unknown, lang: "ar" | "en") {
  const ar = lang === "ar",
    status = error instanceof ApiError ? error.status : 0;
  const code =
    error instanceof ApiError &&
    typeof error.details === "object" &&
    error.details &&
    "code" in error.details
      ? error.details.code
      : "";
  if (code === "TOKEN_EXPIRED")
    return ar ? "انتهت صلاحية الرابط. اطلب رابطًا جديدًا." : "This link expired. Request a new link.";
  if (code === "TOKEN_USED")
    return ar
      ? "استُخدم هذا الرابط سابقًا. اطلب رابطًا جديدًا عند الحاجة."
      : "This link was already used. Request a new link if needed.";
  if (code === "TOKEN_INVALID")
    return ar ? "الرابط غير صالح. اطلب رابطًا جديدًا." : "This link is invalid. Request a new link.";
  if (code === "INVALID_CURRENT_PASSWORD")
    return ar ? "كلمة المرور الحالية غير صحيحة." : "The current password is incorrect.";
  if (status === 429)
    return ar
      ? "طلبات كثيرة. انتظر 15 دقيقة ثم حاول مجددًا."
      : "Too many requests. Wait 15 minutes and try again.";
  if (status === 401)
    return ar
      ? "تعذّر تسجيل الدخول أو انتهت الجلسة. راجع البيانات وسجّل الدخول."
      : "Sign-in failed or the session expired. Check your details and sign in.";
  if (status === 400)
    return ar
      ? "راجع الحقول. قد يكون الرابط غير صالح أو منتهيًا أو مستخدمًا سابقًا."
      : "Check the fields. The link may be invalid, expired or already used.";
  if (status === 403)
    return ar
      ? "تعذّر تأكيد الطلب. أعد تحميل الصفحة وحاول مجددًا."
      : "The request could not be verified. Reload and try again.";
  return ar ? "تعذّر الاتصال بالخدمة. حاول مجددًا." : "The service could not be reached. Try again.";
}
