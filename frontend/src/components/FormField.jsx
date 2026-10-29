import { useId } from "react";

export default function FormField({
  label,
  hint,
  error,
  as = "input",
  className = "",
  id,
  ...props
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = [
    hint ? `${fieldId}-hint` : null,
    error ? `${fieldId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const Element = as;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700" htmlFor={fieldId}>
        {label}
        {props.required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      <Element
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        className={`form-control ${error ? "form-control-error" : ""} ${className}`}
        id={fieldId}
        {...props}
      />
      {hint && (
        <p className="text-xs leading-5 text-slate-500" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs leading-5 text-rose-700" id={`${fieldId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
