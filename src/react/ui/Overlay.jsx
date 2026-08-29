import React, { useEffect, useRef } from "react";
import { focusFirst, cx } from "./utils.jsx";
import { IconButton } from "./Icon.jsx";

export function Dialog({ open = false, title, description, onClose, children, footer, className }) {
  const ref = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      triggerRef.current = document.activeElement;
      dialog.showModal?.();
      focusFirst(dialog);
    } else if (!open && dialog.open) {
      dialog.close();
      triggerRef.current?.focus?.();
    }
    return undefined;
  }, [open]);
  return <dialog aria-describedby={description ? "ui-dialog-description" : undefined} aria-labelledby="ui-dialog-title" className={cx("ui-dialog", className)} onCancel={event => { event.preventDefault(); onClose?.(); }} ref={ref}>
    <div className="ui-dialog-card">
      <header className="ui-dialog-header"><div><h2 id="ui-dialog-title">{title}</h2>{description ? <p id="ui-dialog-description">{description}</p> : null}</div><IconButton icon="close" label="Fechar" onClick={onClose} /></header>
      <div className="ui-dialog-content">{children}</div>
      {footer ? <footer className="ui-dialog-footer">{footer}</footer> : null}
    </div>
  </dialog>;
}

export function Popover({ open, label, children, className }) {
  if (!open) return null;
  return <div aria-label={label} className={cx("ui-popover", className)} role="dialog">{children}</div>;
}

export function Tooltip({ label, children, className }) {
  return <span className={cx("ui-tooltip-wrap", className)}>{children}<span className="ui-tooltip" role="tooltip">{label}</span></span>;
}
