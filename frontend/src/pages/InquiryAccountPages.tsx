import { useState } from "react";
import AppLink from "../components/AppLink";
import { AccountLayout } from "../components/WorkspaceLayouts";
import { SelectField, TextField } from "../components/FormFields";
import {
  useInquiries,
  useInquiry,
  useInquiryCounts,
  inquiryFailure,
} from "../hooks/inquiries/queries";
import type { InquiryFilters } from "../services/inquiries";
import { msg, productName, withLang, type Lang } from "../i18n";
import { useSelectedProducts, visibleData } from "../hooks/products/queries";
import CatalogStatus from "../components/CatalogStatus";
const t = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
type Props = {
  lang: Lang;
  go: (href: string) => void;
  inquiryId?: string;
  search?: string;
  preview?: boolean;
};
export const inquiryStatus = (status: string, lang: Lang) =>
  status === "draft" ? t(lang, "مسودة", "Draft") : t(lang, "مرسل للمراجعة", "Submitted for review");
const date = (value: string, lang: Lang) =>
  new Date(value).toLocaleString(lang === "ar" ? "ar-PS" : "en-GB");
export function AccountHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="workspace-page-heading">
      <div>
        <p className="eyebrow">VOIC</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
export function InquiryCounts({ lang, go }: Props) {
  const query = useInquiryCounts();
  return (
    <section>
      <span>{t(lang, "استفسارات التوريد", "Supply inquiries")}</span>
      {query.isPending ? (
        <p role="status">{t(lang, "جارٍ التحميل…", "Loading…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{inquiryFailure(query.error, lang)}</p>
          <button onClick={() => query.refetch()}>{t(lang, "إعادة المحاولة", "Retry")}</button>
        </div>
      ) : (
        query.data && (
          <>
            <strong>{query.data.total}</strong>
            <p>
              {query.data.draft} {t(lang, "مسودة", "drafts")} · {query.data.submitted}{" "}
              {t(lang, "مرسل", "submitted")}
            </p>
          </>
        )
      )}
      <AppLink className="text-link" go={go} href={withLang("/account/inquiries", lang)}>
        {t(lang, "عرض استفساراتي", "View my inquiries")}
      </AppLink>
    </section>
  );
}
export function InquiryListPage({ lang, go, search = "" }: Props) {
  const params = new URLSearchParams(search),
    status = params.get("status");
  const [filters, setFilters] = useState<InquiryFilters>({
    q: "",
    status: status === "draft" || status === "submitted" ? status : "",
    sort: "desc",
    page: 1,
    pageSize: 10,
  });
  const [q, setQ] = useState("");
  const query = useInquiries(filters);
  const set = (patch: Partial<InquiryFilters>) => setFilters({ ...filters, ...patch, page: 1 });
  return (
    <AccountLayout lang={lang} go={go} active="/account/inquiries">
      <AccountHeading
        title={t(lang, "استفساراتي", "My inquiries")}
        description={t(
          lang,
          "مسوداتك واستفسارات التوريد المرسلة من حسابك.",
          "Your drafts and supply inquiries submitted from this account.",
        )}
      />
      <AppLink className="button button-primary" go={go} href={withLang("/inquiries/new", lang)}>
        {t(lang, "استفسار جديد", "New inquiry")}
      </AppLink>
      <form
        className="list-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q });
        }}
      >
        <TextField
          label={t(lang, "ابحث بالمرجع", "Search reference")}
          type="search"
          value={q}
          maxLength={32}
          pattern="[A-Za-z0-9-]*"
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="button button-secondary">{t(lang, "بحث", "Search")}</button>
        <SelectField
          label={t(lang, "الحالة", "Status")}
          value={filters.status}
          onChange={(e) => set({ status: e.target.value as InquiryFilters["status"] })}
        >
          <option value="">{t(lang, "كل الحالات", "All statuses")}</option>
          {["draft", "submitted"].map((s) => (
            <option value={s} key={s}>
              {inquiryStatus(s, lang)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t(lang, "ترتيب التاريخ", "Date order")}
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as "asc" | "desc" })}
        >
          <option value="desc">{t(lang, "الأحدث أولًا", "Newest first")}</option>
          <option value="asc">{t(lang, "الأقدم أولًا", "Oldest first")}</option>
        </SelectField>
      </form>
      {query.isPending ? (
        <p role="status">{t(lang, "جارٍ تحميل الاستفسارات…", "Loading inquiries…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{inquiryFailure(query.error, lang)}</p>
          <button className="button button-secondary" onClick={() => query.refetch()}>
            {t(lang, "إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        query.data && (
          <>
            <p role="status">
              {query.data.total} {t(lang, "نتيجة", "results")}
            </p>
            {!query.data.items.length ? (
              <p className="shared-state">
                {t(lang, "لا توجد استفسارات تطابق البحث.", "No inquiries match this search.")}
              </p>
            ) : (
              <div
                className="responsive-table"
                role="region"
                aria-label={t(lang, "قائمة الاستفسارات", "Inquiry list")}
                tabIndex={0}
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      {[
                        t(lang, "المرجع", "Reference"),
                        t(lang, "الوجهة", "Destination"),
                        t(lang, "الحالة", "Status"),
                        t(lang, "التاريخ", "Date"),
                      ].map((label) => (
                        <th key={label} scope="col">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <AppLink
                            className="text-link"
                            go={go}
                            href={withLang(`/account/inquiries/${i.id}`, lang)}
                          >
                            {i.reference}
                          </AppLink>
                        </td>
                        <td>{i.destination || "—"}</td>
                        <td>{inquiryStatus(i.status, lang)}</td>
                        <td>{date(i.createdAt, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <nav className="page-actions" aria-label={t(lang, "صفحات الاستفسارات", "Inquiry pages")}>
              <button
                className="button button-secondary"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                {t(lang, "السابق", "Previous")}
              </button>
              <span>
                {filters.page} / {query.data.totalPages}
              </span>
              <button
                className="button button-secondary"
                disabled={filters.page >= query.data.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                {t(lang, "التالي", "Next")}
              </button>
            </nav>
          </>
        )
      )}
    </AccountLayout>
  );
}
export function InquiryDetailPage({ lang, go, inquiryId = "" }: Props) {
  const query = useInquiry(inquiryId),
    i = query.data;
  const currentProducts = useSelectedProducts(
    i?.status === "draft" ? i.items.map((x) => x.productId) : [],
    lang,
  );
  return (
    <AccountLayout lang={lang} go={go} active="/account/inquiries">
      <AccountHeading
        title={t(lang, "تفاصيل الاستفسار", "Inquiry details")}
        description={
          i?.reference || t(lang, "سجل خاص بحسابك.", "A record private to your account.")
        }
      />
      {query.isPending ? (
        <p role="status">{t(lang, "جارٍ التحميل…", "Loading…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{inquiryFailure(query.error, lang)}</p>
          <button className="button button-secondary" onClick={() => query.refetch()}>
            {t(lang, "إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        i && (
          <>
            <p role="status">
              {inquiryStatus(i.status, lang)} · {date(i.createdAt, lang)}
            </p>
            {i.status === "draft" ? (
              <AppLink
                className="button button-primary"
                go={go}
                href={withLang(`/inquiries/new?draft=${i.id}`, lang)}
              >
                {t(lang, "متابعة المسودة", "Continue draft")}
              </AppLink>
            ) : (
              <p className="commercial-note">
                {t(
                  lang,
                  "حُفظ استفسارك للمراجعة. ليس طلب شراء مقبولًا. بيانات الإرسال ثابتة.",
                  "Your inquiry is saved for review. This is not an accepted order. Submitted details are fixed.",
                )}
              </p>
            )}
            <section className="workspace-section">
              <h2>{t(lang, "المنتجات والكميات", "Products and quantities")}</h2>
              {!i.items.length && (
                <p>
                  {t(
                    lang,
                    "لم تُحفظ منتجات في هذه المسودة بعد.",
                    "No products have been saved to this draft yet.",
                  )}
                </p>
              )}
              {i.items.map((item, index) => (
                <article className="inquiry-detail-line" key={index}>
                  {i.status === "draft" && (
                    <CatalogStatus query={currentProducts[index]} lang={lang} />
                  )}
                  <h3>
                    {item.snapshot?.name ||
                      (currentProducts[index] && visibleData(currentProducts[index])
                        ? productName(visibleData(currentProducts[index])!, lang)
                        : item.productId)}
                  </h3>
                  <p>{item.snapshot?.description}</p>
                  <p>
                    {item.snapshot?.package ||
                      (item.packageId
                        ? (currentProducts[index] &&
                            visibleData(currentProducts[index])?.packageOptions?.find(
                              (p) => p.id === item.packageId,
                            )?.label) ||
                          t(
                            lang,
                            "خيار العبوة غير متاح حاليًا. تابع المسودة للمراجعة.",
                            "Package option currently unavailable. Continue the draft to review it.",
                          )
                        : t(lang, "مناقشة التعبئة مع المبيعات", "Discuss packaging with sales"))}
                  </p>
                  <p>
                    {item.quantity ?? ""}{" "}
                    {item.unit === "packages"
                      ? t(lang, "عبوة", "packages")
                      : item.unit === "kg"
                        ? t(lang, "كيلوغرام", "kg")
                        : item.unit === "L"
                          ? t(lang, "لتر", "L")
                          : ""}
                  </p>
                  <p>{item.requirements}</p>
                </article>
              ))}
            </section>
            <section className="workspace-section">
              <h2>{t(lang, "التواصل والوجهة", "Contact and destination")}</h2>
              <dl className="inquiry-detail-fields">
                {[
                  [t(lang, "الاسم", "Name"), i.fields.name],
                  [t(lang, "الشركة", "Company"), i.fields.company],
                  [t(lang, "الوجهة", "Destination"), i.fields.destination],
                  [t(lang, "البريد الإلكتروني", "Email"), i.contactEmail],
                  [t(lang, "الهاتف", "Phone"), i.fields.phone],
                  [t(lang, "ملاحظات", "Notes"), i.fields.notes],
                  [t(lang, "آخر حفظ", "Last saved"), date(i.updatedAt, lang)],
                  [
                    t(lang, "وقت الإرسال", "Submitted at"),
                    i.submittedAt ? date(i.submittedAt, lang) : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="workspace-section">
              <h2>{t(lang, "سجل الحالة", "Status history")}</h2>
              {!i.history.length ? (
                <p>{t(lang, "لم تُرسل هذه المسودة بعد.", "This draft has not been submitted.")}</p>
              ) : (
                <ol>
                  {i.history.map((h, index) => (
                    <li key={index}>
                      {inquiryStatus(h.status, lang)} — {date(h.occurredAt, lang)}
                    </li>
                  ))}
                </ol>
              )}
            </section>
            {!!i.notifications.length && (
              <section className="workspace-section">
                <h2>{t(lang, "الإشعارات", "Notifications")}</h2>
                {i.notifications.map((n) => (
                  <p key={n.audience}>
                    {n.audience === "customer"
                      ? t(lang, "إشعار العميل", "Customer acknowledgment")
                      : t(lang, "إشعار الشركة", "Company notification")}
                    :{" "}
                    {n.state === "captured"
                      ? t(
                          lang,
                          "محفوظ محليًا للاختبار؛ لم يُرسل خارجيًا",
                          "Captured locally for testing; not externally delivered",
                        )
                      : n.state === "sent"
                        ? t(lang, "قبله خادم البريد", "Accepted by mail server")
                        : n.state === "failed"
                          ? t(
                              lang,
                              "تعذّر إرسال الإشعار؛ الاستفسار محفوظ",
                              "Notification failed; inquiry remains saved",
                            )
                          : t(
                              lang,
                              "بانتظار الإرسال أو إعادة المحاولة",
                              "Pending delivery or retry",
                            )}
                  </p>
                ))}
                <button className="text-link" onClick={() => query.refetch()}>
                  {t(lang, "تحديث الحالة", "Refresh state")}
                </button>
              </section>
            )}
            <div className="page-actions">
              <AppLink
                className="button button-secondary"
                go={go}
                href={withLang("/account/inquiries", lang)}
              >
                {t(lang, "كل استفساراتي", "All my inquiries")}
              </AppLink>
              <AppLink
                className="button button-primary"
                go={go}
                href={withLang("/inquiries/new", lang)}
              >
                {t(lang, "استفسار جديد", "New inquiry")}
              </AppLink>
            </div>
          </>
        )
      )}
    </AccountLayout>
  );
}
