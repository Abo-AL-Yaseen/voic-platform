import { useState } from "react";
import AppLink from "../components/AppLink";
import { EmptyState, IntegrationNotice, StatusBadge } from "../components/Feedback";
import { SelectField, TextAreaField, TextField } from "../components/FormFields";
import { Pagination, StaffLayout, TranslationTabs } from "../components/WorkspaceLayouts";
import { assets } from "../catalog";
import { products } from "../dev/staff-catalog";
import { msg, productName, withLang, type Lang } from "../i18n";
import { recipes } from "../recipes";

type Props = { lang: Lang; go: (href: string) => void; path: string; preview?: boolean };

export function StaffAccessPage({ lang, go }: Omit<Props, "path">) {
  return (
    <main className="access-page staff-access-page section-pad">
      <div>
        <StatusBadge
          status="warning"
          label={msg(lang, {
            ar: "وصول مقيّد",
            en: "Restricted access",
          })}
        />
        <h1>{msg(lang, { ar: "مساحة الموظفين", en: "Staff workspace" })}</h1>
        <p>
          {msg(lang, {
            ar: "يلزم تسجيل دخول موظف وصلاحيات يمنحها المسؤول ويطبقها الخادم. إخفاء الروابط في الواجهة ليس حماية.",
            en: "An employee session and server-enforced permissions are required. Hiding frontend links is not authorization.",
          })}
        </p>
        <AppLink
          href={withLang(`/login?returnTo=${encodeURIComponent("/staff")}`, lang)}
          go={go}
          className="button button-primary"
        >
          {msg(lang, {
            ar: "تسجيل الدخول المشترك",
            en: "Shared sign in",
          })}
        </AppLink>
      </div>
    </main>
  );
}

function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="workspace-page-heading">
      <div>
        <p className="eyebrow">VOIC staff</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Toolbar({
  lang,
  type = "content",
}: {
  lang: Lang;
  type?: "content" | "inquiries" | "people";
}) {
  return (
    <div className="list-toolbar">
      <TextField
        label={msg(lang, { ar: "بحث", en: "Search" })}
        type="search"
        placeholder={msg(lang, { ar: "ابحث…", en: "Search…" })}
      />
      <SelectField label={msg(lang, { ar: "الحالة", en: "Status" })}>
        <option>{msg(lang, { ar: "كل الحالات", en: "All statuses" })}</option>
        {type === "inquiries" ? (
          <>
            <option>submitted</option>
            <option>under_review</option>
            <option>awaiting_customer</option>
            <option>responded</option>
            <option>closed</option>
            <option>cancelled</option>
          </>
        ) : (
          <>
            <option>draft</option>
            <option>published</option>
            <option>archived</option>
          </>
        )}
      </SelectField>
      <SelectField
        label={
          type === "people"
            ? msg(lang, { ar: "نوع الحساب", en: "Account type" })
            : msg(lang, { ar: "الفئة", en: "Category" })
        }
      >
        <option>{msg(lang, { ar: "الكل", en: "All" })}</option>
      </SelectField>
    </div>
  );
}

function UnavailableTable({ lang, columns }: { lang: Lang; columns: string[] }) {
  return (
    <>
      <IntegrationNotice lang={lang} />
      <div className="responsive-table" tabIndex={0} role="region" aria-label={columns.join(", ")}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length}>
                {msg(lang, {
                  ar: "لا توجد بيانات متصلة. لم تُنشأ سجلات تجريبية.",
                  en: "No data source is connected. No demo records were created.",
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination lang={lang} />
    </>
  );
}

function Dashboard({ lang, go }: Omit<Props, "path">) {
  return (
    <>
      <PageHeading
        title={msg(lang, {
          ar: "لوحة الموظفين",
          en: "Staff dashboard",
        })}
        description={msg(lang, {
          ar: "نقطة بداية حسب الصلاحيات الفعلية.",
          en: "A starting point shaped by real permissions.",
        })}
      />
      <div className="staff-overview-grid">
        {[
          ["/staff/inquiries", "Supply inquiries", "Sales"],
          ["/staff/products", "Products & packaging", "Content Editor"],
          ["/staff/recipes", "Recipes", "Content Editor"],
          ["/staff/employees", "Employees & permissions", "Administrator"],
        ].map(([href, title, permission]) => (
          <AppLink key={href} href={withLang(href, lang)} go={go} className="staff-overview-link">
            <span>{permission}</span>
            <h2>{title}</h2>
            <p>—</p>
          </AppLink>
        ))}
      </div>
      <IntegrationNotice
        lang={lang}
        title={msg(lang, {
          ar: "لا توجد إحصاءات متاحة",
          en: "Statistics unavailable",
        })}
      >
        {msg(lang, {
          ar: "لن تُعرض أرقام صفرية أو رسوم قبل وصول بيانات حقيقية.",
          en: "No zero totals or charts are shown before real data is available.",
        })}
      </IntegrationNotice>
    </>
  );
}

function ProductsList({ lang, go }: Omit<Props, "path">) {
  return (
    <>
      <PageHeading
        title={msg(lang, {
          ar: "إدارة المنتجات",
          en: "Product management",
        })}
        description={msg(lang, {
          ar: "تحرير الموظفين معاينة غير متصلة؛ المنتجات العامة تُقرأ من API.",
          en: "Staff editing is a disconnected preview; public products use the API.",
        })}
        action={
          <AppLink
            href={withLang("/staff/products/new", lang)}
            go={go}
            className="button button-primary"
          >
            {msg(lang, { ar: "منتج جديد", en: "New product" })}
          </AppLink>
        }
      />
      <Toolbar lang={lang} />
      <div className="responsive-table" tabIndex={0}>
        <table className="data-table product-admin-table">
          <thead>
            <tr>
              <th>{msg(lang, { ar: "المنتج", en: "Product" })}</th>
              <th>ID</th>
              <th>{msg(lang, { ar: "الفئة", en: "Category" })}</th>
              <th>{msg(lang, { ar: "الحالة", en: "Status" })}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <img src={product.image || ""} alt="" />
                  <strong>{productName(product, lang)}</strong>
                </td>
                <td>
                  <code>{product.id}</code>
                </td>
                <td>{product.category}</td>
                <td>
                  <StatusBadge
                    status="info"
                    label={msg(lang, { ar: "بيانات محلية", en: "Local data" })}
                  />
                </td>
                <td>
                  <AppLink
                    href={withLang(`/staff/products/${product.id}/edit`, lang)}
                    go={go}
                    className="text-link"
                  >
                    {msg(lang, { ar: "تحرير", en: "Edit" })}
                  </AppLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductEditor({ lang, isNew = false }: { lang: Lang; isNew?: boolean }) {
  const [tab, setTab] = useState<Lang>(lang);
  const [notice, setNotice] = useState("");
  return (
    <>
      <PageHeading
        title={
          isNew
            ? msg(lang, { ar: "منتج جديد", en: "New product" })
            : msg(lang, { ar: "تحرير المنتج", en: "Edit product" })
        }
        description={msg(lang, {
          ar: "محرر منظم للمحتوى والتعبئة والصور.",
          en: "Structured editor for content, packaging and imagery.",
        })}
        action={
          <button className="button button-secondary" type="button">
            {msg(lang, { ar: "معاينة", en: "Preview" })}
          </button>
        }
      />
      <div className="editor-layout">
        <form
          className="workspace-form"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(
              msg(lang, {
                ar: "لم تُحفظ التغييرات؛ CMS غير متصل.",
                en: "Changes were not saved; the CMS is disconnected.",
              }),
            );
          }}
        >
          <div className="translation-tabs" role="tablist">
            {(["ar", "en"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={tab === code}
                className={tab === code ? "active" : ""}
                onClick={() => setTab(code)}
              >
                {code === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
          <TextField
            label={msg(lang, { ar: "اسم المنتج", en: "Product name" })}
            placeholder="—"
            required
          />
          <TextAreaField
            label={msg(lang, { ar: "الوصف", en: "Description" })}
            rows={5}
            placeholder="—"
            required
          />
          <TextAreaField
            label={msg(lang, {
              ar: "المكونات المعتمدة (اختياري)",
              en: "Approved ingredients (optional)",
            })}
            rows={3}
            placeholder="—"
          />
          <div className="form-grid">
            <TextField label={msg(lang, { ar: "العلامة", en: "Brand" })} />
            <SelectField label={msg(lang, { ar: "الفئة", en: "Category" })}>
              <option>—</option>
            </SelectField>
          </div>
          <fieldset className="editor-fieldset">
            <legend>{msg(lang, { ar: "الاستخدامات", en: "Uses" })}</legend>
            <div className="checkbox-grid">
              {["Cooking", "Frying", "Traditional sweets", "Baking", "Food industry"].map((use) => (
                <label key={use}>
                  <input type="checkbox" /> {use}
                </label>
              ))}
            </div>
          </fieldset>
          <section className="repeatable-editor">
            <div>
              <h2>
                {msg(lang, {
                  ar: "خيارات التعبئة",
                  en: "Package variants",
                })}
              </h2>
              <button type="button" className="text-link">
                + {msg(lang, { ar: "إضافة خيار", en: "Add variant" })}
              </button>
            </div>
            <div className="form-grid">
              <TextField
                label={msg(lang, { ar: "القيمة الرقمية", en: "Numeric value" })}
                type="number"
              />
              <SelectField label={msg(lang, { ar: "الوحدة", en: "Unit" })}>
                <option>g</option>
                <option>kg</option>
                <option>L</option>
              </SelectField>
              <SelectField label={msg(lang, { ar: "نوع التغليف", en: "Packaging type" })}>
                <option>tin</option>
                <option>drum</option>
                <option>carton</option>
                <option>PET</option>
              </SelectField>
            </div>
          </section>
          <section className="repeatable-editor">
            <h2>
              {msg(lang, {
                ar: "الصور والنص البديل",
                en: "Images and alt text",
              })}
            </h2>
            <input type="file" accept="image/*" />
            <TextField label={msg(lang, { ar: "النص البديل", en: "Alt text" })} />
          </section>
          <div className="page-actions">
            <button className="button button-primary" type="submit">
              {msg(lang, { ar: "حفظ المسودة", en: "Save draft" })}
            </button>
            <button className="button button-secondary" type="button">
              {msg(lang, { ar: "نشر", en: "Publish" })}
            </button>
          </div>
          {notice && (
            <p className="field-error" role="alert">
              {notice}
            </p>
          )}
        </form>
        <aside className="editor-sidebar">
          <SelectField
            label={msg(lang, {
              ar: "حالة النشر",
              en: "Publication status",
            })}
          >
            <option>draft</option>
            <option>published</option>
            <option>archived</option>
          </SelectField>
          <IntegrationNotice lang={lang} />
          <button className="text-link danger-link" type="button">
            {msg(lang, {
              ar: "أرشفة المنتج…",
              en: "Archive product…",
            })}
          </button>
          <p>
            {msg(lang, {
              ar: "الحذف المباشر غير متاح للمنتجات المرتبطة بالاستفسارات.",
              en: "Direct deletion is unavailable for products referenced by inquiries.",
            })}
          </p>
        </aside>
      </div>
    </>
  );
}

function TaxonomyPage({ lang, kind }: { lang: Lang; kind: "categories" | "uses" }) {
  const title =
    kind === "categories"
      ? msg(lang, { ar: "الفئات", en: "Categories" })
      : msg(lang, { ar: "الاستخدامات", en: "Uses" });
  return (
    <>
      <PageHeading
        title={title}
        description={msg(lang, {
          ar: "أسماء مترجمة وعلاقات مع المنتجات.",
          en: "Localized names and product relationships.",
        })}
        action={
          <button className="button button-primary">
            + {msg(lang, { ar: "إضافة", en: "Add" })}
          </button>
        }
      />
      <TranslationTabs lang={lang} />
      <div className="split-admin-view">
        <UnavailableTable lang={lang} columns={[title, "Products", "Status"]} />
        <form className="workspace-form compact-form">
          <TextField label={`${title} — العربية`} />
          <TextField label={`${title} — English`} />
          <IntegrationNotice
            lang={lang}
            title={msg(lang, {
              ar: "تحذير العلاقات",
              en: "Relationship warning",
            })}
          />
          <button className="button button-primary" disabled>
            {msg(lang, { ar: "حفظ", en: "Save" })}
          </button>
        </form>
      </div>
    </>
  );
}

function RecipesList({ lang, go }: Omit<Props, "path">) {
  return (
    <>
      <PageHeading
        title={msg(lang, { ar: "إدارة الوصفات", en: "Recipe management" })}
        description={msg(lang, {
          ar: "الوصفات الأربع الحالية ومحرر النشر.",
          en: "The four current recipes and publication editor.",
        })}
        action={
          <AppLink
            href={withLang("/staff/recipes/new", lang)}
            go={go}
            className="button button-primary"
          >
            {msg(lang, { ar: "وصفة جديدة", en: "New recipe" })}
          </AppLink>
        }
      />
      <Toolbar lang={lang} />
      <div className="admin-card-grid">
        {recipes.map((recipe) => (
          <article key={recipe.slug}>
            <img src={recipe.image} alt="" />
            <div>
              <h2>{lang === "ar" ? recipe.titleAr : recipe.titleEn}</h2>
              <code>{recipe.slug}</code>
              <AppLink
                href={withLang(`/staff/recipes/${recipe.slug}/edit`, lang)}
                go={go}
                className="text-link"
              >
                {msg(lang, { ar: "تحرير", en: "Edit" })}
              </AppLink>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function RecipeEditor({ lang, isNew = false }: { lang: Lang; isNew?: boolean }) {
  return (
    <>
      <PageHeading
        title={
          isNew
            ? msg(lang, { ar: "وصفة جديدة", en: "New recipe" })
            : msg(lang, { ar: "تحرير الوصفة", en: "Edit recipe" })
        }
        description={msg(lang, {
          ar: "مكونات وخطوات منظمة دون اختلاق تغذية أو حصص.",
          en: "Structured ingredients and steps without invented nutrition or servings.",
        })}
      />
      <form className="workspace-form">
        <TranslationTabs lang={lang} />
        <TextField label={msg(lang, { ar: "العنوان", en: "Title" })} />
        <TextAreaField label={msg(lang, { ar: "الوصف", en: "Description" })} rows={3} />
        <section className="repeatable-editor">
          <div>
            <h2>{msg(lang, { ar: "المكونات", en: "Ingredients" })}</h2>
            <button className="text-link" type="button">
              + Add ingredient
            </button>
          </div>
          <div className="form-grid">
            <TextField label="Amount" type="number" />
            <TextField label="Unit" />
            <TextField label="Ingredient" />
          </div>
        </section>
        <section className="repeatable-editor">
          <div>
            <h2>{msg(lang, { ar: "الخطوات المرتبة", en: "Ordered steps" })}</h2>
            <button className="text-link" type="button">
              + Add step
            </button>
          </div>
          <TextAreaField label="1" rows={3} />
        </section>
        <div className="form-grid">
          <TextField label={msg(lang, { ar: "الوقت المعروف", en: "Known time" })} />
          <TextField label="Temperature °C" type="number" />
        </div>
        <SelectField
          label={msg(lang, {
            ar: "المنتجات المرتبطة",
            en: "Related products",
          })}
          multiple
        >
          {products.map((product) => (
            <option key={product.id}>{productName(product, lang)}</option>
          ))}
        </SelectField>
        <input type="file" accept="image/*" />
        <div className="page-actions">
          <button className="button button-primary" type="button" disabled>
            Save draft
          </button>
          <button className="button button-secondary" type="button" disabled>
            Publish
          </button>
        </div>
        <IntegrationNotice lang={lang} />
      </form>
    </>
  );
}

function ContentPage({ lang }: { lang: Lang }) {
  const pages = [
    "Home",
    "Products",
    "Chooser",
    "Recipes",
    "Business",
    "About",
    "Contact",
    "Privacy",
  ];
  return (
    <>
      <PageHeading
        title={msg(lang, { ar: "محتوى الصفحات", en: "Page content" })}
        description={msg(lang, {
          ar: "حقول منظمة للأقسام المعتمدة، دون HTML أو JavaScript قابل للتنفيذ.",
          en: "Structured fields for approved sections, without executable HTML or JavaScript.",
        })}
      />
      <div className="split-admin-view">
        <nav className="content-page-list">
          {pages.map((page) => (
            <button key={page}>{page}</button>
          ))}
        </nav>
        <form className="workspace-form">
          <TranslationTabs lang={lang} />
          <TextField label="Page title" />
          <TextField label="Eyebrow" />
          <TextAreaField label="Introduction" rows={5} />
          <fieldset className="editor-fieldset">
            <legend>Verified contact details</legend>
            <TextField label="Email" value="info@voic.ps" readOnly />
            <TextField label="Telephone" value="+970 9 2324011" readOnly />
          </fieldset>
          <button className="button button-primary" disabled>
            Save draft
          </button>
          <IntegrationNotice lang={lang} />
        </form>
      </div>
    </>
  );
}

function MediaPage({ lang }: { lang: Lang }) {
  const media = [
    assets.logo,
    assets.ghazal,
    assets.nabateen,
    assets.kawakeb,
    assets.baking,
    assets.factory,
  ];
  return (
    <>
      <PageHeading
        title={msg(lang, { ar: "مكتبة الوسائط", en: "Media library" })}
        description={msg(lang, {
          ar: "عرض الأصول العامة الحالية ومعاينة ملفات محلية مؤقتة.",
          en: "Review current public assets and preview transient local files.",
        })}
        action={
          <label className="button button-primary">
            {msg(lang, {
              ar: "اختر ملفًا محليًا",
              en: "Choose local file",
            })}
            <input type="file" accept="image/*" hidden />
          </label>
        }
      />
      <IntegrationNotice
        lang={lang}
        title={msg(lang, {
          ar: "الاختيار لا يعني الرفع",
          en: "Selection is not an upload",
        })}
      />
      <div className="media-grid">
        {media.map((src) => (
          <article key={src}>
            <img src={src} alt="" />
            <code>{src}</code>
            <TextField label={msg(lang, { ar: "النص البديل", en: "Alt text" })} placeholder="—" />
          </article>
        ))}
      </div>
    </>
  );
}

function InquiryAdmin({ lang, detail = false }: { lang: Lang; detail?: boolean }) {
  if (!detail)
    return (
      <>
        <PageHeading
          title={msg(lang, {
            ar: "إدارة الاستفسارات",
            en: "Inquiry management",
          })}
          description={msg(lang, {
            ar: "للمبيعات المصرّح لهم.",
            en: "For authorized sales staff.",
          })}
        />
        <Toolbar lang={lang} type="inquiries" />
        <div className="form-grid">
          <TextField label="Destination" />
          <TextField label="Customer" />
          <TextField label="Date from" type="date" />
          <TextField label="Date to" type="date" />
        </div>
        <UnavailableTable
          lang={lang}
          columns={["Reference", "Customer", "Destination", "Products", "Status", "Date"]}
        />
      </>
    );
  return (
    <>
      <PageHeading
        title={msg(lang, { ar: "تفاصيل الاستفسار", en: "Inquiry details" })}
        description={msg(lang, {
          ar: "تفاصيل العملاء محمية وتحتاج تحقق صلاحية الخادم.",
          en: "Customer details are private and require server authorization.",
        })}
      />
      <IntegrationNotice lang={lang} />
      <div className="detail-placeholder-grid">
        {[
          "Reference & status",
          "Customer & destination",
          "Products, packages & quantities",
          "Status history",
        ].map((x) => (
          <section key={x}>
            <h2>{x}</h2>
            <p>—</p>
          </section>
        ))}
      </div>
      <div className="staff-message-grid">
        <form className="workspace-form">
          <h2>Customer-visible response</h2>
          <TextAreaField label="Response" rows={6} />
          <SelectField label="Next status">
            <option>under_review</option>
            <option>awaiting_customer</option>
            <option>responded</option>
            <option>closed</option>
            <option>cancelled</option>
          </SelectField>
          <button className="button button-primary" disabled>
            Send response
          </button>
        </form>
        <form className="workspace-form internal-note">
          <h2>INTERNAL NOTE</h2>
          <p>Never visible to customers or content editors.</p>
          <TextAreaField label="Internal note" rows={6} />
          <button className="button button-secondary" disabled>
            Save internal note
          </button>
        </form>
      </div>
    </>
  );
}

function PeoplePage({ lang, employees = false }: { lang: Lang; employees?: boolean }) {
  return (
    <>
      <PageHeading
        title={
          employees
            ? msg(lang, {
                ar: "الموظفون والصلاحيات",
                en: "Employees and permissions",
              })
            : msg(lang, { ar: "العملاء", en: "Customers" })
        }
        description={
          employees
            ? msg(lang, {
                ar: "واجهة للمسؤول فقط؛ لا يوجد تسجيل موظفين عام.",
                en: "Administrator-only interface; there is no public staff registration.",
              })
            : msg(lang, {
                ar: "سياق الفرد أو الشركة وحالة التحقق والاستفسارات.",
                en: "Individual/company context, verification and related inquiries.",
              })
        }
        action={
          employees ? <button className="button button-primary">Invite employee</button> : undefined
        }
      />
      <Toolbar lang={lang} type="people" />
      {employees && (
        <form className="workspace-form compact-form">
          <h2>Provision employee</h2>
          <TextField label="Work email" type="email" />
          <TextField label="Full name" />
          <fieldset className="editor-fieldset">
            <legend>Permissions</legend>
            {["Administrator", "Sales", "Content Editor"].map((role) => (
              <label key={role}>
                <input type="checkbox" /> {role}
              </label>
            ))}
          </fieldset>
          <SelectField label="Account status">
            <option>active</option>
            <option>disabled</option>
          </SelectField>
          <button className="button button-primary" disabled>
            Send invitation
          </button>
          <IntegrationNotice lang={lang} title="No invitation is sent in preview" />
        </form>
      )}
      <UnavailableTable
        lang={lang}
        columns={
          employees
            ? ["Employee", "Permissions", "Status", "Last updated"]
            : ["Customer", "Type", "Verification", "Status", "Inquiries"]
        }
      />
    </>
  );
}

function AuditLog({ lang }: { lang: Lang }) {
  return (
    <>
      <PageHeading
        title={msg(lang, { ar: "سجل التدقيق", en: "Audit log" })}
        description={msg(lang, {
          ar: "سجل خادمي غير قابل للتعديل للمسؤولين.",
          en: "Server-generated, immutable history for administrators.",
        })}
      />
      <div className="list-toolbar">
        <TextField label="Actor" />
        <TextField label="Action" />
        <TextField label="Date" type="date" />
      </div>
      <UnavailableTable lang={lang} columns={["Actor", "Action", "Target", "Timestamp"]} />
    </>
  );
}

export function StaffPreviewPage({ lang, go, path }: Props) {
  const active = path;
  let content: React.ReactNode;
  if (path === "/staff") content = <Dashboard lang={lang} go={go} preview />;
  else if (path === "/staff/products") content = <ProductsList lang={lang} go={go} preview />;
  else if (path === "/staff/products/new") content = <ProductEditor lang={lang} isNew />;
  else if (/^\/staff\/products\/[^/]+\/edit$/.test(path)) content = <ProductEditor lang={lang} />;
  else if (path === "/staff/categories") content = <TaxonomyPage lang={lang} kind="categories" />;
  else if (path === "/staff/uses") content = <TaxonomyPage lang={lang} kind="uses" />;
  else if (path === "/staff/recipes") content = <RecipesList lang={lang} go={go} preview />;
  else if (path === "/staff/recipes/new") content = <RecipeEditor lang={lang} isNew />;
  else if (/^\/staff\/recipes\/[^/]+\/edit$/.test(path)) content = <RecipeEditor lang={lang} />;
  else if (path === "/staff/content") content = <ContentPage lang={lang} />;
  else if (path === "/staff/media") content = <MediaPage lang={lang} />;
  else if (path === "/staff/inquiries") content = <InquiryAdmin lang={lang} />;
  else if (/^\/staff\/inquiries\/[^/]+$/.test(path)) content = <InquiryAdmin lang={lang} detail />;
  else if (path === "/staff/customers") content = <PeoplePage lang={lang} />;
  else if (path === "/staff/employees") content = <PeoplePage lang={lang} employees />;
  else if (path === "/staff/audit-log") content = <AuditLog lang={lang} />;
  else
    content = (
      <EmptyState
        title="Staff screen unavailable"
        description="This preview route is not registered."
      />
    );
  return (
    <StaffLayout lang={lang} go={go} active={active} preview>
      {content}
    </StaffLayout>
  );
}
