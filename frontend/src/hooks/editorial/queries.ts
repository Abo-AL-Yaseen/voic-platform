import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../auth/queries";
import { authKeys } from "../auth/keys";
import { queryClient } from "../../services/queryClient";
import { ApiError } from "../../services/api";
import type { Session } from "../../services/auth";
import * as api from "../../services/editorial";
import { editorialKeys } from "./keys";
export { editorialKeys } from "./keys";
const policy = {
  meta: { private: true },
  retry: false,
  staleTime: 0,
  refetchInterval: 15000,
} as const;
function useScope() {
  const auth = useAuth(),
    u = auth.session?.user;
  return {
    auth,
    id: u?.id || "anonymous",
    role: u?.role || "anonymous",
    epoch: auth.epoch,
    enabled: !!u && ["administrator", "content_editor"].includes(u.role),
  };
}
async function checked<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (e) {
    if (
      e instanceof ApiError &&
      (e.status === 401 || (e.details as any)?.code === "CONTENT_FORBIDDEN")
    )
      window.dispatchEvent(
        new Event(e.status === 401 ? "voic:session-expired" : "voic:permissions-changed"),
      );
    throw e;
  }
}
export function useEditorialList(kind: string, f: api.EditorialFilters) {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: [...editorialKeys.lists(s.id, s.role, s.epoch, kind), f],
    enabled: s.enabled,
    queryFn: ({ signal }) =>
      checked(() => api.editorialGet<api.EditorialList>(`/${kind}?${api.filterParams(f)}`, signal)),
  });
}
export function useEditorialDetail(kind: string, id: string) {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: editorialKeys.detail(s.id, s.role, s.epoch, kind, id),
    enabled: s.enabled && !!id && id !== "new",
    queryFn: ({ signal }) =>
      checked(() =>
        api.editorialGet<api.EditorialRecord>(`/${kind}/${encodeURIComponent(id)}`, signal),
      ),
  });
}
export function useEditorialMetadata() {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: [...editorialKeys.scope(s.id, s.role, s.epoch), "metadata"],
    enabled: s.enabled,
    queryFn: ({ signal }) =>
      checked(() =>
        api.editorialGet<{
          brands: { id: string; ar: string; en: string }[];
          permissions: { canWrite: boolean; canPublish: boolean };
        }>("/metadata", signal),
      ),
  });
}
export function useMedia(f: api.EditorialFilters) {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: [...editorialKeys.lists(s.id, s.role, s.epoch, "media"), f],
    enabled: s.enabled,
    queryFn: ({ signal }) =>
      checked(() =>
        api.editorialGet<{
          items: api.Media[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }>(`/media?${api.filterParams(f)}`, signal),
      ),
  });
}
export function useMediaUsage(id: string) {
  const s = useScope();
  return useQuery({
    ...policy,
    queryKey: [...editorialKeys.scope(s.id, s.role, s.epoch), "media", "usage", id],
    enabled: s.enabled && !!id,
    queryFn: ({ signal }) =>
      checked(() =>
        api.editorialGet<{
          media: api.Media;
          items: { documentKey: string; revisionId: string }[];
          total: number;
        }>(`/media/${encodeURIComponent(id)}/usage`, signal),
      ),
  });
}
export function useEditorialMutation<T = api.EditorialRecord>() {
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
    mutationFn: async (input: { path: string; body: any; kind: string; id?: string }) => {
      const c = new AbortController();
      controllers.current.add(c);
      const active = () => {
        const u = queryClient.getQueryData<Session>(authKeys.current(s.epoch))?.user;
        return alive.current && !c.signal.aborted && u?.id === s.id && u?.role === s.role;
      };
      try {
        if (!active() || !s.enabled) throw new DOMException("Identity changed", "AbortError");
        const csrf = await s.auth.csrf();
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        const result = await checked(() =>
          api.editorialWrite<T>(input.path, input.body, csrf, c.signal),
        );
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        if (input.kind !== "media" && input.id)
          queryClient.setQueryData(
            editorialKeys.detail(s.id, s.role, s.epoch, input.kind, input.id),
            result,
          );
        await queryClient.invalidateQueries({
          queryKey: editorialKeys.lists(s.id, s.role, s.epoch, input.kind),
        });
        if (["publish", "unpublish", "archive"].includes(input.body.action)) {
          const families =
            input.kind === "products" ||
            ["categories", "uses"].includes(input.kind) ||
            (input.kind === "pages" && input.id === "home")
              ? ["products", "published-content"]
              : ["published-content"];
          await Promise.all(
            families.map((name) =>
              queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === name }),
            ),
          );
          const channel = new BroadcastChannel("voic-publication");
          channel.postMessage({ kind: input.kind });
          channel.close();
        }
        if (!active()) throw new DOMException("Identity changed", "AbortError");
        return result;
      } finally {
        controllers.current.delete(c);
      }
    },
  });
}
export function editorialFailure(e: unknown, lang: "ar" | "en") {
  const ar = lang === "ar",
    code = e instanceof ApiError ? (e.details as any)?.code : "",
    status = e instanceof ApiError ? e.status : 0;
  if (status === 409)
    return ar
      ? "تغيرت النسخة أو تعارضت هوية أو علاقة. بقيت مدخلاتك؛ حدّث وراجع قبل الحفظ."
      : "The version, identity or a relationship conflicts. Your input remains; refresh and review before saving.";
  if (code === "CONTENT_MEDIA")
    return ar
      ? "اختر صورة مسجلة غير مؤرشفة وأكمل النص البديل باللغتين."
      : "Select registered active media with both localized alt texts.";
  if (code === "CONTENT_REFERENCE")
    return ar
      ? "توجد علاقة تمنع الإجراء. راجع المنتجات والوصفات والنسخ المحتفظ بها."
      : "A retained relationship prevents this action. Review products, recipes and retained revisions.";
  if (code === "STAFF_WRITES_DISABLED")
    return ar
      ? "الكتابة غير مفعلة في هذه البيئة أو البريد غير مؤكد."
      : "Writes are disabled in this environment or email is unverified.";
  if (status === 403)
    return ar ? "لا تملك صلاحية الإجراء." : "You do not have permission for this action.";
  if (status === 400)
    return ar
      ? "راجع الحقول المطلوبة واللغتين والملف والروابط والعلاقات قبل المتابعة."
      : "Check required fields, both locales, file, links and relationships before continuing.";
  if (status === 429)
    return ar ? "طلبات كثيرة؛ انتظر 15 دقيقة." : "Too many requests; wait 15 minutes.";
  return ar
    ? "تعذر تأكيد النتيجة. احتُفظ بمدخلاتك؛ تحقق من السجل قبل إعادة المحاولة."
    : "The result could not be confirmed. Your input remains; check the record before retrying.";
}
