import { usePublishedPage, useRecipes, useRecipe } from "./hooks/content/queries";
import ContentStatus from "./components/ContentStatus";
import { sizeLabel, packageLabel, productUseLabel } from "./utils/productLabels";
import { useEffect, useState } from "react";
import { type Product, type UseKey } from "./catalog";
import {
  categoryLabel,
  arrow,
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
import RemoteQuickView from "./components/RemoteQuickView";
import CatalogStatus, { ProductTranslation } from "./components/CatalogStatus";
import {
  useProduct,
  useRelatedProducts,
  useAllProducts,
  useProductLookup,
  useProductFilters,
  useSelectedProducts,
  visibleData,
} from "./hooks/products/queries";
import type { Recipe } from "./recipes";

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
    <img crossOrigin="anonymous" src={product.image} alt={productName(product, lang)} />
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
    <ProductTranslation product={product} lang={lang}>
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
            {product.sizes.map((size) => sizeLabel(product, size, lang)).join(" • ")}
          </strong>
        )}
        <div className="mini-card-actions">
          {onQuick && (
            <button className="button button-secondary" onClick={onQuick}>
              {ui[lang].details}
            </button>
          )}
          <PageLink
            href={withLang(`/products/${product.slug}`, lang)}
            go={go}
            className="text-link"
          >
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
    </ProductTranslation>
  );
}

export function ProductDetailPage({ product, lang, go }: PageProps & { product: Product }) {
  const relatedQuery = useRelatedProducts(product.id, lang);
  const related = relatedQuery.data?.items ?? [];
  const recipeQuery = useRecipes({ lang, productId: product.id, pageSize: 3 });
  const relatedRecipes = recipeQuery.isError ? [] : recipeQuery.data?.items || [];
  const sharedQuery = usePublishedPage("shared", lang);
  return (
    <main id="main-content" className="page-shell product-page section-pad">
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
                  <li key={use}>{productUseLabel(product, use, lang)}</li>
                ))}
              </ul>
            </div>
          )}
          {(product.packaging?.length || product.sizes.length > 0) && (
            <div className="detail-block">
              <h2>{pick(lang, "الأحجام وخيارات التعبئة", "Sizes and packaging")}</h2>
              <p>
                {(product.packaging || product.sizes)
                  .map((value) => packageLabel(product, value, lang))
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
            <a
              className="text-link"
              href={
                sharedQuery.data && !sharedQuery.isError
                  ? productInquiryHref(product, lang, sharedQuery.data.links.email)
                  : undefined
              }
            >
              {pick(lang, "تواصل بالبريد بدلًا من ذلك", "Contact by email instead")}
            </a>
          </div>
        </div>
      </section>
      <ContentStatus query={recipeQuery} lang={lang} />
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
                <img crossOrigin="anonymous" src={recipe.image} alt="" loading="lazy" />
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
        <CatalogStatus
          query={relatedQuery}
          lang={lang}
          empty={relatedQuery.data?.items.length === 0}
        />
        <div className="three-grid">
          {related.map((item) => (
            <ProductMiniCard key={item.id} product={item} lang={lang} go={go} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function ProductRoutePage({ id, lang, go, search }: PageProps & { id: string }) {
  const query = useProduct(id, lang),
    product = visibleData(query);
  useEffect(() => {
    if (product) document.title = `${productName(product, lang) || ui[lang].products} | VOIC`;
    else if (query.isError)
      document.title = `${pick(lang, "المنتج غير متاح", "Product unavailable")} | VOIC`;
  }, [product, lang, query.isError]);
  if (product?.translationAvailable !== false && product)
    return (
      <>
        <CatalogStatus query={query} lang={lang} />
        <ProductDetailPage product={product} lang={lang} go={go} search={search} />
      </>
    );
  return (
    <main className="page-shell section-pad">
      <h1>{ui[lang].products}</h1>
      <CatalogStatus query={query} lang={lang} />
      {product && (
        <ProductTranslation product={product} lang={lang}>
          {null}
        </ProductTranslation>
      )}
      <PageLink href={withLang("/products", lang)} go={go}>
        {ui[lang].products}
      </PageLink>
    </main>
  );
}

const chooserUses: UseKey[] = ["cooking", "frying", "oriental-sweets", "baking", "food-industry"];

export function ChooserPage({ lang, go }: PageProps) {
  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState<"home" | "business" | "">("");
  const [use, setUse] = useState<UseKey | "">("");
  const [size, setSize] = useState("");
  const [quick, setQuick] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [inquirySelected, setInquirySelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const chooserQuery = useAllProducts({ locale: lang, use: use ? [use] : undefined });
  const filtersQuery = useProductFilters(lang);
  const selectionQueries = useSelectedProducts(
    [...new Set([...selected, ...inquirySelected])],
    lang,
  );
  const useMatches = use ? (chooserQuery.data ?? []) : [];
  const chooserUseLabel = (key: UseKey) =>
    filtersQuery.data?.recommendationUses.find((c) => c.value === key)?.label ??
    useLabel(key, lang);
  const chooserSizeLabel = (value: string) =>
    useMatches.find((p) => p.sizes.includes(value))?.sizeLabels?.[value] ?? formatSize(value, lang);
  const availableSizes = [...new Set(useMatches.flatMap((product) => product.sizes))].sort(
    (a, b) => Number.parseFloat(a) - Number.parseFloat(b),
  );
  const results =
    step === 4
      ? useMatches.filter((product) => !size || size === "none" || product.sizes.includes(size))
      : [];
  const chooseUse = (value: UseKey) => {
    setUse(value);
  };
  useEffect(() => {
    if (
      chooserQuery.data &&
      size &&
      size !== "none" &&
      !chooserQuery.data.some((p) => p.sizes.includes(size))
    )
      setSize("");
  }, [chooserQuery.data, size]);
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
      <CatalogStatus query={chooserQuery} lang={lang} />
      <CatalogStatus query={filtersQuery} lang={lang} />
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
                {chooserUses
                  .filter((key) =>
                    filtersQuery.data?.recommendationUses.some((c) => c.value === key),
                  )
                  .map((item) => (
                    <button
                      key={item}
                      className={`choice-button ${use === item ? "is-selected" : ""}`}
                      aria-pressed={use === item}
                      onClick={() => chooseUse(item)}
                    >
                      <strong>{chooserUseLabel(item)}</strong>
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
                      <strong>{chooserSizeLabel(item)}</strong>
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
      {step === 4 && chooserQuery.data && (
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
                  onQuick={() => setQuick(product.id)}
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
                    `مناسب لـ${chooserUseLabel(use as UseKey)}${size !== "none" ? `، وبحجم ${size} الذي اخترته` : ""}.`,
                    `Matches your ${chooserUseLabel(use as UseKey).toLowerCase()} use${size !== "none" ? ` and selected ${chooserSizeLabel(size)} size` : ""}.`,
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
      {[...new Set([...selected, ...inquirySelected])].map((id, index) => (
        <div key={id}>
          <CatalogStatus query={selectionQueries[index]} lang={lang} />
          <button
            className="text-link"
            onClick={() => {
              setSelected((v) => v.filter((x) => x !== id));
              setInquirySelected((v) => v.filter((x) => x !== id));
            }}
          >
            {pick(lang, "إزالة", "Remove")}{" "}
            {visibleData(selectionQueries[index])
              ? productName(visibleData(selectionQueries[index])!, lang) || id
              : id}
          </button>
        </div>
      ))}
      {quick && <RemoteQuickView id={quick} lang={lang} onClose={() => setQuick(null)} go={go} />}
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
  const professionalQuery = useProductLookup(professionalIds, lang);
  const contentQuery = usePublishedPage("business", lang),
    content = contentQuery.data;
  if (!content || contentQuery.isError) return <ContentStatus query={contentQuery} lang={lang} />;
  return (
    <main className="page-shell business-page">
      <section className="business-page-hero section-pad">
        <div>
          <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].business }]} />
          <p className="eyebrow">{content.texts["text-39"][lang]}</p>
          <h1>{content.texts["text-40"][lang]}</h1>
          <p className="lead">{content.texts["text-41"][lang]}</p>
          <PageLink className="button button-light" href={withLang("/inquiries/new", lang)} go={go}>
            {pick(lang, "ابدأ استفسارك", "Start an inquiry")}
          </PageLink>
        </div>
        <img
          crossOrigin="anonymous"
          src={content.images.hero}
          alt={content.texts["text-43"][lang]}
        />
      </section>
      <section className="section-pad audience-section">
        <div className="page-section-heading">
          <h2>{content.texts["text-44"][lang]}</h2>
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
          <p className="eyebrow">{content.texts["text-45"][lang]}</p>
          <h2>{content.texts["text-46"][lang]}</h2>
        </div>
        <div className="professional-list">
          <CatalogStatus
            query={professionalQuery}
            lang={lang}
            empty={professionalQuery.data?.items.length === 0}
          />
          {professionalQuery.data?.items.map((product) => {
            const id = product.id;
            return (
              <ProductTranslation key={id} product={product} lang={lang}>
                <PageLink
                  href={withLang(`/products/${product.slug}`, lang)}
                  go={go}
                  className="professional-row"
                >
                  <ProductImage product={product} lang={lang} />
                  <div>
                    <strong>{productName(product, lang)}</strong>
                    <span>
                      {(product.packaging || product.sizes)
                        .map((value) => packageLabel(product, value, lang))
                        .join(" • ")}
                    </span>
                  </div>
                  <b>{arrow(lang)}</b>
                </PageLink>
              </ProductTranslation>
            );
          })}
        </div>
      </section>
      <section className="section-pad inquiry-section" id="business-inquiry">
        <div className="page-section-heading">
          <p className="eyebrow">{content.texts["text-47"][lang]}</p>
          <h2>{content.texts["text-48"][lang]}</h2>
          <p>{content.texts["text-49"][lang]}</p>
        </div>
        <InquiryForm lang={lang} mode="business" initialProductIds={initialProductIds} />
        <div className="business-inquiry-path">
          <strong>{content.texts["text-50"][lang]}</strong>
          <p>{content.texts["text-51"][lang]}</p>
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
          <h2>{content.texts["text-53"][lang]}</h2>
        </div>
        <div className="faq-list">
          {content.rows.map(([qAr, qEn, aAr, aEn]) => (
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
  const contentQuery = usePublishedPage("about", lang),
    content = contentQuery.data;
  if (!content || contentQuery.isError) return <ContentStatus query={contentQuery} lang={lang} />;
  const milestones = content.rows;
  return (
    <main className="page-shell about-page">
      <section className="about-hero section-pad">
        <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].about }]} />
        <div className="about-hero-grid">
          <div>
            <p className="eyebrow">{content.texts["text-54"][lang]}</p>
            <h1>{content.texts["text-55"][lang]}</h1>
            <p className="lead">{content.texts["text-56"][lang]}</p>
          </div>
          <img
            crossOrigin="anonymous"
            src={content.images.factory}
            alt={content.texts["text-57"][lang]}
          />
        </div>
      </section>
      <section className="section-pad timeline-section">
        <div className="page-section-heading">
          <h2>{content.texts["text-58"][lang]}</h2>
        </div>
        <div className="timeline">
          {milestones.map(([year, ar, en, image]) => (
            <article key={year} className="timeline-item">
              <img crossOrigin="anonymous" src={image} alt="" loading="lazy" />
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
          <p className="eyebrow">{content.texts["text-59"][lang]}</p>
          <h2>{content.texts["text-60"][lang]}</h2>
        </article>
        <article>
          <p className="eyebrow">{content.texts["text-61"][lang]}</p>
          <p>{content.texts["text-62"][lang]}</p>
        </article>
      </section>
      <section className="quality-section section-pad">
        <div>
          <p className="eyebrow">{content.texts["text-63"][lang]}</p>
          <h2>{content.texts["text-64"][lang]}</h2>
          <p>{content.texts["text-65"][lang]}</p>
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
        <img
          crossOrigin="anonymous"
          src={content.images.quality}
          alt={content.texts["text-67"][lang]}
        />
      </section>
    </main>
  );
}

export function ContactPage({ lang, go, search = "" }: PageProps) {
  const params = new URLSearchParams(search);
  const mapQuery = encodeURIComponent(
    "Vegetable Oil Industries Co Eastern Industrial Area Nablus Palestine",
  );
  const contentQuery = usePublishedPage("contact", lang),
    content = contentQuery.data;
  const sharedQuery = usePublishedPage("shared", lang),
    shared = sharedQuery.data;
  if (!shared || sharedQuery.isError) return <ContentStatus query={sharedQuery} lang={lang} />;
  if (!content || contentQuery.isError) return <ContentStatus query={contentQuery} lang={lang} />;
  return (
    <main className="page-shell contact-page section-pad">
      <Breadcrumb lang={lang} go={go} items={[{ label: ui[lang].contact }]} />
      <section className="page-intro">
        <p className="eyebrow">{content.texts["text-68"][lang]}</p>
        <h1>{content.texts["text-69"][lang]}</h1>
        <p>{content.texts["text-70"][lang]}</p>
      </section>
      <div className="contact-layout">
        <section className="contact-details">
          <article>
            <span>{pick(lang, "البريد الإلكتروني", "Email")}</span>
            <a href={`mailto:${shared.links.email}`} dir="ltr" aria-label={shared.links.email}>
              {shared.links.email}
            </a>
          </article>
          <article>
            <span>{pick(lang, "الهاتف", "Telephone")}</span>
            <a
              href={`tel:${shared.links["phone"].replace(/ /g, "")}`}
              dir="ltr"
              aria-label={shared.links["phone"]}
            >
              {shared.links["phone"]}
            </a>
            <a
              href={`tel:${shared.links["phone-secondary"].replace(/ /g, "")}`}
              dir="ltr"
              aria-label={shared.links["phone-secondary"]}
            >
              {shared.links["phone-secondary"]}
            </a>
          </article>
          <article>
            <span>{pick(lang, "العنوان", "Address")}</span>
            <p>{shared.texts.address[lang]}</p>
            <p>{content.texts["text-75"][lang]}</p>
            <a href={content.links.map} target="_blank" rel="noreferrer" className="text-link">
              {pick(lang, "ابحث عن الموقع على الخريطة", "Search for the location on the map")}{" "}
              {arrow(lang)}
            </a>
          </article>
          <article className="secondary-contact">
            <span>{pick(lang, "فاكس", "Fax")}</span>
            <p dir="ltr">{shared.links.fax}</p>
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
  const [page, setPage] = useState(1);
  const recipesQuery = useRecipes({ lang, q: query, category, page, pageSize: 12 });
  const visible = recipesQuery.isError ? [] : recipesQuery.data?.items || [];
  const linkedQuery = useProductLookup([...new Set(visible.flatMap((r) => r.productIds))], lang);
  const products = linkedQuery.data?.items ?? [];
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
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={pick(lang, "اسم الوصفة...", "Recipe name...")}
          />
        </label>
        <label>
          <span>{pick(lang, "الفئة", "Category")}</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{pick(lang, "كل الوصفات", "All recipes")}</option>
            <option value="sweets-baking">
              {pick(lang, "حلويات ومخبوزات", "Sweets & baking")}
            </option>
            <option value="main-dishes">{pick(lang, "أطباق رئيسية", "Main dishes")}</option>
          </select>
        </label>
      </div>
      <ContentStatus query={recipesQuery} lang={lang} />
      <CatalogStatus query={linkedQuery} lang={lang} />
      <div className="recipe-grid">
        {visible.map((recipe) => {
          const linked = recipe.productIds
            .map((id) => products.find((product) => product.id === id))
            .filter(Boolean);
          return (
            <article className="recipe-card" key={recipe.slug}>
              <PageLink href={withLang(`/recipes/${recipe.slug}`, lang)} go={go}>
                <img
                  crossOrigin="anonymous"
                  src={recipe.image}
                  alt={pick(lang, recipe.titleAr, recipe.titleEn)}
                />
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
      {recipesQuery.data && !recipesQuery.isError && !visible.length && (
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
      {recipesQuery.data && recipesQuery.data.totalPages > 1 && (
        <nav className="page-actions">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {pick(lang, "السابق", "Previous")}
          </button>
          <bdi>
            {page} / {recipesQuery.data.totalPages}
          </bdi>
          <button disabled={page >= recipesQuery.data.totalPages} onClick={() => setPage(page + 1)}>
            {pick(lang, "التالي", "Next")}
          </button>
        </nav>
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
  const relatedQuery = useRecipes({ lang, category: recipe.category, pageSize: 4 });
  const related = (relatedQuery.isError ? [] : relatedQuery.data?.items || [])
    .filter((item) => item.slug !== recipe.slug)
    .slice(0, 3);
  const linkedQuery = useProductLookup(recipe.productIds, lang);
  const linkedProducts = linkedQuery.data?.items ?? [];
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
        <img
          crossOrigin="anonymous"
          src={recipe.image}
          alt={pick(lang, recipe.titleAr, recipe.titleEn)}
        />
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
            {(lang === "ar" ? recipe.stepsAr : recipe.stepsEn).map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <CatalogStatus query={linkedQuery} lang={lang} empty={linkedQuery.data?.items.length === 0} />
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
      <ContentStatus query={relatedQuery} lang={lang} />
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
                <img crossOrigin="anonymous" src={item.image} alt="" loading="lazy" />
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

export function RecipeRoutePage({ id, lang, go }: PageProps & { id: string }) {
  const q = useRecipe(id, lang);
  if (!q.data || q.isError)
    return (
      <main>
        <ContentStatus query={q} lang={lang} />
      </main>
    );
  return <RecipeDetailPage key={q.data.slug} recipe={q.data} lang={lang} go={go} />;
}
