import { useId, useState, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { msg, type Lang } from "../i18n";

type BaseProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  required,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label className="form-field" htmlFor={id}>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        {...props}
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && (
        <small className="field-hint" id={`${id}-hint`}>
          {hint}
        </small>
      )}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  );
}

export function PasswordField(
  props: BaseProps & InputHTMLAttributes<HTMLInputElement> & { lang: Lang },
) {
  const [visible, setVisible] = useState(false);
  const { lang, ...fieldProps } = props;
  return (
    <div className="password-field">
      <TextField {...fieldProps} type={visible ? "text" : "password"} />
      <button className="field-inline-action" type="button" onClick={() => setVisible(!visible)}>
        {visible
          ? msg(lang, { ar: "إخفاء", en: "Hide", de: "Ausblenden" })
          : msg(lang, { ar: "إظهار", en: "Show", de: "Anzeigen" })}
      </button>
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  required,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <label className="form-field" htmlFor={id}>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <select
        {...props}
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      >
        {children}
      </select>
      {hint && !error && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  ...props
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <label className="form-field" htmlFor={id}>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        {...props}
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </label>
  );
}

export function ErrorSummary({ title, errors }: { title: string; errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="error-summary" role="alert" tabIndex={-1}>
      <strong>{title}</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
