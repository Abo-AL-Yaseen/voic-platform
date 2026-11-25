import { StaffSecurityPage, StaffInvitationPage } from "./pages/StaffSecurityPages";
import { EmployeesPage, AuditPage } from "./pages/StaffAdministrationPages";
import EditorialWorkspace from "./pages/EditorialPages";
import { queryClient } from "./services/queryClient";
import { usePublishedPage } from "./hooks/content/queries";
import ContentStatus from "./components/ContentStatus";
import { sizeLabel } from "./utils/productLabels";
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { assets } from "./catalog";
import {
  arrow,
  direction,
  localeName,
  msg,
  pick,
  productDescription,
  productName,
  resolveLang,
  ui,
  withLang,
  type Lang,
} from "./i18n";
import {
  AboutPage,
  BusinessPage,
  ChooserPage,
  ContactPage,
  NotFoundPage,
  ProductRoutePage,
  RecipeRoutePage,
  RecipesPage,
} from "./Pages";
import ProductsPage from "./ProductsPage";
import { useFeaturedProducts } from "./hooks/products/queries";
import CatalogStatus, { ProductTranslation } from "./components/CatalogStatus";
import { decodeRouteSegment } from "./utils/productScope";

import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "./pages/AuthPages";
import {
  AccountOverviewPage,
  ProfilePage,
  SecurityPage,
  InquiryListPage,
  InquiryDetailPage,
} from "./pages/AccountPages";
import SessionGate from "./components/SessionGate";
import { StaffWorkspace } from "./pages/StaffSalesPages";
import { useAuth, authFailure } from "./hooks/auth/queries";
import NewInquiryPage from "./pages/NewInquiryPage";
import PrivacyPage from "./pages/PrivacyPage";

type PreviewProps = { lang: Lang; go: (href: string) => void; search: string };
const previewModulePath = "/src/pages/PreviewPage.tsx";
const PreviewPage =
  import.meta.env.MODE !== "production"
    ? lazy(
        () =>
          import(/* @vite-ignore */ previewModulePath) as Promise<{
            default: ComponentType<PreviewProps>;
          }>,
      )
    : null;

function AppLink({
  href,
  go,
  className,
  children,
}: {
  href: string;
  go: (href: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
          event.preventDefault();
          go(href);
        }
      }}
    >
      {children}
    </a>
  );
}

export default function App() {
  const auth = useAuth();
  useEffect(() => {
    const c = new BroadcastChannel("voic-publication");
    c.onmessage = () => {
      void queryClient.invalidateQueries({
        predicate: (q) => ["products", "published-content"].includes(String(q.queryKey[0])),
      });
    };
    return () => c.close();
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState(() => window.location.pathname + window.location.search);
  const homeScroll = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const url = new URL(location, window.location.origin);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const requestedLang = url.searchParams.get("lang");
  const lang = resolveLang(requestedLang);
  const t = ui[lang];

  useEffect(() => {
    const handlePop = () => {
      setLocation(window.location.pathname + window.location.search);
      setMenuOpen(false);
      requestAnimationFrame(() =>
        window.scrollTo({
          top: window.location.pathname === "/" ? homeScroll.current : 0,
          behavior: "instant",
        }),
      );
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = direction(lang);
    document.querySelector("main")?.setAttribute("id", "main-content");
    const routeTitle =
      path === "/"
        ? pick(lang, "الرئيسية", "Home")
        : path.startsWith("/products")
          ? t.products
          : path.startsWith("/recipes")
            ? t.recipes
            : path === "/find-your-product"
              ? t.chooser
              : path === "/business"
                ? t.business
                : path === "/about"
                  ? t.about
                  : path === "/contact"
                    ? t.contact
                    : path === "/login"
                      ? msg(lang, { ar: "تسجيل الدخول", en: "Sign in" })
                      : path === "/register"
                        ? msg(lang, {
                            ar: "إنشاء حساب",
                            en: "Create account",
                          })
                        : path === "/verify-email"
                          ? msg(lang, {
                              ar: "التحقق من البريد",
                              en: "Verify email",
                            })
                          : path === "/forgot-password"
                            ? msg(lang, {
                                ar: "استعادة كلمة المرور",
                                en: "Recover password",
                              })
                            : path === "/reset-password"
                              ? msg(lang, {
                                  ar: "تعيين كلمة المرور",
                                  en: "Reset password",
                                })
                              : path.startsWith("/account")
                                ? msg(lang, { ar: "حسابي", en: "My account" })
                                : path.startsWith("/inquiries")
                                  ? msg(lang, {
                                      ar: "استفسار توريد",
                                      en: "Supply inquiry",
                                    })
                                  : path.startsWith("/staff")
                                    ? msg(lang, {
                                        ar: "مساحة الموظفين",
                                        en: "Staff workspace",
                                      })
                                    : path === "/privacy"
                                      ? msg(lang, {
                                          ar: "الخصوصية",
                                          en: "Privacy",
                                        })
                                      : pick(lang, "صفحة غير موجودة", "Page not found");
    document.title = `${routeTitle} | VOIC`;
  }, [lang, path, t]);

  useEffect(() => {
    if (!menuOpen) return;
    navRef.current?.querySelector<HTMLElement>("a")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function go(href: string) {
    if (path === "/") homeScroll.current = window.scrollY;
    window.history.pushState(null, "", href);
    setLocation(window.location.pathname + window.location.search);
    setMenuOpen(false);
    requestAnimationFrame(() => {
      window.scrollTo({
        top: href.split("?")[0] === "/" ? homeScroll.current : 0,
        behavior: "instant",
      });
      const heading = document.querySelector<HTMLElement>("main h1");
      if (heading && href.split("?")[0] !== "/") {
        heading.tabIndex = -1;
        heading.classList.add("route-heading");
        heading.focus({ preventScroll: true });
      }
    });
  }

  function updateSearch(params: URLSearchParams) {
    if (lang !== "ar") params.set("lang", lang);
    else params.delete("lang");
    const href = `/products${params.size ? `?${params}` : ""}`;
    window.history.pushState(null, "", href);
    setLocation(href);
  }

  function setLanguage(nextLang: Lang) {
    const next = new URL(window.location.href);
    if (nextLang === "ar") next.searchParams.delete("lang");
    else next.searchParams.set("lang", nextLang);
    if (path === "/products") next.searchParams.delete("page");
    const href = `${next.pathname}${next.search}${next.hash}`;
    window.history.pushState(null, "", href);
    setLocation(href);
    setMenuOpen(false);
  }

  const navItems = [
    ["/products", t.products],
    ["/find-your-product", t.chooser],
    ["/recipes", t.recipes],
    ["/about", t.about],
    ["/business", t.business],
  ];

  if (import.meta.env.MODE !== "production") {
    if (path === "/__preview" && PreviewPage) {
      return (
        <Suspense
          fallback={<main className="section-pad preview-loading">Loading frontend preview…</main>}
        >
          <PreviewPage lang={lang} go={go} search={url.search} />
        </Suspense>
      );
    }
  }

  let page: React.ReactNode;
  const productMatch = /^\/products\/([^/]+)$/.exec(path);
  const recipeMatch = /^\/recipes\/([^/]+)$/.exec(path);
  if (path === "/") {
    page = <HomePage lang={lang} go={go} />;
  } else if (path === "/products") {
    page = (
      <ProductsPage
        search={url.search}
        updateSearch={updateSearch}
        goHome={() => go(withLang("/", lang))}
        lang={lang}
        go={go}
      />
    );
  } else if (productMatch) {
    page = (
      <ProductRoutePage
        id={decodeRouteSegment(productMatch[1])}
        lang={lang}
        go={go}
        search={url.search}
      />
    );
  } else if (path === "/find-your-product") {
    page = <ChooserPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/business") {
    page = <BusinessPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/about") {
    page = <AboutPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/contact") {
    page = <ContactPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/recipes") {
    page = <RecipesPage lang={lang} go={go} search={url.search} />;
  } else if (recipeMatch) {
    page = <RecipeRoutePage id={decodeRouteSegment(recipeMatch[1])} lang={lang} go={go} />;
  } else if (path === "/login") {
    page = <LoginPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/register") {
    page = <RegisterPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/verify-email") {
    page = <VerifyEmailPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/forgot-password") {
    page = <ForgotPasswordPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/reset-password") {
    page = <ResetPasswordPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/inquiries/new") {
    page = <NewInquiryPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/account" || path.startsWith("/account/")) {
    page = (
      <SessionGate lang={lang} go={go}>
        {path === "/account/profile" ? (
          <ProfilePage lang={lang} go={go} />
        ) : path === "/account/security" ? (
          <SecurityPage lang={lang} go={go} />
        ) : path === "/account/inquiries" ? (
          <InquiryListPage lang={lang} go={go} search={url.search} />
        ) : path.startsWith("/account/inquiries/") ? (
          <InquiryDetailPage lang={lang} go={go} inquiryId={path.split("/").at(-1)} />
        ) : (
          <AccountOverviewPage lang={lang} go={go} />
        )}
      </SessionGate>
    );
  } else if (path === "/staff-invitation") {
    page = <StaffInvitationPage lang={lang} go={go} />;
  } else if (path === "/staff/security") {
    page = <StaffSecurityPage lang={lang} go={go} />;
  } else if (path === "/staff" || path.startsWith("/staff/")) {
    page = (
      <SessionGate
        lang={lang}
        go={go}
        staff
        administration={/^\/staff\/(employees|audit-log)(\/|$)/.test(path)}
        inquiries={path.startsWith("/staff/inquiries")}
        content={/^\/staff\/(products|categories|uses|recipes|content|media)(\/|$)/.test(path)}
      >
        {/^\/staff\/(products|categories|uses|recipes|content|media)(\/|$)/.test(path) ? (
          <EditorialWorkspace lang={lang} go={go} path={path} search={url.search} />
        ) : path === "/staff/employees" ? (
          <EmployeesPage lang={lang} go={go} />
        ) : path === "/staff/audit-log" ? (
          <AuditPage lang={lang} go={go} />
        ) : (
          <StaffWorkspace lang={lang} go={go} path={path} search={url.search} />
        )}
      </SessionGate>
    );
  } else if (path === "/privacy") {
    page = <PrivacyPage lang={lang} go={go} />;
  } else {
    page = <NotFoundPage lang={lang} go={go} />;
  }

  return (
    <div className="site-shell" dir={direction(lang)}>
      {auth.transitionError && path !== "/login" && (
        <p className="inline-alert" role="alert">
          {authFailure(auth.transitionError, lang)}
        </p>
      )}
      <a className="skip-link" href="#main-content">
        {msg(lang, { ar: "انتقل إلى المحتوى", en: "Skip to content" })}
      </a>
      <div className="identity-strip">
        <PublishedIdentity lang={lang} />
      </div>
      <header className="site-header">
        <AppLink href={withLang("/", lang)} go={go} className="brand-button">
          <img
            crossOrigin="anonymous"
            src={assets.logo}
            alt={pick(lang, "شركة مصانع الزيوت النباتية", "Vegetable Oil Industries Co.")}
          />
        </AppLink>
        <nav
          ref={navRef}
          className={`main-nav ${menuOpen ? "is-open" : ""}`}
          aria-label={pick(lang, "التنقل الرئيسي", "Main navigation")}
        >
          {navItems.map(([href, label]) => (
            <AppLink
              key={href}
              href={withLang(href, lang)}
              go={go}
              className={path === href || path.startsWith(`${href}/`) ? "active" : undefined}
            >
              {label}
            </AppLink>
          ))}
        </nav>
        <div className="header-actions">
          <label className="language-select">
            <span className="visually-hidden">{msg(lang, { ar: "اللغة", en: "Language" })}</span>
            <select value={lang} onChange={(event) => setLanguage(event.target.value as Lang)}>
              {(Object.keys(localeName) as Lang[]).map((code) => (
                <option key={code} value={code}>
                  {localeName[code]}
                </option>
              ))}
            </select>
          </label>
          <AppLink
            className="header-login"
            href={withLang(
              auth.session?.user
                ? auth.session.user.role === "customer"
                  ? "/account"
                  : "/staff"
                : "/login",
              lang,
            )}
            go={go}
          >
            {auth.session?.user
              ? msg(lang, { ar: "حسابي", en: "My account" })
              : msg(lang, { ar: "دخول", en: "Sign in" })}
          </AppLink>
          <AppLink
            className="button button-primary header-contact"
            href={withLang("/contact", lang)}
            go={go}
          >
            {t.contact}
          </AppLink>
          <button
            ref={menuButtonRef}
            className="menu-button"
            aria-label={pick(
              lang,
              menuOpen ? "إغلاق القائمة" : "فتح القائمة",
              menuOpen ? "Close menu" : "Open menu",
            )}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      {page}
      <SiteFooter lang={lang} go={go} />
    </div>
  );
}

function HomePage({ lang, go }: { lang: Lang; go: (href: string) => void }) {
  const featuredQuery = useFeaturedProducts(lang);
  const featuredProducts = featuredQuery.data?.items ?? [];
  const contentQuery = usePublishedPage("home", lang),
    content = contentQuery.data;
  if (!content || contentQuery.isError) return <ContentStatus query={contentQuery} lang={lang} />;
  return (
    <main>
      <section className="hero section-pad" id="home">
        <div className="hero-copy">
          <p className="eyebrow">{content.texts["text-0"][lang]}</p>
          <h1>
            {content.texts["text-1"][lang]}
            <br />
            {content.texts["text-2"][lang]}
          </h1>
          <p className="hero-description">{content.texts["text-3"][lang]}</p>
          <div className="hero-actions">
            <AppLink className="button button-primary" href={withLang("/products", lang)} go={go}>
              {pick(lang, "اكتشف منتجاتنا", "Explore our products")}
            </AppLink>
            <AppLink
              className="button button-secondary"
              href={withLang("/find-your-product", lang)}
              go={go}
            >
              {ui[lang].chooser}
            </AppLink>
          </div>
          <p className="hero-note">{content.texts["text-5"][lang]}</p>
        </div>
        <div className="hero-art" aria-label={content.texts["text-6"][lang]}>
          <img
            crossOrigin="anonymous"
            className="hero-food"
            src={content.images.kunafa}
            alt={content.texts["text-7"][lang]}
          />
          <div className="product-backdrop" />
          <img
            crossOrigin="anonymous"
            className="hero-product"
            src={content.images.ghazal}
            alt={content.texts["text-8"][lang]}
          />
          <div className="hero-caption">
            <strong>{content.texts["text-9"][lang]}</strong>
            <span>{content.texts["text-10"][lang]}</span>
          </div>
        </div>
      </section>
      <section className="usage-section section-pad" id="chooser">
        <div className="section-heading split-heading">
          <div>
            <h2>{content.texts["text-11"][lang]}</h2>
          </div>
          <p>{content.texts["text-12"][lang]}</p>
        </div>
        <div className="usage-grid">
          {content.rows
            .map(([title, titleEn, text, textEn, image, filter]) => ({
              title,
              titleEn,
              text,
              textEn,
              image,
              filter,
            }))
            .map((card) => (
              <AppLink
                className="usage-card"
                key={card.title}
                href={withLang(`/products?usage=${encodeURIComponent(card.filter)}`, lang)}
                go={go}
              >
                <img crossOrigin="anonymous" src={card.image} alt="" />
                <strong>
                  {lang === "ar" ? card.title : card.titleEn} {arrow(lang)}
                </strong>
                <span>{lang === "ar" ? card.text : card.textEn}</span>
              </AppLink>
            ))}
        </div>
      </section>
      <section className="products-section section-pad" id="products">
        <div className="section-heading split-heading">
          <div>
            <h2>{content.texts["text-16"][lang]}</h2>
            <p>{content.texts["text-17"][lang]}</p>
          </div>
          <AppLink className="text-link" href={withLang("/products", lang)} go={go}>
            {pick(lang, "تصفّح كل المنتجات", "Browse all products")} {arrow(lang)}
          </AppLink>
        </div>
        <CatalogStatus
          query={featuredQuery}
          lang={lang}
          empty={featuredQuery.data?.items.length === 0}
        />
        <div className="product-grid" id="product-list">
          {featuredProducts.map((product) => (
            <ProductTranslation key={product.id} product={product} lang={lang}>
              <article className="product-card">
                <img crossOrigin="anonymous" src={product.image} alt={productName(product, lang)} />
                <h3>{productName(product, lang)}</h3>
                <p>{productDescription(product, lang)}</p>
                <strong className="sizes">
                  {product.sizes.map((size) => sizeLabel(product, size, lang)).join(" • ")}
                </strong>
                <AppLink href={withLang(`/products?product=${product.id}`, lang)} go={go}>
                  {pick(lang, "اكتشف المنتج", "Explore product")} {arrow(lang)}
                </AppLink>
              </article>
            </ProductTranslation>
          ))}
        </div>
      </section>
      <section className="story-section section-pad" id="story">
        <div className="story-copy">
          <p className="eyebrow">{content.texts["text-20"][lang]}</p>
          <h2>{content.texts["text-21"][lang]}</h2>
          <p>{content.texts["text-22"][lang]}</p>
          <AppLink className="button button-primary" href={withLang("/about", lang)} go={go}>
            {pick(lang, "اكتشف حكايتنا", "Discover our story")}
          </AppLink>
        </div>
        <figure className="story-image">
          <img
            crossOrigin="anonymous"
            src={content.images.factory}
            alt={content.texts["text-24"][lang]}
          />
          <figcaption>{content.texts["text-25"][lang]}</figcaption>
        </figure>
      </section>
      <section className="business-section section-pad" id="business">
        <div className="business-copy">
          <p>{content.texts["text-26"][lang]}</p>
          <h2>{content.texts["text-27"][lang]}</h2>
          <p>{content.texts["text-28"][lang]}</p>
          <AppLink className="button button-light" href={withLang("/business", lang)} go={go}>
            {pick(lang, "اكتشف حلول الأعمال", "Explore business options")}
          </AppLink>
        </div>
        <img
          crossOrigin="anonymous"
          src={content.images.kawakeb}
          alt={content.texts["text-30"][lang]}
        />
      </section>
    </main>
  );
}

function SiteFooter({ lang, go }: { lang: Lang; go: (href: string) => void }) {
  const contentQuery = usePublishedPage("shared", lang),
    content = contentQuery.data;
  if (!content || contentQuery.isError) return <ContentStatus query={contentQuery} lang={lang} />;
  return (
    <footer className="site-footer section-pad" id="footer">
      <div className="footer-grid expanded-footer-grid">
        <div className="footer-brand">
          <img crossOrigin="anonymous" src={assets.logo} alt={content.texts["text-31"][lang]} />
          <p>{content.texts["text-32"][lang]}</p>
        </div>
        <div>
          <h3>{pick(lang, "استكشف", "Explore")}</h3>
          <div className="footer-link-list">
            {[
              ["/products", ui[lang].products],
              ["/find-your-product", ui[lang].chooser],
              ["/recipes", ui[lang].recipes],
              ["/about", ui[lang].about],
              ["/business", ui[lang].business],
            ].map(([href, label]) => (
              <AppLink key={href} href={withLang(href, lang)} go={go}>
                {label}
              </AppLink>
            ))}
          </div>
        </div>
        <div>
          <h3>{pick(lang, "تواصل معنا", "Contact")}</h3>
          <a href={`mailto:${content.links.email}`} dir="ltr">
            {content.links.email}
          </a>
          <a href={`tel:${content.links.phone.replace(/ /g, "")}`} dir="ltr">
            {content.links.phone}
          </a>
          <p>{content.texts["address-short"][lang]}</p>
        </div>
        <div>
          <h3>{pick(lang, "تابع حكايتنا", "Follow our story")}</h3>
          <p className="social-links">
            <a href={content.links.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <span>•</span>
            <a href={content.links.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
            <span>•</span>
            <a href="https://www.linkedin.com/company/voic.ltd" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <div>
          <AppLink href={withLang("/products", lang)} go={go}>
            {ui[lang].products}
          </AppLink>
          <span>|</span>
          <AppLink href={withLang("/contact", lang)} go={go}>
            {ui[lang].contact}
          </AppLink>
          <span>|</span>
          <AppLink href={withLang("/about", lang)} go={go}>
            {ui[lang].about}
          </AppLink>
          <span>|</span>
          <AppLink href={withLang("/privacy", lang)} go={go}>
            {msg(lang, { ar: "الخصوصية", en: "Privacy" })}
          </AppLink>
        </div>
        <p>© {content.texts["text-38"][lang]}</p>
      </div>
    </footer>
  );
}

function PublishedIdentity({ lang }: { lang: Lang }) {
  const q = usePublishedPage("header", lang);
  return q.data && !q.isError ? (
    <>{q.data.texts.identity[lang]}</>
  ) : (
    <ContentStatus query={q} lang={lang} />
  );
}
