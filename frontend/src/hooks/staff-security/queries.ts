import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/queries";
import { authKeys } from "../auth/keys";
import { queryClient } from "../../services/queryClient";
import type { Session } from "../../services/auth";
import { ApiError } from "../../services/api";
import { securityGet, securityWrite, type SecurityResult } from "../../services/staff-security";
async function checked<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (
      e instanceof ApiError &&
      (e.status === 401 ||
        (e.status === 403 &&
          ["MFA_REQUIRED", "STAFF_FORBIDDEN", "STAFF_SUSPENDED"].includes(
            (e.details as any)?.code,
          )))
    )
      window.dispatchEvent(new Event("voic:permissions-changed"));
    throw e;
  }
}
export function useSecurityQuery<T>(path: string, permission?: string) {
  const a = useAuth(),
    u = a.session?.user;
  return useQuery({
    queryKey: ["staff-security", u?.id, u?.role, a.epoch, path],
    meta: { private: true },
    enabled:
      !!u &&
      u.role !== "customer" &&
      a.session?.staffAuth !== "suspended" &&
      (!permission || !!a.session?.permissions?.includes(permission)),
    retry: false,
    staleTime: 0,
    refetchInterval: 15000,
    queryFn: ({ signal }) => checked(() => securityGet<T>(path, signal)),
  });
}
// Secret responses stay only in the calling page's state, never in mutation/query caches.
export function useSecurityAction() {
  const a = useAuth(),
    controllers = useRef(new Set<AbortController>()),
    alive = useRef(true),
    id = a.session?.user?.id,
    role = a.session?.user?.role;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controllers.current.forEach((c) => c.abort());
      controllers.current.clear();
    };
  }, [id, role, a.epoch]);
  return async <T>(path: string, body: unknown, rotate = false): Promise<T> => {
    const c = new AbortController();
    controllers.current.add(c);
    const active = () => {
      const session = queryClient.getQueryData<Session>(authKeys.current(a.epoch));
      return (
        alive.current &&
        !c.signal.aborted &&
        session?.user?.id === id &&
        session?.user?.role === role
      );
    };
    try {
      if (!active()) throw new DOMException("Identity changed", "AbortError");
      const csrf = await a.csrf();
      if (!active()) throw new DOMException("Identity changed", "AbortError");
      const request = () => checked(() => securityWrite<T>(path, body, csrf, c.signal));
      const result = await request();
      if (!active()) throw new DOMException("Identity changed", "AbortError");
      if (rotate)
        return await a.transition(
          async () => result,
          (value) => ((value as SecurityResult).session || value) as Session,
        );
      await queryClient.invalidateQueries({ queryKey: ["staff-security", id, role, a.epoch] });
      return result;
    } finally {
      controllers.current.delete(c);
    }
  };
}
