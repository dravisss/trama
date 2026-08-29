import React from "react";
import { cx } from "./utils.jsx";

export function Surface({ as: Component = "section", tone = "default", padding = "comfortable", className, ...props }) {
  return <Component className={cx("ui-surface", `ui-surface-${tone}`, `ui-surface-padding-${padding}`, className)} data-ui-component="surface" {...props} />;
}

export function Card({ interactive = false, className, ...props }) {
  return <Surface className={cx("ui-card", interactive && "ui-card-interactive", className)} {...props} />;
}

export function Badge({ tone = "neutral", children, className, ...props }) {
  return <span className={cx("ui-badge", `ui-badge-${tone}`, className)} {...props}>{children}</span>;
}

export function Status({ tone = "neutral", label, children, className, ...props }) {
  return <span className={cx("ui-status", `ui-status-${tone}`, className)} {...props}><span className="ui-status-dot" aria-hidden="true" />{label || children}</span>;
}

export function EmptyState({ icon = "info", title, children, action, className }) {
  return <div className={cx("ui-empty-state", className)}><div className="ui-empty-state-icon" aria-hidden="true">{icon}</div><strong>{title}</strong>{children ? <p>{children}</p> : null}{action}</div>;
}
