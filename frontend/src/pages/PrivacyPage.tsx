import AppLink from "../components/AppLink";
import { msg, withLang, type Lang } from "../i18n";

export default function PrivacyPage({ lang, go }: { lang: Lang; go: (href: string) => void }) {
  const sections = [
    {
      title: msg(lang, {
        ar: "الجهة المسؤولة والتواصل",
        en: "Responsible company and contact",
        de: "Verantwortliches Unternehmen und Kontakt",
      }),
      body: msg(lang, {
        ar: "شركة مصانع الزيوت النباتية، المنطقة الصناعية الشرقية، نابلس، فلسطين. للاستفسارات: info@voic.ps.",
        en: "Vegetable Oil Industries Co., Eastern Industrial Area, Nablus, Palestine. Contact: info@voic.ps.",
        de: "Vegetable Oil Industries Co., Östliches Industriegebiet, Nablus, Palästina. Kontakt: info@voic.ps.",
      }),
    },
    {
      title: msg(lang, {
        ar: "البيانات التي قد تُجمع",
        en: "Data that may be collected",
        de: "Möglicherweise erhobene Daten",
      }),
      body: msg(lang, {
        ar: "قد تشمل بيانات الحساب الاسم والبريد ونوع الحساب والشركة والدولة والهاتف الاختياري، إضافة إلى منتجات الاستفسار والكميات والوجهة والملاحظات.",
        en: "Account data may include name, email, account type, company, country and optional phone, plus inquiry products, quantities, destination and notes.",
        de: "Kontodaten können Name, E-Mail, Kontotyp, Unternehmen, Land und optionale Telefonnummer sowie Produkte, Mengen, Zielort und Hinweise einer Anfrage umfassen.",
      }),
    },
    {
      title: msg(lang, { ar: "الأغراض", en: "Purposes", de: "Zwecke" }),
      body: msg(lang, {
        ar: "إدارة الحساب والتحقق من البريد ومراجعة استفسارات التوريد والتواصل بشأنها وحماية الخدمة.",
        en: "Account administration, email verification, review of supply inquiries, related communication and service protection.",
        de: "Kontoverwaltung, E-Mail-Bestätigung, Prüfung von Lieferanfragen, zugehörige Kommunikation und Schutz des Dienstes.",
      }),
    },
    {
      title: msg(lang, {
        ar: "الوصول والاحتفاظ",
        en: "Access and retention",
        de: "Zugriff und Aufbewahrung",
      }),
      body: msg(lang, {
        ar: "يجب تحديد صلاحيات الوصول وفترات الاحتفاظ والحذف في سياسة معتمدة قبل النشر. لا تحدد هذه المسودة مدة قانونية.",
        en: "Access controls and retention/deletion periods must be approved before publication. This draft does not state a legal retention period.",
        de: "Zugriffsregeln sowie Aufbewahrungs- und Löschfristen müssen vor Veröffentlichung genehmigt werden. Dieser Entwurf nennt keine rechtliche Frist.",
      }),
    },
    {
      title: msg(lang, {
        ar: "طلبات المستخدم",
        en: "User requests",
        de: "Anfragen betroffener Personen",
      }),
      body: msg(lang, {
        ar: "يجب أن توضح النسخة القانونية المعتمدة طريقة طلب الوصول أو التصحيح أو الحذف والقيود التي قد تنطبق.",
        en: "The approved legal version must explain how to request access, correction or deletion and any applicable limitations.",
        de: "Die rechtlich freigegebene Fassung muss Anfragen auf Auskunft, Berichtigung oder Löschung und mögliche Einschränkungen erläutern.",
      }),
    },
    {
      title: msg(lang, {
        ar: "ملفات الارتباط والتحليلات",
        en: "Cookies and analytics",
        de: "Cookies und Analyse",
      }),
      body: msg(lang, {
        ar: "لا يضيف هذا التنفيذ أدوات تحليلات تسويقية. يجب توثيق أي ملفات ارتباط أو خدمات مستقبلية قبل تفعيلها.",
        en: "This implementation adds no marketing analytics. Any future cookies or services must be documented before activation.",
        de: "Diese Umsetzung fügt keine Marketing-Analyse hinzu. Zukünftige Cookies oder Dienste müssen vor Aktivierung dokumentiert werden.",
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
            de: "Entwurf zur rechtlichen Prüfung",
          })}
        </span>
        <h1>
          {msg(lang, {
            ar: "مسودة إشعار الخصوصية",
            en: "Privacy notice draft",
            de: "Entwurf des Datenschutzhinweises",
          })}
        </h1>
        <p>
          {msg(lang, {
            ar: "هذه بنية تحريرية غير معتمدة للنشر القانوني. لا تتضمن أساسًا قانونيًا أو فترات احتفاظ أو معالِجين غير مؤكّدين.",
            en: "This is an editorial structure, not an approved legal notice. It does not assert legal bases, exact retention periods or unconfirmed processors.",
            de: "Dies ist eine redaktionelle Struktur und kein genehmigter Rechtstext. Sie nennt keine Rechtsgrundlagen, genauen Aufbewahrungsfristen oder unbestätigten Auftragsverarbeiter.",
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
        {msg(lang, { ar: "تواصل معنا", en: "Contact us", de: "Kontakt" })}
      </AppLink>
    </main>
  );
}
