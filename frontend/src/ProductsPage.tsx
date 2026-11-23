import { sizeLabel, packageLabel, productUseLabel } from "./utils/productLabels";
import { useEffect, useState } from "react";
import type { Product } from "./catalog";
import type { FilterKey } from "./services/products";
import {
  useProducts,
  useProductFilters,
  useProductLookup,
  useSelectedProducts,
  visibleData,
} from "./hooks/products/queries";
import { scopeFromSearch, uniqueProductIds } from "./utils/productScope";
import CatalogStatus, { ProductTranslation } from "./components/CatalogStatus";
import RemoteQuickView from "./components/RemoteQuickView";
import {
  categoryLabel,
  pick,
  productDescription,
  productName,
  secondaryProductName,
  ui,
  withLang,
  type Lang,
} from "./i18n";
import Modal from "./Modal";

export default function ProductsPage({
  search,
  updateSearch,
  goHome,
  lang,
  go,
}: {
  search: string;
  updateSearch: (params: URLSearchParams) => void;
  goHome: () => void;
  lang: Lang;
  go: (href: string) => void;
}) {
  const params = new URLSearchParams(search);
  const listQuery = useProducts(scopeFromSearch(search, lang));
  const filtersQuery = useProductFilters(lang);
  const results = listQuery.data?.items ?? [];
  const filterGroups = (filtersQuery.data?.groups ?? []).map((group) => ({
    ...group,
    title: group.key,
    choices: group.choices.map((choice) => choice.value),
    sections:
      group.key === "size"
        ? [
            {
              title: "الوزن",
              choices: group.choices.filter((c) => !c.value.endsWith("-L")).map((c) => c.value),
            },
            {
              title: "الحجم",
              choices: group.choices.filter((c) => c.value.endsWith("-L")).map((c) => c.value),
            },
          ].filter((section) => section.choices.length)
        : undefined,
  }));
  const [initialCompared] = useState(() => uniqueProductIds(params.getAll("compare")));
  const initialLookup = useProductLookup(initialCompared, lang);
  const [initialized, setInitialized] = useState(!initialCompared.length);
  const [selected, setSelected] = useState<string[]>([]);
  const [inquirySelected, setInquirySelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [notice, setNotice] = useState("");
  const selectedQueries = useSelectedProducts(selected, lang);
  const inquiryQueries = useSelectedProducts(inquirySelected, lang);
  const compared = selectedQueries.flatMap((query) => {
    const p = visibleData(query);
    return p && p.translationAvailable !== false ? [p] : [];
  });
  const detail = params.get("product");
  useEffect(() => {
    if (initialized || !initialLookup.data) return;
    const ids = initialLookup.data.items.map((p) => p.id).slice(0, 3);
    setSelected(ids);
    setComparing(ids.length >= 2);
    setInitialized(true);
    if (initialLookup.data.unavailableIds.length || initialLookup.data.items.length > 3)
      setNotice(
        pick(
          lang,
          "بعض معرّفات المقارنة غير متاحة أو تتجاوز حد ثلاثة منتجات.",
          "Some comparison IDs are unavailable or exceed the three-product limit.",
        ),
      );
  }, [initialized, initialLookup.data, lang]);
  const chips = (["category", "brand", "usage", "size"] as FilterKey[]).flatMap((key) =>
    params.getAll(key).map((value) => ({ key, value })),
  );
  const hasFilters = chips.length > 0 || !!params.get("q");
  const t = ui[lang];

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page" && key !== "product") next.delete("page");
    updateSearch(next);
  }
  function toggleFilter(key: FilterKey, value: string) {
    const next = new URLSearchParams(search);
    const choice = filtersQuery.data?.groups
      .find((g) => g.key === key)
      ?.choices.find((c) => c.value === value);
    const values = next.getAll(key).map((v) => (choice?.legacyValues.includes(v) ? value : v));
    next.delete(key);
    (values.includes(value) ? values.filter((item) => item !== value) : [...values, value]).forEach(
      (item) => next.append(key, item),
    );
    next.delete("page");
    updateSearch(next);
  }
  function clearFilters() {
    const next = new URLSearchParams(search);
    ["q", "category", "brand", "usage", "size"].forEach((key) => next.delete(key));
    next.delete("page");
    updateSearch(next);
  }
  function toggleSelection(product: Product) {
    setInitialized(true);
    if (selected.includes(product.id)) {
      setSelected(selected.filter((id) => id !== product.id));
      setNotice("");
    } else if (selected.length === 3) {
      setNotice(
        pick(
          lang,
          "يمكنك مقارنة 3 منتجات كحد أقصى. أزل منتجًا من المقارنة لإضافة منتج آخر.",
          "You can compare up to three products. Remove one before adding another.",
        ),
      );
    } else {
      setSelected([...selected, product.id]);
      setNotice("");
    }
  }
  function toggleInquiry(product: Product) {
    setInquirySelected((current) =>
      current.includes(product.id)
        ? current.filter((id) => id !== product.id)
        : [...current, product.id],
    );
  }
  const groupTitle = (key: FilterKey, _fallback: string) =>
    ({
      category: pick(lang, "الفئة", "Category"),
      brand: pick(lang, "العلامة التجارية", "Brand"),
      usage: pick(lang, "الاستخدام", "Use"),
      size: pick(lang, "حجم العبوة", "Pack size"),
    })[key];
  const choiceLabel = (key: FilterKey, value: string) =>
    filtersQuery.data?.groups
      .find((g) => g.key === key)
      ?.choices.find((c) => c.value === value || c.legacyValues.includes(value))?.label || value;
  const filterChecked = (key: FilterKey, choice: string) => {
    const c = filtersQuery.data?.groups
      .find((g) => g.key === key)
      ?.choices.find((c) => c.value === choice);
    return params.getAll(key).some((v) => v === choice || c?.legacyValues.includes(v));
  };

  return (
    <main className={`catalog-page section-pad ${selected.length ? "has-comparison" : ""}`}>
      <nav className="breadcrumb" aria-label={pick(lang, "مسار التنقل", "Breadcrumb")}>
        <button onClick={goHome}>{t.home}</button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t.products}</span>
      </nav>
      <section className="catalog-intro" aria-labelledby="catalog-title">
        <p className="eyebrow">
          {pick(lang, "من مصانع نابلس… إلى مطبخك.", "From our Nablus factory to your kitchen.")}
        </p>
        <h1 id="catalog-title">
          {pick(lang, "منتج مناسب لكل وصفة", "A product for every recipe")}
        </h1>
        <p>
          {pick(
            lang,
            "اكتشف منتجاتنا واختار الأنسب لاستخدامك.",
            "Explore our products and choose what suits your use.",
          )}
        </p>
        <div className="collection-note">
          <strong>{pick(lang, "سمن وزيوت نباتية", "Vegetable ghee and oils")}</strong>
          <span>
            {pick(
              lang,
              "تصفّح المنتجات والأحجام المعروضة، وتواصل معنا للاستفسارات التجارية.",
              "Browse products and pack sizes, then contact us for commercial inquiries.",
            )}
          </span>
        </div>
      </section>
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <label htmlFor="product-search">{pick(lang, "ابحث عن منتج", "Search products")}</label>
          <input
            id="product-search"
            type="search"
            placeholder={pick(lang, "ابحث عن منتج...", "Search products...")}
            value={params.get("q") || ""}
            onChange={(event) => setParam("q", event.target.value)}
          />
        </div>
        <div className="catalog-sort">
          <label htmlFor="product-sort">{pick(lang, "ترتيب المنتجات", "Sort products")}</label>
          <select
            id="product-sort"
            value={params.get("sort") === "desc" ? "desc" : "asc"}
            onChange={(event) => setParam("sort", event.target.value)}
          >
            <option value="asc">{pick(lang, "أبجديًا: أ — ي", "Alphabetical: A–Z")}</option>
            <option value="desc">{pick(lang, "أبجديًا: ي — أ", "Alphabetical: Z–A")}</option>
          </select>
        </div>
      </div>
      <div className="catalog-results-heading">
        <p role="status" aria-live="polite">
          {pick(
            lang,
            `${listQuery.data?.total ?? "—"} من ${listQuery.data?.totalPublished ?? "—"} منتجات`,
            `${listQuery.data?.total ?? "—"} of ${listQuery.data?.totalPublished ?? "—"} products`,
          )}
        </p>
        <button className="text-link" onClick={clearFilters} disabled={!hasFilters}>
          {pick(lang, "مسح الفلاتر", "Clear filters")}
        </button>
      </div>
      {!initialized && <CatalogStatus query={initialLookup} lang={lang} />}
      {notice && !selected.length && <p role="alert">{notice}</p>}
      {hasFilters && (
        <div className="filter-chips" aria-label={pick(lang, "الفلاتر النشطة", "Active filters")}>
          {params.get("q") && (
            <button onClick={() => setParam("q", "")}>
              {pick(lang, "البحث:", "Search:")} {params.get("q")} <span aria-hidden="true">×</span>
            </button>
          )}
          {chips.map(({ key, value }) => (
            <button key={`${key}-${value}`} onClick={() => toggleFilter(key, value)}>
              {choiceLabel(key, value)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <div className="catalog-layout">
        <aside
          className="catalog-sidebar"
          aria-label={pick(lang, "تصفية المنتجات", "Filter products")}
        >
          <h2>{pick(lang, "اختار الأنسب إلك", "Choose what suits you")}</h2>
          <CatalogStatus query={filtersQuery} lang={lang} />
          {filterGroups.map(({ key, title, choices, sections }) => (
            <fieldset key={key}>
              <legend>{groupTitle(key, title)}</legend>
              {(sections || [{ title: "", choices }]).map((section) => (
                <div className="filter-choice-group" key={section.title || key}>
                  {section.title && (
                    <p className="filter-subheading">
                      {pick(lang, section.title, section.title === "الوزن" ? "Weight" : "Volume")}
                    </p>
                  )}
                  {section.choices.map((choice) => (
                    <label className="check-option" key={choice}>
                      <input
                        type="checkbox"
                        checked={filterChecked(key, choice)}
                        onChange={() => toggleFilter(key, choice)}
                      />
                      <span>{choiceLabel(key, choice)}</span>
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
          ))}
        </aside>
        <section className="catalog-results" aria-label={t.products}>
          <CatalogStatus query={listQuery} lang={lang} />
          {listQuery.data &&
            !listQuery.data.invalidPage &&
            (results.length ? (
              <div className="product-grid catalog-grid">
                {results.map((product) => (
                  <ProductTranslation key={product.id} product={product} lang={lang}>
                    <article className="product-card catalog-card">
                      {product.image ? (
                        <img src={product.image} alt={productName(product, lang)} loading="lazy" />
                      ) : (
                        <div
                          className="missing-product-image"
                          role="img"
                          aria-label={pick(
                            lang,
                            "لا تتوفر صورة أصلية",
                            "Original image unavailable",
                          )}
                        >
                          <span>
                            {pick(lang, "الصورة الأصلية غير متوفّرة", "Original image unavailable")}
                          </span>
                        </div>
                      )}
                      <h3>{productName(product, lang)}</h3>
                      <span className="product-english-name" dir={lang === "ar" ? "ltr" : "rtl"}>
                        {secondaryProductName(product, lang)}
                      </span>
                      <span className="product-type">{categoryLabel(product, lang)}</span>
                      <p>{productDescription(product, lang)}</p>
                      {product.sizes.length > 0 && (
                        <strong className="sizes">
                          {product.sizes.map((size) => sizeLabel(product, size, lang)).join(" • ")}
                        </strong>
                      )}
                      <button
                        className="button button-secondary"
                        aria-label={`${t.details}: ${productName(product, lang)}`}
                        onClick={() => setParam("product", product.id)}
                      >
                        {t.details}
                      </button>
                      <button
                        className={`inquiry-select-button ${inquirySelected.includes(product.id) ? "is-selected" : ""}`}
                        aria-pressed={inquirySelected.includes(product.id)}
                        onClick={() => toggleInquiry(product)}
                      >
                        {inquirySelected.includes(product.id)
                          ? pick(lang, "تمت الإضافة للاستفسار", "Added to inquiry")
                          : pick(lang, "أضف لاستفسار توريد", "Add to inquiry")}
                      </button>
                      <label className="check-option compare-option">
                        <input
                          type="checkbox"
                          checked={selected.includes(product.id)}
                          onChange={() => toggleSelection(product)}
                        />
                        <span>{t.compare}</span>
                      </label>
                    </article>
                  </ProductTranslation>
                ))}
              </div>
            ) : (
              <div className="catalog-empty">
                <h2>
                  {listQuery.data.totalPublished === 0
                    ? pick(lang, "لا توجد منتجات منشورة حاليًا", "No published products yet")
                    : pick(lang, "ما لقينا منتجات بتطابق بحثك", "No products match your search")}
                </h2>
                <p>
                  {pick(
                    lang,
                    "جرّب تغيّر كلمة البحث أو اختيارات الفلاتر.",
                    "Try changing the search term or filters.",
                  )}
                </p>
                <button className="button button-primary" onClick={clearFilters}>
                  {pick(lang, "مسح الفلاتر", "Clear filters")}
                </button>
              </div>
            ))}
          {listQuery.data?.invalidPage && (
            <p role="alert">
              {pick(
                lang,
                "هذا الجزء غير صالح. ارجع لأول نتيجة.",
                "This page is no longer valid. Return to the first page.",
              )}{" "}
              <button onClick={() => setParam("page", "1")}>
                {pick(lang, "أول جزء", "First page")}
              </button>
            </p>
          )}
          {listQuery.data && listQuery.data.totalPages > 1 && (
            <nav
              className="catalog-pagination"
              aria-label={pick(lang, "أجزاء النتائج", "Result pages")}
            >
              <button
                className="button button-secondary"
                disabled={listQuery.data.page <= 1}
                onClick={() => setParam("page", String(listQuery.data!.page - 1))}
              >
                {ui[lang].back}
              </button>
              <span role="status">
                {listQuery.data.page} / {listQuery.data.totalPages}
              </span>
              <button
                className="button button-secondary"
                disabled={!listQuery.data.nextPage}
                onClick={() => setParam("page", String(listQuery.data!.nextPage))}
              >
                {ui[lang].next}
              </button>
            </nav>
          )}
        </section>
      </div>
      {selected.length > 0 && (
        <section
          className="comparison-bar"
          aria-label={pick(lang, "المنتجات المحددة للمقارنة", "Products selected for comparison")}
        >
          <div className="comparison-selected">
            <strong>
              {pick(lang, `للمقارنة (${selected.length}/3)`, `Compare (${selected.length}/3)`)}
            </strong>
            {selected.map((id, index) => (
              <div key={id}>
                <button onClick={() => setSelected((ids) => ids.filter((value) => value !== id))}>
                  {visibleData(selectedQueries[index])
                    ? productName(visibleData(selectedQueries[index])!, lang) || id
                    : id}{" "}
                  <span aria-hidden="true">×</span>
                </button>
                <CatalogStatus query={selectedQueries[index]} lang={lang} />
                {visibleData(selectedQueries[index])?.translationAvailable === false && (
                  <ProductTranslation product={visibleData(selectedQueries[index])!} lang={lang}>
                    {null}
                  </ProductTranslation>
                )}
              </div>
            ))}
          </div>
          <div className="comparison-actions">
            <button
              className="text-link"
              onClick={() => {
                setSelected([]);
                setNotice("");
              }}
            >
              {pick(lang, "مسح الاختيار", "Clear selection")}
            </button>
            <button className="button button-primary" onClick={() => setComparing(true)}>
              {pick(lang, "قارن المنتجات", "Compare products")}
            </button>
          </div>
          <p className="comparison-notice" role="alert">
            {notice}
          </p>
        </section>
      )}
      {inquirySelected.length > 0 && (
        <section className="inquiry-selection-bar" aria-live="polite">
          <div>
            <strong>
              {pick(
                lang,
                `${inquirySelected.length} منتجات في استفسارك`,
                `${inquirySelected.length} products selected for inquiry`,
              )}
            </strong>
            <span>
              {pick(
                lang,
                "يمكنك اختيار أكثر من ثلاثة منتجات.",
                "Inquiry selection is not limited to three products.",
              )}
            </span>
          </div>
          <div>
            {inquirySelected.map((id, index) => (
              <div key={id}>
                <button
                  className="text-link"
                  onClick={() => setInquirySelected((ids) => ids.filter((v) => v !== id))}
                >
                  {visibleData(inquiryQueries[index])
                    ? productName(visibleData(inquiryQueries[index])!, lang) || id
                    : id}{" "}
                  ×
                </button>
                <CatalogStatus query={inquiryQueries[index]} lang={lang} />
              </div>
            ))}
          </div>
          <button
            className="button button-primary"
            disabled={inquiryQueries.some((q) => !visibleData(q))}
            onClick={() =>
              go(
                withLang(
                  `/inquiries/new?products=${encodeURIComponent(inquirySelected.join(","))}`,
                  lang,
                ),
              )
            }
          >
            {pick(lang, "تابع الاستفسار", "Continue inquiry")}
          </button>
        </section>
      )}
      {detail && (
        <RemoteQuickView id={detail} lang={lang} onClose={() => setParam("product", "")} go={go} />
      )}
      {comparing && (
        <Modal
          title={pick(lang, "مقارنة المنتجات", "Product comparison")}
          onClose={() => setComparing(false)}
          lang={lang}
        >
          {selected.map((id, index) => (
            <div key={id}>
              <CatalogStatus query={selectedQueries[index]} lang={lang} />
              {visibleData(selectedQueries[index])?.translationAvailable === false && (
                <ProductTranslation product={visibleData(selectedQueries[index])!} lang={lang}>
                  {null}
                </ProductTranslation>
              )}
            </div>
          ))}
          <p className="comparison-intro">
            {pick(
              lang,
              "قارن بين نوع المنتج، استخداماته، وأحجام التعبئة لاختيار الأنسب لاحتياجك.",
              "Compare product type, uses and pack formats to choose what suits your needs.",
            )}
          </p>
          <div
            className="comparison-table-wrap"
            tabIndex={0}
            role="region"
            aria-label={pick(lang, "جدول مقارنة المنتجات", "Product comparison table")}
          >
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">{pick(lang, "المنتج", "Product")}</th>
                  {compared.map((product) => (
                    <th scope="col" key={product.id}>
                      {productName(product, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{pick(lang, "الاسم الآخر", "Other name")}</th>
                  {compared.map((product) => (
                    <td key={product.id}>{secondaryProductName(product, lang)}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{pick(lang, "نوع المنتج", "Product type")}</th>
                  {compared.map((product) => (
                    <td key={product.id}>{categoryLabel(product, lang)}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{pick(lang, "الاستخدامات", "Uses")}</th>
                  {compared.map((product) => (
                    <td key={product.id}>
                      {product.useKeys.length
                        ? product.useKeys
                            .map((use) => productUseLabel(product, use, lang))
                            .join(" • ")
                        : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{pick(lang, "الأحجام وخيارات التعبئة", "Sizes and packaging")}</th>
                  {compared.map((product) => (
                    <td key={product.id}>
                      {(product.packaging || product.sizes).length
                        ? (product.packaging || product.sizes)
                            .map((value) => packageLabel(product, value, lang))
                            .join(" • ")
                        : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </main>
  );
}
