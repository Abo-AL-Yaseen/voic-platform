import { useState } from "react";
import AppLink from "../components/AppLink";
import { StatusBadge } from "../components/Feedback";
import { PasswordField, SelectField, TextField } from "../components/FormFields";
import { AccountLayout } from "../components/WorkspaceLayouts";
import { msg, withLang, type Lang } from "../i18n";
import { useAuth, useLogout, usePasswordChange, authFailure } from "../hooks/auth/queries";
import { useProfile, useSaveProfile } from "../hooks/account/queries";
import { InquiryCounts } from "./InquiryAccountPages";
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
        <InquiryCounts lang={lang} go={go} />
      </div>
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
export { InquiryListPage, InquiryDetailPage } from "./InquiryAccountPages";
