import { useEffect, useRef, useState } from "react";
import AppLink from "../components/AppLink";
import SessionGate from "../components/SessionGate";
import { SelectField, TextAreaField, TextField } from "../components/FormFields";
import { useAllProducts } from "../hooks/products/queries";
import CatalogStatus from "../components/CatalogStatus";
import { msg, productName, withLang, type Lang } from "../i18n";
import { useAuth } from "../hooks/auth/queries";
import { useInquiry, useInquiryWrite, inquiryFailure } from "../hooks/inquiries/queries";
import type { Inquiry, InquiryFields, InquiryItem } from "../services/inquiries";
import { inquiryPayload } from "../utils/inquiryPayload";

type Props = {
  lang: Lang;
  go: (href: string) => void;
  search?: string;
  initialStep?: 1 | 2 | 3;
  previewSuccess?: boolean;
};
const t = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
const idsFrom = (search: string) =>
  [
    ...new Set(
      (new URLSearchParams(search).get("products") || "")
        .split(",")
        .filter((id) => /^[a-z0-9-]{1,64}$/.test(id)),
    ),
  ].slice(0, 30);
const blank = (productId: string): InquiryItem => ({
  productId,
  packageId: null,
  quantity: null,
  unit: null,
  requirements: "",
});
export default function NewInquiryPage({ lang, go, search = "" }: Props) {
  const auth = useAuth(),
    draft = new URLSearchParams(search).get("draft") || "";
  if (draft)
    return (
      <SessionGate lang={lang} go={go}>
        <OwnedDraft lang={lang} go={go} search={search} id={draft} />
      </SessionGate>
    );
  return (
    <Selection
      key={`${auth.session?.user?.id || "public"}:${auth.epoch}`}
      lang={lang}
      go={go}
      search={search}
    />
  );
}
function Heading({ lang }: { lang: Lang }) {
  return (
    <header className="flow-heading">
      <p className="eyebrow">VOIC</p>
      <h1>{t(lang, "استفسار توريد جديد", "New supply inquiry")}</h1>
      <p>
        {t(
          lang,
          "طلب تراجعه الشركة، وليس طلب شراء مقبولًا. لا حجز للمخزون أو ضمان للتوريد.",
          "A request for company review, not an accepted order. No stock reservation or guaranteed fulfillment.",
        )}
      </p>
    </header>
  );
}
function Selection({ lang, go, search = "" }: Props) {
  const auth = useAuth(),
    user = auth.session?.user,
    catalog = useAllProducts({ locale: lang }),
    write = useInquiryWrite();
  const [ids, setIds] = useState(() => idsFrom(search)),
    [key] = useState(() => crypto.randomUUID());
  const returnTo = `/inquiries/new?products=${ids.join(",")}`;
  return (
    <main className="inquiry-flow section-pad">
      <Heading lang={lang} />
      <section className="flow-panel">
        <h2>{t(lang, "اختر المنتجات", "Choose products")}</h2>
        <p>
          {t(
            lang,
            "حتى 30 منتجًا؛ حد المقارنة مستقل. الاختيار هنا عام ولا يُرسل كطلب.",
            "Up to 30 products, independently of comparison. This public selection is not a submission.",
          )}
        </p>
        <CatalogStatus query={catalog} lang={lang} empty={catalog.data?.length === 0} />
        {ids
          .filter((id) => catalog.data && !catalog.data.some((p) => p.id === id))
          .map((id) => (
            <p key={id}>
              {id} — {t(lang, "غير متاح", "Unavailable")}{" "}
              <button onClick={() => setIds(ids.filter((x) => x !== id))}>
                {t(lang, "إزالة", "Remove")}
              </button>
            </p>
          ))}
        <div className="inquiry-product-grid">
          {catalog.data?.map((p) => (
            <article
              className={`inquiry-product ${ids.includes(p.id) ? "selected" : ""}`}
              key={p.id}
            >
              {p.image && <img src={p.image} alt="" />}
              <div>
                <h3>{productName(p, lang)}</h3>
                <label className="check-option">
                  <input
                    type="checkbox"
                    checked={ids.includes(p.id)}
                    disabled={
                      p.translationAvailable === false || (!ids.includes(p.id) && ids.length >= 30)
                    }
                    onChange={() =>
                      setIds(ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id])
                    }
                  />
                  {t(lang, "أضف للاستفسار", "Add to inquiry")}
                </label>
              </div>
            </article>
          ))}
        </div>
        <p role="status">
          {ids.length} {t(lang, "منتج مختار", "selected products")}
        </p>
        {auth.pending ? (
          <p role="status">{t(lang, "جارٍ التحقق من الجلسة…", "Checking session…")}</p>
        ) : auth.error ? (
          <p role="alert">
            {t(lang, "تعذّر التحقق من الجلسة.", "Session check failed.")}{" "}
            <button onClick={auth.retry}>{t(lang, "إعادة المحاولة", "Retry")}</button>
          </p>
        ) : user ? (
          user.role === "customer" ? (
            <button
              className="button button-primary"
              disabled={!ids.length || write.isPending}
              onClick={async () => {
                try {
                  const d = await write.mutateAsync({ type: "create", creationKey: key, lang });
                  go(withLang(`/inquiries/new?draft=${d.id}&products=${ids.join(",")}`, lang));
                } catch {}
              }}
            >
              {write.isPending
                ? t(lang, "جارٍ إنشاء المسودة…", "Creating draft…")
                : t(lang, "إنشاء مسودة والمتابعة", "Create draft and continue")}
            </button>
          ) : (
            <p>
              {t(
                lang,
                "الاستفسارات متاحة لحسابات العملاء فقط.",
                "Inquiries are available to customer accounts only.",
              )}
            </p>
          )
        ) : (
          <div className="page-actions">
            {["login", "register"].map((route) => (
              <AppLink
                key={route}
                className="button button-primary"
                go={go}
                href={withLang(`/${route}?returnTo=${encodeURIComponent(returnTo)}`, lang)}
              >
                {route === "login"
                  ? t(lang, "سجّل الدخول للمتابعة", "Sign in to continue")
                  : t(lang, "إنشاء حساب", "Create account")}
              </AppLink>
            ))}
          </div>
        )}
        {write.error && <p role="alert">{inquiryFailure(write.error, lang)}</p>}
        <AppLink
          className="text-link"
          go={go}
          href={withLang("/account/inquiries?status=draft", lang)}
        >
          {t(lang, "متابعة مسودة محفوظة", "Continue a saved draft")}
        </AppLink>
      </section>
    </main>
  );
}
function OwnedDraft({ lang, go, search, id }: Props & { id: string }) {
  const query = useInquiry(id);
  if (query.isPending)
    return (
      <main className="inquiry-flow section-pad" role="status">
        {t(lang, "جارٍ تحميل المسودة…", "Loading draft…")}
      </main>
    );
  if (query.error || !query.data)
    return (
      <main className="inquiry-flow section-pad" role="alert">
        <p>{inquiryFailure(query.error, lang)}</p>
        <button onClick={() => query.refetch()}>{t(lang, "إعادة المحاولة", "Retry")}</button>
      </main>
    );
  if (query.data.status === "submitted")
    return (
      <main className="inquiry-flow section-pad">
        <h1>{t(lang, "الاستفسار محفوظ ومرسل", "Inquiry saved and submitted")}</h1>
        <p>{query.data.reference}</p>
        <AppLink
          className="button button-primary"
          go={go}
          href={withLang(`/account/inquiries/${id}`, lang)}
        >
          {t(lang, "عرض الاستفسار", "View inquiry")}
        </AppLink>
      </main>
    );
  return (
    <DraftEditor
      key={id}
      initial={query.data}
      lang={lang}
      go={go}
      search={search}
      reload={() => query.refetch()}
    />
  );
}
function DraftEditor({
  initial,
  lang,
  go,
  search = "",
  reload,
}: Props & { initial: Inquiry; reload: () => unknown }) {
  const auth = useAuth(),
    catalog = useAllProducts({ locale: lang }),
    write = useInquiryWrite();
  const [record, setRecord] = useState(initial),
    [fields, setFields] = useState<InquiryFields>(initial.fields);
  const [items, setItems] = useState<InquiryItem[]>(() =>
    initial.items.length ? initial.items : initial.revision === 1 ? idsFrom(search).map(blank) : [],
  );
  const [step, setStep] = useState(1),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const [submitKey, setSubmitKey] = useState(() => crypto.randomUUID());
  const heading = useRef<HTMLHeadingElement>(null);
  const products = catalog.data || [];
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    setStep(1);
  }, [lang]);
  // Explicit reload resolves conflicts without silently overwriting unsaved local edits.
  const refresh = () => {
    go(withLang(`/account/inquiries/${record.id}`, lang));
  };
  const set = (key: keyof InquiryFields, value: string) => setFields({ ...fields, [key]: value });
  const update = (id: string, patch: Partial<InquiryItem>) =>
    setItems(items.map((x) => (x.productId === id ? { ...x, ...patch } : x)));
  const validate = () => {
    if (catalog.isPending || catalog.isError)
      return t(
        lang,
        "انتظر تحميل المنتجات أو أعد المحاولة قبل الحفظ.",
        "Wait for products to load or retry before saving.",
      );
    if (
      !items.length ||
      items.some(
        (x) => !products.some((p) => p.id === x.productId && p.translationAvailable !== false),
      )
    )
      return t(
        lang,
        "اختر منتجات متاحة أو أزل غير المتاح.",
        "Select available products or remove unavailable ones.",
      );
    if (
      items.some((x) =>
        x.packageId
          ? !Number.isInteger(x.quantity) || x.quantity! < 1 || x.quantity! > 100000
          : x.quantity != null
            ? x.quantity <= 0 || x.quantity > 1000000 || !["kg", "L"].includes(x.unit || "")
            : !x.requirements.trim(),
      )
    )
      return t(
        lang,
        "لكل منتج: أدخل عدد عبوات صحيحًا، أو كمية ووحدة، أو متطلبات التعبئة.",
        "For each product enter a whole package count, an amount with unit, or packaging requirements.",
      );
    return "";
  };
  const save = async (next: boolean) => {
    if (write.isPending) return;
    if (
      next &&
      step === 2 &&
      (!fields.name.trim() ||
        !fields.destination.trim() ||
        (fields.kind === "company" && !fields.company.trim()))
    ) {
      setError(
        t(
          lang,
          "أدخل الاسم والوجهة واسم الشركة عند اختيار شركة.",
          "Enter name, destination and company name for a company request.",
        ),
      );
      return;
    }
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setNotice("");
    try {
      const result = await write.mutateAsync({
        type: "save",
        id: record.id,
        body: inquiryPayload(record.revision, lang, fields, items),
      });
      setRecord(result);
      setSubmitKey(crypto.randomUUID());
      setNotice(t(lang, "حُفظت المسودة.", "Draft saved."));
      if (next) setStep(Math.min(3, step + 1));
    } catch {}
  };
  const pending = write.isPending;
  return (
    <main className="inquiry-flow section-pad">
      <Heading lang={lang} />
      <ol className="flow-steps">
        {[
          t(lang, "المنتجات", "Products"),
          t(lang, "التفاصيل", "Details"),
          t(lang, "المراجعة", "Review"),
        ].map((s, index) => (
          <li
            className={step === index + 1 ? "active" : ""}
            aria-current={step === index + 1 ? "step" : undefined}
            key={s}
          >
            <span>{index + 1}</span>
            <strong>{s}</strong>
          </li>
        ))}
      </ol>
      <CatalogStatus query={catalog} lang={lang} />
      <form
        className="flow-panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) void save(true);
        }}
      >
        <h2 ref={heading} tabIndex={-1} className="route-heading">
          {step === 1
            ? t(lang, "المنتجات والكميات", "Products and quantities")
            : step === 2
              ? t(lang, "التواصل والوجهة", "Contact and destination")
              : t(lang, "راجع الاستفسار", "Review inquiry")}
        </h2>
        {(error || write.error) && (
          <div className="error-summary" role="alert">
            {error || inquiryFailure(write.error, lang)}{" "}
            <button
              type="button"
              onClick={() => {
                void catalog.refetch();
              }}
            >
              {t(lang, "تحديث الخيارات", "Reload options")}
            </button>
            <button type="button" onClick={refresh}>
              {t(lang, "تحقق من السجل المحفوظ", "Check saved record")}
            </button>
          </div>
        )}
        <p role="status" aria-live="polite">
          {pending ? t(lang, "جارٍ الحفظ…", "Saving…") : notice}
        </p>
        <fieldset disabled={pending || uncertain} className="inquiry-fields">
          {step === 1 && (
            <>
              <div className="inquiry-line-list">
                {items.map((item) => {
                  const p = products.find((x) => x.id === item.productId),
                    options = p?.packageOptions || [];
                  return (
                    <article className="workspace-section" key={item.productId}>
                      <h3>{p ? productName(p, lang) : item.productId}</h3>
                      {!p && (
                        <p role="alert">
                          {t(
                            lang,
                            "هذا المنتج غير متاح. أزله أو أعد تحميل الخيارات.",
                            "This product is unavailable. Remove it or reload options.",
                          )}
                        </p>
                      )}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setItems(items.filter((x) => x !== item))}
                      >
                        {t(lang, "إزالة المنتج", "Remove product")}
                      </button>
                      <SelectField
                        label={t(lang, "خيار التعبئة", "Package option")}
                        value={item.packageId || ""}
                        onChange={(e) =>
                          update(item.productId, {
                            packageId: e.target.value || null,
                            quantity: e.target.value ? 1 : null,
                            unit: e.target.value ? "packages" : null,
                          })
                        }
                      >
                        <option value="">
                          {t(lang, "مناقشة التعبئة مع المبيعات", "Discuss packaging with sales")}
                        </option>
                        {item.packageId && !options.some((o) => o.id === item.packageId) && (
                          <option value={item.packageId}>
                            {t(
                              lang,
                              "الخيار المحفوظ غير متاح — اختر مجددًا",
                              "Saved option unavailable — choose again",
                            )}
                          </option>
                        )}
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </SelectField>
                      <div className="quantity-row">
                        <TextField
                          label={
                            item.packageId
                              ? t(lang, "عدد العبوات", "Number of packages")
                              : t(
                                  lang,
                                  "الكمية المطلوبة (اختياري مع المتطلبات)",
                                  "Requested amount (optional with requirements)",
                                )
                          }
                          type="number"
                          min={item.packageId ? 1 : 0.001}
                          max={item.packageId ? 100000 : 1000000}
                          step={item.packageId ? 1 : 0.001}
                          required={!!item.packageId}
                          error={
                            error &&
                            item.packageId &&
                            (!Number.isInteger(item.quantity) ||
                              item.quantity! < 1 ||
                              item.quantity! > 100000)
                              ? t(
                                  lang,
                                  "أدخل عددًا صحيحًا من 1 إلى 100000 عبوة.",
                                  "Enter a whole count from 1 to 100000 packages.",
                                )
                              : undefined
                          }
                          value={item.quantity ?? ""}
                          onChange={(e) =>
                            update(item.productId, {
                              quantity: e.target.value === "" ? null : Number(e.target.value),
                              unit: item.packageId
                                ? "packages"
                                : e.target.value
                                  ? item.unit || "kg"
                                  : null,
                            })
                          }
                        />
                        {item.packageId ? (
                          <p>{t(lang, "الوحدة: عبوة", "Unit: package")}</p>
                        ) : (
                          <SelectField
                            label={t(lang, "الوحدة", "Unit")}
                            value={item.unit || "kg"}
                            onChange={(e) =>
                              update(item.productId, {
                                unit: e.target.value as "kg" | "L",
                              })
                            }
                          >
                            <option value="kg">{t(lang, "كيلوغرام", "kg")}</option>
                            <option value="L">{t(lang, "لتر", "L")}</option>
                          </SelectField>
                        )}
                      </div>
                      <TextAreaField
                        label={t(lang, "متطلبات التعبئة", "Packaging requirements")}
                        maxLength={1000}
                        required={!item.packageId && item.quantity == null}
                        error={
                          error &&
                          !item.packageId &&
                          item.quantity == null &&
                          !item.requirements.trim()
                            ? t(
                                lang,
                                "اكتب متطلبات التعبئة أو أدخل كمية ووحدة.",
                                "Describe packaging requirements or enter an amount and unit.",
                              )
                            : undefined
                        }
                        value={item.requirements}
                        onChange={(e) => update(item.productId, { requirements: e.target.value })}
                      />
                    </article>
                  );
                })}
              </div>
              <SelectField
                label={t(lang, "إضافة منتج", "Add product")}
                value=""
                disabled={items.length >= 30}
                onChange={(e) => {
                  if (e.target.value) setItems([...items, blank(e.target.value)]);
                }}
              >
                <option value="">{t(lang, "اختر منتجًا", "Choose product")}</option>
                {products
                  .filter(
                    (p) =>
                      !items.some((x) => x.productId === p.id) && p.translationAvailable !== false,
                  )
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {productName(p, lang)}
                    </option>
                  ))}
              </SelectField>
            </>
          )}
          {step === 2 && (
            <div className="form-grid">
              <SelectField
                label={t(lang, "نوع العميل", "Customer type")}
                value={fields.kind}
                onChange={(e) => set("kind", e.target.value)}
              >
                <option value="individual">{t(lang, "فرد", "Individual")}</option>
                <option value="company">{t(lang, "شركة", "Company")}</option>
              </SelectField>
              <TextField
                label={t(lang, "الاسم الكامل", "Full name")}
                required
                maxLength={100}
                value={fields.name}
                onChange={(e) => set("name", e.target.value)}
              />
              {fields.kind === "company" && (
                <TextField
                  label={t(lang, "اسم الشركة", "Company name")}
                  required
                  maxLength={150}
                  value={fields.company}
                  onChange={(e) => set("company", e.target.value)}
                />
              )}
              <TextField
                label={t(lang, "بلد ومدينة الوجهة", "Destination country and city")}
                required
                maxLength={200}
                value={fields.destination}
                onChange={(e) => set("destination", e.target.value)}
              />
              <TextField
                label={t(lang, "البريد الإلكتروني للحساب", "Account email")}
                value={record.contactEmail}
                disabled
              />
              <TextField
                label={t(lang, "الهاتف (اختياري)", "Phone (optional)")}
                maxLength={40}
                value={fields.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
              <TextAreaField
                label={t(lang, "ملاحظات (اختياري)", "Notes (optional)")}
                maxLength={3000}
                value={fields.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          )}
          {step === 3 && (
            <>
              <div className="review-items">
                {record.items.map((item) => {
                  const p = products.find((p) => p.id === item.productId);
                  return (
                    <article key={item.productId}>
                      <div>
                        <h3>{p ? productName(p, lang) : item.productId}</h3>
                        <p>
                          {item.packageId
                            ? p?.packageOptions?.find((o) => o.id === item.packageId)?.label ||
                              t(
                                lang,
                                "العبوة غير متاحة — ارجع للمنتجات واختر مجددًا.",
                                "Package unavailable — return to products and choose again.",
                              )
                            : t(lang, "مناقشة التعبئة مع المبيعات", "Discuss packaging with sales")}
                        </p>
                        <p>{item.requirements}</p>
                      </div>
                      <strong>
                        {item.quantity}{" "}
                        {item.unit === "packages"
                          ? t(lang, "عبوة", "packages")
                          : item.unit === "L"
                            ? t(lang, "لتر", "L")
                            : item.unit === "kg"
                              ? t(lang, "كيلوغرام", "kg")
                              : ""}
                      </strong>
                    </article>
                  );
                })}
              </div>
              <div className="review-contact">
                <p>
                  {record.fields.name}
                  <br />
                  {record.fields.company}
                  <br />
                  {record.contactEmail}
                  <br />
                  {record.fields.phone}
                </p>
                <p>
                  {record.fields.destination}
                  <br />
                  {record.fields.notes}
                </p>
              </div>
              <p className="commercial-note">
                {t(
                  lang,
                  "تراجع الشركة طلبك وتتواصل معك بشأن شروط التوريد. هذا استفسار تجاري وليس طلب شراء مقبولًا.",
                  "The company will review your request and contact you about supply terms. This commercial inquiry is not an accepted order.",
                )}
              </p>
            </>
          )}
        </fieldset>
        <div className="flow-controls">
          <button
            type="button"
            className="button button-secondary"
            disabled={step === 1 || pending || uncertain}
            onClick={() => {
              setStep(step - 1);
              setError("");
              write.reset();
            }}
          >
            {t(lang, "رجوع", "Back")}
          </button>
          {step < 3 && (
            <>
              <button
                type="button"
                className="button button-secondary"
                disabled={pending || uncertain}
                onClick={() => void save(false)}
              >
                {t(lang, "حفظ المسودة", "Save draft")}
              </button>
              <button className="button button-primary" disabled={pending || uncertain}>
                {t(lang, "حفظ ومتابعة", "Save and continue")}
              </button>
            </>
          )}
        </div>
      </form>
      {step === 3 && (
        <section className="flow-panel">
          {!auth.session?.user?.emailVerified ? (
            <AppLink
              className="button button-primary"
              go={go}
              href={withLang(
                `/verify-email?returnTo=${encodeURIComponent(`/inquiries/new?draft=${record.id}`)}`,
                lang,
              )}
            >
              {t(lang, "أكد البريد للمتابعة", "Verify email to continue")}
            </AppLink>
          ) : (
            <button
              className="button button-primary"
              disabled={pending || uncertain || catalog.isPending || catalog.isError}
              onClick={async () => {
                if (pending || uncertain) return;
                setError("");
                try {
                  const result = await write.mutateAsync({
                    type: "submit",
                    id: record.id,
                    key: submitKey,
                    revision: record.revision,
                  });
                  go(withLang(`/account/inquiries/${result.id}?submitted=1`, lang));
                } catch {
                  setUncertain(true);
                }
              }}
            >
              {pending
                ? t(lang, "جارٍ الإرسال…", "Submitting…")
                : t(lang, "إرسال الاستفسار", "Submit inquiry")}
            </button>
          )}
          {uncertain && (
            <div role="alert">
              <p>
                {t(
                  lang,
                  "لم تتأكد نتيجة الإرسال. تحقق من السجل أولًا؛ إذا بقي مسودة يمكنك إعادة المحاولة بالمفتاح نفسه.",
                  "Submission result is uncertain. Check the saved record first; if still a draft you can retry with the same key.",
                )}
              </p>
              <button
                className="button button-secondary"
                onClick={async () => {
                  const q = (await reload()) as { data?: Inquiry; error?: unknown };
                  if (q.data?.status === "submitted")
                    go(withLang(`/account/inquiries/${record.id}`, lang));
                  else if (q.data && q.data.revision === record.revision) {
                    setUncertain(false);
                    setNotice(
                      t(
                        lang,
                        "ما زالت مسودة. يمكنك إعادة الإرسال.",
                        "Still a draft. You can retry submission.",
                      ),
                    );
                  } else refresh();
                }}
              >
                {t(lang, "تحقق من نتيجة الإرسال", "Check submission result")}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
