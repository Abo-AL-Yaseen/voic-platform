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
    de: "Dieses Feld ist erforderlich.",
  });
const invalidEmail = (lang: Lang) =>
  msg(lang, {
    ar: "أدخل بريدًا إلكترونيًا صحيحًا.",
    en: "Enter a valid email address.",
    de: "Geben Sie eine gültige E-Mail-Adresse ein.",
  });
const disconnected = (lang: Lang) =>
  msg(lang, {
    ar: "تعذّر المتابعة لأن خدمة الحسابات غير متصلة بعد. لم يتم إرسال أو حفظ أي بيانات.",
    en: "The account service is not connected yet. No data was sent or saved.",
    de: "Der Kontodienst ist noch nicht verbunden. Es wurden keine Daten gesendet oder gespeichert.",
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
              de: "Eine Anfrage, kein automatischer Kauf",
            })}
          </strong>
          <p>
            {msg(lang, {
              ar: "تراجع الشركة تفاصيل التوريد وتتواصل معك لتأكيد المعلومات التجارية.",
              en: "The company reviews supply details and contacts you to confirm commercial information.",
              de: "Das Unternehmen prüft die Lieferdetails und kontaktiert Sie zur Klärung der geschäftlichen Angaben.",
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
      title={msg(lang, { ar: "تسجيل الدخول", en: "Sign in", de: "Anmelden" })}
      description={msg(lang, {
        ar: "مدخل واحد للعملاء والموظفين المصرّح لهم.",
        en: "One secure entry for customers and authorized employees.",
        de: "Ein gemeinsamer Zugang für Kunden und autorisierte Mitarbeiter.",
      })}
    >
      {previewState === "session-expired" && (
        <div className="inline-alert" role="alert">
          {msg(lang, {
            ar: "انتهت الجلسة. سجّل الدخول للمتابعة.",
            en: "Your session expired. Sign in to continue.",
            de: "Ihre Sitzung ist abgelaufen. Melden Sie sich erneut an.",
          })}
        </div>
      )}
      <ErrorSummary
        title={msg(lang, { ar: "راجع البيانات", en: "Check your details", de: "Angaben prüfen" })}
        errors={errors}
      />
      <form className="stack-form" onSubmit={submit} noValidate>
        <TextField
          label={msg(lang, { ar: "البريد الإلكتروني", en: "Email", de: "E-Mail" })}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordField
          lang={lang}
          label={msg(lang, { ar: "كلمة المرور", en: "Password", de: "Passwort" })}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <AppLink href={withLang("/forgot-password", lang)} go={go} className="text-link">
          {msg(lang, {
            ar: "نسيت كلمة المرور؟",
            en: "Forgot password?",
            de: "Passwort vergessen?",
          })}
        </AppLink>
        <button className="button button-primary" type="submit">
          {msg(lang, { ar: "تسجيل الدخول", en: "Sign in", de: "Anmelden" })}
        </button>
      </form>
      <p className="auth-switch">
        {msg(lang, { ar: "ما عندك حساب؟", en: "New to VOIC?", de: "Noch kein Konto?" })}{" "}
        <AppLink
          href={withLang(`/register?returnTo=${encodeURIComponent(returnTo)}`, lang)}
          go={go}
          className="text-link"
        >
          {msg(lang, { ar: "أنشئ حسابًا", en: "Create an account", de: "Konto erstellen" })}
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
          de: "Das Passwort muss mindestens 10 Zeichen enthalten.",
        }),
      );
    if (values.password !== values.confirm)
      next.push(
        msg(lang, {
          ar: "كلمتا المرور غير متطابقتين.",
          en: "Passwords do not match.",
          de: "Die Passwörter stimmen nicht überein.",
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
        de: "Kundenkonto erstellen",
      })}
      description={msg(lang, {
        ar: "للأفراد والشركات. لا يمكن إنشاء حساب موظف من التسجيل العام.",
        en: "For individuals and companies. Staff accounts cannot be created through public registration.",
        de: "Für Privatpersonen und Unternehmen. Mitarbeiterkonten können nicht öffentlich registriert werden.",
      })}
    >
      <ErrorSummary
        title={msg(lang, { ar: "راجع البيانات", en: "Check your details", de: "Angaben prüfen" })}
        errors={errors}
      />
      <form className="stack-form" onSubmit={submit} noValidate>
        <fieldset className="segmented-control">
          <legend>{msg(lang, { ar: "نوع الحساب", en: "Account type", de: "Kontotyp" })}</legend>
          <label>
            <input
              type="radio"
              checked={kind === "individual"}
              onChange={() => setKind("individual")}
            />
            <span>{msg(lang, { ar: "فرد", en: "Individual", de: "Privatperson" })}</span>
          </label>
          <label>
            <input type="radio" checked={kind === "company"} onChange={() => setKind("company")} />
            <span>{msg(lang, { ar: "شركة", en: "Company", de: "Unternehmen" })}</span>
          </label>
        </fieldset>
        <TextField
          label={msg(lang, { ar: "الاسم الكامل", en: "Full name", de: "Vollständiger Name" })}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
        {kind === "company" && (
          <TextField
            label={msg(lang, { ar: "اسم الشركة", en: "Company name", de: "Unternehmensname" })}
            value={values.company}
            onChange={(e) => set("company", e.target.value)}
            required
          />
        )}
        <TextField
          label={msg(lang, { ar: "البريد الإلكتروني", en: "Email", de: "E-Mail" })}
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />
        <PasswordField
          lang={lang}
          label={msg(lang, { ar: "كلمة المرور", en: "Password", de: "Passwort" })}
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          required
          hint={msg(lang, {
            ar: "10 أحرف على الأقل.",
            en: "At least 10 characters.",
            de: "Mindestens 10 Zeichen.",
          })}
        />
        <PasswordField
          lang={lang}
          label={msg(lang, {
            ar: "تأكيد كلمة المرور",
            en: "Confirm password",
            de: "Passwort bestätigen",
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
            de: "Vor dem Absenden einer Lieferanfrage müssen Sie Ihre E-Mail-Adresse bestätigen.",
          })}{" "}
          <AppLink href={withLang("/privacy", lang)} go={go} className="text-link">
            {msg(lang, { ar: "مسودة الخصوصية", en: "Privacy draft", de: "Datenschutzentwurf" })}
          </AppLink>
        </p>
        <button className="button button-primary" type="submit">
          {msg(lang, { ar: "إنشاء الحساب", en: "Create account", de: "Konto erstellen" })}
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
          de: "Ich habe bereits ein Konto",
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
      de: "Bestätigen Sie Ihre E-Mail-Adresse",
    }),
    pending: msg(lang, { ar: "جارٍ التحقق", en: "Verification pending", de: "Bestätigung läuft" }),
    success: msg(lang, {
      ar: "تم التحقق من البريد",
      en: "Email verified",
      de: "E-Mail-Adresse bestätigt",
    }),
    expired: msg(lang, {
      ar: "انتهت صلاحية الرابط",
      en: "Verification link expired",
      de: "Bestätigungslink abgelaufen",
    }),
    invalid: msg(lang, {
      ar: "رابط التحقق غير صالح",
      en: "Verification link is invalid",
      de: "Bestätigungslink ungültig",
    }),
    error: msg(lang, {
      ar: "تعذّر التحقق",
      en: "Verification failed",
      de: "Bestätigung fehlgeschlagen",
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
        de: "Die Bestätigung ist vor dem Absenden einer Anfrage erforderlich; die öffentliche Ansicht bleibt verfügbar.",
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
          de: "Bestätigungs-E-Mail erneut senden",
        })}
      </button>
      <AppLink href={withLang("/register", lang)} go={go} className="text-link">
        {msg(lang, {
          ar: "استخدم بريدًا مختلفًا",
          en: "Use a different email",
          de: "Andere E-Mail-Adresse verwenden",
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
        de: "Passwort wiederherstellen",
      })}
      description={msg(lang, {
        ar: "أدخل بريدك. عند ربط الخدمة ستكون الاستجابة محايدة لحماية خصوصية الحسابات.",
        en: "Enter your email. Once connected, the response will remain neutral to protect account privacy.",
        de: "Geben Sie Ihre E-Mail-Adresse ein. Die spätere Antwort bleibt zum Schutz der Konten neutral.",
      })}
    >
      <ErrorSummary
        title={msg(lang, {
          ar: "تعذّر إرسال الطلب",
          en: "Request not sent",
          de: "Anfrage nicht gesendet",
        })}
        errors={errors}
      />
      <form className="stack-form" onSubmit={submit} noValidate>
        <TextField
          label={msg(lang, { ar: "البريد الإلكتروني", en: "Email", de: "E-Mail" })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="button button-primary" type="submit">
          {msg(lang, {
            ar: "طلب رابط الاستعادة",
            en: "Request recovery link",
            de: "Link anfordern",
          })}
        </button>
      </form>
      <AppLink href={withLang("/login", lang)} go={go} className="text-link">
        {msg(lang, {
          ar: "العودة لتسجيل الدخول",
          en: "Back to sign in",
          de: "Zurück zur Anmeldung",
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
          de: "Verwenden Sie mindestens 10 Zeichen.",
        }),
      );
    if (values.password !== values.confirm)
      next.push(
        msg(lang, {
          ar: "كلمتا المرور غير متطابقتين.",
          en: "Passwords do not match.",
          de: "Die Passwörter stimmen nicht überein.",
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
        de: "Neues Passwort festlegen",
      })}
      description={msg(lang, {
        ar: "رابط صالح من الخدمة الخلفية مطلوب لإتمام العملية.",
        en: "A valid backend-issued link is required to complete this action.",
        de: "Zum Abschluss ist ein gültiger, vom Backend ausgestellter Link erforderlich.",
      })}
    >
      {blocked ? (
        <>
          <IntegrationNotice
            lang={lang}
            title={msg(lang, {
              ar: "الرابط منتهي أو غير صالح",
              en: "Link expired or invalid",
              de: "Link abgelaufen oder ungültig",
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
              de: "Neuen Link anfordern",
            })}
          </AppLink>
        </>
      ) : (
        <form className="stack-form" onSubmit={submit} noValidate>
          <ErrorSummary
            title={msg(lang, {
              ar: "راجع كلمة المرور",
              en: "Check the password",
              de: "Passwort prüfen",
            })}
            errors={errors}
          />
          <PasswordField
            lang={lang}
            label={msg(lang, {
              ar: "كلمة المرور الجديدة",
              en: "New password",
              de: "Neues Passwort",
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
              de: "Passwort bestätigen",
            })}
            value={values.confirm}
            onChange={(e) => setValues({ ...values, confirm: e.target.value })}
            required
          />
          <button className="button button-primary" type="submit">
            {msg(lang, {
              ar: "تحديث كلمة المرور",
              en: "Update password",
              de: "Passwort aktualisieren",
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
        ? msg(lang, { ar: "رمز المصادقة", en: "Authentication code", de: "Authentifizierungscode" })
        : msg(lang, { ar: "رمز الاسترداد", en: "Recovery code", de: "Wiederherstellungscode" }),
    [lang, method],
  );
  return (
    <section className="preview-panel">
      <h2>
        {msg(lang, {
          ar: "تحقق إضافي للموظف",
          en: "Staff verification",
          de: "Mitarbeiter-Verifizierung",
        })}
      </h2>
      <TextField
        label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode={method === "code" ? "numeric" : "text"}
      />
      <button className="button button-primary" onClick={() => setNotice(disconnected(lang))}>
        {msg(lang, { ar: "تحقق", en: "Verify", de: "Bestätigen" })}
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
              de: "Wiederherstellungscode verwenden",
            })
          : msg(lang, {
              ar: "استخدم رمز المصادقة",
              en: "Use an authentication code",
              de: "Authentifizierungscode verwenden",
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
