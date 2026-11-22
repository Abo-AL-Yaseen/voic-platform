import { useMemo, useState } from "react";
import { products, type Product, type UseKey } from "./catalog";
import {
  categoryLabel,
  arrow,
  formatPackaging,
  formatSize,
  pick,
  productDescription,
  productName,
  secondaryProductName,
  ui,
  useLabel,
  withLang,
  type Lang,
} from "./i18n";
import InquiryForm, { productInquiryHref } from "./InquiryForm";
import Modal from "./Modal";
import ProductQuickView from "./ProductQuickView";
import { recipes, type Recipe } from "./recipes";

type PageProps = { lang: Lang; go: (href: string) => void; search?: string };

function PageLink({
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

function Breadcrumb({
  lang,
  go,
  items,
}: PageProps & { items: { label: string; href?: string }[] }) {
  return (
    <nav
      className="breadcrumb page-breadcrumb"
      aria-label={pick(lang, "مسار التنقل", "Breadcrumb")}
    >
      <PageLink href={withLang("/", lang)} go={go}>
        {ui[lang].home}
      </PageLink>
      {items.map((item) => (
        <span className="breadcrumb-segment" key={item.label}>
          <span aria-hidden="true">/</span>
          {item.href ? (
            <PageLink href={withLang(item.href, lang)} go={go}>
              {item.label}
            </PageLink>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function ProductImage({ product, lang }: { product: Product; lang: Lang }) {
  return product.image ? (
    <img src={product.image} alt={productName(product, lang)} />
  ) : (
    <div
      className="missing-product-image"
      role="img"
      aria-label={pick(lang, "لا تتوفر صورة أصلية", "Original image unavailable")}
    >
      {pick(lang, "الصورة الأصلية غير متوفّرة", "Original image unavailable")}
    </div>
  );
}

function ProductMiniCard({
  product,
  lang,
  go,
  onQuick,
  reason,
  selectable,
  selected,
  onSelect,
  onInquiry,
  inquirySelected,
}: {
  product: Product;
  lang: Lang;
  go: (href: string) => void;
  onQuick?: () => void;
  reason?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onInquiry?: () => void;
  inquirySelected?: boolean;
}) {
  return (
    <article className="product-card catalog-card mini-product-card">
      <ProductImage product={product} lang={lang} />
      <span className="product-type">{categoryLabel(product, lang)}</span>
      <h3>{productName(product, lang)}</h3>
      <span className="product-english-name" dir={lang === "ar" ? "ltr" : "rtl"}>
        {secondaryProductName(product, lang)}
      </span>
      <p>{reason || productDescription(product, lang)}</p>
      {product.sizes.length > 0 && (
        <strong className="sizes">
          {product.sizes.map((size) => formatSize(size, lang)).join(" • ")}
        </strong>
      )}
      <div className="mini-card-actions">
        {onQuick && (
          <button className="button button-secondary" onClick={onQuick}>
            {ui[lang].details}
          </button>
        )}
        <PageLink href={withLang(`/products/${product.slug}`, lang)} go={go} className="text-link">
          {ui[lang].fullProduct} {arrow(lang)}
        </PageLink>
      </div>
      {selectable && (
        <label className="check-option compare-option">
          <input type="checkbox" checked={selected} onChange={onSelect} />
          <span>{ui[lang].compare}</span>
        </label>
      )}
      {onInquiry && (
        <button
          className={`inquiry-select-button ${inquirySelected ? "is-selected" : ""}`}
          aria-pressed={inquirySelected}
          onClick={onInquiry}
        >
          {inquirySelected
            ? pick(lang, "تمت الإضافة للاستفسار", "Added to inquiry")
            : pick(lang, "أضف لاستفسار توريد", "Add to inquiry")}
        </button>
      )}
    </article>
  );
}

export function ProductDetailPage({ product, lang, go }: PageProps & { product: Product }) {
  const related = products
    .filter(
      (item) =>
        item.id !== product.id &&
        (item.categoryKey === product.categoryKey ||
          item.useKeys.some((use) => product.useKeys.includes(use))),
    )
    .slice(0, 3);
  const relatedRecipes = recipes.filter((recipe) => recipe.productIds.includes(product.id));
  return (
    <main className="page-shell product-page section-pad">
      <Breadcrumb
        lang={lang}
        go={go}
        items={[
          { label: ui[lang].products, href: "/products" },
          { label: productName(product, lang) },
        ]}
      />
      <section className="product-page-hero">
        <div className="product-page-image">
          <ProductImage product={product} lang={lang} />
        </div>
        <div className="product-page-copy">
          <p className="eyebrow">{categoryLabel(product, lang)}</p>
          <h1>{productName(product, lang)}</h1>
          <p className="secondary-title" dir={lang === "ar" ? "ltr" : "rtl"}>
            {secondaryProductName(product, lang)}
          </p>
          <p className="lead">{productDescription(product, lang)}</p>
          {product.useKeys.length > 0 && (
            <div className="detail-block">
              <h2>{pick(lang, "الاستخدامات", "Uses")}</h2>
              <ul className="product-use-list">
                {product.useKeys.map((use) => (
                  <li key={use}>{useLabel(use, lang)}</li>
                ))}
              </ul>
            </div>
          )}
          {(product.packaging?.length || product.sizes.length > 0) && (
            <div className="detail-block">
              <h2>{pick(lang, "الأحجام وخيارات التعبئة", "Sizes and packaging")}</h2>
              <p>
                {(product.packaging || product.sizes)
                  .map((value) => formatPackaging(value, lang))
                  .join(" • ")}
              </p>
            </div>
          )}
          {product.ingredientsAr && (
            <div className="detail-block">
              <h2>{pick(lang, "المكونات", "Ingredients")}</h2>
              <p>{pick(lang, product.ingredientsAr, product.ingredientsEn || "")}</p>
            </div>
          )}
          <div className="product-page-actions">
            <PageLink
              className="button button-primary"
              href={withLang(`/inquiries/new?products=${product.id}`, lang)}
              go={go}
            >
              {ui[lang].inquiry}
            </PageLink>
            <small>{ui[lang].emailHint}</small>
            <a className="text-link" href={productInquiryHref(product.id, lang)}>
              {pick(lang, "تواصل بالبريد بدلًا من ذلك", "Contact by email instead")}
            </a>
          </div>
        </div>
      </section>
      {relatedRecipes.length > 0 && (
        <section className="related-section">
          <div className="page-section-heading">
            <h2>{pick(lang, "وصفات تستخدم المنتج", "Recipes using this product")}</h2>
          </div>
          <div className="related-recipe-grid">
            {relatedRecipes.map((recipe) => (
              <PageLink
                key={recipe.slug}
                href={withLang(`/recipes/${recipe.slug}`, lang)}
                go={go}
                className="related-recipe"
              >
                <img src={recipe.image} alt="" loading="lazy" />
                <strong>{pick(lang, recipe.titleAr, recipe.titleEn)}</strong>
              </PageLink>
            ))}
          </div>
        </section>
      )}
      <section className="related-section">
        <div className="page-section-heading">
          <h2>{pick(lang, "منتجات قريبة", "Related products")}</h2>
        </div>
        <div className="three-grid">
          {related.map((item) => (
            <ProductMiniCard key={item.id} product={item} lang={lang} go={go} />
          ))}
        </div>
      </section>
    </main>
  );
}

const chooserUses: UseKey[] = ["cooking", "frying", "oriental-sweets", "baking", "food-industry"];

export function ChooserPage({ lang, go }: PageProps) {
  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState<"home" | "business" | "">("");
  const [use, setUse] = useState<UseKey | "">("");
  const [size, setSize] = useState("");
  const [quick, setQuick] = useState<Product | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [inquirySelected, setInquirySelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const useMatches = products.filter((product) => use && product.useKeys.includes(use));
  const availableSizes = [...new Set(useMatches.flatMap((product) => product.sizes))].sort(
    (a, b) => Number.parseFloat(a) - Number.parseFloat(b),
  );
  const results =
    step === 4
      ? useMatches.filter((product) => !size || size === "none" || product.sizes.includes(size))
      : [];
  const chooseUse = (value: UseKey) => {
    setUse(value);
    if (size && size !== "none") {
      const nextSizes = products
        .filter((product) => product.useKeys.includes(value))
        .flatMap((product) => product.sizes);
      if (!nextSizes.includes(size)) setSize("");
    }
  };
  const toggleCompare = (id: string) => {
    if (selected.includes(id)) setSelected(selected.filter((item) => item !== id));
    else if (selected.length === 3)
      setNotice(
        pick(lang, "يمكنك مقارنة 3 منتجات كحد أقصى.", "You can compare up to three products."),
      );
    else {
      setSelected([...selected, id]);
      setNotice("");
    }
  };
  const reset = () => {
    setStep(1);
    setAudience("");
    setUse("");
    setSize("");
    setSelected([]);
    setInquirySelected([]);
    setNotice("");
  };
  return (
    <main className="page-shell chooser-page section-pad">
      <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].chooser }]} />
      <section className="page-intro centered-intro">
        <p className="eyebrow">{pick(lang, "اختيار بخطوات بسيطة", "A simple guided choice")}</p>
        <h1>{pick(lang, "خلّينا نساعدك تختار", "Let us help you choose")}</h1>
        <p>
          {pick(
            lang,
            "احكيلنا عن استخدامك وحجم العبوة اللي بناسبك، وشوف الخيارات الأقرب لاحتياجك.",
            "Tell us how you plan to use the product and which pack size suits you, then see the closest options.",
          )}
        </p>
      </section>
      <div
        className="chooser-progress"
        aria-label={pick(lang, "تقدم الخطوات", "Progress")}
        aria-live="polite"
      >
        <span>
          {pick(lang, `الخطوة ${Math.min(step, 3)} من 3`, `Step ${Math.min(step, 3)} of 3`)}
        </span>
        <div>
          <i style={{ width: `${Math.min(step, 3) * 33.333}%` }} />
        </div>
      </div>
      {step < 4 && (
        <section className="chooser-panel">
          {step === 1 && (
            <>
              <h2>
                {pick(lang, "بتختار للبيت ولا للشغل؟", "Are you choosing for home or business?")}
              </h2>
              <div className="choice-grid two-choice-grid">
                {[
                  ["home", pick(lang, "للبيت", "For home")],
                  ["business", pick(lang, "لقطاع الأعمال", "For business")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={`choice-button ${audience === value ? "is-selected" : ""}`}
                    aria-pressed={audience === value}
                    onClick={() => setAudience(value as "home" | "business")}
                  >
                    <strong>{label}</strong>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>{pick(lang, "شو الاستخدام الأساسي؟", "What is the main use?")}</h2>
              <div className="choice-grid">
                {chooserUses.map((item) => (
                  <button
                    key={item}
                    className={`choice-button ${use === item ? "is-selected" : ""}`}
                    aria-pressed={use === item}
                    onClick={() => chooseUse(item)}
                  >
                    <strong>{useLabel(item, lang)}</strong>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2>{pick(lang, "أي حجم عبوة بناسبك؟", "Which pack size suits you?")}</h2>
              <div className="size-choice-groups">
                <div className="choice-grid size-choice-grid">
                  {availableSizes.map((item) => (
                    <button
                      key={item}
                      className={`choice-button ${size === item ? "is-selected" : ""}`}
                      aria-pressed={size === item}
                      onClick={() => setSize(item)}
                    >
                      <strong>{formatSize(item, lang)}</strong>
                    </button>
                  ))}
                  <button
                    className={`choice-button ${size === "none" ? "is-selected" : ""}`}
                    aria-pressed={size === "none"}
                    onClick={() => setSize("none")}
                  >
                    <strong>
                      {pick(
                        lang,
                        audience === "business" ? "ساعدوني بخيارات التوريد" : "ما عندي تفضيل",
                        audience === "business" ? "Help me with supply options" : "No preference",
                      )}
                    </strong>
                  </button>
                </div>
              </div>
            </>
          )}
          <div className="chooser-controls">
            <button
              className="button button-secondary"
              disabled={step === 1}
              onClick={() => setStep(step - 1)}
            >
              {ui[lang].back}
            </button>
            <button
              className="button button-primary"
              disabled={(step === 1 && !audience) || (step === 2 && !use) || (step === 3 && !size)}
              onClick={() => setStep(step + 1)}
            >
              {step === 3 ? pick(lang, "شوف النتائج", "See results") : ui[lang].next}
            </button>
          </div>
        </section>
      )}
      {step === 4 && (
        <section className="chooser-results">
          <div className="page-section-heading split-heading">
            <div>
              <p className="eyebrow">{pick(lang, "نتيجتك", "Your results")}</p>
              <h2>
                {results.length
                  ? pick(lang, "خيارات تطابق اختياراتك", "Options matching your choices")
                  : pick(
                      lang,
                      "ما لقينا تطابقًا لكل اختياراتك",
                      "No exact match for all your choices",
                    )}
              </h2>
            </div>
            <div className="result-edit-actions">
              <button className="text-link" onClick={() => setStep(2)}>
                {pick(lang, "عدّل الإجابات", "Edit answers")}
              </button>
              <button className="text-link" onClick={reset}>
                {ui[lang].reset}
              </button>
            </div>
          </div>
          {results.length ? (
            <div className="three-grid">
              {results.map((product) => (
                <ProductMiniCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  go={go}
                  onQuick={() => setQuick(product)}
                  selectable
                  selected={selected.includes(product.id)}
                  onSelect={() => toggleCompare(product.id)}
                  onInquiry={() =>
                    setInquirySelected((current) =>
                      current.includes(product.id)
                        ? current.filter((id) => id !== product.id)
                        : [...current, product.id],
                    )
                  }
                  inquirySelected={inquirySelected.includes(product.id)}
                  reason={pick(
                    lang,
                    `مناسب لـ${useLabel(use as UseKey, lang)}${size !== "none" ? `، وبحجم ${size} الذي اخترته` : ""}.`,
                    `Matches your ${useLabel(use as UseKey, lang).toLowerCase()} use${size !== "none" ? ` and selected ${formatSize(size, lang)} size` : ""}.`,
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="no-match">
              <p>
                {pick(
                  lang,
                  "جرّب تعديل الاستخدام أو الحجم، أو تصفّح كل المنتجات وتواصل معنا لمناقشة احتياجك.",
                  "Edit the use or size, browse the full catalog, or contact us to discuss your need.",
                )}
              </p>
              <div>
                <button className="button button-secondary" onClick={() => setStep(2)}>
                  {pick(lang, "عدّل الإجابات", "Edit answers")}
                </button>
                <PageLink
                  href={withLang("/products", lang)}
                  go={go}
                  className="button button-primary"
                >
                  {ui[lang].products}
                </PageLink>
                <PageLink href={withLang("/contact", lang)} go={go} className="text-link">
                  {ui[lang].contact}
                </PageLink>
              </div>
            </div>
          )}
          {audience === "business" && results.length > 0 && (
            <PageLink
              href={withLang(
                `/business?products=${results.map((product) => product.id).join(",")}`,
                lang,
              )}
              go={go}
              className="button button-primary chooser-business-cta"
            >
              {pick(lang, "ابدأ استفسارًا تجاريًا", "Start a business inquiry")}
            </PageLink>
          )}
          {notice && (
            <p className="comparison-notice" role="alert">
              {notice}
            </p>
          )}
          {selected.length > 0 && (
            <button
              className="button button-secondary chooser-compare-button"
              onClick={() =>
                go(
                  withLang(
                    `/products?${selected.map((id) => `compare=${encodeURIComponent(id)}`).join("&")}`,
                    lang,
                  ),
                )
              }
            >
              {pick(
                lang,
                `قارن المنتجات (${selected.length})`,
                `Compare products (${selected.length})`,
              )}
            </button>
          )}
          {inquirySelected.length > 0 && (
            <PageLink
              href={withLang(`/inquiries/new?products=${inquirySelected.join(",")}`, lang)}
              go={go}
              className="button button-primary chooser-inquiry-button"
            >
              {pick(
                lang,
                `تابع استفسارًا عن ${inquirySelected.length} منتجات`,
                `Continue inquiry with ${inquirySelected.length} products`,
              )}
            </PageLink>
          )}
        </section>
      )}
      {quick && (
        <ProductQuickView product={quick} lang={lang} onClose={() => setQuick(null)} go={go} />
      )}
    </main>
  );
}

export function BusinessPage({ lang, go, search = "" }: PageProps) {
  const params = new URLSearchParams(search);
  const initialProductIds = [
    ...(params.get("product") ? [params.get("product")!] : []),
    ...(params.get("products")?.split(",") || []),
  ];
  const professionalIds = ["kawakeb", "nabateen", "balqa", "mumtaz", "aseel", "kawkab-soybean-oil"];
  return (
    <main className="page-shell business-page">
      <section className="business-page-hero section-pad">
        <div>
          <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].business }]} />
          <p className="eyebrow">
            {pick(lang, "للمطاعم والمخابز والموزعين", "For kitchens, bakeries and distributors")}
          </p>
          <h1>{pick(lang, "منتجات تناسب حجم شغلك", "Products sized for your business")}</h1>
          <p className="lead">
            {pick(
              lang,
              "خيارات من السمن والزيوت النباتية للمطاعم ومحلات الحلويات والمخابز والموزعين. تعرّف على المنتجات وأحجام التعبئة، وتواصل معنا لمناقشة احتياجات التوريد.",
              "Vegetable ghee and oil options for restaurants, sweet shops, bakeries and distributors. Explore products and pack sizes, then contact us to discuss supply needs.",
            )}
          </p>
          <PageLink className="button button-light" href={withLang("/inquiries/new", lang)} go={go}>
            {pick(lang, "ابدأ استفسارك", "Start an inquiry")}
          </PageLink>
        </div>
        <img src="/assets/fe634.png" alt={pick(lang, "عبوات الكواكب", "Al-Kawakib packs")} />
      </section>
      <section className="section-pad audience-section">
        <div className="page-section-heading">
          <h2>{pick(lang, "مسارات لاحتياجك", "Paths for your business")}</h2>
        </div>
        <div className="audience-grid">
          {[
            ["مطاعم ومطابخ مهنية", "Restaurants & professional kitchens", "cooking"],
            ["محلات الحلويات", "Sweet shops", "oriental-sweets"],
            ["المخابز", "Bakeries", "baking"],
            ["موزعون ومستوردون", "Distributors & importers", ""],
          ].map(([ar, en, use]) => (
            <PageLink
              key={ar}
              href={withLang(
                use
                  ? `/products?usage=${encodeURIComponent(useLabel(use as UseKey, "ar"))}`
                  : "/products",
                lang,
              )}
              go={go}
              className="audience-path"
            >
              <strong>{pick(lang, ar, en)}</strong>
              <span>{arrow(lang)}</span>
            </PageLink>
          ))}
        </div>
      </section>
      <section className="section-pad professional-products">
        <div className="page-section-heading">
          <p className="eyebrow">
            {pick(lang, "أحجام مهنية معروفة", "Known professional formats")}
          </p>
          <h2>{pick(lang, "خيارات للتحضير والتوريد", "Options for preparation and supply")}</h2>
        </div>
        <div className="professional-list">
          {professionalIds.map((id) => {
            const product = products.find((item) => item.id === id)!;
            return (
              <PageLink
                key={id}
                href={withLang(`/products/${product.slug}`, lang)}
                go={go}
                className="professional-row"
              >
                <ProductImage product={product} lang={lang} />
                <div>
                  <strong>{productName(product, lang)}</strong>
                  <span>
                    {(product.packaging || product.sizes)
                      .map((value) => formatPackaging(value, lang))
                      .join(" • ")}
                  </span>
                </div>
                <b>{arrow(lang)}</b>
              </PageLink>
            );
          })}
        </div>
      </section>
      <section className="section-pad inquiry-section" id="business-inquiry">
        <div className="page-section-heading">
          <p className="eyebrow">{pick(lang, "استفسار تجاري", "Commercial inquiry")}</p>
          <h2>{pick(lang, "خلّينا نتعرّف على احتياجك", "Tell us about your needs")}</h2>
          <p>
            {pick(
              lang,
              "شاركنا المنتجات والأحجام والكميات التقريبية وبلد الوجهة، لبدء التواصل مع فريق الشركة.",
              "Share the products, sizes, approximate quantities and destination country to begin a conversation with our team.",
            )}
          </p>
        </div>
        <InquiryForm lang={lang} mode="business" initialProductIds={initialProductIds} />
        <div className="business-inquiry-path">
          <strong>{pick(lang, "مسار استفسار التوريد", "Supply inquiry journey")}</strong>
          <p>
            {pick(
              lang,
              "اختيار المنتجات ← إنشاء حساب والتحقق ← مراجعة الاستفسار ← متابعة رد الشركة",
              "Choose products → create and verify an account → review the inquiry → track the company response",
            )}
          </p>
          <PageLink
            href={withLang(
              `/inquiries/new${initialProductIds.length ? `?products=${initialProductIds.join(",")}` : ""}`,
              lang,
            )}
            go={go}
            className="button button-primary"
          >
            {pick(lang, "ابدأ المسار", "Start the journey")}
          </PageLink>
        </div>
      </section>
      <section className="section-pad faq-section">
        <div className="page-section-heading">
          <h2>{pick(lang, "أسئلة شائعة", "Frequently asked questions")}</h2>
        </div>
        <div className="faq-list">
          {[
            [
              "كيف أطلب عرض سعر؟",
              "How do I request a quotation?",
              "حدّد المنتجات والأحجام والكميات التقريبية وبلد الوجهة، ثم تواصل مع فريق الشركة لمناقشة طلبك.",
              "Specify products, sizes, approximate quantities and destination country, then contact the company team to discuss your request.",
            ],
            [
              "هل يمكن الاستفسار عن التوريد إلى ألمانيا؟",
              "Can I inquire about supply to Germany?",
              "يمكنك ذكر ألمانيا أو أي وجهة مطلوبة في استفسارك، ومناقشة إمكانية التوريد ومتطلباته مباشرة مع الشركة.",
              "You can name Germany or any requested destination in your inquiry and discuss supply feasibility and requirements directly with the company.",
            ],
            [
              "هل أستطيع الشراء مباشرة من الموقع؟",
              "Can I buy directly from the website?",
              "الموقع يعرّفك بمنتجاتنا ويساعدك على الاختيار. يتم التواصل بشأن الأسعار وشروط التوريد مباشرة مع الشركة.",
              "The website introduces our products and helps you choose. Pricing and supply terms are discussed directly with the company.",
            ],
            [
              "كيف أحصل على تفاصيل التعبئة والمواصفات؟",
              "How do I obtain packaging and specification details?",
              "اذكر اسم المنتج والحجم المطلوب في استفسارك، وأضف المعلومات الفنية التي تحتاجها.",
              "Include the product name, required size and the technical information you need in your inquiry.",
            ],
          ].map(([qAr, qEn, aAr, aEn]) => (
            <details key={qAr}>
              <summary>{pick(lang, qAr, qEn)}</summary>
              <p>{pick(lang, aAr, aEn)}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

export function AboutPage({ lang, go }: PageProps) {
  const milestones = [
    [
      "1953",
      "تأسيس الشركة في نابلس، وبداية العمل في تكرير زيت الزيتون وتعبئته.",
      "VOIC was established in Nablus, beginning with olive-oil refining and packing.",
      "/assets/site/history-1954.jpg",
    ],
    [
      "1961",
      "بدء إنتاج السمن النباتي وتطوير الخبرات الفنية بالتعاون مع خبراء هولنديين.",
      "Vegetable ghee production began, with technical expertise developed in cooperation with Dutch experts.",
      "/assets/site/history-1961.jpg",
    ],
    [
      "1985",
      "التوسع في تكرير الزيوت النباتية السائلة وتحديث تجهيزات المصنع.",
      "The company expanded into liquid vegetable-oil refining and modernised factory equipment.",
      "/assets/site/history-2016.jpg",
    ],
  ];
  return (
    <main className="page-shell about-page">
      <section className="about-hero section-pad">
        <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].about }]} />
        <div className="about-hero-grid">
          <div>
            <p className="eyebrow">{pick(lang, "منذ 1953", "Since 1953")}</p>
            <h1>{pick(lang, "حكاية بدأت من نابلس", "A story that began in Nablus")}</h1>
            <p className="lead">
              {pick(
                lang,
                "تأسست شركة مصانع الزيوت النباتية عام 1953 في المنطقة الصناعية الشرقية بمدينة نابلس. بدأت مسيرتها بتكرير زيت الزيتون وتعبئته، ثم توسعت إلى إنتاج السمن النباتي وتكرير الزيوت النباتية السائلة. واليوم تضم مجموعتها علامات للسمن وزيوت الصويا والذرة ودوار الشمس.",
                "Vegetable Oil Industries Co. was established in 1953 in Nablus's Eastern Industrial Area. It began by refining and packing olive oil, then expanded into vegetable ghee and liquid vegetable-oil refining. Today its range includes ghee, soybean, corn and sunflower oil brands.",
              )}
            </p>
          </div>
          <img
            src="/assets/site/factory-panorama.png"
            alt={pick(lang, "مصنع الشركة في نابلس", "VOIC factory in Nablus")}
          />
        </div>
      </section>
      <section className="section-pad timeline-section">
        <div className="page-section-heading">
          <h2>{pick(lang, "محطات من المسيرة", "Milestones")}</h2>
        </div>
        <div className="timeline">
          {milestones.map(([year, ar, en, image]) => (
            <article key={year} className="timeline-item">
              <img src={image} alt="" loading="lazy" />
              <div>
                <span>{year}</span>
                <p>{pick(lang, ar, en)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section-pad purpose-section">
        <article>
          <p className="eyebrow">{pick(lang, "رؤيتنا", "Our vision")}</p>
          <h2>
            {pick(
              lang,
              "نكهة أصيلة ومنتجات نعتزّ بها.",
              "Authentic flavour and products we are proud of.",
            )}
          </h2>
        </article>
        <article>
          <p className="eyebrow">{pick(lang, "رسالتنا", "Our mission")}</p>
          <p>
            {pick(
              lang,
              "نعمل على تقديم السمن والزيوت النباتية وتطوير عملياتنا وبناء علاقات طويلة الأمد مع عملائنا، والمساهمة في الصناعة والاقتصاد الفلسطيني.",
              "We work to provide vegetable ghee and oils, develop our operations, build long-term customer relationships, and contribute to Palestinian industry and the economy.",
            )}
          </p>
        </article>
      </section>
      <section className="quality-section section-pad">
        <div>
          <p className="eyebrow">{pick(lang, "نهج الجودة", "Our quality approach")}</p>
          <h2>{pick(lang, "الجودة في صميم عملنا", "Quality at the heart of our work")}</h2>
          <p>
            {pick(
              lang,
              "نعتمد إدارة الجودة أساسًا لتطوير أعمالنا الفنية والإدارية ومتابعة جودة منتجاتنا، مع استمرار العمل على تحسين العمليات.",
              "We use quality management as a basis for developing our technical and administrative work, monitoring product quality and continuously improving our processes.",
            )}
          </p>
          <PageLink
            href={withLang("/contact?topic=quality", lang)}
            go={go}
            className="button button-primary"
          >
            {pick(
              lang,
              "استفسر عن المواصفات ووثائق الجودة",
              "Ask about specifications and quality documents",
            )}
          </PageLink>
        </div>
        <img src="/assets/3bfa2.png" alt={pick(lang, "مرافق الشركة", "Company facilities")} />
      </section>
    </main>
  );
}

export function ContactPage({ lang, go, search = "" }: PageProps) {
  const params = new URLSearchParams(search);
  const mapQuery = encodeURIComponent(
    "Vegetable Oil Industries Co Eastern Industrial Area Nablus Palestine",
  );
  return (
    <main className="page-shell contact-page section-pad">
      <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].contact }]} />
      <section className="page-intro">
        <p className="eyebrow">
          {pick(lang, "شركة مصانع الزيوت النباتية", "Vegetable Oil Industries Co.")}
        </p>
        <h1>{pick(lang, "خلّينا على تواصل", "Let's stay in touch")}</h1>
        <p>
          {pick(
            lang,
            "عندك سؤال عن منتج أو حاب تناقش احتياجات التوريد؟ تواصل معنا عبر القنوات التالية.",
            "Have a product question or want to discuss supply needs? Contact us through the following channels.",
          )}
        </p>
      </section>
      <div className="contact-layout">
        <section className="contact-details">
          <article>
            <span>{pick(lang, "البريد الإلكتروني", "Email")}</span>
            <a href="mailto:info@voic.ps" dir="ltr" aria-label="info@voic.ps">
              info@voic.ps
            </a>
          </article>
          <article>
            <span>{pick(lang, "الهاتف", "Telephone")}</span>
            <a href="tel:+97092324011" dir="ltr" aria-label="+970 9 2324011">
              +970 9 2324011
            </a>
            <a href="tel:+97092324010" dir="ltr" aria-label="+970 9 2324010">
              +970 9 2324010
            </a>
          </article>
          <article>
            <span>{pick(lang, "العنوان", "Address")}</span>
            <p>
              {pick(
                lang,
                "المنطقة الصناعية الشرقية، نابلس، فلسطين",
                "Eastern Industrial Area, Nablus, Palestine",
              )}
            </p>
            <p>{pick(lang, "صندوق بريد 95", "P.O. Box 95")}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              {pick(lang, "ابحث عن الموقع على الخريطة", "Search for the location on the map")}{" "}
              {arrow(lang)}
            </a>
          </article>
          <article className="secondary-contact">
            <span>{pick(lang, "فاكس", "Fax")}</span>
            <p dir="ltr">+970 9 2325036</p>
          </article>
        </section>
        <section className="contact-form-wrap">
          <h2>{pick(lang, "جهّز رسالة", "Prepare a message")}</h2>
          <InquiryForm
            lang={lang}
            mode="contact"
            initialProductId={params.get("product") || undefined}
            initialTopic={
              params.get("topic") === "quality"
                ? pick(lang, "وثائق الجودة والمواصفات", "Quality and specification documents")
                : ""
            }
          />
        </section>
      </div>
    </main>
  );
}

export function RecipesPage({ lang, go }: PageProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const visible = recipes.filter((recipe) => {
    const text =
      `${recipe.titleAr} ${recipe.titleEn} ${recipe.descriptionAr} ${recipe.descriptionEn}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!category || recipe.category === category);
  });
  return (
    <main className="page-shell recipes-page section-pad">
      <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].recipes }]} />
      <section className="page-intro">
        <p className="eyebrow">{pick(lang, "وصفات من مطبخنا", "Recipes from our kitchen")}</p>
        <h1>{pick(lang, "من مطبخنا", "From Our Kitchen")}</h1>
        <p>
          {pick(
            lang,
            "وصفات تجمعنا حول المائدة، من الحلويات إلى الأطباق اليومية.",
            "Recipes that bring us around the table, from sweets to everyday dishes.",
          )}
        </p>
      </section>
      <div className="recipe-filters">
        <label>
          <span>{pick(lang, "ابحث عن وصفة", "Search recipes")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(lang, "اسم الوصفة...", "Recipe name...")}
          />
        </label>
        <label>
          <span>{pick(lang, "الفئة", "Category")}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{pick(lang, "كل الوصفات", "All recipes")}</option>
            <option value="sweets-baking">
              {pick(lang, "حلويات ومخبوزات", "Sweets & baking")}
            </option>
            <option value="main-dishes">{pick(lang, "أطباق رئيسية", "Main dishes")}</option>
          </select>
        </label>
      </div>
      <div className="recipe-grid">
        {visible.map((recipe) => {
          const linked = recipe.productIds
            .map((id) => products.find((product) => product.id === id))
            .filter(Boolean);
          return (
            <article className="recipe-card" key={recipe.slug}>
              <PageLink href={withLang(`/recipes/${recipe.slug}`, lang)} go={go}>
                <img src={recipe.image} alt={pick(lang, recipe.titleAr, recipe.titleEn)} />
              </PageLink>
              <div>
                <span>
                  {recipe.category === "sweets-baking"
                    ? pick(lang, "حلويات ومخبوزات", "Sweets & baking")
                    : pick(lang, "أطباق رئيسية", "Main dishes")}
                </span>
                <h2>{pick(lang, recipe.titleAr, recipe.titleEn)}</h2>
                <p>{pick(lang, recipe.descriptionAr, recipe.descriptionEn)}</p>
                {linked.length > 0 && (
                  <small>
                    {pick(lang, "يستخدم:", "Uses:")}{" "}
                    {linked.map((p) => productName(p!, lang)).join(" • ")}
                  </small>
                )}
                <PageLink
                  href={withLang(`/recipes/${recipe.slug}`, lang)}
                  go={go}
                  className="text-link"
                >
                  {pick(lang, "شوف الوصفة", "View recipe")} {arrow(lang)}
                </PageLink>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="catalog-empty">
          <h2>{pick(lang, "ما لقينا وصفات بتطابق بحثك", "No recipes match your search")}</h2>
          <button
            className="button button-primary"
            onClick={() => {
              setQuery("");
              setCategory("");
            }}
          >
            {pick(lang, "مسح البحث", "Clear search")}
          </button>
        </div>
      )}
    </main>
  );
}

function formatAmount(value: number, lang: Lang) {
  const rounded = Math.round(value * 100) / 100;
  const fractions: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾", "1.5": "1½" };
  return (
    fractions[String(rounded)] ||
    new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(rounded)
  );
}

export function RecipeDetailPage({ recipe, lang, go }: PageProps & { recipe: Recipe }) {
  const [multiplier, setMultiplier] = useState(1);
  const related = recipes
    .filter((item) => item.slug !== recipe.slug && item.category === recipe.category)
    .slice(0, 3);
  const linkedProducts = recipe.productIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean) as Product[];
  return (
    <main className="page-shell recipe-detail-page">
      <div className="section-pad">
        <Breadcrumb
          lang={lang}
          go={go}
          items={[
            { label: ui[lang].recipes, href: "/recipes" },
            { label: pick(lang, recipe.titleAr, recipe.titleEn) },
          ]}
        />
      </div>
      <section className="recipe-hero">
        <img src={recipe.image} alt={pick(lang, recipe.titleAr, recipe.titleEn)} />
        <div>
          <p className="eyebrow">
            {recipe.category === "sweets-baking"
              ? pick(lang, "حلويات ومخبوزات", "Sweets & baking")
              : pick(lang, "أطباق رئيسية", "Main dishes")}
          </p>
          <h1>{pick(lang, recipe.titleAr, recipe.titleEn)}</h1>
          <p>{pick(lang, recipe.descriptionAr, recipe.descriptionEn)}</p>
          {(recipe.knownTimeAr || recipe.knownTimeEn) && (
            <span>{pick(lang, recipe.knownTimeAr || "", recipe.knownTimeEn || "")}</span>
          )}
        </div>
      </section>
      <div className="recipe-body section-pad">
        <section className="ingredients-panel">
          <div className="recipe-section-title">
            <h2>{pick(lang, "المكونات", "Ingredients")}</h2>
            <button className="text-link print-button" onClick={() => window.print()}>
              {pick(lang, "اطبع الوصفة", "Print recipe")}
            </button>
          </div>
          <fieldset className="quantity-switch">
            <legend>{pick(lang, "كمية الوصفة", "Recipe quantity")}</legend>
            {[
              [0.5, "نصف الكمية", "Half"],
              [1, "الكمية الأساسية", "Original"],
              [2, "ضعف الكمية", "Double"],
            ].map(([value, ar, en]) => (
              <button
                key={value}
                className={multiplier === value ? "is-selected" : ""}
                onClick={() => setMultiplier(value as number)}
                type="button"
              >
                {pick(lang, ar as string, en as string)}
              </button>
            ))}
          </fieldset>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={`${ingredient.nameAr}-${index}`}>
                <label>
                  <input type="checkbox" />
                  <span>
                    {ingredient.amount !== undefined && (
                      <b>
                        {formatAmount(ingredient.amount * multiplier, lang)}{" "}
                        {pick(lang, ingredient.unitAr || "", ingredient.unitEn || "")}{" "}
                      </b>
                    )}
                    {pick(lang, ingredient.nameAr, ingredient.nameEn)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className="method-panel">
          <h2>{pick(lang, "طريقة التحضير", "Method")}</h2>
          <ol>
            {(lang === "ar"
              ? recipe.stepsAr
              : lang === "de"
                ? recipe.stepsEn.map((step) => pick(lang, "", step))
                : recipe.stepsEn
            ).map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {linkedProducts.length > 0 ? (
        <section className="section-pad recipe-products">
          <div className="page-section-heading">
            <h2>{pick(lang, "منتجات مستخدمة في الوصفة", "Products used in this recipe")}</h2>
          </div>
          <div className="three-grid">
            {linkedProducts.map((product) => (
              <ProductMiniCard key={product.id} product={product} lang={lang} go={go} />
            ))}
          </div>
        </section>
      ) : (
        <section className="section-pad generic-catalog-cta">
          <p>
            {pick(
              lang,
              "اكتشف مجموعة السمن والزيوت النباتية.",
              "Explore our vegetable ghee and oil range.",
            )}
          </p>
          <PageLink href={withLang("/products", lang)} go={go} className="button button-secondary">
            {ui[lang].products}
          </PageLink>
        </section>
      )}
      {related.length > 0 && (
        <section className="section-pad related-section">
          <div className="page-section-heading">
            <h2>{pick(lang, "وصفات قريبة", "Related recipes")}</h2>
          </div>
          <div className="related-recipe-grid">
            {related.map((item) => (
              <PageLink
                key={item.slug}
                href={withLang(`/recipes/${item.slug}`, lang)}
                go={go}
                className="related-recipe"
              >
                <img src={item.image} alt="" loading="lazy" />
                <strong>{pick(lang, item.titleAr, item.titleEn)}</strong>
              </PageLink>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export function NotFoundPage({ lang, go }: PageProps) {
  return (
    <main className="page-shell not-found-page section-pad">
      <div>
        <span>404</span>
        <h1>{pick(lang, "الصفحة مش موجودة", "Page not found")}</h1>
        <p>
          {pick(
            lang,
            "الرابط اللي فتحته غير متوفر. ارجع للرئيسية أو تصفّح منتجاتنا.",
            "The page you opened is unavailable. Return home or browse our products.",
          )}
        </p>
        <div>
          <PageLink href={withLang("/", lang)} go={go} className="button button-primary">
            {ui[lang].home}
          </PageLink>
          <PageLink href={withLang("/products", lang)} go={go} className="button button-secondary">
            {ui[lang].products}
          </PageLink>
        </div>
      </div>
    </main>
  );
}
