import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { assets, featuredProducts, products, usageCards } from "./catalog";
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
  ProductDetailPage,
  RecipeDetailPage,
  RecipesPage,
} from "./Pages";
import ProductsPage from "./ProductsPage";
import { recipes } from "./recipes";
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "./pages/AuthPages";
import { AccountAccessPage } from "./pages/AccountPages";
import NewInquiryPage from "./pages/NewInquiryPage";
import PrivacyPage from "./pages/PrivacyPage";
import StaffAccessPage from "./pages/StaffAccessPage";

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
    const productSegment = /^\/products\/([^/]+)$/.exec(path)?.[1];
    const recipeSegment = /^\/recipes\/([^/]+)$/.exec(path)?.[1];
    const missingDetail =
      (productSegment &&
        !products.some(
          (item) =>
            item.slug === decodeURIComponent(productSegment) ||
            item.id === decodeURIComponent(productSegment),
        )) ||
      (recipeSegment && !recipes.some((item) => item.slug === decodeURIComponent(recipeSegment)));
    const routeTitle = missingDetail
      ? pick(lang, "صفحة غير موجودة", "Page not found")
      : path === "/"
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
        heading.focus({ preventScroll: true });
      }
    });
  }

  function updateSearch(params: URLSearchParams) {
    if (lang !== "ar") params.set("lang", lang);
    else params.delete("lang");
    const href = `/products${params.size ? `?${params}` : ""}`;
    window.history.replaceState(null, "", href);
    setLocation(href);
  }

  function setLanguage(nextLang: Lang) {
    const next = new URL(window.location.href);
    if (nextLang === "ar") next.searchParams.delete("lang");
    else next.searchParams.set("lang", nextLang);
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
    const product = products.find(
      (item) =>
        item.slug === decodeURIComponent(productMatch[1]) ||
        item.id === decodeURIComponent(productMatch[1]),
    );
    page = product ? (
      <ProductDetailPage product={product} lang={lang} go={go} search={url.search} />
    ) : (
      <NotFoundPage lang={lang} go={go} />
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
    const recipe = recipes.find((item) => item.slug === decodeURIComponent(recipeMatch[1]));
    page = recipe ? (
      <RecipeDetailPage recipe={recipe} lang={lang} go={go} search={url.search} />
    ) : (
      <NotFoundPage lang={lang} go={go} />
    );
  } else if (path === "/login") {
    page = <LoginPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/register") {
    page = <RegisterPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/verify-email") {
    page = <VerifyEmailPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/forgot-password") {
    page = <ForgotPasswordPage lang={lang} go={go} />;
  } else if (path === "/reset-password") {
    page = <ResetPasswordPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/inquiries/new") {
    page = <NewInquiryPage lang={lang} go={go} search={url.search} />;
  } else if (path === "/account" || path.startsWith("/account/")) {
    page = <AccountAccessPage lang={lang} go={go} />;
  } else if (path === "/staff" || path.startsWith("/staff/")) {
    page = <StaffAccessPage lang={lang} go={go} />;
  } else if (path === "/privacy") {
    page = <PrivacyPage lang={lang} go={go} />;
  } else {
    page = <NotFoundPage lang={lang} go={go} />;
  }

  return (
    <div className="site-shell" dir={direction(lang)}>
      <a className="skip-link" href="#main-content">
        {msg(lang, { ar: "انتقل إلى المحتوى", en: "Skip to content" })}
      </a>
      <div className="identity-strip">
        {pick(
          lang,
          "صناعة فلسطينية • من نابلس إلى موائدكم منذ 1953",
          "Made in Palestine • From Nablus to your table since 1953",
        )}
      </div>
      <header className="site-header">
        <AppLink href={withLang("/", lang)} go={go} className="brand-button">
          <img
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
          <AppLink className="header-login" href={withLang("/login", lang)} go={go}>
            {msg(lang, { ar: "دخول", en: "Sign in" })}
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
  return (
    <main>
      <section className="hero section-pad" id="home">
        <div className="hero-copy">
          <p className="eyebrow">
            {pick(lang, "من قلب نابلس، منذ 1953", "From Nablus, since 1953")}
          </p>
          <h1>
            {pick(lang, "من نابلس،", "From Nablus,")}
            <br />
            {pick(lang, "نكهات بتجمعنا", "flavours that bring us together")}
          </h1>
          <p className="hero-description">
            {pick(
              lang,
              "للأطباق اللي بنحبها، وللحلويات اللي بتجمعنا. اكتشف منتجاتنا للطبخ والحلويات والمخبوزات.",
              "For the dishes we love and the sweets that bring us together. Explore products for cooking, sweets and baking.",
            )}
          </p>
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
          <p className="hero-note">
            {pick(
              lang,
              "منتجات نعرفها… وطعم تربّينا عليه",
              "Familiar products and flavours generations grew up with",
            )}
          </p>
        </div>
        <div
          className="hero-art"
          aria-label={pick(lang, "كنافة وعبوة الغزال", "Kunafa and Al-Ghazal pack")}
        >
          <img
            className="hero-food"
            src={assets.kunafa}
            alt={pick(lang, "كنافة نابلسية بالفستق", "Nabulsi kunafa with pistachios")}
          />
          <div className="product-backdrop" />
          <img
            className="hero-product"
            src={assets.ghazal}
            alt={pick(lang, "عبوة سمن الغزال", "Al-Ghazal vegetable ghee pack")}
          />
          <div className="hero-caption">
            <strong>{pick(lang, "الغزال", "Al-Ghazal")}</strong>
            <span>{pick(lang, "نكهة ترافق وصفاتك", "A flavour for your recipes")}</span>
          </div>
        </div>
      </section>
      <section className="usage-section section-pad" id="chooser">
        <div className="section-heading split-heading">
          <div>
            <h2>{pick(lang, "شو بدك تحضّر؟", "What are you making?")}</h2>
          </div>
          <p>{pick(lang, "ابدأ من وصفتك المفضلة", "Start with your favourite recipe")}</p>
        </div>
        <div className="usage-grid">
          {usageCards.map((card) => (
            <AppLink
              className="usage-card"
              key={card.title}
              href={withLang(`/products?usage=${encodeURIComponent(card.filter)}`, lang)}
              go={go}
            >
              <img src={card.image} alt="" />
              <strong>
                {pick(
                  lang,
                  `${card.title} ${arrow(lang)}`,
                  `${card.filter === "الطبخ" ? pick(lang, "الطبخ", "Cooking") : card.filter === "الحلويات الشرقية" ? pick(lang, "الحلويات الشرقية", "Traditional sweets") : pick(lang, "المخبوزات", "Baking")} ${arrow(lang)}`,
                )}
              </strong>
              <span>
                {pick(
                  lang,
                  card.text,
                  card.filter === "الطبخ"
                    ? "For everyday dishes"
                    : card.filter === "الحلويات الشرقية"
                      ? "From kunafa to festive sweets"
                      : "Recipes worth trying",
                )}
              </span>
            </AppLink>
          ))}
        </div>
      </section>
      <section className="products-section section-pad" id="products">
        <div className="section-heading split-heading">
          <div>
            <h2>{pick(lang, "أسماء مألوفة، خيارات متنوعة", "Familiar names, varied options")}</h2>
            <p>
              {pick(
                lang,
                "تعرّف على منتجاتنا، واختار العبوة المناسبة إلك.",
                "Explore our range and choose the pack size that suits you.",
              )}
            </p>
          </div>
          <AppLink className="text-link" href={withLang("/products", lang)} go={go}>
            {pick(lang, "تصفّح كل المنتجات", "Browse all products")} {arrow(lang)}
          </AppLink>
        </div>
        <div className="product-grid" id="product-list">
          {featuredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <img src={product.image} alt={productName(product, lang)} />
              <h3>{productName(product, lang)}</h3>
              <p>{productDescription(product, lang)}</p>
              <strong className="sizes">
                {product.sizes
                  .map((size) =>
                    lang === "ar"
                      ? size
                      : size.replace("كغم", "kg").replace("غم", "g").replace("لتر", "L"),
                  )
                  .join(" • ")}
              </strong>
              <AppLink href={withLang(`/products?product=${product.id}`, lang)} go={go}>
                {pick(lang, "اكتشف المنتج", "Explore product")} {arrow(lang)}
              </AppLink>
            </article>
          ))}
        </div>
      </section>
      <section className="story-section section-pad" id="story">
        <div className="story-copy">
          <p className="eyebrow">
            {pick(lang, "جذور فلسطينية. حكاية مستمرة.", "Palestinian roots. An ongoing story.")}
          </p>
          <h2>{pick(lang, "حكاية بدأت من نابلس", "A story that began in Nablus")}</h2>
          <p>
            {pick(
              lang,
              "منذ تأسيس الشركة عام 1953، نواصل تطوير منتجات الزيوت والسمن النباتي، لنكون جزءًا من وصفات البيوت والمطابخ المهنية.",
              "Since the company was founded in 1953, we have continued developing vegetable oil and ghee products for home and professional kitchens.",
            )}
          </p>
          <AppLink className="button button-primary" href={withLang("/about", lang)} go={go}>
            {pick(lang, "اكتشف حكايتنا", "Discover our story")}
          </AppLink>
        </div>
        <figure className="story-image">
          <img
            src={assets.factory}
            alt={pick(lang, "مصانع الشركة في نابلس", "VOIC factory in Nablus")}
          />
          <figcaption>
            {pick(
              lang,
              "منذ 1953 / شركة مصانع الزيوت النباتية",
              "Since 1953 / Vegetable Oil Industries Co.",
            )}
          </figcaption>
        </figure>
      </section>
      <section className="business-section section-pad" id="business">
        <div className="business-copy">
          <p>
            {pick(
              lang,
              "للمطاعم • لمحلات الحلويات • للمخابز • للتجّار",
              "For restaurants • sweet shops • bakeries • distributors",
            )}
          </p>
          <h2>{pick(lang, "منتجات تناسب حجم شغلك", "Products sized for your business")}</h2>
          <p>
            {pick(
              lang,
              "اكتشف خيارات التعبئة لقطاع الأعمال، وتواصل معنا لتحديد احتياجك.",
              "Explore business pack formats and contact us to discuss your needs.",
            )}
          </p>
          <AppLink className="button button-light" href={withLang("/business", lang)} go={go}>
            {pick(lang, "اكتشف حلول الأعمال", "Explore business options")}
          </AppLink>
        </div>
        <img
          src={assets.kawakeb}
          alt={pick(lang, "عبوات الكواكب للمطابخ المهنية", "Al-Kawakib professional packs")}
        />
      </section>
    </main>
  );
}

function SiteFooter({ lang, go }: { lang: Lang; go: (href: string) => void }) {
  return (
    <footer className="site-footer section-pad" id="footer">
      <div className="footer-grid expanded-footer-grid">
        <div className="footer-brand">
          <img
            src={assets.logo}
            alt={pick(lang, "شركة مصانع الزيوت النباتية", "Vegetable Oil Industries Co.")}
          />
          <p>
            {pick(lang, "من مصانع نابلس… إلى مطبخك.", "From our Nablus factory to your kitchen.")}
          </p>
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
          <a href="mailto:info@voic.ps" dir="ltr">
            info@voic.ps
          </a>
          <a href="tel:+97092324011" dir="ltr">
            +970 9 2324011
          </a>
          <p>{pick(lang, "نابلس، فلسطين", "Nablus, Palestine")}</p>
        </div>
        <div>
          <h3>{pick(lang, "تابع حكايتنا", "Follow our story")}</h3>
          <p className="social-links">
            <a href="https://www.instagram.com/voic.ltd" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <span>•</span>
            <a href="https://www.facebook.com/voic.ltd/" target="_blank" rel="noreferrer">
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
        <p>© {pick(lang, "شركة مصانع الزيوت النباتية", "Vegetable Oil Industries Co.")}</p>
      </div>
    </footer>
  );
}
