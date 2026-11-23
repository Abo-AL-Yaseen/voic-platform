import type { ReactNode } from "react";
import AppLink from "./AppLink";
import { msg, ui, withLang, type Lang } from "../i18n";
import { useLogout, authFailure } from "../hooks/auth/queries";

type NavItem = { href: string; label: string };

export function AccountLayout({
  lang,
  go,
  active,
  children,
}: {
  lang: Lang;
  go: (href: string) => void;
  active: string;
  children: ReactNode;
}) {
  const logout = useLogout();
  const items: NavItem[] = [
    { href: "/account", label: msg(lang, { ar: "نظرة عامة", en: "Overview" }) },
    {
      href: "/account/inquiries",
      label: msg(lang, { ar: "استفساراتي", en: "My inquiries" }),
    },
    {
      href: "/account/profile",
      label: msg(lang, { ar: "الملف الشخصي", en: "Profile" }),
    },
    {
      href: "/account/security",
      label: msg(lang, { ar: "أمان الحساب", en: "Account security" }),
    },
  ];
  return (
    <main className="workspace-shell account-shell section-pad">
      <aside className="workspace-sidebar">
        <p className="eyebrow">{msg(lang, { ar: "حساب VOIC", en: "VOIC account" })}</p>
        <nav
          aria-label={msg(lang, {
            ar: "تنقل الحساب",
            en: "Account navigation",
          })}
        >
          {items.map((item) => (
            <AppLink
              key={item.href}
              href={withLang(item.href, lang)}
              go={go}
              className={active === item.href ? "active" : undefined}
            >
              {item.label}
            </AppLink>
          ))}
        </nav>
        <button
          className="text-link"
          type="button"
          disabled={logout.isPending}
          onClick={async () => {
            try {
              await logout.mutateAsync();
              go(withLang("/login", lang));
            } catch {}
          }}
        >
          {msg(lang, { ar: "تسجيل الخروج", en: "Log out" })}
        </button>
        {logout.error && <p role="alert">{authFailure(logout.error, lang)}</p>}
      </aside>
      <div className="workspace-content">{children}</div>
    </main>
  );
}

export const staffNavigation: NavItem[] = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/inquiries", label: "Inquiries" },
  { href: "/staff/products", label: "Products" },
  { href: "/staff/categories", label: "Categories" },
  { href: "/staff/uses", label: "Uses" },
  { href: "/staff/recipes", label: "Recipes" },
  { href: "/staff/content", label: "Page content" },
  { href: "/staff/media", label: "Media" },
  { href: "/staff/customers", label: "Customers" },
  { href: "/staff/employees", label: "Employees" },
  { href: "/staff/audit-log", label: "Audit log" },
];

export function StaffLayout({
  lang,
  go,
  active,
  children,
  preview = false,
}: {
  lang: Lang;
  go: (href: string) => void;
  active: string;
  children: ReactNode;
  preview?: boolean;
}) {
  return (
    <main className="workspace-shell staff-shell">
      <aside className="workspace-sidebar staff-sidebar">
        <AppLink href={withLang("/", lang)} go={go} className="workspace-brand">
          VOIC
        </AppLink>
        <span>{msg(lang, { ar: "مساحة الموظفين", en: "Staff workspace" })}</span>
        <nav
          aria-label={msg(lang, {
            ar: "تنقل الموظفين",
            en: "Staff navigation",
          })}
        >
          {staffNavigation.map((item) => (
            <AppLink
              key={item.href}
              href={
                preview
                  ? withLang(
                      `/__preview?screen=${encodeURIComponent(item.href.slice(1).split("/").join("-"))}`,
                      lang,
                    )
                  : withLang(item.href, lang)
              }
              go={go}
              className={active === item.href ? "active" : undefined}
            >
              {item.label}
            </AppLink>
          ))}
        </nav>
      </aside>
      <div className="workspace-content staff-content">
        <header className="workspace-topbar">
          <span>
            {ui[lang].home} / {active.replace("/staff", "") || "Dashboard"}
          </span>
          {preview && <strong>Frontend preview</strong>}
        </header>
        {children}
      </div>
    </main>
  );
}

export function TranslationTabs({ lang }: { lang: Lang }) {
  return (
    <div className="translation-tabs" role="tablist" aria-label="Translations">
      {[
        ["ar", "العربية"],
        ["en", "English"],
      ].map(([code, label]) => (
        <button
          key={code}
          role="tab"
          aria-selected={lang === code}
          className={lang === code ? "active" : ""}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ lang }: { lang: Lang }) {
  return (
    <nav className="pagination" aria-label={msg(lang, { ar: "ترقيم الصفحات", en: "Pagination" })}>
      <button type="button" disabled>
        {msg(lang, { ar: "السابق", en: "Previous" })}
      </button>
      <span aria-current="page">1</span>
      <button type="button" disabled>
        {msg(lang, { ar: "التالي", en: "Next" })}
      </button>
    </nav>
  );
}
