import { useEffect, useRef, useState } from "react";
import { StaffLayout } from "../components/WorkspaceLayouts";
import { TextField, SelectField, TextAreaField } from "../components/FormFields";
import AppLink from "../components/AppLink";
import { useSecurityQuery, useSecurityAction } from "../hooks/staff-security/queries";
import { useAuth } from "../hooks/auth/queries";
import { securityFailure } from "./StaffSecurityPages";
import {
  params,
  type Employee,
  type Invitation,
  type Page,
  type AuditEvent,
} from "../services/staff-security";
import { msg, withLang, type Lang } from "../i18n";
const t = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
type Props = { lang: Lang; go: (href: string) => void };
const roles = ["administrator", "sales", "content_editor"] as const;
const roleName = (r: string, l: Lang) =>
  ({
    administrator: t(l, "مسؤول", "Administrator"),
    sales: t(l, "مبيعات", "Sales"),
    content_editor: t(l, "محرر محتوى", "Content editor"),
    customer: t(l, "عميل", "Customer"),
  })[r] || r;
function Pager({
  data,
  change,
  lang,
}: {
  data?: { page: number; totalPages: number };
  change: (v: number) => void;
  lang: Lang;
}) {
  return data && data.totalPages > 1 ? (
    <nav className="pagination" aria-label={t(lang, "الصفحات", "Pages")}>
      <button disabled={data.page <= 1} onClick={() => change(data.page - 1)}>
        {t(lang, "السابق", "Previous")}
      </button>
      <span>
        {data.page} / {data.totalPages}
      </span>
      <button disabled={data.page >= data.totalPages} onClick={() => change(data.page + 1)}>
        {t(lang, "التالي", "Next")}
      </button>
    </nav>
  ) : null;
}
export function EmployeesPage({ lang, go }: Props) {
  const auth = useAuth(),
    action = useSecurityAction();
  const [invitationPage, setInvitationPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", role: "", status: "", page: 1 }),
    [lookup, setLookup] = useState(""),
    [lookupEmail, setLookupEmail] = useState(""),
    [selected, setSelected] = useState(""),
    [email, setEmail] = useState(""),
    [inviteRole, setInviteRole] = useState("sales"),
    [reason, setReason] = useState(""),
    [targetRole, setTargetRole] = useState("sales"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState<{
      path: string;
      body: Record<string, unknown>;
      title: string;
      target: string;
    } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    focus = useRef<HTMLElement | null>(null);
  const list = useSecurityQuery<Page<Employee>>(
      `staff/employees?${params(filters)}`,
      "employees:manage",
    ),
    invitations = useSecurityQuery<Page<Invitation>>(
      `staff/invitations?pageSize=20&page=${invitationPage}`,
      "employees:manage",
    );
  const detail = useSecurityQuery<Employee>(
    selected
      ? `staff/employees/${selected}`
      : "staff/employees/lookup?email=" + encodeURIComponent(lookupEmail),
    selected || lookupEmail ? "employees:manage" : "disabled",
  );
  useEffect(() => {
    if (pending) {
      focus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
      dialog.current?.querySelector<HTMLElement>("button")?.focus();
    } else if (dialog.current?.open) {
      dialog.current.close();
      focus.current?.focus();
    }
  }, [pending]);
  const request = (path: string, body: Record<string, unknown>, title: string, target?: string) => {
    if (busy) return;
    setError(null);
    setPending({
      path,
      body: { ...body, key: crypto.randomUUID(), reason },
      title,
      target: target || String(body.email || detail.data?.email || path),
    });
  };
  async function confirm() {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await action<{ delivery?: string }>(pending.path, pending.body);
      setPending(null);
      setNotice(
        r.delivery === "captured"
          ? t(
              lang,
              "حُفظت الدعوة في البريد المحلي فقط.",
              "Invitation saved in local mail capture only.",
            )
          : r.delivery === "failed"
            ? t(
                lang,
                "حُفظت الدعوة لكن تعذر تسليم الرسالة. استخدم إعادة الإرسال.",
                "Invitation saved; delivery failed. Use resend.",
              )
            : t(lang, "تم حفظ الإجراء.", "Action saved."),
      );
      await auth.refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <StaffLayout lang={lang} go={go} active="/staff/employees">
      <header className="workspace-page-heading">
        <h1>{t(lang, "إدارة الموظفين", "Employee management")}</h1>
      </header>
      <p>
        {t(
          lang,
          "الإجراءات الحساسة تتطلب كلمة مرور وتحققًا ثانيًا خلال آخر خمس دقائق. لا تُحذف هويات الموظفين.",
          "Sensitive actions require password and MFA verification within five minutes. Employee identities are retained.",
        )}
      </p>
      <AppLink className="text-link" go={go} href={withLang("/staff/security", lang)}>
        {t(lang, "تأكيد حديث من أمان الموظف", "Reauthenticate in Staff security")}
      </AppLink>
      {!!error && <p role="alert">{securityFailure(error, lang)}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="security-grid">
        <section className="workspace-card">
          <h2>{t(lang, "الموظفون", "Employees")}</h2>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              void list.refetch();
            }}
          >
            <TextField
              label={t(lang, "بحث بالاسم أو البريد", "Search name or email")}
              maxLength={100}
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
            />
            <SelectField
              label={t(lang, "الدور", "Role")}
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
            >
              <option value="">{t(lang, "الكل", "All")}</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleName(r, lang)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={t(lang, "الحالة", "Status")}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">{t(lang, "الكل", "All")}</option>
              <option value="active">{t(lang, "نشط", "Active")}</option>
              <option value="suspended">{t(lang, "موقوف", "Suspended")}</option>
            </SelectField>
            <button>{t(lang, "تحديث", "Refresh")}</button>
          </form>
          {list.error && <p role="alert">{securityFailure(list.error, lang)}</p>}
          {list.isPending && <p role="status">{t(lang, "جارٍ التحميل…", "Loading…")}</p>}
          <ul className="employee-list">
            {list.data?.items.map((u) => (
              <li key={u.id}>
                <button
                  className="text-link"
                  onClick={() => {
                    setSelected(u.id);
                    setLookupEmail("");
                  }}
                >
                  <bdi>
                    {u.name} · {u.email}
                  </bdi>
                </button>
                <p>
                  {roleName(u.role, lang)} ·{" "}
                  {u.suspendedAt ? t(lang, "موقوف", "Suspended") : t(lang, "نشط", "Active")}
                </p>
              </li>
            ))}
          </ul>
          {list.data && !list.data.items.length && <p>{t(lang, "لا توجد نتائج.", "No results.")}</p>}
          <Pager data={list.data} lang={lang} change={(page) => setFilters({ ...filters, page })} />
        </section>
        <section className="workspace-card">
          <h2>{t(lang, "دعوة موظف جديد", "Invite a new employee")}</h2>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              request(
                "staff/invitations",
                { email, role: inviteRole, lang },
                t(lang, "تأكيد إرسال الدعوة", "Confirm invitation"),
              );
            }}
          >
            <TextField
              label={t(lang, "بريد الدعوة", "Invitation email")}
              type="email"
              dir="ltr"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <SelectField
              label={t(lang, "دور الدعوة", "Invitation role")}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleName(r, lang)}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label={t(
                lang,
                "سبب الإجراء (10 أحرف على الأقل)",
                "Action reason (at least 10 characters)",
              )}
              required
              minLength={10}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button className="button button-primary" disabled={busy}>
              {t(lang, "إنشاء دعوة", "Create invitation")}
            </button>
          </form>
          <h2>{t(lang, "ترقية حساب موجود صراحةً", "Explicitly promote an existing account")}</h2>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSelected("");
              setLookupEmail(lookup.trim().toLowerCase());
            }}
          >
            <TextField
              label={t(lang, "بريد الحساب الموجود", "Existing account email")}
              required
              type="email"
              maxLength={254}
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
            />
            <button>{t(lang, "مراجعة الحساب", "Review account")}</button>
          </form>
          <p>
            {t(
              lang,
              "تظل كلمة المرور والملف والاستفسارات كما هي.",
              "Password, profile and inquiries are preserved.",
            )}
          </p>
        </section>
      </div>
      {(selected || lookupEmail) && (
        <section className="workspace-card">
          <h2>{t(lang, "تفاصيل الحساب", "Account details")}</h2>
          {detail.error && <p role="alert">{securityFailure(detail.error, lang)}</p>}
          {detail.data && (
            <>
              <p>
                <bdi>
                  {detail.data.name} · {detail.data.email}
                </bdi>
              </p>
              <p>
                {roleName(detail.data.role, lang)} ·{" "}
                {detail.data.mfaEnrolled
                  ? t(lang, "التحقق مفعّل", "MFA enrolled")
                  : t(lang, "يلزم إعداد التحقق", "MFA enrollment required")}
              </p>
              <p>
                {t(lang, "الإصدار:", "Version:")} {detail.data.version}
              </p>
              <SelectField
                label={t(lang, "الدور الجديد", "New role")}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleName(r, lang)}
                  </option>
                ))}
              </SelectField>
              <div className="page-actions">
                {(detail.data.role === "customer"
                  ? ["promote"]
                  : [
                      "role",
                      detail.data.suspendedAt ? "activate" : "suspend",
                      "revoke_sessions",
                      "reset_mfa",
                    ]
                ).map((a) => (
                  <button
                    key={a}
                    className="button button-secondary"
                    disabled={busy || reason.trim().length < 10}
                    onClick={() =>
                      request(
                        `staff/employees/${detail.data!.id}/actions`,
                        {
                          version: detail.data!.version,
                          action: a,
                          ...(["role", "promote"].includes(a) ? { role: targetRole } : {}),
                          ...(a === "promote" ? { expectedRole: "customer" } : {}),
                        },
                        {
                          promote: t(lang, "تأكيد ترقية الحساب", "Confirm account promotion"),
                          role: t(lang, "تأكيد تغيير الدور", "Confirm role change"),
                          activate: t(lang, "تأكيد إعادة التفعيل", "Confirm reactivation"),
                          suspend: t(lang, "تأكيد إيقاف الموظف", "Confirm suspension"),
                          revoke_sessions: t(
                            lang,
                            "تأكيد إلغاء جميع الجلسات",
                            "Confirm session revocation",
                          ),
                          reset_mfa: t(lang, "تأكيد إعادة ضبط التحقق", "Confirm MFA reset"),
                        }[a] || a,
                      )
                    }
                  >
                    {
                      {
                        promote: t(lang, "ترقية إلى موظف", "Promote to staff"),
                        role: t(lang, "تغيير الدور", "Change role"),
                        activate: t(lang, "إعادة التفعيل", "Reactivate"),
                        suspend: t(lang, "إيقاف", "Suspend"),
                        revoke_sessions: t(lang, "إلغاء الجلسات", "Revoke sessions"),
                        reset_mfa: t(lang, "إعادة ضبط MFA", "Reset MFA"),
                      }[a]
                    }
                  </button>
                ))}
              </div>
              <button onClick={() => detail.refetch()}>
                {t(lang, "تحديث التفاصيل", "Refresh details")}
              </button>
            </>
          )}
        </section>
      )}
      <section className="workspace-card">
        <h2>{t(lang, "الدعوات الأخيرة", "Recent invitations")}</h2>
        {invitations.error && <p role="alert">{securityFailure(invitations.error, lang)}</p>}
        <ul className="employee-list">
          {invitations.data?.items.map((i) => (
            <li key={i.id}>
              <bdi>{i.email}</bdi> · {roleName(i.role, lang)}
              <p>
                {i.consumedAt
                  ? t(lang, "مقبولة", "Accepted")
                  : i.revokedAt
                    ? t(lang, "ملغاة", "Revoked")
                    : Date.parse(i.expiresAt) <= Date.now()
                      ? t(lang, "منتهية", "Expired")
                      : t(lang, "بانتظار القبول", "Pending")}
              </p>
              {!i.consumedAt && !i.revokedAt && (
                <div className="page-actions">
                  {["resend", "revoke"].map((a) => (
                    <button
                      key={a}
                      disabled={busy || reason.trim().length < 10}
                      onClick={() =>
                        request(
                          `staff/invitations/${i.id}/actions`,
                          { action: a, lang },
                          a === "resend"
                            ? t(
                                lang,
                                "تأكيد تجديد وإعادة إرسال الدعوة",
                                "Confirm renewed invitation",
                              )
                            : t(lang, "تأكيد إلغاء الدعوة", "Confirm invitation revocation"),
                          i.email,
                        )
                      }
                    >
                      {a === "resend"
                        ? t(lang, "إعادة الإرسال", "Resend")
                        : t(lang, "إلغاء الدعوة", "Revoke invitation")}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <Pager data={invitations.data} lang={lang} change={setInvitationPage} />
      <dialog
        ref={dialog}
        className="workflow-dialog staff-administration-dialog"
        aria-labelledby="employee-confirm-title"
        onClose={() => {
          setPending(null);
          focus.current?.focus();
        }}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setPending(null);
        }}
      >
        <h2 id="employee-confirm-title">{pending?.title}</h2>
        <p>
          {t(
            lang,
            "سيُسجَّل السبب، وقد تُلغى جلسات الحساب. راجع الهوية والإجراء قبل التأكيد.",
            "The reason is recorded and sessions may be revoked. Review the account and action before confirming.",
          )}
        </p>
        <p>
          <bdi>{pending?.target}</bdi>
        </p>
        <p>{reason}</p>
        {!!error && <p role="alert">{securityFailure(error, lang)}</p>}
        <div className="page-actions">
          <button disabled={busy} onClick={() => setPending(null)}>
            {t(lang, "إلغاء", "Cancel")}
          </button>
          <button className="button button-primary" disabled={busy} onClick={confirm}>
            {busy ? t(lang, "جارٍ الحفظ…", "Saving…") : t(lang, "تأكيد الإجراء", "Confirm action")}
          </button>
        </div>
      </dialog>
    </StaffLayout>
  );
}
export function AuditPage({ lang, go }: Props) {
  const [form, setForm] = useState({ actor: "", action: "", target: "", from: "", to: "" }),
    [filters, setFilters] = useState<Record<string, string | number>>({ page: 1 });
  const query = useSecurityQuery<Page<AuditEvent>>(`staff/audit?${params(filters)}`, "audit:read");
  return (
    <StaffLayout lang={lang} go={go} active="/staff/audit-log">
      <header className="workspace-page-heading">
        <h1>{t(lang, "سجل التدقيق", "Audit log")}</h1>
      </header>
      <p>
        {t(
          lang,
          "سجل الموظفين والأمان والتحرير والاستفسارات. السجلات السابقة محفوظة؛ قد لا تحتوي القديمة على معرّف طلب.",
          "Staff, security, editorial and inquiry history. Historical records are retained; older events may lack request correlation.",
        )}
      </p>
      <form
        className="security-grid"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({
            ...form,
            from: form.from ? new Date(form.from).toISOString() : "",
            to: form.to ? new Date(form.to).toISOString() : "",
            page: 1,
          });
        }}
      >
        {(
          [
            ["actor", t(lang, "معرّف المنفذ", "Actor ID")],
            ["action", t(lang, "الإجراء المطابق", "Exact action")],
            ["target", t(lang, "الهدف المطابق", "Exact target")],
            ["from", t(lang, "من تاريخ", "From date")],
            ["to", t(lang, "إلى تاريخ", "To date")],
          ] as const
        ).map(([k, label]) => (
          <TextField
            key={k}
            label={label}
            type={k === "from" || k === "to" ? "datetime-local" : "text"}
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          />
        ))}
        <button className="button button-secondary">
          {t(lang, "تطبيق المرشحات", "Apply filters")}
        </button>
      </form>
      {query.isPending && <p role="status">{t(lang, "جارٍ التحميل…", "Loading…")}</p>}
      {query.error && (
        <p role="alert">
          {securityFailure(query.error, lang)}{" "}
          <button onClick={() => query.refetch()}>{t(lang, "إعادة المحاولة", "Retry")}</button>
        </p>
      )}
      <ul className="audit-list">
        {query.data?.items.map((e) => (
          <li className="workspace-card" key={e.id}>
            <h2>
              <bdi>{e.action}</bdi>
            </h2>
            <time dateTime={e.createdAt}>
              {new Date(e.createdAt).toLocaleString(lang === "ar" ? "ar-PS" : "en-GB")}
            </time>
            <p>
              {t(lang, "المنفذ:", "Actor:")}{" "}
              <bdi>
                {e.actorId || "operator"} ({e.actorRole})
              </bdi>
            </p>
            <p>
              {t(lang, "الهدف:", "Target:")} <bdi>{e.target}</bdi>
            </p>
            <p>
              {t(lang, "معرّف الطلب:", "Request ID:")}{" "}
              <bdi>{e.requestId || t(lang, "سجل سابق", "Historical event")}</bdi>
            </p>
            <dl>
              {Object.entries(e.changes).map(([k, v]) => (
                <div key={k}>
                  <dt>
                    <bdi>{k}</bdi>
                  </dt>
                  <dd>{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      {query.data && !query.data.items.length && (
        <p>{t(lang, "لا توجد سجلات مطابقة.", "No matching records.")}</p>
      )}
      <Pager data={query.data} lang={lang} change={(page) => setFilters({ ...filters, page })} />
    </StaffLayout>
  );
}
