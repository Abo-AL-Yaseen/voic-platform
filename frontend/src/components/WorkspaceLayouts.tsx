import type { ReactNode } from "react";
import AppLink from "./AppLink";
import { msg, ui, withLang, type Lang } from "../i18n";

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
  const items: NavItem[] = [
    { href: "/account", label: msg(lang, { ar: "نظرة عامة", en: "Overview", de: "Übersicht" }) },
    {
      href: "/account/inquiries",
      label: msg(lang, { ar: "استفساراتي", en: "My inquiries", de: "Meine Anfragen" }),
    },
    {
      href: "/account/profile",
      label: msg(lang, { ar: "الملف الشخصي", en: "Profile", de: "Profil" }),
    },
    {
      href: "/account/security",
      label: msg(lang, { ar: "أمان الحساب", en: "Account security", de: "Kontosicherheit" }),
    },
  ];
  return (
    <main className="workspace-shell account-shell section-pad">
      <aside className="workspace-sidebar">
        <p className="eyebrow">
          {msg(lang, { ar: "حساب VOIC", en: "VOIC account", de: "VOIC-Konto" })}
        </p>
        <nav
          aria-label={msg(lang, {
            ar: "تنقل الحساب",
            en: "Account navigation",
            de: "Kontonavigation",
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
        <button className="text-link" type="button">
          {msg(lang, { ar: "تسجيل الخروج", en: "Log out", de: "Abmelden" })}
        </button>
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
        <span>
          {msg(lang, { ar: "مساحة الموظفين", en: "Staff workspace", de: "Mitarbeiterbereich" })}
        </span>
        <nav
          aria-label={msg(lang, {
            ar: "تنقل الموظفين",
            en: "Staff navigation",
            de: "Mitarbeiternavigation",
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
        ["de", "Deutsch"],
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
    <nav
      className="pagination"
      aria-label={msg(lang, { ar: "ترقيم الصفحات", en: "Pagination", de: "Seitennavigation" })}
    >
      <button type="button" disabled>
        {msg(lang, { ar: "السابق", en: "Previous", de: "Zurück" })}
      </button>
      <span aria-current="page">1</span>
      <button type="button" disabled>
        {msg(lang, { ar: "التالي", en: "Next", de: "Weiter" })}
      </button>
    </nav>
  );
}
