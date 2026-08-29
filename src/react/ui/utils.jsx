export function cx(...values) {
  return values.flat(Infinity).filter(Boolean).join(" ");
}

export function focusFirst(container) {
  const target = container?.querySelector?.(
    "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
  );
  target?.focus?.();
}
