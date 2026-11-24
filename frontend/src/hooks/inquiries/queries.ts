import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/queries";
import { authKeys } from "../auth/keys";
import { queryClient } from "../../services/queryClient";
import { ApiError } from "../../services/api";
import { inquiryKeys } from "./keys";
import * as api from "../../services/inquiries";
import type { Session } from "../../services/auth";
function useScope() {
  const auth = useAuth(),
    id = auth.session?.user?.id || "anonymous";
  return {
    auth,
    id,
    epoch: auth.epoch,
    enabled: !!auth.session?.user && auth.session.user.role === "customer",
  };
}
async function privateCall<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401)
      window.dispatchEvent(new Event("voic:session-expired"));
    throw e;
  }
}
export function useInquiry(
  id: string,
  pages: api.DetailPages = { messagePage: 1, historyPage: 1 },
) {
  const s = useScope();
  return useQuery({
    queryKey: inquiryKeys.customerDetail(s.id, s.epoch, id, pages),
    queryFn: ({ signal }) => privateCall(() => api.readInquiry(id, signal, pages)),
    enabled: s.enabled && !!id,
    meta: { private: true },
    retry: false,
    staleTime: 0,
    refetchInterval: 15000,
  });
}
export function useInquiries(filters: api.InquiryFilters) {
  const s = useScope();
  return useQuery({
    queryKey: inquiryKeys.customerList(s.id, s.epoch, filters),
    queryFn: ({ signal }) => privateCall(() => api.readInquiries(filters, signal)),
    enabled: s.enabled,
    meta: { private: true },
    retry: false,
    staleTime: 0,
  });
}
export function useInquiryCounts() {
  const s = useScope();
  return useQuery({
    queryKey: inquiryKeys.counts(s.id, s.epoch),
    queryFn: ({ signal }) => privateCall(() => api.readInquiryCounts(signal)),
    enabled: s.enabled,
    meta: { private: true },
    retry: false,
    staleTime: 0,
  });
}
type Write =
  | { type: "create"; creationKey: string; lang: "ar" | "en" }
  | { type: "save"; id: string; body: api.SaveInquiry }
  | { type: "submit"; id: string; key: string; revision: number };
export function useInquiryWrite() {
  const s = useScope(),
    alive = useRef(true),
    controllers = useRef(new Set<AbortController>());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controllers.current.forEach((c) => c.abort());
    };
  }, [s.id, s.epoch]);
  return useMutation({
    meta: { private: true },
    retry: false,
    mutationFn: async (input: Write) => {
      const controller = new AbortController();
      controllers.current.add(controller);
      const active = () =>
        alive.current &&
        !controller.signal.aborted &&
        queryClient.getQueryData<Session>(authKeys.current(s.epoch))?.user?.id === s.id;
      try {
        if (!s.enabled || !active()) throw new DOMException("Identity changed", "AbortError");
        const csrf = await s.auth.csrf();
        const result = await privateCall(() =>
          api.writeInquiry(
            input.type === "create"
              ? ""
              : `/${input.id}${input.type === "submit" ? "/submit" : ""}`,
            input.type === "create"
              ? { creationKey: input.creationKey, lang: input.lang }
              : input.type === "save"
                ? input.body
                : { key: input.key, revision: input.revision },
            csrf,
            controller.signal,
            input.type === "save" ? "PATCH" : "POST",
          ),
        );
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        queryClient.setQueryData(inquiryKeys.customerDetail(s.id, s.epoch, result.id), result);
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
        controllers.current.delete(controller);
      }
    },
  });
}
export function inquiryFailure(error: unknown, lang: "ar" | "en") {
  const ar = lang === "ar",
    code = error instanceof ApiError ? (error.details as { code?: string })?.code : "";
  if (code === "INQUIRY_UNAVAILABLE")
    return ar
      ? "منتج أو عبوة لم يعد متاحًا. أعد تحميل الخيارات، ثم أزل المنتج أو اختر عبوة متاحة واحفظ مجددًا."
      : "A product or package is unavailable. Reload options, then remove the product or choose an available package and save again.";
  if (code === "EMAIL_UNVERIFIED")
    return ar ? "أكد بريد حسابك قبل الإرسال." : "Verify your account email before submission.";
  if (code === "WORKFLOW_FIELDS")
    return ar
      ? "أدخل نصًا توضيحيًا حتى 4000 محرف في الحقل المناسب."
      : "Enter explanatory text up to 4000 characters in the appropriate field.";
  if (code === "WORKFLOW_TRANSITION")
    return ar
      ? "هذا الانتقال غير متاح من الحالة الحالية. حدّث السجل وراجعه."
      : "This transition is unavailable from the current state. Refresh and review.";
  if (code === "WORKFLOW_CLOSED")
    return ar ? "الاستفسار مغلق وللقراءة فقط." : "This inquiry is closed and read-only.";
  if (code === "STAFF_WRITES_DISABLED")
    return ar
      ? "إجراءات الموظفين غير مفعلة في هذه البيئة."
      : "Staff business actions are disabled in this environment.";
  if (code === "STAFF_FORBIDDEN")
    return ar ? "لا تملك صلاحية إدارة الاستفسارات." : "You do not have inquiry management permission.";
  if (code === "INQUIRY_FIELDS")
    return ar
      ? "راجع الاسم والوجهة والشركة والمنتجات والكميات أو متطلبات التعبئة."
      : "Check name, destination, company, products, quantities or packaging requirements.";
  if (error instanceof ApiError && error.status === 409)
    return ar
      ? "تغير السجل أو استُخدم مفتاح الإرسال. أعد تحميل الاستفسار وتحقق من حالته قبل المتابعة."
      : "The record changed or the submission key was used. Reload the inquiry and check its state before continuing.";
  if (error instanceof ApiError && error.status === 404)
    return ar ? "الاستفسار غير موجود في حسابك." : "This inquiry was not found in your account.";
  if (error instanceof ApiError && error.status === 401)
    return ar ? "انتهت الجلسة. سجّل الدخول مجددًا." : "Your session expired. Sign in again.";
  if (error instanceof ApiError && error.status === 403)
    return ar
      ? "لا تملك صلاحية هذا الطلب. أعد تحميل الصفحة للتحقق من الجلسة."
      : "This request is forbidden. Reload to check your session.";
  if (error instanceof ApiError && error.status === 429)
    return ar ? "طلبات كثيرة. انتظر 15 دقيقة." : "Too many requests. Wait 15 minutes.";
  return ar
    ? "تعذّر تأكيد النتيجة. أعد تحميل حالة الاستفسار قبل إعادة المحاولة."
    : "The result could not be confirmed. Reload the inquiry state before retrying.";
}
