import React from "react";
import { cx } from "./utils.jsx";

const ICONS = {
  folder: "M3.5 6.5h6l1.7 2h9.3v9.5a2 2 0 0 1-2 2h-15zM3.5 6.5v-2h6l1.7 2",
  map: "M8.5 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20.5 6a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM18.5 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM8.5 6.4l7-.3M7.6 8.4l6.8 7.7M17.6 8.5l-1.2 7",
  compass: "M15.4 8.6l-2 4.8-4.8 2 2-4.8zM20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
  book: "M4 5.5h5a3 3 0 0 1 3 3v10a3 3 0 0 0-3-3H4zM20 5.5h-5a3 3 0 0 0-3 3v10a3 3 0 0 1 3-3h5z",
  presentation: "M4 5h16v11H4zM8 20h8M12 16v4m-2-8 5 2.5-5 2.5z",
  arrowLeft: "M19 12H5m7-7-7 7 7 7",
  arrowRight: "M5 12h14m-7-7 7 7-7 7",
  skipFirst: "M5 5v14m13-14-7 7 7 7",
  skipLast: "M19 5v14M6 5l7 7-7 7",
  chevronDown: "m6 9 6 6 6-6",
  close: "m6 6 12 12M18 6 6 18",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M3 12h2m14 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42",
  play: "m8 5 11 7-11 7V5Z",
  pause: "M8 5v14M16 5v14",
  focus: "M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4",
  edit: "M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4Zm9-13 4 4",
  save: "M5 4h11l3 3v13H5V4Zm3 0v5h7V4M8 20v-7h8v7",
  copy: "M8 8h12v12H8zM16 8V4H4v12h4",
  trash: "M4 7h16m-10 4v5m4-5v5M6 7l1 13h10l1-13M9 7V4h6v3",
  info: "M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  warning: "m12 4 9 16H3L12 4Zm0 6v4m0 3h.01",
  sparkles: "m12 3-1.35 5.65L5 10l5.65 1.35L12 17l1.35-5.65L19 10l-5.65-1.35L12 3Zm7 11-.7 2.3L16 17l2.3.7L19 20l.7-2.3L22 17l-2.3-.7L19 14ZM5 15l-.55 1.45L3 17l1.45.55L5 19l.55-1.45L7 17l-1.45-.55L5 15Z",
  download: "M12 3v12m0 0 5-5m-5 5-5-5M5 21h14",
  external: "M14 5h5v5m0-5-8 8M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5",
  more: "M5 12h.01M12 12h.01M19 12h.01"
};

export function Icon({ name = "info", label, size = "md", className, ...props }) {
  const path = ICONS[name] || ICONS.info;
  return (
    <svg
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      className={cx("ui-icon", `ui-icon-${size}`, className)}
      fill="none"
      focusable="false"
      role={label ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d={path} />
    </svg>
  );
}

export function IconButton({ label, icon, size = "md", variant = "ghost", className, children, ...props }) {
  return (
    <button
      aria-label={label}
      className={cx("ui-button", "ui-icon-button", `ui-button-${variant}`, `ui-button-${size}`, className)}
      data-ui-component="icon-button"
      type="button"
      {...props}
    >
      {children || <Icon name={icon} size={size === "sm" ? "sm" : "md"} />}
    </button>
  );
}
