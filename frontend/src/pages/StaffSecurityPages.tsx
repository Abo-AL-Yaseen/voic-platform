import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth, useLogout, authFailure } from "../hooks/auth/queries";
import { useSecurityQuery, useSecurityAction } from "../hooks/staff-security/queries";
import {
  securityWrite,
  type SecurityStatus,
  type Enrollment,
  type SecurityResult,
} from "../services/staff-security";
import { TextField, PasswordField, SelectField } from "../components/FormFields";
import AppLink from "../components/AppLink";
import { msg, withLang, type Lang } from "../i18n";
import { ApiError } from "../services/api";
const t = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
export function securityFailure(error: unknown, lang: Lang) {
  const code = error instanceof ApiError ? (error.details as any)?.code : "";
  const messages: Record<string, [string, string]> = {
    MFA_REQUIRED: ["أكمل التحقق بخطوتين أولًا.", "Complete MFA first."],
    MFA_INVALID: [
      "الرمز غير صحيح أو استُخدم. انتظر الرمز التالي أو استخدم رمز استرداد آخر.",
      "The code is invalid or already used. Wait for the next code or use another recovery code.",
    ],
    MFA_EXPIRED: [
      "انتهت مهلة الإعداد. ابدأ من جديد أو سجل الدخول مجددًا.",
      "Setup expired. Start again or sign in again.",
    ],
    REAUTH_REQUIRED: [
      "أكد كلمة المرور والتحقق الثاني من أمان الموظف ثم أعد المحاولة.",
      "Confirm your password and MFA in Staff security, then retry.",
    ],
    STAFF_SUSPENDED: [
      "الحساب موقوف. راجع مسؤول VOIC.",
      "This account is suspended. Contact a VOIC administrator.",
    ],
    LAST_ADMINISTRATOR: [
      "يجب الإبقاء على مسؤول نشط واحد على الأقل.",
      "At least one active administrator must remain.",
    ],
    EMPLOYEE_CONFLICT: [
      "تغير الحساب. حدّث التفاصيل وراجع الإجراء.",
      "The account changed. Refresh its details and review the action.",
    ],
    INVITATION_EXISTS: [
      "الحساب أو الدعوة موجودان. راجع الحساب أو الدعوة الحالية.",
      "This account or invitation already exists. Review the existing record.",
    ],
    MFA_SELF_RESET: [
      "استبدل عامل حسابك من أمان الموظف مع إثبات العامل الحالي.",
      "Replace your own factor in Staff security using existing-factor proof.",
    ],
  };
  return messages[code] ? t(lang, ...messages[code]!) : authFailure(error, lang);
}
type Props = { lang: Lang; go: (href: string) => void };
export function StaffSecurityPage({ lang, go }: Props) {
  const auth = useAuth(),
    logout = useLogout(),
    action = useSecurityAction(),
    query = useSecurityQuery<SecurityStatus>("staff-security/status");
  const [password, setPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [code, setCode] = useState(""),
    [recovery, setRecovery] = useState(false),
    [enrollment, setEnrollment] = useState<Enrollment | null>(null),
    [codes, setCodes] = useState<string[] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [success, setSuccess] = useState(false),
    [mode, setMode] = useState("reauthenticate");
  const identity = useRef<string | null>(null);
  useEffect(() => {
    const u = auth.session?.user ? `${auth.session.user.id}:${auth.session.user.role}` : undefined;
    if (!auth.pending && u !== identity.current) {
      setPassword("");
      setNewPassword("");
      setCode("");
      setEnrollment(null);
      setCodes(null);
      setError(null);
      identity.current = u || null;
    }
  }, [auth.session?.user?.id, auth.pending]);
  useEffect(() => {
    if (!enrollment) return;
    const timer = setTimeout(
      () => setEnrollment(null),
      Math.max(0, Date.parse(enrollment.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [enrollment]);
  const user = auth.session?.user,
    restricted = auth.session?.staffAuth !== "complete";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const proof = recovery ? { recoveryCode: code.trim() } : { code: code.trim() };
      if (enrollment) {
        const r = await action<SecurityResult>(
          "staff-security/enrollment/confirm",
          { code: code.trim() },
          true,
        );
        setEnrollment(null);
        setCodes(r.recoveryCodes || null);
      } else if (restricted && query.data?.enrolled) {
        await action("staff-security/challenge", proof, true);
        setSuccess(true);
      } else if (!query.data?.enrolled || mode === "replace")
        setEnrollment(
          await action<Enrollment>("staff-security/enrollment", {
            password,
            ...(query.data?.enrolled ? proof : {}),
          }),
        );
      else {
        const r = await action<SecurityResult>(
          `staff-security/${mode === "recovery" ? "recovery-codes" : mode}`,
          { password, ...proof, ...(mode === "password" ? { newPassword } : {}) },
          true,
        );
        setCodes(r.recoveryCodes || null);
        setSuccess(true);
      }
      setPassword("");
      setCode("");
      setNewPassword("");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!auth.pending && (!user || user.role === "customer"))
    return (
      <main className="section-pad access-page">
        <h1>{t(lang, "أمان الموظف", "Staff security")}</h1>
        <AppLink
          go={go}
          href={withLang(user ? "/account" : "/login?returnTo=%2Fstaff%2Fsecurity", lang)}
        >
          {t(lang, "تسجيل الدخول إلى حساب الموظف", "Sign in to your staff account")}
        </AppLink>
      </main>
    );
  if (auth.session?.staffAuth === "suspended")
    return (
      <main className="section-pad">
        <h1>{t(lang, "الحساب موقوف", "Account suspended")}</h1>
        <p>{t(lang, "راجع مسؤول VOIC.", "Contact a VOIC administrator.")}</p>
        <button
          onClick={async () => {
            await logout.mutateAsync();
            go(withLang("/login", lang));
          }}
        >
          {t(lang, "تسجيل الخروج", "Log out")}
        </button>
      </main>
    );
  return (
    <main className="section-pad">
      <section className="security-panel auth-card">
        <p className="eyebrow">VOIC</p>
        <h1>{t(lang, "أمان الموظف والتحقق بخطوتين", "Staff security and MFA")}</h1>
        {auth.pending && <p role="status">{t(lang, "جارٍ التحقق…", "Checking…")}</p>}
        {user && (
          <p>
            <bdi>{user.email}</bdi>
          </p>
        )}
        {user && auth.session?.staffAuth === "verify_email" ? (
          <AppLink go={go} href={withLang("/verify-email?returnTo=%2Fstaff%2Fsecurity", lang)}>
            {t(lang, "أكد بريدك الإلكتروني أولًا", "Verify your email first")}
          </AppLink>
        ) : (
          <>
            {restricted && !codes && (
              <p>
                {t(
                  lang,
                  "الجلسة مقيدة لخمس دقائق. لا تتاح بيانات الموظفين قبل إكمال التحقق. عند انتهائها سجّل الدخول مجددًا.",
                  "This session is restricted for five minutes. Staff data is unavailable until verification succeeds. Sign in again if it expires.",
                )}
              </p>
            )}
            {!!error && <p role="alert">{securityFailure(error, lang)}</p>}
            {query.error && (
              <div role="alert">
                {securityFailure(query.error, lang)}{" "}
                <button onClick={() => query.refetch()}>
                  {t(lang, "إعادة المحاولة", "Retry")}
                </button>
              </div>
            )}
            {codes ? (
              <section aria-label={t(lang, "رموز الاسترداد", "Recovery codes")}>
                <h2>{t(lang, "احفظ الرموز بشكل خاص", "Store these codes privately")}</h2>
                <p>
                  {t(
                    lang,
                    "تظهر مرة واحدة فقط. كل رمز صالح لاستخدام واحد. لا تشاركها في المحادثات أو البريد.",
                    "These appear only once. Each code works once. Keep them private and out of chats or email.",
                  )}
                </p>
                <ul className="recovery-codes" dir="ltr">
                  {codes.map((c) => (
                    <li key={c}>
                      <code>{c}</code>
                    </li>
                  ))}
                </ul>
                <button
                  className="button button-primary"
                  onClick={() => {
                    setCodes(null);
                    go(withLang("/staff", lang));
                  }}
                >
                  {t(lang, "حفظت الرموز بشكل آمن", "I stored the codes securely")}
                </button>
              </section>
            ) : (
              query.data && (
                <form className="stack-form" onSubmit={submit}>
                  {enrollment ? (
                    <>
                      <h2>{t(lang, "اربط تطبيق المصادقة", "Connect your authenticator")}</h2>
                      <img
                        width="260"
                        height="260"
                        src={enrollment.qr}
                        alt={t(lang, "رمز إعداد تطبيق المصادقة", "Authenticator setup QR code")}
                      />
                      <p>
                        {t(lang, "المفتاح اليدوي الخاص:", "Private manual setup key:")}{" "}
                        <code className="private-secret" dir="ltr">
                          {enrollment.secret}
                        </code>
                      </p>
                      <p>
                        {t(
                          lang,
                          "أدخل الرمز لتفعيل العامل. تنتهي هذه الخطوة خلال خمس دقائق.",
                          "Enter the code to activate MFA. This step expires in five minutes.",
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      {!restricted && query.data.enrolled && (
                        <>
                          <p>
                            {t(lang, "رموز الاسترداد المتبقية:", "Remaining recovery codes:")}{" "}
                            {query.data.recoveryRemaining}
                          </p>
                          <SelectField
                            label={t(lang, "الإجراء الأمني", "Security action")}
                            value={mode}
                            onChange={(e) => {
                              setMode(e.target.value);
                              setCode("");
                              setPassword("");
                            }}
                          >
                            <option value="reauthenticate">
                              {t(
                                lang,
                                "تأكيد حديث للإجراءات الحساسة",
                                "Reauthenticate for sensitive actions",
                              )}
                            </option>
                            <option value="replace">
                              {t(lang, "استبدال تطبيق المصادقة", "Replace authenticator")}
                            </option>
                            <option value="recovery">
                              {t(lang, "إنشاء رموز استرداد جديدة", "Regenerate recovery codes")}
                            </option>
                            <option value="password">
                              {t(lang, "تغيير كلمة المرور", "Change password")}
                            </option>
                          </SelectField>
                          <p>
                            {t(
                              lang,
                              "الاستبدال أو تغيير كلمة المرور أو الرموز يلغي الجلسات الأخرى. الرموز القديمة تُلغى عند التجديد.",
                              "Replacement, password changes and code regeneration revoke other sessions. Regeneration invalidates old recovery codes.",
                            )}
                          </p>
                        </>
                      )}
                      {(!restricted || !query.data.enrolled) && (
                        <PasswordField
                          lang={lang}
                          label={t(lang, "كلمة المرور الحالية", "Current password")}
                          required
                          maxLength={128}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      )}
                      {!restricted && mode === "password" && (
                        <PasswordField
                          lang={lang}
                          label={t(lang, "كلمة المرور الجديدة", "New password")}
                          required
                          minLength={15}
                          maxLength={128}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      )}
                      {query.data.enrolled && (
                        <label>
                          <input
                            type="checkbox"
                            checked={recovery}
                            onChange={(e) => {
                              setRecovery(e.target.checked);
                              setCode("");
                            }}
                          />{" "}
                          {t(
                            lang,
                            "استخدام رمز استرداد بدل رمز التطبيق",
                            "Use a recovery code instead",
                          )}
                        </label>
                      )}
                    </>
                  )}
                  {(enrollment || query.data.enrolled) && (
                    <TextField
                      label={
                        recovery && !enrollment
                          ? t(lang, "رمز الاسترداد", "Recovery code")
                          : t(lang, "رمز تطبيق المصادقة", "Authenticator code")
                      }
                      dir="ltr"
                      autoComplete="one-time-code"
                      inputMode={recovery && !enrollment ? "text" : "numeric"}
                      required
                      maxLength={recovery && !enrollment ? 35 : 6}
                      pattern={
                        recovery && !enrollment ? "[a-f0-9]{8}(-[a-f0-9]{8}){3}" : "[0-9]{6}"
                      }
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  )}
                  <button className="button button-primary" disabled={busy || auth.pending}>
                    {busy
                      ? t(lang, "جارٍ التحقق…", "Verifying…")
                      : enrollment
                        ? t(lang, "تأكيد التفعيل", "Confirm enrollment")
                        : !query.data.enrolled
                          ? t(lang, "بدء إعداد التحقق", "Start MFA setup")
                          : t(lang, "تأكيد", "Confirm")}
                  </button>
                  {enrollment && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        setEnrollment(null);
                        setCode("");
                      }}
                    >
                      {t(lang, "إلغاء الإعداد", "Cancel setup")}
                    </button>
                  )}
                </form>
              )
            )}
            {success && !codes && (
              <p role="status">{t(lang, "اكتمل التحقق بنجاح.", "Verification completed.")}</p>
            )}
            {!restricted && !codes && (
              <AppLink className="button button-secondary" go={go} href={withLang("/staff", lang)}>
                {t(lang, "مساحة الموظفين", "Staff workspace")}
              </AppLink>
            )}
          </>
        )}
        <button
          className="text-link"
          disabled={busy || logout.isPending}
          onClick={async () => {
            try {
              await logout.mutateAsync();
              go(withLang("/login", lang));
            } catch (e) {
              setError(e);
            }
          }}
        >
          {t(lang, "تسجيل الخروج", "Log out")}
        </button>
      </section>
    </main>
  );
}
export function StaffInvitationPage({ lang, go }: Props) {
  const request=useRef<AbortController|null>(null),identity=useRef<string|undefined>(undefined);
  const auth = useAuth(),
    [token, setToken] = useState(
      () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
    ),
    [name, setName] = useState(""),
    [country, setCountry] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{
    if(auth.pending||!auth.session)return;
    const u=auth.session.user,next=u?`${u.id}:${u.role}`:"anonymous";
    if(identity.current!==undefined&&identity.current!==next){request.current?.abort();setToken("");setPassword("");setName("");setCountry("");setDone(false);setError(null);setBusy(false);}
    identity.current=next;
  },[auth.pending,auth.session?.user?.id,auth.session?.user?.role]);
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const controller=new AbortController();request.current=controller;
    try {
      const csrf=await auth.csrf();if(controller.signal.aborted)return;
      await securityWrite(
        "staff-invitation/accept",
        { token, name, country, password },
        csrf,controller.signal,
      );
      if(controller.signal.aborted)return;
      setToken("");
      setPassword("");
      setDone(true);
    } catch (e) {
      if(!controller.signal.aborted)setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="section-pad">
      <section className="security-panel auth-card">
        <h1>{t(lang, "قبول دعوة الموظف", "Accept staff invitation")}</h1>
        <p>
          {t(
            lang,
            "اختر كلمة مرورك الخاصة. بعد الدخول يلزم إعداد التحقق بخطوتين.",
            "Set your own password. MFA enrollment is required after sign-in.",
          )}
        </p>
        {!!error && <p role="alert">{securityFailure(error, lang)}</p>}
        {done ? (
          <>
            <p role="status">
              {t(
                lang,
                "تم إنشاء حسابك. سجّل الدخول وأكمل التحقق.",
                "Your account is ready. Sign in and complete MFA.",
              )}
            </p>
            <AppLink go={go} href={withLang("/login", lang)}>
              {t(lang, "تسجيل الدخول", "Sign in")}
            </AppLink>
          </>
        ) : !token ? (
          <p role="alert">
            {t(
              lang,
              "افتح رابط دعوة صالح من رسالة الدعوة. إذا أعدت تحميل الصفحة، افتح الرابط من جديد.",
              "Open a valid invitation link from its message. If you reloaded, reopen the original link.",
            )}
          </p>
        ) : (
          <form className="stack-form" onSubmit={submit}>
            <TextField
              label={t(lang, "الاسم", "Name")}
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label={t(lang, "الدولة", "Country")}
              required
              maxLength={100}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <PasswordField
              lang={lang}
              label={t(lang, "كلمة المرور", "Password")}
              required
              minLength={15}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="button button-primary" disabled={busy || auth.pending}>
              {t(lang, "قبول الدعوة", "Accept invitation")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
