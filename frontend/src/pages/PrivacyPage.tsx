import AppLink from "../components/AppLink";
import { msg, withLang, type Lang } from "../i18n";

export default function PrivacyPage({ lang, go }: { lang: Lang; go: (href: string) => void }) {
  const sections = [
    {
      title: msg(lang, {
        ar: "الجهة المسؤولة والتواصل",
        en: "Responsible company and contact",
      }),
      body: msg(lang, {
        ar: "شركة مصانع الزيوت النباتية، المنطقة الصناعية الشرقية، نابلس، فلسطين. للاستفسارات: info@voic.ps.",
        en: "Vegetable Oil Industries Co., Eastern Industrial Area, Nablus, Palestine. Contact: info@voic.ps.",
      }),
    },
    {
      title: msg(lang, {
        ar: "البيانات التي قد تُجمع",
        en: "Data that may be collected",
      }),
      body: msg(lang, {
        ar: "قد تشمل بيانات الحساب الاسم والبريد ونوع الحساب والشركة والدولة والهاتف الاختياري، إضافة إلى منتجات الاستفسار والكميات والوجهة والملاحظات.",
        en: "Account data may include name, email, account type, company, country and optional phone, plus inquiry products, quantities, destination and notes.",
      }),
    },
    {
      title: msg(lang, { ar: "الأغراض", en: "Purposes" }),
      body: msg(lang, {
        ar: "إدارة الحساب والتحقق من البريد ومراجعة استفسارات التوريد والتواصل بشأنها وحماية الخدمة.",
        en: "Account administration, email verification, review of supply inquiries, related communication and service protection.",
      }),
    },
    {
      title: msg(lang, {
        ar: "الوصول والاحتفاظ",
        en: "Access and retention",
      }),
      body: msg(lang, {
        ar: "يجب تحديد صلاحيات الوصول وفترات الاحتفاظ والحذف في سياسة معتمدة قبل النشر. لا تحدد هذه المسودة مدة قانونية.",
        en: "Access controls and retention/deletion periods must be approved before publication. This draft does not state a legal retention period.",
      }),
    },
    {
      title: msg(lang, {
        ar: "طلبات المستخدم",
        en: "User requests",
      }),
      body: msg(lang, {
        ar: "يجب أن توضح النسخة القانونية المعتمدة طريقة طلب الوصول أو التصحيح أو الحذف والقيود التي قد تنطبق.",
        en: "The approved legal version must explain how to request access, correction or deletion and any applicable limitations.",
      }),
    },
    {
      title: msg(lang, {
        ar: "ملفات الارتباط والتحليلات",
        en: "Cookies and analytics",
      }),
      body: msg(lang, {
        ar: "لا يضيف هذا التنفيذ أدوات تحليلات تسويقية. يجب توثيق أي ملفات ارتباط أو خدمات مستقبلية قبل تفعيلها.",
        en: "This implementation adds no marketing analytics. Any future cookies or services must be documented before activation.",
      }),
    },
  ];
  return (
    <main className="legal-page section-pad">
      <header>
        <span className="draft-label">
          {msg(lang, {
            ar: "مسودة للمراجعة القانونية",
            en: "Draft for legal review",
          })}
        </span>
        <h1>
          {msg(lang, {
            ar: "مسودة إشعار الخصوصية",
            en: "Privacy notice draft",
          })}
        </h1>
        <p>
          {msg(lang, {
            ar: "هذه بنية تحريرية غير معتمدة للنشر القانوني. لا تتضمن أساسًا قانونيًا أو فترات احتفاظ أو معالِجين غير مؤكّدين.",
            en: "This is an editorial structure, not an approved legal notice. It does not assert legal bases, exact retention periods or unconfirmed processors.",
          })}
        </p>
      </header>
      <div className="legal-content">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <AppLink href={withLang("/contact", lang)} go={go} className="button button-secondary">
        {msg(lang, { ar: "تواصل معنا", en: "Contact us" })}
      </AppLink>
    </main>
  );
}
