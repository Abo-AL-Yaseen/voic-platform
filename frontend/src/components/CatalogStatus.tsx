import type { ReactNode } from "react";
import { ApiError } from "../services/api";
import type { Product } from "../catalog";
import { pick, withLang, type Lang } from "../i18n";

export default function CatalogStatus({
  query,
  lang,
  empty = false,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    isFetching?: boolean;
    data?: unknown;
    error: unknown;
    refetch: () => unknown;
  };
  lang: Lang;
  empty?: boolean;
}) {
  if (query.isPending)
    return (
      <p className="catalog-feedback" role="status">
        {pick(lang, "جارٍ تحميل المنتجات…", "Loading products…")}
      </p>
    );
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    return (
      <div className="catalog-feedback" role="alert">
        <p>
          {status === 404
            ? pick(lang, "المنتج غير موجود أو غير متاح.", "Product not found or unavailable.")
            : status === 400
              ? pick(
                  lang,
                  "الرابط أو الفلاتر غير صالحة. عدّل الاختيارات أو امسح الفلاتر.",
                  "Invalid link or filters. Change the selection or clear filters.",
                )
              : query.data
                ? pick(
                    lang,
                    "تعذر تحديث البيانات. المعروض آخر نتيجة ناجحة لهذا السياق.",
                    "Could not refresh. Showing the last successful result for this context.",
                  )
                : pick(
                    lang,
                    "تعذر تحميل المنتجات. حاول مرة أخرى.",
                    "Could not load products. Please try again.",
                  )}
        </p>
        {status !== 400 && status !== 404 && (
          <button className="button button-secondary" onClick={() => query.refetch()}>
            {pick(lang, "إعادة المحاولة", "Retry")}
          </button>
        )}
      </div>
    );
  }
  if (query.isFetching)
    return (
      <p className="catalog-feedback" role="status">
        {pick(lang, "جارٍ تحديث المنتجات…", "Refreshing products…")}
      </p>
    );
  return empty ? (
    <p className="catalog-feedback" role="status">
      {pick(lang, "لا توجد منتجات متاحة هنا.", "No products available here.")}
    </p>
  ) : null;
}
export function ProductTranslation({
  product,
  lang,
  children,
}: {
  product: Product;
  lang: Lang;
  children: ReactNode;
}) {
  if (product.translationAvailable !== false) return children;
  return (
    <div className="catalog-feedback" role="status">
      <p>
        {pick(
          lang,
          "معلومات المنتج غير متاحة بهذه اللغة.",
          "Product information is unavailable in this language.",
        )}
      </p>
      {product.availableLocales
        ?.filter((l) => l !== lang)
        .map((locale) => (
          <a
            key={locale}
            className="text-link"
            href={withLang(window.location.pathname + window.location.search, locale)}
          >
            {locale === "ar" ? "العربية" : "English"}
          </a>
        ))}
    </div>
  );
}
