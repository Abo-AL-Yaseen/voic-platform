import { useMemo, useState } from "react";
import { products } from "./catalog";
import { msg, productName, type Lang } from "./i18n";

export function productInquiryHref(productId: string, lang: Lang) {
  const product = products.find((item) => item.id === productId);
  if (!product) return "mailto:info@voic.ps";
  const name = productName(product, lang);
  const subject = lang === "ar" ? `استفسار تجاري عن ${name}` : `Commercial inquiry about ${name}`;
  const body =
    lang === "ar"
      ? `مرحبًا فريق شركة مصانع الزيوت النباتية،

أرغب بالاستفسار عن المنتج: ${name}

اسم الشركة:
بلد الوجهة:
حجم العبوة المطلوب:
الكمية التقديرية:

تفاصيل إضافية:
`
      : `Hello Vegetable Oil Industries Co. team,

I would like to inquire about: ${name}

Company name:
Destination country:
Desired package size:
Estimated quantity:

Additional details:
`;
  return `mailto:info@voic.ps?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type Props = {
  lang: Lang;
  mode: "business" | "contact";
  initialProductId?: string;
  initialProductIds?: string[];
  initialTopic?: string;
};

export function buildInquiryMessage(
  lang: Lang,
  values: {
    name: string;
    company: string;
    email: string;
    destination: string;
    businessType: string;
    topic: string;
    productIds: string[];
    sizeNeed: string;
    quantity: string;
    quantityUnit: string;
    notes: string;
  },
) {
  const selected = values.productIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean)
    .map((product) => productName(product!, lang))
    .join(", ");
  if (lang === "en") {
    return `Commercial inquiry

Contact name: ${values.name}
Company: ${values.company || "—"}
Email: ${values.email}
Destination country: ${values.destination}
Business type / topic: ${values.businessType || values.topic}
Product(s): ${selected || values.topic}
Desired package size or need: ${values.sizeNeed || "—"}
Estimated quantity: ${values.quantity ? `${values.quantity} ${values.quantityUnit}` : "—"}

Notes:
${values.notes || "—"}`;
  }
  return `استفسار تجاري

اسم جهة الاتصال: ${values.name}
الشركة: ${values.company || "—"}
البريد الإلكتروني: ${values.email}
بلد الوجهة: ${values.destination}
نوع النشاط / الموضوع: ${values.businessType || values.topic}
المنتجات: ${selected || values.topic}
حجم العبوة أو الاحتياج: ${values.sizeNeed || "—"}
الكمية التقديرية: ${values.quantity ? `${values.quantity} ${values.quantityUnit}` : "—"}

ملاحظات:
${values.notes || "—"}`;
}

export default function InquiryForm({
  lang,
  mode,
  initialProductId,
  initialProductIds,
  initialTopic = "",
}: Props) {
  const [values, setValues] = useState({
    name: "",
    company: "",
    email: "",
    destination: "",
    businessType: "",
    topic: initialTopic,
    productIds:
      initialProductIds?.filter((id) => products.some((product) => product.id === id)) ||
      (initialProductId ? [initialProductId] : ([] as string[])),
    sizeNeed: "",
    quantity: "",
    quantityUnit: lang === "ar" ? "كغم" : "kg",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const message = useMemo(() => buildInquiryMessage(lang, values), [lang, values]);
  const set = (key: keyof typeof values, value: string | string[]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setCopied(false);
  };
  const toggleProduct = (id: string) => {
    set(
      "productIds",
      values.productIds.includes(id)
        ? values.productIds.filter((productId) => productId !== id)
        : [...values.productIds, id],
    );
  };
  const validate = () => {
    const next: Record<string, string> = {};
    const required = msg(lang, {
      ar: "هذا الحقل مطلوب",
      en: "This field is required",
    });
    if (!values.name.trim()) next.name = required;
    if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      next.email = msg(lang, {
        ar: "أدخل بريدًا إلكترونيًا صحيحًا",
        en: "Enter a valid email address",
      });
    if (!values.destination.trim()) next.destination = required;
    if (mode === "business" && !values.company.trim()) next.company = required;
    if (!values.productIds.length && !values.topic.trim())
      next.topic = msg(lang, {
        ar: "اختر منتجًا أو موضوعًا",
        en: "Choose a product or topic",
      });
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const mailto = `mailto:info@voic.ps?subject=${encodeURIComponent(
    msg(lang, {
      ar: "استفسار من موقع VOIC",
      en: "Inquiry from the VOIC website",
    }),
  )}&body=${encodeURIComponent(message)}`;
  const prepareEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) window.location.href = mailto;
  };
  const copyMessage = async () => {
    if (!validate()) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
      setErrors((current) => ({
        ...current,
        copy:
          lang === "ar"
            ? "تعذّر النسخ. يمكنك تحديد النص يدويًا."
            : "Copy failed. Select the text manually.",
      }));
    }
  };

  const field = (
    key: keyof typeof values,
    labelAr: string,
    labelEn: string,
    required = false,
    type = "text",
  ) => (
    <label className="form-field">
      <span>
        {lang === "ar" ? labelAr : labelEn}
        {required && " *"}
      </span>
      <input
        type={type}
        value={values[key] as string}
        onChange={(event) => set(key, event.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
      />
      {errors[key] && (
        <small className="field-error" id={`${key}-error`}>
          {errors[key]}
        </small>
      )}
    </label>
  );

  return (
    <form className="inquiry-form" onSubmit={prepareEmail} noValidate>
      <div className="form-grid">
        {field("name", "الاسم", "Contact name", true)}
        {field("company", "اسم الشركة", "Company", mode === "business")}
        {field("email", "البريد الإلكتروني", "Email", true, "email")}
        {field("destination", "بلد الوجهة", "Destination country", true)}
        {mode === "business" ? (
          <label className="form-field">
            <span>{msg(lang, { ar: "نوع النشاط", en: "Business type" })}</span>
            <select
              value={values.businessType}
              onChange={(event) => set("businessType", event.target.value)}
            >
              <option value="">{msg(lang, { ar: "اختر", en: "Select" })}</option>
              <option
                value={lang === "ar" ? "مطعم أو مطبخ مهني" : "Restaurant / professional kitchen"}
              >
                {msg(lang, {
                  ar: "مطعم أو مطبخ مهني",
                  en: "Restaurant / professional kitchen",
                })}
              </option>
              <option value={lang === "ar" ? "محل حلويات" : "Sweet shop"}>
                {msg(lang, { ar: "محل حلويات", en: "Sweet shop" })}
              </option>
              <option value={lang === "ar" ? "مخبز" : "Bakery"}>
                {msg(lang, { ar: "مخبز", en: "Bakery" })}
              </option>
              <option value={lang === "ar" ? "موزع أو مستورد" : "Distributor / importer"}>
                {msg(lang, {
                  ar: "موزع أو مستورد",
                  en: "Distributor / importer",
                })}
              </option>
            </select>
          </label>
        ) : (
          <label className="form-field">
            <span>{msg(lang, { ar: "موضوع الاستفسار", en: "Inquiry topic" })} *</span>
            <select
              value={values.topic}
              onChange={(event) => set("topic", event.target.value)}
              aria-invalid={!!errors.topic}
            >
              <option value="">{msg(lang, { ar: "اختر الموضوع", en: "Choose a topic" })}</option>
              <option value={lang === "ar" ? "سؤال عن منتج" : "Product question"}>
                {msg(lang, { ar: "سؤال عن منتج", en: "Product question" })}
              </option>
              <option value={lang === "ar" ? "استفسار توريد" : "Supply inquiry"}>
                {msg(lang, { ar: "استفسار توريد", en: "Supply inquiry" })}
              </option>
              <option
                value={
                  lang === "ar" ? "وثائق الجودة والمواصفات" : "Quality and specification documents"
                }
              >
                {msg(lang, {
                  ar: "وثائق الجودة والمواصفات",
                  en: "Quality and specification documents",
                })}
              </option>
              <option value={lang === "ar" ? "استفسار عام" : "General inquiry"}>
                {msg(lang, { ar: "استفسار عام", en: "General inquiry" })}
              </option>
            </select>
            {errors.topic && <small className="field-error">{errors.topic}</small>}
          </label>
        )}
      </div>
      <fieldset className="product-picks">
        <legend>{msg(lang, { ar: "المنتجات", en: "Products" })}</legend>
        <div>
          {products.map((product) => (
            <label key={product.id}>
              <input
                type="checkbox"
                checked={values.productIds.includes(product.id)}
                onChange={() => toggleProduct(product.id)}
              />
              <span>{productName(product, lang)}</span>
            </label>
          ))}
        </div>
        {errors.topic && mode === "business" && (
          <small className="field-error">{errors.topic}</small>
        )}
      </fieldset>
      <div className="form-grid form-grid-quantity">
        {field("sizeNeed", "حجم العبوة أو الاحتياج", "Desired package size or need")}
        {field("quantity", "الكمية التقديرية", "Estimated quantity")}
        <label className="form-field form-unit">
          <span>{msg(lang, { ar: "الوحدة", en: "Unit" })}</span>
          <input
            value={values.quantityUnit}
            onChange={(event) => set("quantityUnit", event.target.value)}
          />
        </label>
      </div>
      <label className="form-field">
        <span>{msg(lang, { ar: "ملاحظات", en: "Notes" })}</span>
        <textarea
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          rows={5}
        />
      </label>
      <div className="inquiry-form-actions">
        <button className="button button-primary" type="submit">
          {msg(lang, {
            ar: "جهّز رسالة الاستفسار",
            en: "Prepare inquiry email",
          })}
        </button>
        <button className="button button-secondary" type="button" onClick={copyMessage}>
          {msg(lang, { ar: "انسخ نص الرسالة", en: "Copy message" })}
        </button>
      </div>
      <p className="form-hint">
        {msg(lang, {
          ar: "يفتح تطبيق البريد لإرسال استفسارك. يمكنك مراجعة الرسالة وتعديلها قبل الإرسال.",
          en: "Opens your email app. You can review and edit the message before sending.",
        })}
      </p>
      {copied && (
        <p className="copy-status" role="status">
          {msg(lang, { ar: "تم نسخ نص الرسالة.", en: "Message copied." })}
        </p>
      )}
      {errors.copy && <p className="field-error">{errors.copy}</p>}
    </form>
  );
}
