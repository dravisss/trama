import React, { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "./Field.jsx";

function lineTotal(value) {
  return Math.max(1, String(value || "").split("\n").length);
}

/**
 * A deliberately thin code-writing surface. The application bridge continues
 * to own source values and compilation; this component only supplies the
 * editorial code treatment (line gutter, count and synchronized scrolling).
 *
 * `loopviewer:code-editor-sync` supports the current imperative bridge while
 * source panels are being promoted to React. Its `detail.id` is optional so a
 * caller may refresh every mounted code surface after a model switch.
 */
export function LineNumberedTextarea({ id, className = "", label, metaId, ...props }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const [count, setCount] = useState(() => lineTotal(props.defaultValue || props.value));
  const lines = useMemo(() => Array.from({ length: count }, (_, index) => index + 1), [count]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return undefined;
    const refresh = () => setCount(lineTotal(textarea.value));
    const syncScroll = () => {
      if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop;
    };
    const syncFromBridge = event => {
      const sourceId = event.detail?.id;
      if (!sourceId || sourceId === id) refresh();
    };
    textarea.addEventListener("input", refresh);
    textarea.addEventListener("change", refresh);
    textarea.addEventListener("scroll", syncScroll, { passive: true });
    document.addEventListener("loopviewer:code-editor-sync", syncFromBridge);
    const frame = window.requestAnimationFrame(refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      textarea.removeEventListener("input", refresh);
      textarea.removeEventListener("change", refresh);
      textarea.removeEventListener("scroll", syncScroll);
      document.removeEventListener("loopviewer:code-editor-sync", syncFromBridge);
    };
  }, [id]);

  return <div className={`lv-code-editor${metaId ? " has-meta" : ""}`} data-code-editor-id={id}>
    <ol ref={gutterRef} className="lv-code-editor-gutter" aria-hidden="true">
      {lines.map(line => <li key={line}>{line}</li>)}
    </ol>
    <Textarea
      ref={textareaRef}
      unstyled
      id={id}
      className={`code-editor ${className}`.trim()}
      aria-label={label}
      spellCheck="false"
      {...props}
    />
    {metaId ? <output id={metaId} className="lv-code-editor-count" aria-live="polite">{count} {count === 1 ? "linha" : "linhas"}</output> : null}
  </div>;
}
