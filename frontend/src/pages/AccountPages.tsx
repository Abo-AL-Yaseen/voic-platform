import { useState, type FormEvent } from "react";
import AppLink from "../components/AppLink";
import { EmptyState, IntegrationNotice, StatusBadge } from "../components/Feedback";
import { PasswordField, SelectField, TextAreaField, TextField } from "../components/FormFields";
import { AccountLayout, Pagination } from "../components/WorkspaceLayouts";
import { msg, withLang, type Lang } from "../i18n";

type Props = { lang: Lang; go: (href: string) => void; preview?: boolean; inquiryId?: string };

export function AccountAccessPage({ lang, go }: Props) {
  return (
    <main className="access-page section-pad">
      <div>
        <p className="eyebrow">{msg(lang, { ar: "حساب العميل", en: "Customer account" })}</p>
        <h1>
          {msg(lang, {
            ar: "سجّل الدخول لعرض حسابك",
            en: "Sign in to view your account",
          })}
        </h1>
        <p>
          {msg(lang, {
            ar: "تبقى المنتجات والوصفات متاحة للجميع. الحساب مطلوب فقط لحفظ ومتابعة استفسارات التوريد.",
            en: "Products and recipes remain public. An account is only required to save and track supply inquiries.",
          })}
        </p>
        <div className="page-actions">
          <AppLink
            href={withLang("/login?returnTo=/account", lang)}
            go={go}
            className="button button-primary"
          >
            {msg(lang, { ar: "تسجيل الدخول", en: "Sign in" })}
          </AppLink>
          <AppLink
            href={withLang("/register?returnTo=/account", lang)}
            go={go}
            className="button button-secondary"
          >
            {msg(lang, { ar: "إنشاء حساب", en: "Create account" })}
          </AppLink>
        </div>
      </div>
    </main>
  );
}

function PreviewHeader({
  lang,
  title,
  description,
}: {
  lang: Lang;
  title: string;
  description: string;
}) {
  return (
    <header className="workspace-page-heading">
      <div>
        <p className="eyebrow">{msg(lang, { ar: "معاينة واجهة", en: "Interface preview" })}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <StatusBadge status="warning" label={msg(lang, { ar: "غير متصل", en: "Disconnected" })} />
    </header>
  );
}

export function AccountOverviewPage({ lang, go }: Props) {
  return (
    <AccountLayout lang={lang} go={go} active="/account">
      <PreviewHeader
        lang={lang}
        title={msg(lang, { ar: "نظرة عامة", en: "Account overview" })}
        description={msg(lang, {
          ar: "ملخص الحساب وحالة التحقق والاستفسارات دون أرقام مختلقة.",
          en: "Account, verification and inquiry summary without fabricated activity.",
        })}
      />
      <div className="account-summary-grid">
        <section>
          <span>{msg(lang, { ar: "حالة البريد", en: "Email status" })}</span>
          <StatusBadge
            status="success"
            label={msg(lang, {
              ar: "تم التحقق — مثال بصري",
              en: "Verified — visual example",
            })}
          />
          <p>
            {msg(lang, {
              ar: "يتطلب التحقق الفعلي استجابة من الخادم.",
              en: "Actual verification requires a server response.",
            })}
          </p>
        </section>
        <section>
          <span>{msg(lang, { ar: "استفسارات التوريد", en: "Supply inquiries" })}</span>
          <strong>—</strong>
          <p>
            {msg(lang, {
              ar: "لا تُعرض قيمة صفرية قبل تحميل البيانات.",
              en: "No zero value is shown before data is loaded.",
            })}
          </p>
        </section>
      </div>
      <IntegrationNotice lang={lang} />
      <EmptyState
        title={msg(lang, {
          ar: "لا توجد بيانات استفسارات محمّلة",
          en: "No inquiry data loaded",
        })}
        description={msg(lang, {
          ar: "هذه ليست قائمة فارغة مؤكدة؛ يلزم ربط الحساب بالخدمة.",
          en: "This is not a confirmed empty list; account integration is required.",
        })}
        action={
          <AppLink
            href={withLang("/inquiries/new", lang)}
            go={go}
            className="button button-primary"
          >
            {msg(lang, { ar: "ابدأ استفسارًا", en: "Start an inquiry" })}
          </AppLink>
        }
      />
    </AccountLayout>
  );
}

export function ProfilePage({ lang, go }: Props) {
  const [kind, setKind] = useState("company");
  const [notice, setNotice] = useState("");
  return (
    <AccountLayout lang={lang} go={go} active="/account/profile">
      <PreviewHeader
        lang={lang}
        title={msg(lang, { ar: "الملف الشخصي", en: "Profile" })}
        description={msg(lang, {
          ar: "بيانات الحساب القابلة للتعديل.",
          en: "Editable account details.",
        })}
      />
      <form
        className="workspace-form"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(
            msg(lang, {
              ar: "لم تُحفظ التغييرات؛ خدمة الحساب غير متصلة.",
              en: "Changes were not saved; the account service is disconnected.",
            }),
          );
        }}
      >
        <div className="form-grid">
          <TextField
            label={msg(lang, { ar: "الاسم الكامل", en: "Full name" })}
            placeholder="—"
            required
          />
          <SelectField
            label={msg(lang, { ar: "نوع الحساب", en: "Account type" })}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="individual">{msg(lang, { ar: "فرد", en: "Individual" })}</option>
            <option value="company">{msg(lang, { ar: "شركة", en: "Company" })}</option>
          </SelectField>
          {kind === "company" && (
            <TextField
              label={msg(lang, { ar: "اسم الشركة", en: "Company name" })}
              placeholder="—"
              required
            />
          )}
          <TextField label={msg(lang, { ar: "الدولة", en: "Country" })} placeholder="—" required />
          <TextField
            label={msg(lang, {
              ar: "الهاتف (اختياري)",
              en: "Phone (optional)",
            })}
            type="tel"
            placeholder="—"
          />
          <TextField
            label={msg(lang, { ar: "البريد الإلكتروني", en: "Email" })}
            type="email"
            placeholder="—"
            disabled
            hint={msg(lang, {
              ar: "تغيير البريد يتطلب تحققًا جديدًا.",
              en: "Changing email requires reverification.",
            })}
          />
        </div>
        <div className="page-actions">
          <button className="button button-primary" type="submit">
            {msg(lang, { ar: "حفظ التغييرات", en: "Save changes" })}
          </button>
          <button className="button button-secondary" type="reset">
            {msg(lang, { ar: "إلغاء", en: "Cancel" })}
          </button>
        </div>
        {notice && (
          <p className="field-error" role="alert">
            {notice}
          </p>
        )}
      </form>
    </AccountLayout>
  );
}

export function SecurityPage({ lang, go }: Props) {
  const [notice, setNotice] = useState("");
  return (
    <AccountLayout lang={lang} go={go} active="/account/security">
      <PreviewHeader
        lang={lang}
        title={msg(lang, { ar: "أمان الحساب", en: "Account security" })}
        description={msg(lang, {
          ar: "تغيير كلمة المرور وإدارة الجلسة الحالية.",
          en: "Password change and current-session controls.",
        })}
      />
      <form
        className="workspace-form compact-form"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(
            msg(lang, {
              ar: "لم يتم تغيير كلمة المرور؛ الخدمة غير متصلة.",
              en: "Password was not changed; the service is disconnected.",
            }),
          );
        }}
      >
        <PasswordField
          lang={lang}
          label={msg(lang, {
            ar: "كلمة المرور الحالية",
            en: "Current password",
          })}
          required
        />
        <PasswordField
          lang={lang}
          label={msg(lang, { ar: "كلمة المرور الجديدة", en: "New password" })}
          required
        />
        <PasswordField
          lang={lang}
          label={msg(lang, {
            ar: "تأكيد كلمة المرور",
            en: "Confirm password",
          })}
          required
        />
        <button className="button button-primary" type="submit">
          {msg(lang, {
            ar: "تحديث كلمة المرور",
            en: "Update password",
          })}
        </button>
        {notice && (
          <p className="field-error" role="alert">
            {notice}
          </p>
        )}
      </form>
      <section className="workspace-section">
        <h2>{msg(lang, { ar: "الجلسة الحالية", en: "Current session" })}</h2>
        <p>
          {msg(lang, {
            ar: "لا تُعرض سجلات أجهزة أو مواقع غير حقيقية.",
            en: "No fabricated device or location history is shown.",
          })}
        </p>
        <button className="button button-secondary" type="button">
          {msg(lang, {
            ar: "تسجيل الخروج من هذه الجلسة",
            en: "Log out of this session",
          })}
        </button>
      </section>
    </AccountLayout>
  );
}

export function InquiryListPage({ lang, go }: Props) {
  return (
    <AccountLayout lang={lang} go={go} active="/account/inquiries">
      <PreviewHeader
        lang={lang}
        title={msg(lang, { ar: "استفساراتي", en: "My inquiries" })}
        description={msg(lang, {
          ar: "متابعة استفسارات التوريد المحفوظة للحساب.",
          en: "Track supply inquiries saved to the account.",
        })}
      />
      <div className="list-toolbar">
        <TextField
          label={msg(lang, { ar: "ابحث بالمرجع", en: "Search reference" })}
          type="search"
          placeholder="—"
        />
        <SelectField label={msg(lang, { ar: "الحالة", en: "Status" })}>
          <option>{msg(lang, { ar: "كل الحالات", en: "All statuses" })}</option>
          <option>submitted</option>
          <option>under_review</option>
          <option>awaiting_customer</option>
          <option>responded</option>
          <option>closed</option>
          <option>cancelled</option>
        </SelectField>
        <SelectField label={msg(lang, { ar: "ترتيب التاريخ", en: "Date order" })}>
          <option>{msg(lang, { ar: "الأحدث أولًا", en: "Newest first" })}</option>
          <option>{msg(lang, { ar: "الأقدم أولًا", en: "Oldest first" })}</option>
        </SelectField>
      </div>
      <IntegrationNotice lang={lang} />
      <div
        className="responsive-table"
        role="region"
        aria-label={msg(lang, { ar: "قائمة الاستفسارات", en: "Inquiry list" })}
        tabIndex={0}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>{msg(lang, { ar: "المرجع", en: "Reference" })}</th>
              <th>{msg(lang, { ar: "المنتجات", en: "Products" })}</th>
              <th>{msg(lang, { ar: "الوجهة", en: "Destination" })}</th>
              <th>{msg(lang, { ar: "الحالة", en: "Status" })}</th>
              <th>{msg(lang, { ar: "التاريخ", en: "Date" })}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5}>
                {msg(lang, {
                  ar: "لا توجد بيانات محمّلة. هذه ليست نتيجة صفر مؤكدة.",
                  en: "No data is loaded. This is not a confirmed zero result.",
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination lang={lang} />
    </AccountLayout>
  );
}

export function InquiryDetailPage({ lang, go, inquiryId }: Props) {
  return (
    <AccountLayout lang={lang} go={go} active="/account/inquiries">
      <PreviewHeader
        lang={lang}
        title={msg(lang, { ar: "تفاصيل الاستفسار", en: "Inquiry details" })}
        description={msg(lang, {
          ar: "يُحمّل السجل الحقيقي حسب المرجع وملكية الحساب.",
          en: "The real record is loaded by reference and account ownership.",
        })}
      />
      <IntegrationNotice
        lang={lang}
        title={
          inquiryId
            ? msg(lang, {
                ar: "لا يمكن تحميل هذا الاستفسار",
                en: "This inquiry cannot be loaded",
              })
            : undefined
        }
      >
        {msg(lang, {
          ar: "لم يتم اختلاق سجل لهذا المعرّف. يلزم API يتحقق من الملكية.",
          en: "No record was fabricated for this identifier. An ownership-enforcing API is required.",
        })}
      </IntegrationNotice>
      <div className="detail-placeholder-grid">
        {[
          "Reference / status",
          "Products / packages / quantities",
          "Destination / submitted details",
          "Status history",
          "Customer-visible messages",
        ].map((label) => (
          <section key={label}>
            <h2>{label}</h2>
            <p>—</p>
          </section>
        ))}
      </div>
      <form className="workspace-form">
        <TextAreaField
          label={msg(lang, {
            ar: "رد بمعلومات إضافية",
            en: "Reply with additional information",
          })}
          rows={5}
          placeholder="—"
        />
        <button className="button button-primary" type="button" disabled>
          {msg(lang, { ar: "إرسال الرد", en: "Send reply" })}
        </button>
        <button className="text-link danger-link" type="button" disabled>
          {msg(lang, {
            ar: "طلب إلغاء الاستفسار",
            en: "Request cancellation",
          })}
        </button>
      </form>
    </AccountLayout>
  );
}
