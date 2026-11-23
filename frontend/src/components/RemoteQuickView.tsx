import { useProduct, visibleData } from "../hooks/products/queries";
import CatalogStatus, { ProductTranslation } from "./CatalogStatus";
import ProductQuickView from "../ProductQuickView";
import Modal from "../Modal";
import { pick, type Lang } from "../i18n";
export default function RemoteQuickView({
  id,
  lang,
  onClose,
  go,
}: {
  id: string;
  lang: Lang;
  onClose: () => void;
  go: (href: string) => void;
}) {
  const query = useProduct(id, lang),
    product = visibleData(query);
  if (product && product.translationAvailable !== false)
    return (
      <ProductQuickView
        product={product}
        lang={lang}
        onClose={onClose}
        go={go}
        feedback={<CatalogStatus query={query} lang={lang} />}
      />
    );
  return (
    <Modal title={pick(lang, "تفاصيل المنتج", "Product details")} onClose={onClose} lang={lang}>
      <CatalogStatus query={query} lang={lang} />
      {product && (
        <ProductTranslation product={product} lang={lang}>
          {null}
        </ProductTranslation>
      )}
      <a href={lang === "en" ? "/products?lang=en" : "/products"}>
        {pick(lang, "كل المنتجات", "All products")}
      </a>
    </Modal>
  );
}
