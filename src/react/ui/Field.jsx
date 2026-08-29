import React, { forwardRef, useId, useRef, useState } from "react";
import { cx } from "./utils.jsx";

export const Field = forwardRef(function Field({ label, hint, error, required, id, className, children, ...props }, ref) {
  const generatedId = useId();
  const fieldId = id || `field-${generatedId.replaceAll(":", "")}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return (
    <label className={cx("ui-field", error && "ui-field-error", className)} htmlFor={fieldId}>
      {label ? <span className="ui-field-label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span> : null}
      {React.cloneElement(children, {
        ...props,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : props["aria-invalid"],
        id: fieldId,
        ref
      })}
      {hint ? <small className="ui-field-hint" id={hintId}>{hint}</small> : null}
      {error ? <small className="ui-field-error-copy" id={errorId} role="alert">{error}</small> : null}
    </label>
  );
});

export const Input = forwardRef(function Input({ className, unstyled = false, ...props }, ref) {
  return <input ref={ref} className={unstyled ? className : cx("ui-input", className)} {...props} />;
});

export const Select = forwardRef(function Select({ children, className, unstyled = false, ...props }, ref) {
  return <select ref={ref} className={unstyled ? className : cx("ui-input", "ui-select", className)} {...props}>{children}</select>;
});

export const Textarea = forwardRef(function Textarea({ className, unstyled = false, ...props }, ref) {
  return <textarea ref={ref} className={unstyled ? className : cx("ui-input", "ui-textarea", className)} {...props} />;
});

export const Checkbox = forwardRef(function Checkbox({ label, className, ...props }, ref) {
  return <label className={cx("ui-checkbox", className)}><input ref={ref} type="checkbox" {...props} /><span className="ui-checkbox-box" aria-hidden="true" /><span className="ui-checkbox-label">{label}</span></label>;
});

export const ColorField = forwardRef(function ColorField({ label, className, defaultValue = "white", onInput, onReset, ...props }, ref) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(defaultValue);
  const setInputRef = element => {
    inputRef.current = element;
    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  };
  const handleInput = event => {
    setValue(event.currentTarget.value);
    onInput?.(event);
  };
  const reset = () => {
    if (inputRef.current) inputRef.current.value = defaultValue;
    setValue(defaultValue);
    onReset?.(defaultValue);
    onInput?.({ currentTarget: inputRef.current, target: inputRef.current });
  };
  return <label className={cx("ui-color-field", className)}>
    <span className="ui-field-label">{label}</span>
    <span className="ui-color-control">
      <input ref={setInputRef} type="color" defaultValue={defaultValue} onInput={handleInput} {...props} />
      <code>{value.toUpperCase()}</code>
      <button type="button" className="ui-color-reset" onClick={reset}>Resetar</button>
    </span>
  </label>;
});
