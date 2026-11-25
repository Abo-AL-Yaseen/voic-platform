import { useEffect, useRef, useState } from "react";
import { TextAreaField, SelectField } from "./FormFields";
import { useWorkflowAction } from "../hooks/staff-inquiries/queries";
import { inquiryFailure } from "../hooks/inquiries/queries";
import { ApiError } from "../services/api";
import type { Inquiry, InquiryStatus, PageInfo } from "../services/inquiries";
import type { StaffInquiry, StaffAction, Reply } from "../services/staffInquiries";
import { inquiryStatus } from "../utils/inquiryLabels";
import { msg, type Lang } from "../i18n";
const t = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
export function RecordPager({
  info,
  lang,
  onPage,
}: {
  info: PageInfo;
  lang: Lang;
  onPage: (page: number) => void;
}) {
  if (info.totalPages <= 1) return null;
  return (
    <div className="page-actions record-pager">
      <button
        type="button"
        className="button button-secondary"
        disabled={info.page <= 1}
        onClick={() => onPage(info.page - 1)}
      >
        {t(lang, "السابق", "Previous")}
      </button>
      <bdi>
        {info.page} / {info.totalPages}
      </bdi>
      <button
        type="button"
        className="button button-secondary"
        disabled={info.page >= info.totalPages}
        onClick={() => onPage(info.page + 1)}
      >
        {t(lang, "التالي", "Next")}
      </button>
    </div>
  );
}
export function InquiryConversation({
  record,
  lang,
  onPage,
}: {
  record: Inquiry;
  lang: Lang;
  onPage: (page: number) => void;
}) {
  return (
    <section className="workspace-section inquiry-conversation">
      <h2>{t(lang, "المحادثة مع الشركة", "Conversation with the company")}</h2>
      {!record.messages.length ? (
        <p>{t(lang, "لا توجد رسائل في هذه الصفحة.", "No messages on this page.")}</p>
      ) : (
        <ol>
          {record.messages.map((m) => (
            <li key={m.id} className={`inquiry-message ${m.sender}`}>
              <strong>
                {m.sender === "staff"
                  ? t(lang, "فريق الشركة", "Company staff")
                  : t(lang, "العميل", "Customer")}
              </strong>
              <time dateTime={m.createdAt} dir="ltr">
                <bdi>{new Date(m.createdAt).toLocaleString(lang === "ar" ? "ar-PS" : "en-GB")}</bdi>
              </time>
              <p>{m.text}</p>
            </li>
          ))}
        </ol>
      )}
      <RecordPager info={record.messagePagination} lang={lang} onPage={onPage} />
    </section>
  );
}
export function WorkflowComposer({
  record,
  staff = false,
  lang,
  refresh,
  onApplied,
}: {
  record: Inquiry;
  staff?: boolean;
  lang: Lang;
  refresh: () => Promise<{ data?: Inquiry; error?: unknown }>;
  onApplied: () => void;
}) {
  const mutation = useWorkflowAction(staff),
    [text, setText] = useState(""),
    [note, setNote] = useState(""),
    [status, setStatus] = useState(""),
    [revision, setRevision] = useState(record.revision),
    [notice, setNotice] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState<StaffAction | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    attempt = useRef<{ signature: string; body: StaffAction | Reply } | null>(null);
  const permissions = (record as StaffInquiry).permissions,
    open = !["draft", "closed", "cancelled"].includes(record.status),
    stale = revision !== record.revision;
  const busy = mutation.isPending || uncertain,
    allowed = staff ? permissions?.writesEnabled : open;
  useEffect(() => {
    if (confirm && !dialog.current?.open) dialog.current?.showModal();
  }, [confirm]);
  const success = (result: { record: Inquiry }, type: string) => {
    setRevision(result.record.revision);
    if (type === "note") setNote("");
    else setText("");
    setStatus("");
    attempt.current = null;
    setUncertain(false);
    setError("");
    setNotice(t(lang, "تم الحفظ بنجاح.", "Saved successfully."));
    onApplied();
  };
  const send = async (body: StaffAction | Reply) => {
    if (mutation.isPending) return;
    setError("");
    setNotice("");
    try {
      const result = await mutation.mutateAsync({ id: record.id, body });
      success(result, "type" in body ? body.type : "reply");
    } catch (e) {
      setError(inquiryFailure(e, lang));
      if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500) setUncertain(true);
    }
  };
  const prepare = (internal = false) => {
    if (busy || stale) return;
    const type = internal ? "note" : status ? "status" : "message",
      value = internal ? note : text;
    if (
      (internal ||
        !staff ||
        !status ||
        ["awaiting_customer", "responded", "closed"].includes(status)) &&
      !value.trim()
    ) {
      setError(
        t(
          lang,
          "اكتب رسالة توضيحية في الحقل المخصص.",
          "Enter explanatory text in the corresponding field.",
        ),
      );
      return;
    }
    const input = staff
      ? {
          revision,
          type,
          status: status && type === "status" ? (status as InquiryStatus) : undefined,
          text: value,
        }
      : { revision, text: value };
    const signature = JSON.stringify(input);
    const body =
      attempt.current?.signature === signature
        ? attempt.current.body
        : ({ ...input, key: crypto.randomUUID() } as StaffAction | Reply);
    attempt.current = { signature, body };
    if (staff && type === "status" && status === "closed") setConfirm(body as StaffAction);
    else void send(body);
  };
  const review = async () => {
    const result = await refresh();
    if (result.data) {
      setRevision(result.data.revision);
      setError("");
      setNotice(
        t(
          lang,
          "تم تحديث السجل. راجع الحالة والرسائل؛ بقي نصك غير المرسل محفوظًا في الصفحة.",
          "Record refreshed. Review state and messages; your unsent text remains on this page.",
        ),
      );
    } else setError(inquiryFailure(result.error, lang));
  };
  return (
    <section className="workspace-section">
      {open && (
        <div className="page-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={mutation.isPending || uncertain}
            onClick={() => void review()}
          >
            {t(lang, "تحديث ومراجعة مع الاحتفاظ بالنص", "Refresh and review, keeping text")}
          </button>
        </div>
      )}
      {open && stale && (
        <p role="alert">
          {t(
            lang,
            "وصل تحديث جديد. راجع السجل قبل إرسال نصك؛ لم يتغير النص غير المرسل.",
            "A new update arrived. Review the record before sending; your unsent text is unchanged.",
          )}
        </p>
      )}
      <p role="status" aria-live="polite">
        {mutation.isPending ? t(lang, "جارٍ الحفظ…", "Saving…") : notice}
      </p>
      {error && <p role="alert">{error}</p>}
      {!open ? (
        <div>
          <p>{t(lang, "هذا الاستفسار للقراءة فقط.", "This inquiry is read-only.")}</p>
          {(text || note) && (
            <section className="retained-composer">
              <h2>
                {t(lang, "نص غير مرسل محفوظ في هذه الصفحة", "Unsent text retained on this page")}
              </h2>
              {text && (
                <>
                  <h3>{t(lang, "نص الرسالة غير المرسلة", "Unsent customer message")}</h3>
                  <pre>{text}</pre>
                </>
              )}
              {note && (
                <>
                  <h3>{t(lang, "الملاحظة الداخلية غير المحفوظة", "Unsaved internal note")}</h3>
                  <pre>{note}</pre>
                </>
              )}
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText([text, note].filter(Boolean).join("\n\n"));
                    setNotice(t(lang, "نُسخ النص غير المرسل.", "Unsent text copied."));
                  } catch {
                    setError(
                      t(
                        lang,
                        "تعذر النسخ؛ حدّد النص الظاهر وانسخه يدويًا.",
                        "Copy failed; select the displayed text and copy it manually.",
                      ),
                    );
                  }
                }}
              >
                {t(lang, "نسخ النص غير المرسل", "Copy unsent text")}
              </button>
            </section>
          )}
        </div>
      ) : !allowed ? (
        <p>
          {t(
            lang,
            "إجراءات الموظفين غير متاحة في هذه البيئة.",
            "Staff actions are unavailable in this environment.",
          )}
        </p>
      ) : (
        <div className={staff ? "staff-message-grid" : ""}>
          <form
            className="workspace-form"
            onSubmit={(e) => {
              e.preventDefault();
              prepare();
            }}
          >
            <h2>
              {staff
                ? t(lang, "رسالة مرئية للعميل", "Customer-visible message")
                : t(lang, "إرسال معلومات إضافية", "Send additional information")}
            </h2>
            <TextAreaField
              label={
                staff
                  ? t(lang, "نص الرسالة للعميل", "Message to customer")
                  : t(lang, "ردك للشركة", "Your reply to the company")
              }
              rows={5}
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              hint={t(
                lang,
                "نص عادي حتى 4000 محرف؛ لا يغيّر بيانات الطلب الأصلية.",
                "Plain text up to 4000 characters; the original request stays unchanged.",
              )}
            />
            {staff && (
              <SelectField
                label={t(lang, "الحالة التالية", "Next status")}
                value={status}
                disabled={busy}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">
                  {t(lang, "رسالة فقط دون تغيير الحالة", "Message only, keep status")}
                </option>
                {status && !permissions.transitions.includes(status as InquiryStatus) && (
                  <option value={status} disabled>
                    {inquiryStatus(status, lang)} — {t(lang, "غير متاح", "unavailable")}
                  </option>
                )}
                {permissions.transitions.map((s) => (
                  <option key={s} value={s}>
                    {inquiryStatus(s, lang)}
                  </option>
                ))}
              </SelectField>
            )}
            <button
              className="button button-primary"
              disabled={
                busy ||
                stale ||
                (staff &&
                  (!permissions.canMessage ||
                    (!!status && !permissions.transitions.includes(status as InquiryStatus))))
              }
            >
              {staff
                ? t(lang, "إرسال للعميل", "Send to customer")
                : t(lang, "إرسال الرد", "Send reply")}
            </button>
          </form>
          {staff && (
            <form
              className="workspace-form internal-note"
              onSubmit={(e) => {
                e.preventDefault();
                prepare(true);
              }}
            >
              <h2>{t(lang, "ملاحظة داخلية خاصة", "Private internal note")}</h2>
              <p>
                {t(
                  lang,
                  "يراها الموظفون المصرّح لهم فقط. لا تُرسل إلى العميل أو بريده.",
                  "Visible only to authorized staff. Never sent to the customer or their email.",
                )}
              </p>
              <TextAreaField
                label={t(lang, "نص الملاحظة الداخلية", "Internal note text")}
                rows={5}
                required
                maxLength={4000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
              <button
                className="button button-secondary"
                disabled={busy || stale || !permissions.canNote}
              >
                {t(lang, "حفظ ملاحظة داخلية", "Save internal note")}
              </button>
            </form>
          )}
        </div>
      )}
      {uncertain && (
        <div role="alert">
          <p>
            {t(
              lang,
              "نتيجة العملية غير مؤكدة. تحقق منها قبل إعادة المحاولة.",
              "The result is uncertain. Check it before retrying.",
            )}
          </p>
          <button
            className="button button-secondary"
            disabled={mutation.isPending}
            onClick={async () => {
              const body = attempt.current?.body;
              if (!body) return;
              try {
                const r = await mutation.mutateAsync({
                  id: record.id,
                  body: { key: body.key },
                  resolve: true,
                });
                success(r, "type" in body ? body.type : "reply");
              } catch (e) {
                if (e instanceof ApiError && e.status === 404) {
                  setUncertain(false);
                  setNotice(
                    t(
                      lang,
                      "لم يُعثر على تأكيد. يمكنك إعادة المحاولة بنفس الطلب.",
                      "No acknowledgment found. You can retry the same request.",
                    ),
                  );
                } else setError(inquiryFailure(e, lang));
              }
            }}
          >
            {t(lang, "تحقق من نتيجة العملية", "Check action result")}
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="close-inquiry-title"
        aria-describedby="close-inquiry-description"
        className="workflow-dialog"
        onCancel={() => setConfirm(null)}
        onClose={() => setConfirm(null)}
      >
        <h2 id="close-inquiry-title">
          {t(lang, "تأكيد إغلاق الاستفسار", "Confirm closing inquiry")}
        </h2>
        <p id="close-inquiry-description">
          {t(
            lang,
            "سيصبح الاستفسار للقراءة فقط. الإغلاق لا يعني قبول طلب شراء أو دفعه أو تنفيذه.",
            "The inquiry becomes read-only. Closing does not mean an accepted, paid or fulfilled order.",
          )}
        </p>
        <div className="page-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => dialog.current?.close()}
          >
            {t(lang, "رجوع", "Cancel")}
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              const body = confirm;
              dialog.current?.close();
              if (body) void send(body);
            }}
          >
            {t(lang, "تأكيد الإغلاق", "Confirm close")}
          </button>
        </div>
      </dialog>
    </section>
  );
}
