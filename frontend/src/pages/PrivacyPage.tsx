import { usePublishedPage } from "../hooks/content/queries";
import ContentStatus from "../components/ContentStatus";
import AppLink from "../components/AppLink";
import { msg, withLang, type Lang } from "../i18n";

export default function PrivacyPage({ lang, go }: { lang: Lang; go: (href: string) => void }) {
  const contentQuery = usePublishedPage("privacy", lang),
    content = contentQuery.data;
  const sharedQuery = usePublishedPage("shared", lang),
    shared = sharedQuery.data;
  if (!content || contentQuery.isError) return <ContentStatus query={contentQuery} lang={lang} />;
  if (!shared || sharedQuery.isError) return <ContentStatus query={sharedQuery} lang={lang} />;
  const sections = [
    {
      title: content.texts["text-80"][lang],
      body: content.texts["text-81"][lang].replace("{{email}}", shared.links.email),
    },
    {
      title: content.texts["text-82"][lang],
      body: content.texts["text-83"][lang],
    },
    {
      title: content.texts["text-84"][lang],
      body: content.texts["text-85"][lang],
    },
    {
      title: content.texts["text-86"][lang],
      body: content.texts["text-87"][lang],
    },
    {
      title: content.texts["text-88"][lang],
      body: content.texts["text-89"][lang],
    },
    {
      title: content.texts["text-90"][lang],
      body: content.texts["text-91"][lang],
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
        <h1>{content.texts["text-93"][lang]}</h1>
        <p>{content.texts["text-94"][lang]}</p>
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
