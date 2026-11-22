import { useMemo, useState, type FormEvent } from "react";
import AppLink from "../components/AppLink";
import { ErrorSummary, PasswordField, TextField } from "../components/FormFields";
import { IntegrationNotice, StatusBadge } from "../components/Feedback";
import { msg, withLang, type Lang } from "../i18n";
import { safeInternalPath } from "../utils/navigation";

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
const disconnected = (lang: Lang) =>
  msg(lang, {
    ar: "تعذّر المتابعة لأن خدمة الحسابات غير متصلة بعد. لم يتم إرسال أو حفظ أي بيانات.",
    en: "The account service is not connected yet. No data was sent or saved.",
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

export function LoginPage({ lang, go, search = "", previewState = "default" }: AuthPageProps) {
  const params = new URLSearchParams(search);
  const returnTo = safeInternalPath(params.get("returnTo"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.push(invalidEmail(lang));
    if (!password) next.push(required(lang));
    if (!next.length) next.push(disconnected(lang));
    setErrors(next);
  };
  return (
    <AuthShell
      lang={lang}
      title={msg(lang, { ar: "تسجيل الدخول", en: "Sign in" })}
      description={msg(lang, {
        ar: "مدخل واحد للعملاء والموظفين المصرّح لهم.",
        en: "One secure entry for customers and authorized employees.",
      })}
    >
      {previewState === "session-expired" && (
        <div className="inline-alert" role="alert">
          {msg(lang, {
            ar: "انتهت الجلسة. سجّل الدخول للمتابعة.",
            en: "Your session expired. Sign in to continue.",
          })}
        </div>
      )}
      <ErrorSummary
        title={msg(lang, { ar: "راجع البيانات", en: "Check your details" })}
        errors={errors}
      />
      <form className="stack-form" onSubmit={submit} noValidate>
        <TextField
          label={msg(lang, { ar: "البريد الإلكتروني", en: "Email" })}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordField
          lang={lang}
          label={msg(lang, { ar: "كلمة المرور", en: "Password" })}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <AppLink href={withLang("/forgot-password", lang)} go={go} className="text-link">
          {msg(lang, {
            ar: "نسيت كلمة المرور؟",
            en: "Forgot password?",
          })}
        </AppLink>
        <button className="button button-primary" type="submit">
          {msg(lang, { ar: "تسجيل الدخول", en: "Sign in" })}
        </button>
      </form>
      <p className="auth-switch">
        {msg(lang, { ar: "ما عندك حساب؟", en: "New to VOIC?" })}{" "}
        <AppLink
          href={withLang(`/register?returnTo=${encodeURIComponent(returnTo)}`, lang)}
          go={go}
          className="text-link"
        >
          {msg(lang, { ar: "أنشئ حسابًا", en: "Create an account" })}
        </AppLink>
      </p>
    </AuthShell>
  );
}

export function RegisterPage({ lang, go, search = "" }: AuthPageProps) {
  const returnTo = safeInternalPath(new URLSearchParams(search).get("returnTo"));
  const [kind, setKind] = useState<"individual" | "company">("individual");
  const [values, setValues] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const set = (key: keyof typeof values, value: string) => setValues({ ...values, [key]: value });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: string[] = [];
    if (!values.name.trim()) next.push(required(lang));
    if (kind === "company" && !values.company.trim()) next.push(required(lang));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.push(invalidEmail(lang));
    if (values.password.length < 10)
      next.push(
        msg(lang, {
          ar: "يجب أن تتكون كلمة المرور من 10 أحرف على الأقل.",
          en: "Use at least 10 characters for the password.",
        }),
      );
    if (values.password !== values.confirm)
      next.push(
        msg(lang, {
          ar: "كلمتا المرور غير متطابقتين.",
          en: "Passwords do not match.",
        }),
      );
    if (!next.length) next.push(disconnected(lang));
    setErrors([...new Set(next)]);
  };
  return (
    <AuthShell
      lang={lang}
      title={msg(lang, {
        ar: "إنشاء حساب عميل",
        en: "Create a customer account",
      })}
      description={msg(lang, {
        ar: "للأفراد والشركات. لا يمكن إنشاء حساب موظف من التسجيل العام.",
        en: "For individuals and companies. Staff accounts cannot be created through public registration.",
      })}
    >
      <ErrorSummary
        title={msg(lang, { ar: "راجع البيانات", en: "Check your details" })}
        errors={errors}
      />
      <form className="stack-form" onSubmit={submit} noValidate>
        <fieldset className="segmented-control">
          <legend>{msg(lang, { ar: "نوع الحساب", en: "Account type" })}</legend>
          <label>
            <input
              type="radio"
              checked={kind === "individual"}
              onChange={() => setKind("individual")}
            />
            <span>{msg(lang, { ar: "فرد", en: "Individual" })}</span>
          </label>
          <label>
            <input type="radio" checked={kind === "company"} onChange={() => setKind("company")} />
            <span>{msg(lang, { ar: "شركة", en: "Company" })}</span>
          </label>
        </fieldset>
        <TextField
          label={msg(lang, { ar: "الاسم الكامل", en: "Full name" })}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
        {kind === "company" && (
          <TextField
            label={msg(lang, { ar: "اسم الشركة", en: "Company name" })}
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
            required
          />
        )}
        <TextField
          label={msg(lang, { ar: "البريد الإلكتروني", en: "Email" })}
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />
        <PasswordField
          lang={lang}
          label={msg(lang, { ar: "كلمة المرور", en: "Password" })}
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          required
          hint={msg(lang, {
            ar: "10 أحرف على الأقل.",
            en: "At least 10 characters.",
          })}
        />
        <PasswordField
          lang={lang}
          label={msg(lang, {
            ar: "تأكيد كلمة المرور",
            en: "Confirm password",
          })}
          autoComplete="new-password"
          value={values.confirm}
          onChange={(e) => set("confirm", e.target.value)}
          required
        />
        <p className="form-hint">
          {msg(lang, {
            ar: "ستحتاج إلى التحقق من بريدك قبل إرسال استفسار توريد.",
            en: "You will need to verify your email before submitting a supply inquiry.",
          })}{" "}
          <AppLink href={withLang("/privacy", lang)} go={go} className="text-link">
            {msg(lang, { ar: "مسودة الخصوصية", en: "Privacy draft" })}
          </AppLink>
        </p>
        <button className="button button-primary" type="submit">
          {msg(lang, { ar: "إنشاء الحساب", en: "Create account" })}
        </button>
      </form>
      <AppLink
        href={withLang(`/login?returnTo=${encodeURIComponent(returnTo)}`, lang)}
        go={go}
        className="text-link"
      >
        {msg(lang, {
          ar: "عندي حساب",
          en: "I already have an account",
        })}
      </AppLink>
    </AuthShell>
  );
}

export function VerifyEmailPage({ lang, go, previewState = "default" }: AuthPageProps) {
  const states = {
    default: msg(lang, {
      ar: "تحقق من بريدك للمتابعة",
      en: "Verify your email to continue",
    }),
    pending: msg(lang, { ar: "جارٍ التحقق", en: "Verification pending" }),
    success: msg(lang, {
      ar: "تم التحقق من البريد",
      en: "Email verified",
    }),
    expired: msg(lang, {
      ar: "انتهت صلاحية الرابط",
      en: "Verification link expired",
    }),
    invalid: msg(lang, {
      ar: "رابط التحقق غير صالح",
      en: "Verification link is invalid",
    }),
    error: msg(lang, {
      ar: "تعذّر التحقق",
      en: "Verification failed",
    }),
    "session-expired": "",
  };
  const [notice, setNotice] = useState("");
  return (
    <AuthShell
      lang={lang}
      title={states[previewState]}
      description={msg(lang, {
        ar: "التحقق مطلوب قبل إرسال استفسار توريد، بينما يبقى التصفح متاحًا.",
        en: "Verification is required before submitting an inquiry; browsing remains public.",
      })}
    >
      <StatusBadge
        status={
          previewState === "success"
            ? "success"
            : previewState === "expired" || previewState === "invalid"
              ? "warning"
              : "info"
        }
        label={states[previewState]}
      />
      {notice && (
        <div className="inline-alert" role="alert">
          {notice}
        </div>
      )}
      <button className="button button-primary" onClick={() => setNotice(disconnected(lang))}>
        {msg(lang, {
          ar: "إعادة إرسال رسالة التحقق",
          en: "Resend verification email",
        })}
      </button>
      <AppLink href={withLang("/register", lang)} go={go} className="text-link">
        {msg(lang, {
          ar: "استخدم بريدًا مختلفًا",
          en: "Use a different email",
        })}
      </AppLink>
    </AuthShell>
  );
}

export function ForgotPasswordPage({ lang, go }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors([/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? disconnected(lang) : invalidEmail(lang)]);
  };
  return (
    <AuthShell
      lang={lang}
      title={msg(lang, {
        ar: "استعادة كلمة المرور",
        en: "Recover your password",
      })}
      description={msg(lang, {
        ar: "أدخل بريدك. عند ربط الخدمة ستكون الاستجابة محايدة لحماية خصوصية الحسابات.",
        en: "Enter your email. Once connected, the response will remain neutral to protect account privacy.",
      })}
    >
      <ErrorSummary
        title={msg(lang, {
          ar: "تعذّر إرسال الطلب",
          en: "Request not sent",
        })}
        errors={errors}
      />
      <form className="stack-form" onSubmit={submit} noValidate>
        <TextField
          label={msg(lang, { ar: "البريد الإلكتروني", en: "Email" })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="button button-primary" type="submit">
          {msg(lang, {
            ar: "طلب رابط الاستعادة",
            en: "Request recovery link",
          })}
        </button>
      </form>
      <AppLink href={withLang("/login", lang)} go={go} className="text-link">
        {msg(lang, {
          ar: "العودة لتسجيل الدخول",
          en: "Back to sign in",
        })}
      </AppLink>
    </AuthShell>
  );
}

export function ResetPasswordPage({ lang, go, previewState = "default" }: AuthPageProps) {
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<string[]>([]);
  const blocked = previewState === "expired" || previewState === "invalid";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = [];
    if (values.password.length < 10)
      next.push(
        msg(lang, {
          ar: "استخدم 10 أحرف على الأقل.",
          en: "Use at least 10 characters.",
        }),
      );
    if (values.password !== values.confirm)
      next.push(
        msg(lang, {
          ar: "كلمتا المرور غير متطابقتين.",
          en: "Passwords do not match.",
        }),
      );
    if (!next.length) next.push(disconnected(lang));
    setErrors(next);
  };
  return (
    <AuthShell
      lang={lang}
      title={msg(lang, {
        ar: "تعيين كلمة مرور جديدة",
        en: "Set a new password",
      })}
      description={msg(lang, {
        ar: "رابط صالح من الخدمة الخلفية مطلوب لإتمام العملية.",
        en: "A valid backend-issued link is required to complete this action.",
      })}
    >
      {blocked ? (
        <>
          <IntegrationNotice
            lang={lang}
            title={msg(lang, {
              ar: "الرابط منتهي أو غير صالح",
              en: "Link expired or invalid",
            })}
          />
          <AppLink
            href={withLang("/forgot-password", lang)}
            go={go}
            className="button button-primary"
          >
            {msg(lang, {
              ar: "اطلب رابطًا جديدًا",
              en: "Request a new link",
            })}
          </AppLink>
        </>
      ) : (
        <form className="stack-form" onSubmit={submit} noValidate>
          <ErrorSummary
            title={msg(lang, {
              ar: "راجع كلمة المرور",
              en: "Check the password",
            })}
            errors={errors}
          />
          <PasswordField
            lang={lang}
            label={msg(lang, {
              ar: "كلمة المرور الجديدة",
              en: "New password",
            })}
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            required
          />
          <PasswordField
            lang={lang}
            label={msg(lang, {
              ar: "تأكيد كلمة المرور",
              en: "Confirm password",
            })}
            value={values.confirm}
            onChange={(e) => setValues({ ...values, confirm: e.target.value })}
            required
          />
          <button className="button button-primary" type="submit">
            {msg(lang, {
              ar: "تحديث كلمة المرور",
              en: "Update password",
            })}
          </button>
        </form>
      )}
    </AuthShell>
  );
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
      <button className="button button-primary" onClick={() => setNotice(disconnected(lang))}>
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
