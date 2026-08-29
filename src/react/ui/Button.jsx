import React from "react";
import { Icon } from "./Icon.jsx";
import { cx } from "./utils.jsx";

export const BUTTON_VARIANTS = Object.freeze(["primary", "secondary", "ghost", "danger", "quiet", "immersive"]);
export const BUTTON_SIZES = Object.freeze(["sm", "md", "touch", "icon"]);

export function Button({
  children,
  variant = "secondary",
  size = "md",
  leadingIcon,
  trailingIcon,
  loading = false,
  unstyled = false,
  className,
  disabled = false,
  type = "button",
  ...props
}) {
  return (
    <button
      className={unstyled ? className : cx("ui-button", `ui-button-${variant}`, `ui-button-${size}`, className)}
      data-loading={loading ? "true" : undefined}
      data-ui-component="button"
      {...props}
      disabled={loading || disabled}
      type={type}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : leadingIcon ? <Icon name={leadingIcon} size="sm" /> : null}
      {children ? (unstyled ? children : <span className="ui-button-label">{children}</span>) : null}
      {!loading && trailingIcon ? <Icon name={trailingIcon} size="sm" /> : null}
    </button>
  );
}
