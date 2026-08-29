import React, { useEffect, useRef } from "react";
import { cx } from "./utils.jsx";

export function Tabs({ items, value, onChange, label = "Abas", className }) {
  const refs = useRef([]);
  const activeIndex = Math.max(0, items.findIndex(item => item.value === value));
  useEffect(() => {
    refs.current = refs.current.slice(0, items.length);
  }, [items.length]);
  function onKeyDown(event, index) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    refs.current[next]?.focus();
    onChange?.(items[next].value);
  }
  return <div className={cx("ui-tabs", className)} data-ui-component="tabs">
    <div aria-label={label} className="ui-tab-list" role="tablist">
      {items.map((item, index) => <button
        aria-controls={item.panelId}
        aria-selected={item.value === value}
        className="ui-tab"
        key={item.value}
        onClick={() => onChange?.(item.value)}
        onKeyDown={event => onKeyDown(event, index)}
        ref={element => { refs.current[index] = element; }}
        role="tab"
        tabIndex={item.value === value || (value == null && index === activeIndex) ? 0 : -1}
        type="button"
      >{item.label}</button>)}
    </div>
  </div>;
}

export function Toolbar({ children, label = "Barra de ferramentas", className }) {
  return <div aria-label={label} className={cx("ui-toolbar", className)} data-ui-component="toolbar" role="toolbar">{children}</div>;
}
