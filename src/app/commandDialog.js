export function createCommandDialogController(elements) {
  const closeDialog = reason => {
    if (typeof elements.dialog.close === "function") {
      elements.dialog.close(reason);
      return;
    }
    // The in-app browser (and a few embedded WebViews) do not implement
    // HTMLDialogElement yet. Keep the same contract with a lightweight
    // non-modal fallback instead of failing silently on showModal().
    elements.dialog.open = false;
    elements.dialog.hidden = true;
    elements.dialog.removeAttribute("open");
    elements.dialog.dispatchEvent(new Event("close"));
  };
  const openDialog = () => {
    if (typeof elements.dialog.showModal === "function") {
      elements.dialog.showModal();
      return;
    }
    elements.dialog.hidden = false;
    elements.dialog.open = true;
    elements.dialog.setAttribute("open", "");
  };

  elements.close.addEventListener("click", () => closeDialog("cancel"));
  elements.cancel.addEventListener("click", () => closeDialog("cancel"));

  return function open({ title, description = "", submitLabel = "Continuar", fields = [], danger = false, onReady = null, restoreFocusTo } = {}) {
    const activeAtOpen = document.activeElement;
    const resolveRestoreFocus = typeof restoreFocusTo === "function"
      ? restoreFocusTo
      : () => restoreFocusTo || activeAtOpen;
    elements.title.textContent = title;
    elements.description.textContent = description;
    elements.description.hidden = !description;
    elements.submit.textContent = submitLabel;
    elements.dialog.classList.toggle("danger", danger);
    elements.fields.replaceChildren();
    fields.forEach(field => {
      const label = document.createElement("label");
      label.textContent = field.label;
      const control = document.createElement(field.type === "textarea" ? "textarea" : field.type === "select" ? "select" : "input");
      control.name = field.name;
      if (field.type === "select") {
        (field.options || []).forEach(option => {
          const item = new Option(option.label ?? option.value, option.value);
          control.append(item);
        });
        control.value = field.value || field.options?.[0]?.value || "";
      } else {
        control.value = field.value || "";
      }
      control.required = Boolean(field.required);
      if (field.placeholder) control.placeholder = field.placeholder;
      label.append(control);
      elements.fields.append(label);
    });
    return new Promise(resolve => {
      let submitted = false;
      elements.form.onsubmit = event => {
        event.preventDefault();
        if (!elements.form.reportValidity()) return;
        submitted = true;
        closeDialog("submit");
      };
      const handleClose = () => {
        elements.form.onsubmit = null;
        elements.dialog.removeEventListener("close", handleClose);
        // Native dialog finishes its own focus cleanup after `close`; defer
        // restoration to the next task so that cleanup cannot overwrite it.
        const restoreFocus = () => {
          const target = resolveRestoreFocus?.();
          // A trigger inside a <details> menu is hidden when the menu closes.
          // Return focus to the visible summary instead of a hidden control.
          const ownerMenu = target?.closest?.("details");
          const focusTarget = ownerMenu?.querySelector?.("summary") || target;
          if (ownerMenu) ownerMenu.open = false;
          focusTarget?.focus?.();
        };
        // Let native dialog cleanup finish before restoring focus. Chromium
        // can restore the original hidden trigger after the close event and
        // reopen its <details> owner, so this runs after that cleanup turn.
        window.setTimeout(restoreFocus, 150);
        if (!submitted) {
          resolve(null);
          return;
        }
        const values = {};
        elements.fields.querySelectorAll("[name]").forEach(control => {
          values[control.name] = control.value.trim();
        });
        resolve(values);
      };
      elements.dialog.addEventListener("close", handleClose, { once: true });
      openDialog();
      if (typeof onReady === "function") onReady({ fields: elements.fields, form: elements.form, dialog: elements.dialog });
      requestAnimationFrame(() => elements.fields.querySelector("input, textarea")?.focus());
    });
  };
}
