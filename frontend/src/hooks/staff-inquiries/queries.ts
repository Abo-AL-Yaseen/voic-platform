import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../auth/queries";
import { authKeys } from "../auth/keys";
import { inquiryKeys } from "../inquiries/keys";
import { queryClient } from "../../services/queryClient";
import type { Session } from "../../services/auth";
import type { Inquiry } from "../../services/inquiries";
import { ApiError } from "../../services/api";
import * as api from "../../services/staffInquiries";
import { staffInquiryKeys as keys } from "./keys";
function useScope() {
  const auth = useAuth(),
    user = auth.session?.user;
  return {
    auth,
    id: user?.id || "anonymous",
    role: user?.role || "anonymous",
    epoch: auth.epoch,
    enabled: !!user && ["sales", "administrator"].includes(user.role),
  };
}
async function call<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (
      e instanceof ApiError &&
      (e.status === 401 ||
        (e.status === 403 &&
          ["MFA_REQUIRED", "STAFF_SUSPENDED", "STAFF_FORBIDDEN"].includes(
            (e.details as any)?.code,
          )) ||
        (e.details as { code?: string })?.code === "STAFF_FORBIDDEN")
    )
      window.dispatchEvent(
        new Event(e.status === 401 ? "voic:session-expired" : "voic:permissions-changed"),
      );
    throw e;
  }
}
const policy = {
  meta: { private: true },
  retry: false,
  staleTime: 0,
  refetchInterval: 15000,
} as const;
export function useStaffInquiryList(filters: api.StaffFilters) {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: keys.list(s.id, s.role, s.epoch, filters),
    queryFn: ({ signal }) => call(() => api.readStaffList(filters, signal)),
    enabled: s.enabled,
  });
}
export function useStaffInquiryStats() {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: keys.stats(s.id, s.role, s.epoch),
    queryFn: ({ signal }) => call(() => api.readStaffStats(signal)),
    enabled: s.enabled,
  });
}
export function useStaffInquiry(id: string, pages: api.StaffPages) {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: keys.detail(s.id, s.role, s.epoch, id, pages),
    queryFn: ({ signal }) => call(() => api.readStaffInquiry(id, pages, signal)),
    enabled: s.enabled && !!id,
  });
}
type Write = { id: string; body: api.StaffAction | api.Reply | { key: string }; resolve?: boolean };
export function useStaffInquiryAction() {
  return useAction<api.StaffInquiry>(true);
}
export function useCustomerReply() {
  return useAction<Inquiry>(false);
}
export function useWorkflowAction(staff: boolean) {
  return useAction<Inquiry>(staff);
}
function useAction<T extends Inquiry>(staff: boolean) {
  const s = useScope(),
    alive = useRef(true),
    controllers = useRef(new Set<AbortController>());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controllers.current.forEach((c) => c.abort());
    };
  }, [s.id, s.role, s.epoch]);
  return useMutation({
    meta: { private: true },
    retry: false,
    mutationFn: async (input: Write) => {
      const c = new AbortController();
      controllers.current.add(c);
      const active = () => {
        const user = queryClient.getQueryData<Session>(authKeys.current(s.epoch))?.user;
        return alive.current && !c.signal.aborted && user?.id === s.id && user?.role === s.role;
      };
      try {
        if (!active() || (staff ? !s.enabled : s.role !== "customer"))
          throw new DOMException("Identity changed", "AbortError");
        const csrf = input.resolve ? "" : await s.auth.csrf();
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        const result = await call(() =>
          api.workflowRequest<T>(input.id, staff, input.body, csrf, c.signal, !!input.resolve),
        );
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        const prefix = staff
          ? keys.detailPrefix(s.id, s.role, s.epoch, input.id)
          : inquiryKeys.detailPrefix(s.id, s.epoch, input.id);
        await queryClient.invalidateQueries({ queryKey: prefix, refetchType: "none" });
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        queryClient.setQueryData(
          staff
            ? keys.detail(s.id, s.role, s.epoch, input.id)
            : inquiryKeys.customerDetail(s.id, s.epoch, input.id),
          result.record,
        );
        if (staff)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: keys.lists(s.id, s.role, s.epoch) }),
            queryClient.invalidateQueries({
              queryKey: keys.stats(s.id, s.role, s.epoch),
              exact: true,
            }),
          ]);
        else
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: inquiryKeys.lists(s.id, s.epoch) }),
            queryClient.invalidateQueries({
              queryKey: inquiryKeys.counts(s.id, s.epoch),
              exact: true,
            }),
          ]);
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        return result;
      } finally {
        controllers.current.delete(c);
      }
    },
  });
}
