import type { ReactNode } from "react";
import { useAuth } from "../hooks/auth/queries";
import { msg, withLang, type Lang } from "../i18n";
import AppLink from "./AppLink";

export default function SessionGate({
  lang,
  go,
  staff = false,
  inquiries = false,
  content = false,
  children,
}: {
  lang: Lang;
  go: (href: string) => void;
  staff?: boolean;
  inquiries?: boolean;
  content?: boolean;
  children: ReactNode;
}) {
  const auth = useAuth(),
    user = auth.session?.user;
  if (auth.pending)
    return (
      <main className="section-pad" role="status">
        {msg(lang, { ar: "جارٍ التحقق من الجلسة…", en: "Checking session…" })}
      </main>
    );
  if (auth.error || !auth.session)
    return (
      <main className="section-pad" role="alert">
        {msg(lang, { ar: "تعذّر التحقق من الجلسة.", en: "The session could not be checked." })}
        <button onClick={auth.retry}>{msg(lang, { ar: "إعادة المحاولة", en: "Retry" })}</button>
      </main>
    );
  if (!user)
    return (
      <main className="access-page section-pad">
        <div>
          <h1>{msg(lang, { ar: "سجّل الدخول للمتابعة", en: "Sign in to continue" })}</h1>
          <AppLink
            className="button button-primary"
            go={go}
            href={withLang(
              `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}${auth.session.sessionExpired ? "&expired=1" : ""}`,
              lang,
            )}
          >
            {msg(lang, { ar: "تسجيل الدخول", en: "Sign in" })}
          </AppLink>
        </div>
      </main>
    );
  if (
    staff
      ? user.role === "customer" ||
        (inquiries && user.role === "content_editor") ||
        (content && user.role === "sales")
      : user.role !== "customer"
  )
    return (
      <main className="access-page access-denied section-pad" aria-labelledby="access-denied-title">
        <section className="access-denied-card">
          <p className="eyebrow">VOIC</p>
          <h1 id="access-denied-title">
            {msg(lang, {
              ar: "لا تملك صلاحية الوصول لهذه المساحة",
              en: "You do not have access to this workspace",
            })}
          </h1>
          <p>
            {msg(lang, {
              ar: "هذه المساحة مخصصة لصلاحيات أخرى. يمكنك متابعة بياناتك واستفساراتك من حسابك.",
              en: "This workspace requires a different role. You can continue to your own account and inquiries.",
            })}
          </p>
          <AppLink
            className="button button-primary"
            go={go}
            href={withLang(user.role === "customer" ? "/account" : "/staff", lang)}
          >
            {user.role === "customer"
              ? msg(lang, { ar: "العودة إلى حسابي", en: "Return to my account" })
              : msg(lang, { ar: "العودة إلى مساحتي", en: "Return to my workspace" })}
          </AppLink>
        </section>
      </main>
    );
  return <div key={`${user.id}:${user.role}:${auth.epoch}`}>{children}</div>;
}
