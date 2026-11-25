import { useEffect, useMemo, useState, type FormEvent } from "react";
import AppLink from "../components/AppLink";
import { ErrorSummary, PasswordField, TextField } from "../components/FormFields";
import { StatusBadge } from "../components/Feedback";
import { msg, withLang, type Lang } from "../i18n";
import { safeInternalPath } from "../utils/navigation";

import { useAuth, useAuthAction, useLogin, authFailure } from "../hooks/auth/queries";
import * as authService from "../services/auth";

type AuthPageProps = {
  lang: Lang;
  go: (href: string) => void;
  search?: string;
  previewState?:
    | "default"
    | "pending"
    | "success"
    | "expired"
    | "invalid"
    | "error"
    | "session-expired";
};

const required = (lang: Lang) =>
  msg(lang, {
    ar: "هذا الحقل مطلوب.",
    en: "This field is required.",
  });
const invalidEmail = (lang: Lang) =>
  msg(lang, {
    ar: "أدخل بريدًا إلكترونيًا صحيحًا.",
    en: "Enter a valid email address.",
  });
function AuthShell({
  lang,
  title,
  description,
  children,
}: {
  lang: Lang;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page section-pad">
      <section className="auth-intro">
        <p className="eyebrow">VOIC</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="auth-assurance">
          <strong>
            {msg(lang, {
              ar: "استفسار، وليس شراءً تلقائيًا",
              en: "An inquiry, not an automatic purchase",
            })}
          </strong>
          <p>
            {msg(lang, {
              ar: "تراجع الشركة تفاصيل التوريد وتتواصل معك لتأكيد المعلومات التجارية.",
              en: "The company reviews supply details and contacts you to confirm commercial information.",
            })}
          </p>
        </div>
      </section>
      <section className="auth-card">{children}</section>
    </main>
  );
}

const text = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
const passHint = (lang: Lang) =>
  text(lang, "استخدم 15 محرفًا على الأقل، وبحد أقصى 128.", "Use 15 to 128 characters.");
const contextPath = (path: string, returnTo: string) =>
  `${path}?returnTo=${encodeURIComponent(returnTo)}`;
const returnPath = (search: string) =>
  safeInternalPath(new URLSearchParams(search).get("returnTo"));
function TokenFeedback({ error, success, lang }: { error: unknown; success?: string; lang: Lang }) {
  return (
    <>
      {error && (
        <div className="inline-alert" role="alert">
          {authFailure(error, lang)}
        </div>
      )}
      {success && <p role="status">{success}</p>}
    </>
  );
}
export function LoginPage({ lang, go, search = "", previewState }: AuthPageProps) {
  const returnTo = returnPath(search),
    login = useLogin();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (login.isPending) return;
    if (!email || !password) {
      setErrors([required(lang)]);
      return;
    }
    setErrors([]);
    try {
      const result = await login.mutateAsync({ email: email.trim(), password });
      setPassword("");
      const user = result.user!;
      const destination =
        user.role !== "customer"
          ? result.staffAuth === "complete"
            ? "/staff"
            : "/staff/security"
          : returnTo.startsWith("/staff")
            ? "/account"
            : returnTo;
      go(
        withLang(
          user.role === "customer" && !user.emailVerified
            ? contextPath("/verify-email", destination)
            : destination,
          lang,
        ),
      );
    } catch {
      /* Mutation state owns the safe error. */
    }
  }
  return (
    <AuthShell
      lang={lang}
      title={text(lang, "تسجيل الدخول", "Sign in")}
      description={text(
        lang,
        "مدخل واحد للعملاء والموظفين المصرّح لهم.",
        "One secure entry for customers and authorized employees.",
      )}
    >
      {(previewState === "session-expired" ||
        new URLSearchParams(search).get("expired") === "1") && (
        <p role="alert">
          {text(
            lang,
            "انتهت الجلسة. سجّل الدخول للمتابعة.",
            "Your session expired. Sign in to continue.",
          )}
        </p>
      )}
      <ErrorSummary title={text(lang, "راجع البيانات", "Check your details")} errors={errors} />
      <TokenFeedback error={login.error} lang={lang} />
      <form className="stack-form" onSubmit={submit}>
        <TextField
          label={text(lang, "البريد الإلكتروني", "Email")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
        />
        <PasswordField
          lang={lang}
          label={text(lang, "كلمة المرور", "Password")}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          maxLength={128}
        />
        <button className="button button-primary" disabled={login.isPending}>
          {login.isPending
            ? text(lang, "جارٍ الدخول…", "Signing in…")
            : text(lang, "تسجيل الدخول", "Sign in")}
        </button>
      </form>
      <AppLink
        className="text-link"
        go={go}
        href={withLang(contextPath("/forgot-password", returnTo), lang)}
      >
        {text(lang, "نسيت كلمة المرور؟", "Forgot password?")}
      </AppLink>
      <p>
        <AppLink
          className="text-link"
          go={go}
          href={withLang(contextPath("/register", returnTo), lang)}
        >
          {text(lang, "أنشئ حسابًا", "Create an account")}
        </AppLink>
      </p>
    </AuthShell>
  );
}
export function RegisterPage({ lang, go, search = "" }: AuthPageProps) {
  const returnTo = returnPath(search),
    mutation = useAuthAction(authService.register);
  const [kind, setKind] = useState<"individual" | "company">("individual");
  const [values, setValues] = useState({
    name: "",
    company: "",
    country: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const set = (key: keyof typeof values, value: string) => setValues({ ...values, [key]: value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;
    if (values.password !== values.confirm) {
      setErrors([text(lang, "كلمتا المرور غير متطابقتين.", "Passwords do not match.")]);
      return;
    }
    setErrors([]);
    try {
      await mutation.mutateAsync({
        name: values.name,
        kind,
        company: kind === "company" ? values.company : undefined,
        country: values.country,
        phone: values.phone,
        email: values.email.trim(),
        password: values.password,
        lang,
        returnTo,
      });
      setValues({ ...values, password: "", confirm: "" });
      go(withLang(contextPath("/verify-email", returnTo), lang));
    } catch {}
  }
  return (
    <AuthShell
      lang={lang}
      title={text(lang, "إنشاء حساب عميل", "Create a customer account")}
      description={text(
        lang,
        "للأفراد والشركات دون موافقة موظف. التسجيل العام ينشئ حساب عميل فقط.",
        "For individuals and companies without staff approval. Public registration creates customer accounts only.",
      )}
    >
      <ErrorSummary title={text(lang, "راجع البيانات", "Check your details")} errors={errors} />
      <TokenFeedback error={mutation.error} lang={lang} />
      <form className="stack-form" onSubmit={submit}>
        <fieldset className="segmented-control">
          <legend>{text(lang, "نوع الحساب", "Account type")}</legend>
          {(["individual", "company"] as const).map((k) => (
            <label key={k}>
              <input type="radio" checked={kind === k} onChange={() => setKind(k)} />
              <span>
                {k === "individual"
                  ? text(lang, "فرد", "Individual")
                  : text(lang, "شركة", "Company")}
              </span>
            </label>
          ))}
        </fieldset>
        {(
          ["name", ...(kind === "company" ? ["company"] : []), "country", "phone"] as (
            | "name"
            | "company"
            | "country"
            | "phone"
          )[]
        ).map((k) => (
          <TextField
            key={k}
            label={
              {
                name: text(lang, "الاسم الكامل", "Full name"),
                company: text(lang, "اسم الشركة", "Company name"),
                country: text(lang, "الدولة", "Country"),
                phone: text(lang, "الهاتف (اختياري)", "Phone (optional)"),
              }[k]
            }
            value={values[k]}
            onChange={(e) => set(k, e.target.value)}
            required={k !== "phone"}
            maxLength={k === "company" ? 150 : k === "phone" ? 40 : 100}
          />
        ))}
        <TextField
          label={text(lang, "البريد الإلكتروني", "Email")}
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          required
          maxLength={254}
        />
        <PasswordField
          lang={lang}
          label={text(lang, "كلمة المرور", "Password")}
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          required
          minLength={15}
          maxLength={128}
          hint={passHint(lang)}
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
        <p className="form-hint">
          {text(
            lang,
            "يجب تأكيد البريد قبل إرسال استفسار توريد، ثم يمكنك حفظه وإرساله ومتابعته من حسابك.",
            "Verify your email before sending a supply inquiry, then save, submit and track it from your account.",
          )}
        </p>
        <AppLink className="text-link" href={withLang("/privacy", lang)} go={go}>
          {text(lang, "مسودة الخصوصية", "Privacy draft")}
        </AppLink>
        <button className="button button-primary" disabled={mutation.isPending}>
          {mutation.isPending
            ? text(lang, "جارٍ الإرسال…", "Sending…")
            : text(lang, "إنشاء الحساب", "Create account")}
        </button>
      </form>
      <AppLink className="text-link" go={go} href={withLang(contextPath("/login", returnTo), lang)}>
        {text(lang, "عندي حساب", "I already have an account")}
      </AppLink>
    </AuthShell>
  );
}
function linkToken() {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
}
function useLinkToken() {
  const [token, setToken] = useState(linkToken);
  useEffect(() => {
    const update = () => setToken(linkToken());
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return token;
}
export function VerifyEmailPage({ lang, go, search = "" }: AuthPageProps) {
  const auth = useAuth(),
    verify = useAuthAction(authService.confirmVerification, true),
    resend = useAuthAction(authService.resendVerification);
  const [email, setEmail] = useState(""),
    token = useLinkToken();
  useEffect(() => {
    verify.reset();
    resend.reset();
  }, [token]);
  const returnTo = returnPath(search),
    verified = verify.isSuccess || (!token && auth.session?.user?.emailVerified);
  return (
    <AuthShell
      lang={lang}
      title={
        verified
          ? text(lang, "تم التحقق من البريد", "Email verified")
          : text(lang, "تحقق من بريدك للمتابعة", "Verify your email to continue")
      }
      description={text(
        lang,
        "إن كان الحساب مؤهلًا فستصل رسالة التحقق. التصفح وتسجيل الدخول متاحان دون تأكيد، وإرسال الاستفسارات يتطلب التأكيد.",
        "If eligible, a verification message will be sent. Browsing and sign-in remain available; inquiry submission requires verification.",
      )}
    >
      <StatusBadge
        status={verified ? "success" : "warning"}
        label={
          verified
            ? text(lang, "تم التحقق", "Verified")
            : text(lang, "لم يتم التحقق بعد", "Not verified yet")
        }
      />
      <TokenFeedback
        error={verify.error || resend.error}
        lang={lang}
        success={
          resend.isSuccess
            ? text(
                lang,
                "تم قبول الطلب. تحقق من بريدك إن كان الحساب مؤهلًا.",
                "Request accepted. Check your email if the account is eligible.",
              )
            : undefined
        }
      />
      {token && !verified && (
        <button
          className="button button-primary"
          disabled={verify.isPending}
          onClick={() => verify.mutate(token)}
        >
          {verify.isPending
            ? text(lang, "جارٍ التحقق…", "Verifying…")
            : text(lang, "تأكيد البريد الإلكتروني", "Confirm email")}
        </button>
      )}
      {!verified && (
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!resend.isPending)
              resend.mutate({ email: auth.session?.user?.email || email, lang, returnTo });
          }}
        >
          {!auth.session?.user && (
            <TextField
              label={text(lang, "البريد الإلكتروني", "Email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          )}
          <button className="button button-secondary" disabled={resend.isPending}>
            {text(lang, "إعادة إرسال رسالة التحقق", "Resend verification email")}
          </button>
        </form>
      )}
      <AppLink
        className="text-link"
        go={go}
        href={withLang(auth.session?.user ? returnTo : contextPath("/login", returnTo), lang)}
      >
        {verified
          ? text(lang, "متابعة", "Continue")
          : text(
              lang,
              "تسجيل الدخول أو المتابعة دون تأكيد",
              "Sign in or continue without verification",
            )}
      </AppLink>
    </AuthShell>
  );
}
export function ForgotPasswordPage({ lang, go, search = "" }: AuthPageProps) {
  const [email, setEmail] = useState(""),
    recovery = useAuthAction(authService.forgotPassword),
    returnTo = returnPath(search);
  return (
    <AuthShell
      lang={lang}
      title={text(lang, "استعادة كلمة المرور", "Recover your password")}
      description={text(
        lang,
        "أدخل بريدك. الاستجابة محايدة لحماية خصوصية الحسابات.",
        "Enter your email. The response remains neutral to protect account privacy.",
      )}
    >
      <TokenFeedback
        error={recovery.error}
        lang={lang}
        success={
          recovery.isSuccess
            ? text(
                lang,
                "إن كان البريد مرتبطًا بحساب فستصلك تعليمات الاستعادة.",
                "If the email has an account, recovery instructions will be sent.",
              )
            : undefined
        }
      />
      <form
        className="stack-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!recovery.isPending) recovery.mutate({ email: email.trim(), lang, returnTo });
        }}
      >
        <TextField
          label={text(lang, "البريد الإلكتروني", "Email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
        />
        <button className="button button-primary" disabled={recovery.isPending}>
          {text(lang, "طلب رابط الاستعادة", "Request recovery link")}
        </button>
      </form>
      <AppLink className="text-link" go={go} href={withLang(contextPath("/login", returnTo), lang)}>
        {text(lang, "العودة لتسجيل الدخول", "Back to sign in")}
      </AppLink>
    </AuthShell>
  );
}
export function ResetPasswordPage({ lang, go, search = "" }: AuthPageProps) {
  const reset = useAuthAction(authService.resetPassword),
    token = useLinkToken(),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    reset.reset();
    setPassword("");
    setConfirm("");
    setErrors([]);
  }, [token]);
  const returnTo = returnPath(search);
  return (
    <AuthShell
      lang={lang}
      title={text(lang, "إعادة تعيين كلمة المرور", "Reset password")}
      description={passHint(lang)}
    >
      <ErrorSummary title={text(lang, "راجع البيانات", "Check your details")} errors={errors} />
      <TokenFeedback
        error={reset.error}
        lang={lang}
        success={
          reset.isSuccess
            ? text(
                lang,
                "تم تغيير كلمة المرور وإبطال الجلسات السابقة. سجّل الدخول مجددًا.",
                "Password reset. Previous sessions were revoked. Sign in again.",
              )
            : undefined
        }
      />
      {!token && (
        <p role="alert">
          {text(lang, "الرابط غير صالح. اطلب رابطًا جديدًا.", "Invalid link. Request a new link.")}
        </p>
      )}
      {!reset.isSuccess && token && (
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (reset.isPending) return;
            if (password !== confirm) {
              setErrors([text(lang, "كلمتا المرور غير متطابقتين.", "Passwords do not match.")]);
              return;
            }
            setErrors([]);
            reset.mutate(
              { token, password },
              {
                onSuccess: () => {
                  setPassword("");
                  setConfirm("");
                  void authRefresh();
                },
              },
            );
          }}
        >
          <PasswordField
            lang={lang}
            label={text(lang, "كلمة المرور الجديدة", "New password")}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={15}
            maxLength={128}
          />
          <PasswordField
            lang={lang}
            label={text(lang, "تأكيد كلمة المرور", "Confirm password")}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={15}
            maxLength={128}
          />
          <button className="button button-primary" disabled={reset.isPending}>
            {text(lang, "حفظ كلمة المرور", "Save password")}
          </button>
        </form>
      )}
      <AppLink
        className="text-link"
        go={go}
        href={withLang(
          contextPath(reset.isSuccess ? "/login" : "/forgot-password", returnTo),
          lang,
        )}
      >
        {reset.isSuccess
          ? text(lang, "تسجيل الدخول", "Sign in")
          : text(lang, "طلب رابط جديد", "Request a new link")}
      </AppLink>
    </AuthShell>
  );
  async function authRefresh() {
    window.dispatchEvent(new Event("voic:session-expired"));
  }
}

export function MfaChallenge({ lang }: { lang: Lang }) {
  const [method, setMethod] = useState<"code" | "recovery">("code");
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState("");
  const label = useMemo(
    () =>
      method === "code"
        ? msg(lang, { ar: "رمز المصادقة", en: "Authentication code" })
        : msg(lang, { ar: "رمز الاسترداد", en: "Recovery code" }),
    [lang, method],
  );
  return (
    <section className="preview-panel">
      <h2>
        {msg(lang, {
          ar: "تحقق إضافي للموظف",
          en: "Staff verification",
        })}
      </h2>
      <TextField
        label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode={method === "code" ? "numeric" : "text"}
      />
      <button
        className="button button-primary"
        onClick={() =>
          setNotice(
            text(
              lang,
              "المصادقة الإضافية غير متصلة بعد.",
              "Additional authentication is not connected yet.",
            ),
          )
        }
      >
        {msg(lang, { ar: "تحقق", en: "Verify" })}
      </button>
      <button
        className="text-link"
        onClick={() => {
          setMethod(method === "code" ? "recovery" : "code");
          setValue("");
        }}
      >
        {method === "code"
          ? msg(lang, {
              ar: "استخدم رمز استرداد",
              en: "Use a recovery code",
            })
          : msg(lang, {
              ar: "استخدم رمز المصادقة",
              en: "Use an authentication code",
            })}
      </button>
      {notice && (
        <p className="field-error" role="alert">
          {notice}
        </p>
      )}
    </section>
  );
}
