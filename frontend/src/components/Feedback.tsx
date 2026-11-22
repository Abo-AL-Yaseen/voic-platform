import type { ReactNode } from "react";
import { msg, type Lang } from "../i18n";
import Modal from "../Modal";

export function IntegrationNotice({
  lang,
  title,
  children,
}: {
  lang: Lang;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <aside className="integration-notice" role="status">
      <strong>
        {title ||
          msg(lang, {
            ar: "التكامل غير متصل بعد",
            en: "Integration is not connected yet",
          })}
      </strong>
      <p>
        {children ||
          msg(lang, {
            ar: "هذه الواجهة جاهزة للربط، لكنها لا ترسل أو تحفظ بيانات دون خدمة خلفية حقيقية.",
            en: "This interface is ready for integration, but it does not send or save data without a real backend.",
          })}
      </p>
    </aside>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="shared-state empty-state">
      <span aria-hidden="true">—</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  retry,
  retryLabel,
}: {
  title: string;
  description: string;
  retry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="shared-state error-state" role="alert">
      <h2>{title}</h2>
      <p>{description}</p>
      {retry && (
        <button className="button button-secondary" onClick={retry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function SkeletonState({ lines = 4 }: { lines?: number }) {
  return (
    <div className="skeleton-state" aria-label="Loading" aria-busy="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: "neutral" | "success" | "warning" | "danger" | "info";
  label: string;
}) {
  return <span className={`status-badge status-${status}`}>{label}</span>;
}

export function AccessDenied({ lang }: { lang: Lang }) {
  return (
    <ErrorState
      title={msg(lang, {
        ar: "لا تملك صلاحية الوصول",
        en: "You do not have access",
      })}
      description={msg(lang, {
        ar: "يجب أن يقرر الخادم الصلاحيات الفعلية لكل موظف. تواصل مع مسؤول النظام إذا كنت تتوقع هذه الصلاحية.",
        en: "The server must determine each employee's permissions. Contact an administrator if you expect this access.",
      })}
    />
  );
}

export function ConfirmationDialog({
  lang,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  destructive = false,
}: {
  lang: Lang;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
}) {
  return (
    <Modal title={title} onClose={onClose} lang={lang}>
      <div className="confirmation-dialog">
        <p>{description}</p>
        <div className="page-actions">
          <button
            className={`button ${destructive ? "button-danger" : "button-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button className="button button-secondary" onClick={onClose}>
            {msg(lang, { ar: "إلغاء", en: "Cancel" })}
          </button>
        </div>
      </div>
    </Modal>
  );
}
