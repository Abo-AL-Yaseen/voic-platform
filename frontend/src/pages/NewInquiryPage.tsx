import { useMemo, useState } from "react";
import AppLink from "../components/AppLink";
import { IntegrationNotice, StatusBadge } from "../components/Feedback";
import { SelectField, TextAreaField, TextField } from "../components/FormFields";
import { products, type Product } from "../catalog";
import { categoryLabel, formatPackaging, msg, productName, withLang, type Lang } from "../i18n";

type Item = { productId: string; packageOption: string; quantity: string; unit: string };
type Props = {
  lang: Lang;
  go: (href: string) => void;
  search?: string;
  initialStep?: 1 | 2 | 3;
  previewSuccess?: boolean;
};

const text = {
  title: { ar: "استفسار توريد جديد", en: "New supply inquiry" },
  products: { ar: "المنتجات", en: "Products" },
  details: { ar: "التفاصيل", en: "Details" },
  review: { ar: "المراجعة", en: "Review" },
} as const;

function itemFromProduct(product: Product): Item {
  return {
    productId: product.id,
    packageOption: product.packaging?.[0] || product.sizes[0] || "contact",
    quantity: "1",
    unit: product.sizes.some((size) => size.includes("لتر")) ? "pack" : "pack",
  };
}

export default function NewInquiryPage({
  lang,
  go,
  search = "",
  initialStep = 1,
  previewSuccess = false,
}: Props) {
  const initialIds = useMemo(
    () =>
      [
        ...new Set((new URLSearchParams(search).get("products") || "").split(",").filter(Boolean)),
      ].filter((id) => products.some((product) => product.id === id)),
    [search],
  );
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [items, setItems] = useState<Item[]>(() =>
    initialIds.map((id) => itemFromProduct(products.find((product) => product.id === id)!)),
  );
  const [details, setDetails] = useState({
    accountType: "company",
    name: "",
    company: "",
    email: "",
    destination: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitNotice, setSubmitNotice] = useState("");

  const toggle = (product: Product) => {
    setItems((current) =>
      current.some((item) => item.productId === product.id)
        ? current.filter((item) => item.productId !== product.id)
        : [...current, itemFromProduct(product)],
    );
    setErrors([]);
  };
  const updateItem = (productId: string, patch: Partial<Item>) =>
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    );
  const validateProducts = () => {
    const next = [];
    if (!items.length)
      next.push(
        msg(lang, {
          ar: "اختر منتجًا واحدًا على الأقل.",
          en: "Select at least one product.",
        }),
      );
    if (items.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0))
      next.push(
        msg(lang, {
          ar: "أدخل كمية أكبر من صفر لكل منتج.",
          en: "Enter a quantity greater than zero for every product.",
        }),
      );
    setErrors(next);
    return !next.length;
  };
  const validateDetails = () => {
    const next = [];
    if (!details.name.trim() || !details.destination.trim())
      next.push(
        msg(lang, {
          ar: "الاسم وبلد الوجهة مطلوبان.",
          en: "Name and destination country are required.",
        }),
      );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email))
      next.push(
        msg(lang, {
          ar: "أدخل بريدًا إلكترونيًا صحيحًا.",
          en: "Enter a valid email address.",
        }),
      );
    if (details.accountType === "company" && !details.company.trim())
      next.push(
        msg(lang, {
          ar: "اسم الشركة مطلوب لحساب الشركة.",
          en: "Company name is required for a company account.",
        }),
      );
    setErrors(next);
    return !next.length;
  };
  const next = () => {
    if (step === 1 && validateProducts()) setStep(2);
    else if (step === 2 && validateDetails()) setStep(3);
  };
  const selectedIds = items.map((item) => item.productId).join(",");

  if (previewSuccess) {
    return (
      <main className="inquiry-flow section-pad">
        <section className="shared-state success-state">
          <StatusBadge
            status="success"
            label={msg(lang, {
              ar: "مثال بصري فقط",
              en: "Visual example only",
            })}
          />
          <h1>
            {msg(lang, {
              ar: "تم استلام الاستفسار",
              en: "Inquiry received",
            })}
          </h1>
          <p>
            {msg(lang, {
              ar: "تظهر هذه الحالة فقط بعد نجاح استجابة الخادم. لا يوجد مرجع تجريبي أو استفسار محفوظ.",
              en: "This state appears only after a successful server response. No demo reference or saved inquiry exists.",
            })}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="inquiry-flow section-pad">
      <header className="flow-heading">
        <p className="eyebrow">
          {msg(lang, {
            ar: "طلب تراجعُه الشركة",
            en: "A request reviewed by the company",
          })}
        </p>
        <h1>{msg(lang, text.title)}</h1>
        <p>
          {msg(lang, {
            ar: "لا توجد أسعار أو عملية شراء تلقائية. تتواصل الشركة معك بعد مراجعة التفاصيل.",
            en: "There are no public prices or automatic purchase. The company contacts you after review.",
          })}
        </p>
      </header>
      <ol
        className="flow-steps"
        aria-label={msg(lang, {
          ar: "خطوات الاستفسار",
          en: "Inquiry steps",
        })}
      >
        {[text.products, text.details, text.review].map((label, index) => (
          <li
            key={label.en}
            className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <span>{index + 1}</span>
            <strong>{msg(lang, label)}</strong>
          </li>
        ))}
      </ol>
      <p className="sr-announcement" aria-live="polite">
        {msg(lang, {
          ar: `الخطوة ${step} من 3`,
          en: `Step ${step} of 3`,
        })}
      </p>
      {errors.length > 0 && (
        <div className="error-summary" role="alert">
          <strong>
            {msg(lang, {
              ar: "راجع الخطوة الحالية",
              en: "Review this step",
            })}
          </strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {step === 1 && (
        <section className="flow-panel">
          <div className="flow-panel-heading">
            <div>
              <h2>
                {msg(lang, {
                  ar: "اختر المنتجات والكميات",
                  en: "Choose products and quantities",
                })}
              </h2>
              <p>
                {msg(lang, {
                  ar: "لا يطبق حد المقارنة على الاستفسار.",
                  en: "The comparison limit does not apply to inquiries.",
                })}
              </p>
            </div>
            <StatusBadge
              status={items.length ? "success" : "neutral"}
              label={`${items.length} ${msg(lang, text.products)}`}
            />
          </div>
          <div className="inquiry-product-grid">
            {products.map((product) => {
              const selected = items.find((item) => item.productId === product.id);
              const options = product.packaging || product.sizes;
              return (
                <article
                  key={product.id}
                  className={`inquiry-product ${selected ? "selected" : ""}`}
                >
                  {product.image ? (
                    <img src={product.image} alt="" />
                  ) : (
                    <div className="missing-product-image">—</div>
                  )}
                  <div>
                    <span>{categoryLabel(product, lang)}</span>
                    <h3>{productName(product, lang)}</h3>
                    <label className="check-option">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggle(product)}
                      />
                      <strong>
                        {msg(lang, {
                          ar: "أضف للاستفسار",
                          en: "Add to inquiry",
                        })}
                      </strong>
                    </label>
                  </div>
                  {selected && (
                    <div className="inquiry-item-editor">
                      <SelectField
                        label={msg(lang, {
                          ar: "خيار التعبئة",
                          en: "Package option",
                        })}
                        value={selected.packageOption}
                        onChange={(e) => updateItem(product.id, { packageOption: e.target.value })}
                      >
                        {options.length ? (
                          options.map((option) => (
                            <option key={option} value={option}>
                              {formatPackaging(option, lang)}
                            </option>
                          ))
                        ) : (
                          <option value="contact">
                            {msg(lang, {
                              ar: "تواصلوا معي بشأن خيارات التعبئة",
                              en: "Contact me about packaging options",
                            })}
                          </option>
                        )}
                      </SelectField>
                      <div className="quantity-row">
                        <TextField
                          label={msg(lang, { ar: "الكمية", en: "Quantity" })}
                          type="number"
                          min="1"
                          step="1"
                          value={selected.quantity}
                          onChange={(e) => updateItem(product.id, { quantity: e.target.value })}
                        />
                        <SelectField
                          label={msg(lang, { ar: "الوحدة", en: "Unit" })}
                          value={selected.unit}
                          onChange={(e) => updateItem(product.id, { unit: e.target.value })}
                        >
                          <option value="pack">{msg(lang, { ar: "عبوة", en: "pack" })}</option>
                          <option value="carton">{msg(lang, { ar: "كرتون", en: "carton" })}</option>
                          <option value="pallet">{msg(lang, { ar: "منصة", en: "pallet" })}</option>
                        </SelectField>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="flow-panel">
          <h2>
            {msg(lang, {
              ar: "بيانات التواصل والوجهة",
              en: "Contact and destination",
            })}
          </h2>
          <div className="form-grid">
            <SelectField
              label={msg(lang, { ar: "نوع العميل", en: "Customer type" })}
              value={details.accountType}
              onChange={(e) => setDetails({ ...details, accountType: e.target.value })}
            >
              <option value="individual">{msg(lang, { ar: "فرد", en: "Individual" })}</option>
              <option value="company">{msg(lang, { ar: "شركة", en: "Company" })}</option>
            </SelectField>
            <TextField
              label={msg(lang, { ar: "الاسم الكامل", en: "Full name" })}
              value={details.name}
              onChange={(e) => setDetails({ ...details, name: e.target.value })}
              required
            />
            {details.accountType === "company" && (
              <TextField
                label={msg(lang, { ar: "اسم الشركة", en: "Company name" })}
                value={details.company}
                onChange={(e) => setDetails({ ...details, company: e.target.value })}
                required
              />
            )}
            <TextField
              label={msg(lang, { ar: "البريد الإلكتروني", en: "Email" })}
              type="email"
              value={details.email}
              onChange={(e) => setDetails({ ...details, email: e.target.value })}
              required
            />
            <TextField
              label={msg(lang, { ar: "بلد الوجهة", en: "Destination country" })}
              value={details.destination}
              onChange={(e) => setDetails({ ...details, destination: e.target.value })}
              required
            />
            <TextField
              label={msg(lang, {
                ar: "الهاتف (اختياري)",
                en: "Phone (optional)",
              })}
              type="tel"
              value={details.phone}
              onChange={(e) => setDetails({ ...details, phone: e.target.value })}
            />
          </div>
          <TextAreaField
            label={msg(lang, {
              ar: "ملاحظات (اختياري)",
              en: "Notes (optional)",
            })}
            rows={5}
            value={details.notes}
            onChange={(e) => setDetails({ ...details, notes: e.target.value })}
          />
          <IntegrationNotice
            lang={lang}
            title={msg(lang, {
              ar: "بيانات مؤقتة في هذه الصفحة",
              en: "Temporary data on this page",
            })}
          >
            {msg(lang, {
              ar: "لا تُحفظ هذه البيانات في المتصفح أو على خادم. ستحتاج إلى تسجيل الدخول والتحقق قبل الإرسال.",
              en: "These details are not saved in the browser or on a server. Sign-in and verification are required before submission.",
            })}
          </IntegrationNotice>
        </section>
      )}
      {step === 3 && (
        <section className="flow-panel review-panel">
          <div className="flow-panel-heading">
            <h2>{msg(lang, { ar: "راجع الاستفسار", en: "Review the inquiry" })}</h2>
            <button className="text-link" onClick={() => setStep(1)}>
              {msg(lang, { ar: "تعديل المنتجات", en: "Edit products" })}
            </button>
          </div>
          <div className="review-items">
            {items.map((item) => {
              const product = products.find((entry) => entry.id === item.productId)!;
              return (
                <article key={item.productId}>
                  <img src={product.image || ""} alt="" />
                  <div>
                    <h3>{productName(product, lang)}</h3>
                    <p>
                      {item.packageOption === "contact"
                        ? msg(lang, {
                            ar: "التواصل بشأن التعبئة",
                            en: "Contact about packaging",
                          })
                        : formatPackaging(item.packageOption, lang)}
                    </p>
                  </div>
                  <strong>
                    {item.quantity} ×{" "}
                    {item.unit === "pack" ? msg(lang, { ar: "عبوة", en: "pack" }) : item.unit}
                  </strong>
                </article>
              );
            })}
          </div>
          <div className="review-contact">
            <div>
              <span>{msg(lang, { ar: "جهة الاتصال", en: "Contact" })}</span>
              <strong>{details.name || "—"}</strong>
              <p>{details.email || "—"}</p>
            </div>
            <div>
              <span>{msg(lang, { ar: "الوجهة", en: "Destination" })}</span>
              <strong>{details.destination || "—"}</strong>
              <p>{details.company || "—"}</p>
            </div>
            <button className="text-link" onClick={() => setStep(2)}>
              {msg(lang, { ar: "تعديل التفاصيل", en: "Edit details" })}
            </button>
          </div>
          <div className="commercial-note">
            <strong>
              {msg(lang, {
                ar: "ماذا يحدث بعد الإرسال؟",
                en: "What happens after submission?",
              })}
            </strong>
            <p>
              {msg(lang, {
                ar: "تراجع الشركة المنتجات والكميات والوجهة وتتواصل معك لتأكيد الأسعار وشروط التوريد. الاستفسار ليس بيعًا مقبولًا تلقائيًا.",
                en: "The company reviews products, quantities and destination, then contacts you to confirm pricing and supply terms. An inquiry is not an automatically accepted sale.",
              })}
            </p>
          </div>
          <IntegrationNotice
            lang={lang}
            title={msg(lang, {
              ar: "يلزم تسجيل الدخول والتحقق",
              en: "Sign-in and verification required",
            })}
          />
          <div className="page-actions">
            <AppLink
              href={withLang(
                `/login?returnTo=${encodeURIComponent(`/inquiries/new?products=${selectedIds}`)}`,
                lang,
              )}
              go={go}
              className="button button-primary"
            >
              {msg(lang, {
                ar: "سجّل الدخول للمتابعة",
                en: "Sign in to continue",
              })}
            </AppLink>
            <AppLink
              href={withLang(
                `/register?returnTo=${encodeURIComponent(`/inquiries/new?products=${selectedIds}`)}`,
                lang,
              )}
              go={go}
              className="button button-secondary"
            >
              {msg(lang, { ar: "إنشاء حساب", en: "Create account" })}
            </AppLink>
            <button className="button button-primary" disabled onClick={() => setSubmitNotice("")}>
              {msg(lang, { ar: "إرسال الاستفسار", en: "Submit inquiry" })}
            </button>
          </div>
          {submitNotice && <p role="alert">{submitNotice}</p>}
        </section>
      )}
      <div className="flow-controls">
        <button
          className="button button-secondary"
          disabled={step === 1}
          onClick={() => {
            setStep((step - 1) as 1 | 2);
            setErrors([]);
          }}
        >
          {msg(lang, { ar: "رجوع", en: "Back" })}
        </button>
        {step < 3 && (
          <button className="button button-primary" onClick={next}>
            {msg(lang, { ar: "متابعة", en: "Continue" })}
          </button>
        )}
      </div>
    </main>
  );
}
