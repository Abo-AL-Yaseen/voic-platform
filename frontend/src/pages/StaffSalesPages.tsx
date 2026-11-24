import { useState } from "react";
import AppLink from "../components/AppLink";
import { StaffLayout } from "../components/WorkspaceLayouts";
import { IntegrationNotice } from "../components/Feedback";
import { TextField, SelectField } from "../components/FormFields";
import {
  InquiryConversation,
  RecordPager,
  WorkflowComposer,
} from "../components/InquiryConversation";
import { AccountHeading } from "./InquiryAccountPages";
import { useStaffAccess } from "../hooks/account/queries";
import { useAuth, useLogout, authFailure } from "../hooks/auth/queries";
import {
  useStaffInquiry,
  useStaffInquiryList,
  useStaffInquiryStats,
} from "../hooks/staff-inquiries/queries";
import { inquiryFailure } from "../hooks/inquiries/queries";
import { submittedStatuses } from "../services/inquiries";
import { inquiryStatus } from "../utils/inquiryLabels";
import { staffInquiryFilters, staffInquiryLocation } from "../utils/staffInquiryLocation";
import { msg, withLang, type Lang } from "../i18n";
const t = (lang: Lang, ar: string, en: string) => msg(lang, { ar, en });
const date = (v: string, lang: Lang) =>
  new Date(v).toLocaleString(lang === "ar" ? "ar-PS" : "en-GB");
type Props = { lang: Lang; go: (href: string) => void; path: string; search: string };
export function StaffWorkspace({ lang, go, path, search }: Props) {
  const access = useStaffAccess(),
    logout = useLogout(),
    user = useAuth().session?.user;
  const sales = !!access.data && ["administrator", "sales"].includes(access.data.role);
  return (
    <StaffLayout lang={lang} go={go} active={path}>
      <div className="page-actions">
        <button
          type="button"
          className="text-link"
          disabled={logout.isPending}
          onClick={async () => {
            try {
              await logout.mutateAsync();
              go(withLang("/login", lang));
            } catch {}
          }}
        >
          {t(lang, "تسجيل الخروج", "Log out")}
        </button>
      </div>
      {logout.error && <p role="alert">{authFailure(logout.error, lang)}</p>}
      {access.isPending ? (
        <p role="status">{t(lang, "جارٍ تحميل الصلاحيات…", "Loading permissions…")}</p>
      ) : access.error ? (
        <div role="alert">
          <p>{authFailure(access.error, lang)}</p>
          <button onClick={() => access.refetch()}>{t(lang, "إعادة المحاولة", "Retry")}</button>
        </div>
      ) : !sales ? (
        <>
          <AccountHeading
            title={t(lang, "مساحة الموظفين", "Staff workspace")}
            description={t(
              lang,
              "إدارة الاستفسارات متاحة للمبيعات والمسؤولين فقط.",
              "Inquiry management is available to sales and administrators only.",
            )}
          />
          <IntegrationNotice lang={lang}>
            {t(lang, "إدارة المحتوى غير متصلة بعد.", "Content management is not connected yet.")}
          </IntegrationNotice>
        </>
      ) : (
        <>
          {!user?.emailVerified && (
            <AppLink
              className="button button-secondary"
              go={go}
              href={withLang(`/verify-email?returnTo=${encodeURIComponent(path)}`, lang)}
            >
              {t(
                lang,
                "أكد البريد لتفعيل إجراءات حسابك",
                "Verify email before using account actions",
              )}
            </AppLink>
          )}
          {path === "/staff" ? (
            <StaffDashboard lang={lang} go={go} />
          ) : path === "/staff/inquiries" ? (
            <StaffInquiryList key={search} lang={lang} go={go} search={search} />
          ) : path.startsWith("/staff/inquiries/") ? (
            <StaffInquiryDetail key={path} lang={lang} id={path.split("/").at(-1) || ""} />
          ) : (
            <>
              <AccountHeading
                title={t(lang, "مساحة الموظفين", "Staff workspace")}
                description={t(
                  lang,
                  "هذا القسم غير متصل بعد.",
                  "This section is not connected yet.",
                )}
              />
              <IntegrationNotice lang={lang} />
            </>
          )}
        </>
      )}
    </StaffLayout>
  );
}
function StaffDashboard({ lang, go }: { lang: Lang; go: Props["go"] }) {
  const query = useStaffInquiryStats();
  return (
    <>
      <AccountHeading
        title={t(lang, "لوحة المبيعات", "Sales dashboard")}
        description={t(
          lang,
          "إحصاءات جميع الاستفسارات المرسلة فقط؛ لا تشمل مسودات العملاء أو فلاتر القائمة.",
          "Statistics for all submitted inquiries only; customer drafts and list filters are excluded.",
        )}
      />
      {query.isPending ? (
        <p role="status">{t(lang, "جارٍ تحميل الإحصاءات…", "Loading statistics…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{inquiryFailure(query.error, lang)}</p>
          <button onClick={() => query.refetch()}>{t(lang, "إعادة المحاولة", "Retry")}</button>
        </div>
      ) : (
        query.data && (
          <>
            <p role="status">
              {t(lang, "إجمالي الاستفسارات المرسلة", "Total submitted inquiries")}:{" "}
              {query.data.total}
            </p>
            <div className="staff-overview-grid">
              {submittedStatuses.map((s) => (
                <AppLink
                  key={s}
                  className="staff-overview-link"
                  go={go}
                  href={withLang(
                    staffInquiryLocation({
                      q: "",
                      destination: "",
                      status: s,
                      sort: "desc",
                      page: 1,
                      pageSize: 10,
                    }),
                    lang,
                  )}
                >
                  <h2>{inquiryStatus(s, lang)}</h2>
                  <strong>{query.data!.byStatus[s]}</strong>
                </AppLink>
              ))}
            </div>
            {!query.data.writesEnabled && (
              <p>
                {t(
                  lang,
                  "هذه البيئة تتيح القراءة فقط لإجراءات الموظفين.",
                  "Staff business actions are read-only in this environment.",
                )}
              </p>
            )}
          </>
        )
      )}
      <button className="button button-secondary" onClick={() => query.refetch()}>
        {t(lang, "تحديث الإحصاءات", "Refresh statistics")}
      </button>
      <IntegrationNotice lang={lang}>
        {t(
          lang,
          "إدارة المنتجات والمحتوى والموظفين غير متصلة هنا. لا توجد أرقام مبيعات أو مخزون.",
          "Product, content and employee management are not connected here. No revenue or stock figures are shown.",
        )}
      </IntegrationNotice>
    </>
  );
}
function StaffInquiryList({ lang, go, search }: { lang: Lang; go: Props["go"]; search: string }) {
  const filters = staffInquiryFilters(search),
    query = useStaffInquiryList(filters);
  const [values, setValues] = useState(filters);
  const navigate = (patch: Partial<typeof filters>) =>
    go(withLang(staffInquiryLocation({ ...filters, ...patch }), lang));
  return (
    <>
      <AccountHeading
        title={t(lang, "إدارة الاستفسارات", "Inquiry management")}
        description={t(
          lang,
          "الاستفسارات المرسلة وبيانات التواصل اللازمة للمراجعة. مسودات العملاء خاصة بأصحابها.",
          "Submitted inquiries and contact information needed for review. Customer drafts remain private to their owners.",
        )}
      />
      <form
        className="list-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ ...values, page: 1 });
        }}
      >
        <TextField
          label={t(lang, "بحث بالمرجع أو العميل", "Search reference or customer")}
          value={values.q}
          maxLength={100}
          onChange={(e) => setValues({ ...values, q: e.target.value })}
        />
        <TextField
          label={t(lang, "الوجهة (مطابقة كاملة)", "Destination (exact match)")}
          value={values.destination}
          maxLength={200}
          onChange={(e) => setValues({ ...values, destination: e.target.value })}
        />
        <SelectField
          label={t(lang, "الحالة", "Status")}
          value={values.status}
          onChange={(e) => setValues({ ...values, status: e.target.value })}
        >
          <option value="">{t(lang, "كل الحالات", "All statuses")}</option>
          {submittedStatuses.map((s) => (
            <option key={s} value={s}>
              {inquiryStatus(s, lang)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t(lang, "ترتيب تاريخ الإرسال", "Submission date order")}
          value={values.sort}
          onChange={(e) => setValues({ ...values, sort: e.target.value })}
        >
          <option value="desc">{t(lang, "الأحدث أولًا", "Newest first")}</option>
          <option value="asc">{t(lang, "الأقدم أولًا", "Oldest first")}</option>
        </SelectField>
        <button className="button button-primary">{t(lang, "تطبيق البحث", "Apply search")}</button>
        <AppLink className="text-link" go={go} href={withLang("/staff/inquiries", lang)}>
          {t(lang, "مسح الفلاتر", "Clear filters")}
        </AppLink>
      </form>
      <button className="button button-secondary" onClick={() => query.refetch()}>
        {t(lang, "تحديث القائمة", "Refresh list")}
      </button>
      {query.isPending ? (
        <p role="status">{t(lang, "جارٍ تحميل الاستفسارات…", "Loading inquiries…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{inquiryFailure(query.error, lang)}</p>
          <button onClick={() => query.refetch()}>{t(lang, "إعادة المحاولة", "Retry")}</button>
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
                aria-label={t(lang, "استفسارات المبيعات", "Sales inquiries")}
                tabIndex={0}
              >
                <table className="data-table">
                  <thead>
                    <tr>
                      {[
                        t(lang, "المرجع", "Reference"),
                        t(lang, "العميل", "Customer"),
                        t(lang, "الوجهة", "Destination"),
                        t(lang, "الحالة", "Status"),
                        t(lang, "تاريخ الإرسال", "Submitted at"),
                      ].map((x) => (
                        <th scope="col" key={x}>
                          {x}
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
                            href={withLang(`/staff/inquiries/${i.id}`, lang)}
                          >
                            {i.reference}
                          </AppLink>
                        </td>
                        <td>
                          {i.customer.name}
                          <br />
                          {i.customer.company}
                          <br />
                          {i.customer.email}
                        </td>
                        <td>{i.destination}</td>
                        <td>{inquiryStatus(i.status, lang)}</td>
                        <td>{date(i.submittedAt, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <RecordPager
              info={{
                page: filters.page,
                total: query.data.total,
                totalPages: query.data.totalPages,
              }}
              lang={lang}
              onPage={(page) => navigate({ page })}
            />
          </>
        )
      )}
    </>
  );
}
function StaffInquiryDetail({ lang, id }: { lang: Lang; id: string }) {
  const [pages, setPages] = useState({ messagePage: 1, historyPage: 1, notePage: 1 }),
    query = useStaffInquiry(id, pages),
    i = query.data;
  return (
    <>
      <AccountHeading
        title={t(lang, "تفاصيل الاستفسار", "Inquiry details")}
        description={i?.reference || ""}
      />
      {query.isPending ? (
        <p role="status">{t(lang, "جارٍ التحميل…", "Loading…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{inquiryFailure(query.error, lang)}</p>
          <button onClick={() => query.refetch()}>{t(lang, "إعادة المحاولة", "Retry")}</button>
        </div>
      ) : (
        i && (
          <>
            <p role="status">
              {inquiryStatus(i.status, lang)} · {i.submittedAt && date(i.submittedAt, lang)}
            </p>
            <p className="commercial-note">
              {t(
                lang,
                "الاستفسار ليس طلب شراء مقبولًا؛ الرد والإغلاق لا يعنيان دفعًا أو تنفيذًا.",
                "An inquiry is not an accepted order; responding or closing does not mean payment or fulfillment.",
              )}
            </p>
            <div className="detail-placeholder-grid inquiry-record-grid">
              <section>
                <h2>{t(lang, "العميل والتواصل", "Customer and contact")}</h2>
                <dl className="inquiry-detail-fields">
                  {[
                    [t(lang, "الاسم", "Name"), i.fields.name],
                    [t(lang, "الشركة", "Company"), i.fields.company],
                    [t(lang, "البريد الإلكتروني", "Email"), i.contactEmail],
                    [t(lang, "الهاتف", "Phone"), i.fields.phone],
                    [t(lang, "الوجهة", "Destination"), i.fields.destination],
                    [t(lang, "ملاحظات العميل", "Customer notes"), i.fields.notes],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section>
                <h2>
                  {t(lang, "المنتجات والكميات عند الإرسال", "Products and quantities at submission")}
                </h2>
                {i.items.map((item, index) => (
                  <article className="inquiry-detail-line" key={index}>
                    <h3>{item.snapshot?.name}</h3>
                    <p>{item.snapshot?.description}</p>
                    <p>
                      {item.snapshot?.package ||
                        t(lang, "مناقشة التعبئة مع المبيعات", "Discuss packaging with sales")}
                    </p>
                    <p>
                      {item.quantity}{" "}
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
            </div>
            <section className="workspace-section">
              <h2>{t(lang, "سجل الحالة المرئي للعميل", "Customer-visible status history")}</h2>
              <ol>
                {i.history.map((h, index) => (
                  <li key={index}>
                    {inquiryStatus(h.status, lang)} — {date(h.occurredAt, lang)}
                  </li>
                ))}
              </ol>
              <RecordPager
                info={i.historyPagination}
                lang={lang}
                onPage={(historyPage) => setPages({ ...pages, historyPage })}
              />
            </section>
            <InquiryConversation
              record={i}
              lang={lang}
              onPage={(messagePage) => setPages({ ...pages, messagePage })}
            />
            <WorkflowComposer
              key={i.id}
              staff
              record={i}
              lang={lang}
              refresh={() => query.refetch()}
              onApplied={() => setPages({ messagePage: 1, historyPage: 1, notePage: 1 })}
            />
            <section className="workspace-section internal-note">
              <h2>{t(lang, "الملاحظات الداخلية — للموظفين فقط", "Internal notes — staff only")}</h2>
              {!i.internalNotes.length ? (
                <p>{t(lang, "لا توجد ملاحظات في هذه الصفحة.", "No notes on this page.")}</p>
              ) : (
                i.internalNotes.map((n) => (
                  <article className="inquiry-message" key={n.id}>
                    <time dateTime={n.createdAt}>{date(n.createdAt, lang)}</time>
                    <p>{n.text}</p>
                  </article>
                ))
              )}
              <RecordPager
                info={i.notePagination}
                lang={lang}
                onPage={(notePage) => setPages({ ...pages, notePage })}
              />
            </section>
          </>
        )
      )}
    </>
  );
}
