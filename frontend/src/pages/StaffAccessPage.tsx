import AppLink from "../components/AppLink";
import { StatusBadge } from "../components/Feedback";
import { msg, withLang, type Lang } from "../i18n";

export default function StaffAccessPage({ lang, go }: { lang: Lang; go: (href: string) => void }) {
  return (
    <main className="access-page staff-access-page section-pad">
      <div>
        <StatusBadge
          status="warning"
          label={msg(lang, {
            ar: "وصول مقيّد",
            en: "Restricted access",
          })}
        />
        <h1>{msg(lang, { ar: "مساحة الموظفين", en: "Staff workspace" })}</h1>
        <p>
          {msg(lang, {
            ar: "يلزم تسجيل دخول موظف وصلاحيات يمنحها المسؤول ويطبقها الخادم. إخفاء الروابط في الواجهة ليس حماية.",
            en: "An employee session and server-enforced permissions are required. Hiding frontend links is not authorization.",
          })}
        </p>
        <AppLink
          href={withLang(`/login?returnTo=${encodeURIComponent("/staff")}`, lang)}
          go={go}
          className="button button-primary"
        >
          {msg(lang, {
            ar: "تسجيل الدخول المشترك",
            en: "Shared sign in",
          })}
        </AppLink>
      </div>
    </main>
  );
}
