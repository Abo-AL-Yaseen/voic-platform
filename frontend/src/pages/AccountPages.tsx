import { useEffect, useState } from "react";
import AppLink from "../components/AppLink";
import { IntegrationNotice, StatusBadge } from "../components/Feedback";
import { PasswordField, SelectField, TextAreaField, TextField } from "../components/FormFields";
import { AccountLayout, Pagination } from "../components/WorkspaceLayouts";
import { msg, withLang, type Lang } from "../i18n";
import { useAuth, useLogout, usePasswordChange, authFailure } from "../hooks/auth/queries";
import { useProfile, useSaveProfile } from "../hooks/account/queries";
import type { ProfileInput, User } from "../services/auth";

type Props = {
  lang: Lang;
  go: (href: string) => void;
  preview?: boolean;
  inquiryId?: string;
  search?: string;
};
const text = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
export function AccountAccessPage({ lang, go, search = "" }: Props) {
  const returnTo = `/account${search}`;
  return (
    <main className="access-page section-pad">
      <div>
        <p className="eyebrow">VOIC</p>
        <h1>{text(lang, "سجّل الدخول لعرض حسابك", "Sign in to view your account")}</h1>
        <p>
          {text(
            lang,
            "تبقى المنتجات والوصفات متاحة للجميع.",
            "Products and recipes remain public.",
          )}
        </p>
        <div className="page-actions">
          <AppLink
            href={withLang(`/login?returnTo=${encodeURIComponent(returnTo)}&expired=1`, lang)}
            go={go}
            className="button button-primary"
          >
            {text(lang, "تسجيل الدخول", "Sign in")}
          </AppLink>
          <AppLink
            href={withLang(`/register?returnTo=${encodeURIComponent(returnTo)}`, lang)}
            go={go}
            className="button button-secondary"
          >
            {text(lang, "إنشاء حساب", "Create account")}
          </AppLink>
        </div>
      </div>
    </main>
  );
}
function PreviewHeader({
  lang,
  title,
  description,
}: {
  lang: Lang;
  title: string;
  description: string;
}) {
  return (
    <header className="workspace-page-heading">
      <div>
        <p className="eyebrow">VOIC</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
export function AccountOverviewPage({ lang, go }: Props) {
  const user = useAuth().session?.user;
  return (
    <AccountLayout lang={lang} go={go} active="/account">
      <PreviewHeader
        lang={lang}
        title={text(lang, "نظرة عامة", "Account overview")}
        description={user?.name || ""}
      />
      <div className="account-summary-grid">
        <section>
          <span>{text(lang, "حالة البريد", "Email status")}</span>
          <StatusBadge
            status={user?.emailVerified ? "success" : "warning"}
            label={
              user?.emailVerified
                ? text(lang, "تم التحقق", "Verified")
                : text(lang, "لم يتم التحقق بعد", "Not verified yet")
            }
          />
          <p>{user?.email}</p>
          {!user?.emailVerified && (
            <AppLink
              className="text-link"
              go={go}
              href={withLang("/verify-email?returnTo=/account", lang)}
            >
              {text(lang, "تحقق من البريد الإلكتروني", "Verify email")}
            </AppLink>
          )}
        </section>
        <section>
          <span>{text(lang, "استفسارات التوريد", "Supply inquiries")}</span>
          <strong>—</strong>
          <p>
            {text(
              lang,
              "إرسال وحفظ الاستفسارات غير متصلين بعد.",
              "Inquiry submission and saved inquiries are not connected yet.",
            )}
          </p>
        </section>
      </div>
      <IntegrationNotice lang={lang}>
        {text(
          lang,
          "الحساب متصل. إرسال الاستفسارات ومتابعتها لم يُربطا بعد.",
          "Your account is connected. Inquiry submission and tracking are not connected yet.",
        )}
      </IntegrationNotice>
    </AccountLayout>
  );
}
export function ProfilePage({ lang, go }: Props) {
  const query = useProfile(),
    save = useSaveProfile();
  if (query.isPending)
    return (
      <p role="status" className="section-pad">
        {text(lang, "جارٍ تحميل الملف…", "Loading profile…")}
      </p>
    );
  if (query.isError || !query.data)
    return (
      <div className="section-pad" role="alert">
        {authFailure(query.error, lang)}{" "}
        <button onClick={() => query.refetch()}>{text(lang, "إعادة المحاولة", "Retry")}</button>
      </div>
    );
  return <ProfileForm key={query.data.id} initial={query.data} lang={lang} go={go} save={save} />;
}
function ProfileForm({
  initial,
  lang,
  go,
  save,
}: {
  initial: User;
  lang: Lang;
  go: Props["go"];
  save: ReturnType<typeof useSaveProfile>;
}) {
  const [values, setValues] = useState<ProfileInput>({
    name: initial.name,
    kind: initial.kind,
    company: initial.company || "",
    country: initial.country,
    phone: initial.phone || "",
  });
  const set = (key: keyof ProfileInput, value: string) => setValues({ ...values, [key]: value });
  return (
    <AccountLayout lang={lang} go={go} active="/account/profile">
      <PreviewHeader
        lang={lang}
        title={text(lang, "الملف الشخصي", "Profile")}
        description={text(lang, "بيانات الحساب القابلة للتعديل.", "Editable account details.")}
      />
      <form
        className="workspace-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!save.isPending)
            save.mutate({
              ...values,
              company: values.kind === "company" ? values.company : undefined,
            });
        }}
        onReset={() =>
          setValues({
            name: initial.name,
            kind: initial.kind,
            company: initial.company || "",
            country: initial.country,
            phone: initial.phone || "",
          })
        }
      >
        <div className="form-grid">
          <TextField
            label={text(lang, "الاسم الكامل", "Full name")}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={100}
          />
          <SelectField
            label={text(lang, "نوع الحساب", "Account type")}
            value={values.kind}
            onChange={(e) => set("kind", e.target.value)}
          >
            <option value="individual">{text(lang, "فرد", "Individual")}</option>
            <option value="company">{text(lang, "شركة", "Company")}</option>
          </SelectField>
          {values.kind === "company" && (
            <TextField
              label={text(lang, "اسم الشركة", "Company name")}
              value={values.company || ""}
              onChange={(e) => set("company", e.target.value)}
              required
              maxLength={150}
            />
          )}
          <TextField
            label={text(lang, "الدولة", "Country")}
            value={values.country}
            onChange={(e) => set("country", e.target.value)}
            required
            maxLength={100}
          />
          <TextField
            label={text(lang, "الهاتف (اختياري)", "Phone (optional)")}
            value={values.phone || ""}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={40}
          />
          <TextField
            label={text(lang, "البريد الإلكتروني", "Email")}
            value={initial.email}
            disabled
            hint={text(
              lang,
              "تغيير البريد غير متاح في هذه المرحلة.",
              "Email changes are not available in this phase.",
            )}
          />
        </div>
        <div className="page-actions">
          <button className="button button-primary" disabled={save.isPending}>
            {text(lang, "حفظ التغييرات", "Save changes")}
          </button>
          <button className="button button-secondary" type="reset">
            {text(lang, "إلغاء", "Cancel")}
          </button>
        </div>
        {save.isSuccess && <p role="status">{text(lang, "حُفظت التغييرات.", "Changes saved.")}</p>}
        {save.error && <p role="alert">{authFailure(save.error, lang)}</p>}
      </form>
    </AccountLayout>
  );
}
export function SecurityPage({ lang, go }: Props) {
  const change = usePasswordChange(),
    logout = useLogout();
  const [values, setValues] = useState({ currentPassword: "", password: "", confirm: "" }),
    [error, setError] = useState("");
  const set = (key: keyof typeof values, value: string) => setValues({ ...values, [key]: value });
  return (
    <AccountLayout lang={lang} go={go} active="/account/security">
      <PreviewHeader
        lang={lang}
        title={text(lang, "أمان الحساب", "Account security")}
        description={text(
          lang,
          "تغيير كلمة المرور يلغي جميع جلسات الحساب ويطلب تسجيل الدخول مجددًا.",
          "Changing your password revokes every account session and requires sign-in again.",
        )}
      />
      <form
        className="workspace-form compact-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (change.isPending) return;
          if (values.password !== values.confirm) {
            setError(text(lang, "كلمتا المرور غير متطابقتين.", "Passwords do not match."));
            return;
          }
          setError("");
          try {
            await change.mutateAsync({
              currentPassword: values.currentPassword,
              password: values.password,
            });
            go(withLang("/login?changed=1", lang));
          } catch {}
        }}
      >
        <PasswordField
          lang={lang}
          label={text(lang, "كلمة المرور الحالية", "Current password")}
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(e) => set("currentPassword", e.target.value)}
          required
          maxLength={128}
        />
        <PasswordField
          lang={lang}
          label={text(lang, "كلمة المرور الجديدة", "New password")}
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          required
          minLength={15}
          maxLength={128}
          hint={text(lang, "15 محرفًا على الأقل.", "At least 15 characters.")}
        />
        <PasswordField
          lang={lang}
          label={text(lang, "تأكيد كلمة المرور", "Confirm password")}
          autoComplete="new-password"
          value={values.confirm}
          onChange={(e) => set("confirm", e.target.value)}
          required
          minLength={15}
          maxLength={128}
        />
        <button className="button button-primary" disabled={change.isPending}>
          {text(lang, "تحديث كلمة المرور", "Update password")}
        </button>
        {(error || change.error) && <p role="alert">{error || authFailure(change.error, lang)}</p>}
      </form>
      <section className="workspace-section">
        <h2>{text(lang, "الجلسة الحالية", "Current session")}</h2>
        <button
          className="button button-secondary"
          disabled={logout.isPending}
          onClick={async () => {
            try {
              await logout.mutateAsync();
              go(withLang("/login", lang));
            } catch {}
          }}
        >
          {text(lang, "تسجيل الخروج من هذه الجلسة", "Log out of this session")}
        </button>
        {logout.error && <p role="alert">{authFailure(logout.error, lang)}</p>}
      </section>
    </AccountLayout>
  );
}
export function InquiryListPage({ lang, go }: Props) {
  return (
    <AccountLayout lang={lang} go={go} active="/account/inquiries">
      <PreviewHeader
        lang={lang}
        title={msg(lang, { ar: "استفساراتي", en: "My inquiries" })}
        description={msg(lang, {
          ar: "متابعة استفسارات التوريد المحفوظة للحساب.",
          en: "Track supply inquiries saved to the account.",
        })}
      />
      <div className="list-toolbar">
        <TextField
          label={msg(lang, { ar: "ابحث بالمرجع", en: "Search reference" })}
          type="search"
          placeholder="—"
        />
        <SelectField label={msg(lang, { ar: "الحالة", en: "Status" })}>
          <option>{msg(lang, { ar: "كل الحالات", en: "All statuses" })}</option>
          <option>submitted</option>
          <option>under_review</option>
          <option>awaiting_customer</option>
          <option>responded</option>
          <option>closed</option>
          <option>cancelled</option>
        </SelectField>
        <SelectField label={msg(lang, { ar: "ترتيب التاريخ", en: "Date order" })}>
          <option>{msg(lang, { ar: "الأحدث أولًا", en: "Newest first" })}</option>
          <option>{msg(lang, { ar: "الأقدم أولًا", en: "Oldest first" })}</option>
        </SelectField>
      </div>
      <IntegrationNotice lang={lang} />
      <div
        className="responsive-table"
        role="region"
        aria-label={msg(lang, { ar: "قائمة الاستفسارات", en: "Inquiry list" })}
        tabIndex={0}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>{msg(lang, { ar: "المرجع", en: "Reference" })}</th>
              <th>{msg(lang, { ar: "المنتجات", en: "Products" })}</th>
              <th>{msg(lang, { ar: "الوجهة", en: "Destination" })}</th>
              <th>{msg(lang, { ar: "الحالة", en: "Status" })}</th>
              <th>{msg(lang, { ar: "التاريخ", en: "Date" })}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5}>
                {msg(lang, {
                  ar: "لا توجد بيانات محمّلة. هذه ليست نتيجة صفر مؤكدة.",
                  en: "No data is loaded. This is not a confirmed zero result.",
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination lang={lang} />
    </AccountLayout>
  );
}

export function InquiryDetailPage({ lang, go, inquiryId }: Props) {
  return (
    <AccountLayout lang={lang} go={go} active="/account/inquiries">
      <PreviewHeader
        lang={lang}
        title={msg(lang, { ar: "تفاصيل الاستفسار", en: "Inquiry details" })}
        description={msg(lang, {
          ar: "يُحمّل السجل الحقيقي حسب المرجع وملكية الحساب.",
          en: "The real record is loaded by reference and account ownership.",
        })}
      />
      <IntegrationNotice
        lang={lang}
        title={
          inquiryId
            ? msg(lang, {
                ar: "لا يمكن تحميل هذا الاستفسار",
                en: "This inquiry cannot be loaded",
              })
            : undefined
        }
      >
        {msg(lang, {
          ar: "لم يتم اختلاق سجل لهذا المعرّف. يلزم API يتحقق من الملكية.",
          en: "No record was fabricated for this identifier. An ownership-enforcing API is required.",
        })}
      </IntegrationNotice>
      <div className="detail-placeholder-grid">
        {[
          "Reference / status",
          "Products / packages / quantities",
          "Destination / submitted details",
          "Status history",
          "Customer-visible messages",
        ].map((label) => (
          <section key={label}>
            <h2>{label}</h2>
            <p>—</p>
          </section>
        ))}
      </div>
      <form className="workspace-form">
        <TextAreaField
          label={msg(lang, {
            ar: "رد بمعلومات إضافية",
            en: "Reply with additional information",
          })}
          rows={5}
          placeholder="—"
        />
        <button className="button button-primary" type="button" disabled>
          {msg(lang, { ar: "إرسال الرد", en: "Send reply" })}
        </button>
        <button className="text-link danger-link" type="button" disabled>
          {msg(lang, {
            ar: "طلب إلغاء الاستفسار",
            en: "Request cancellation",
          })}
        </button>
      </form>
    </AccountLayout>
  );
}
