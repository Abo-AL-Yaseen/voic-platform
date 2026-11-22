import AppLink from "../components/AppLink";
import { useEffect } from "react";
import {
  AccessDenied,
  EmptyState,
  ErrorState,
  IntegrationNotice,
  SkeletonState,
} from "../components/Feedback";
import { msg, withLang, type Lang } from "../i18n";
import {
  AccountOverviewPage,
  InquiryDetailPage,
  InquiryListPage,
  ProfilePage,
  SecurityPage,
} from "./AccountPages";
import { LoginPage, MfaChallenge, VerifyEmailPage } from "./AuthPages";
import NewInquiryPage from "./NewInquiryPage";
import { StaffPreviewPage } from "./StaffPages";

type Props = { lang: Lang; go: (href: string) => void; search: string };

const screens = [
  ["account-overview", "Account overview"],
  ["account-profile", "Account profile"],
  ["account-security", "Account security"],
  ["account-inquiries", "Account inquiry list"],
  ["account-inquiry-detail", "Account inquiry detail"],
  ["login-session-expired", "Login — session expired"],
  ["verify-success", "Verify email — success"],
  ["verify-expired", "Verify email — expired"],
  ["mfa", "Staff MFA challenge"],
  ["inquiry-products", "Inquiry — products"],
  ["inquiry-details", "Inquiry — details"],
  ["inquiry-review", "Inquiry — review"],
  ["inquiry-success", "Inquiry — success visual"],
  ["states", "Shared states"],
  ["access-denied", "Permission denied"],
  ["staff", "Staff dashboard"],
  ["staff-inquiries", "Staff inquiries"],
  ["staff-inquiries-detail", "Staff inquiry detail"],
  ["staff-products", "Staff products"],
  ["staff-products-new", "Product editor — new"],
  ["staff-products-ghazal-edit", "Product editor — edit"],
  ["staff-categories", "Categories"],
  ["staff-uses", "Uses"],
  ["staff-recipes", "Recipes"],
  ["staff-recipes-new", "Recipe editor — new"],
  ["staff-recipes-sem-edit", "Recipe editor — edit"],
  ["staff-content", "Page content"],
  ["staff-media", "Media"],
  ["staff-customers", "Customers"],
  ["staff-employees", "Employees"],
  ["staff-audit-log", "Audit log"],
] as const;

function Index({ lang, go }: Omit<Props, "search">) {
  return (
    <main className="preview-index section-pad">
      <header>
        <p className="eyebrow">Development only</p>
        <h1>VOIC frontend preview</h1>
        <p>
          Static visual demonstrations only. This route does not authenticate, grant permissions,
          save records or call an API.
        </p>
      </header>
      <div className="preview-index-grid">
        {screens.map(([id, label]) => (
          <AppLink key={id} href={withLang(`/__preview?screen=${id}`, lang)} go={go}>
            <strong>{label}</strong>
            <span>{id}</span>
          </AppLink>
        ))}
      </div>
    </main>
  );
}

export default function PreviewPage({ lang, go, search }: Props) {
  useEffect(() => {
    document.title = "VOIC frontend preview";
  }, []);
  const screen = new URLSearchParams(search).get("screen") || "";
  if (!screen) return <Index lang={lang} go={go} />;
  if (screen === "account-overview") return <AccountOverviewPage lang={lang} go={go} preview />;
  if (screen === "account-profile") return <ProfilePage lang={lang} go={go} preview />;
  if (screen === "account-security") return <SecurityPage lang={lang} go={go} preview />;
  if (screen === "account-inquiries") return <InquiryListPage lang={lang} go={go} preview />;
  if (screen === "account-inquiry-detail")
    return <InquiryDetailPage lang={lang} go={go} preview inquiryId="preview" />;
  if (screen === "login-session-expired")
    return <LoginPage lang={lang} go={go} previewState="session-expired" />;
  if (screen === "verify-success")
    return <VerifyEmailPage lang={lang} go={go} previewState="success" />;
  if (screen === "verify-expired")
    return <VerifyEmailPage lang={lang} go={go} previewState="expired" />;
  if (screen === "mfa")
    return (
      <main className="preview-standalone section-pad">
        <MfaChallenge lang={lang} />
      </main>
    );
  if (screen === "inquiry-products")
    return (
      <NewInquiryPage lang={lang} go={go} search="?products=ghazal,nabateen" initialStep={1} />
    );
  if (screen === "inquiry-details")
    return (
      <NewInquiryPage lang={lang} go={go} search="?products=ghazal,nabateen" initialStep={2} />
    );
  if (screen === "inquiry-review")
    return (
      <NewInquiryPage lang={lang} go={go} search="?products=ghazal,nabateen" initialStep={3} />
    );
  if (screen === "inquiry-success") return <NewInquiryPage lang={lang} go={go} previewSuccess />;
  if (screen === "states")
    return (
      <main className="preview-standalone section-pad">
        <h1>
          {msg(lang, {
            ar: "حالات الواجهة المشتركة",
            en: "Shared interface states",
            de: "Gemeinsame Oberflächenzustände",
          })}
        </h1>
        <SkeletonState />
        <EmptyState title="Empty state" description="A confirmed empty result." />
        <ErrorState
          title="Error state"
          description="A request failed and can be retried."
          retry={() => {}}
          retryLabel="Retry"
        />
        <IntegrationNotice lang={lang} />
      </main>
    );
  if (screen === "access-denied")
    return (
      <main className="preview-standalone section-pad">
        <h1>
          {msg(lang, {
            ar: "الوصول غير متاح",
            en: "Access unavailable",
            de: "Zugriff nicht verfügbar",
          })}
        </h1>
        <AccessDenied lang={lang} />
      </main>
    );
  if (screen.startsWith("staff")) {
    const explicit: Record<string, string> = {
      "staff-products-ghazal-edit": "/staff/products/ghazal/edit",
      "staff-recipes-sem-edit": "/staff/recipes/semolina-maamoul/edit",
      "staff-inquiries-detail": "/staff/inquiries/preview",
    };
    const suffix = screen.slice("staff".length).split("-").join("/");
    let path = explicit[screen] || (suffix ? `/staff${suffix}` : "/staff");
    return <StaffPreviewPage lang={lang} go={go} path={path} preview />;
  }
  return (
    <main className="preview-standalone section-pad">
      <EmptyState
        title="Preview not found"
        description="Return to the development preview index."
        action={
          <AppLink href={withLang("/__preview", lang)} go={go} className="button button-primary">
            Preview index
          </AppLink>
        }
      />
    </main>
  );
}
