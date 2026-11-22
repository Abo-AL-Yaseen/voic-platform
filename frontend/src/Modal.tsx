import { useEffect, useRef, type ReactNode } from "react";
import { direction, msg, type Lang } from "./i18n";

export default function Modal({
  title,
  onClose,
  children,
  lang,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  lang: Lang;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="catalog-dialog"
      aria-labelledby="dialog-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(
          ref.current!.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]',
          ),
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-content" dir={direction(lang)}>
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="dialog-close"
            autoFocus
            onClick={onClose}
            aria-label={msg(lang, {
              ar: "إغلاق النافذة",
              en: "Close dialog",
              de: "Dialog schließen",
            })}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
