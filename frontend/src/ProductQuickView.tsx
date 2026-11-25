import { usePublishedPage } from "./hooks/content/queries";
import ContentStatus from "./components/ContentStatus";
import { packageLabel, productUseLabel } from "./utils/productLabels";
import type { ReactNode } from "react";
import type { Product } from "./catalog";
import {
  categoryLabel,
  productDescription,
  productName,
  secondaryProductName,
  ui,
  withLang,
  pick,
  arrow,
  type Lang,
} from "./i18n";
import { productInquiryHref } from "./InquiryForm";
import Modal from "./Modal";

export default function ProductQuickView({
  product,
  lang,
  onClose,
  go,
  feedback,
}: {
  product: Product;
  lang: Lang;
  onClose: () => void;
  go: (href: string) => void;
  feedback?: ReactNode;
}) {
  const t = ui[lang];
  const sharedQuery = usePublishedPage("shared", lang);
  return (
    <Modal title={productName(product, lang)} onClose={onClose} lang={lang}>
      {feedback}
      <ContentStatus query={sharedQuery} lang={lang} />
      <div className="product-detail">
        {product.image ? (
          <img crossOrigin="anonymous" src={product.image} alt={productName(product, lang)} />
        ) : (
          <div
            className="missing-product-image detail-missing-image"
            role="img"
            aria-label={pick(lang, "لا تتوفر صورة أصلية", "Original image unavailable")}
          >
            <span>{pick(lang, "الصورة الأصلية غير متوفّرة", "Original image unavailable")}</span>
          </div>
        )}
        <div>
          <p className="eyebrow">{categoryLabel(product, lang)}</p>
          <p className="detail-english-name" dir={lang === "ar" ? "ltr" : "rtl"}>
            {secondaryProductName(product, lang)}
          </p>
          <h3>{pick(lang, "عن المنتج", "About the product")}</h3>
          <p>{productDescription(product, lang)}</p>
          {product.useKeys.length > 0 && (
            <>
              <h3>{pick(lang, "الاستخدامات", "Uses")}</h3>
              <ul className="product-use-list">
                {product.useKeys.map((use) => (
                  <li key={use}>{productUseLabel(product, use, lang)}</li>
                ))}
              </ul>
            </>
          )}
          {(product.packaging?.length || product.sizes.length > 0) && (
            <>
              <h3>{pick(lang, "الأحجام وخيارات التعبئة", "Sizes and packaging")}</h3>
              <p>
                {(product.packaging || product.sizes)
                  .map((value) => packageLabel(product, value, lang))
                  .join(" • ")}
              </p>
            </>
          )}
          <div className="product-inquiry">
            <button
              className="button button-primary"
              onClick={() => {
                onClose();
                go(withLang(`/inquiries/new?products=${product.id}`, lang));
              }}
            >
              {t.inquiry}
            </button>
            <p>{t.emailHint}</p>
            <a
              className="text-link quick-full-link"
              href={
                sharedQuery.data && !sharedQuery.isError
                  ? productInquiryHref(product, lang, sharedQuery.data.links.email)
                  : undefined
              }
            >
              {lang === "ar" ? "تواصل بالبريد بدلًا من ذلك" : "Contact by email instead"}
            </a>
            <button
              className="text-link quick-full-link"
              onClick={() => {
                onClose();
                go(withLang(`/products/${product.slug}`, lang));
              }}
            >
              {t.fullProduct} {arrow(lang)}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
