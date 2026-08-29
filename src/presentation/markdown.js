/**
 * Small, sanitised Markdown subset shared by presentation readers.
 * Authored Presentation V2 copy needs paragraphs, emphasis and lists, but a
 * publication must never execute markup from narration.
 */
export function renderPresentationMarkdown(value = "") {
  const lines = String(value).trim().split(/\n{2,}/);
  if (!lines.length || !lines[0]) return "";
  return lines.map(block => {
    const text = escapePresentationHtml(block.trim());
    if (text.startsWith("### ")) return `<h4>${inlinePresentationMarkdown(text.slice(4))}</h4>`;
    if (text.startsWith("## ")) return `<h3>${inlinePresentationMarkdown(text.slice(3))}</h3>`;
    if (text.startsWith("# ")) return `<h3>${inlinePresentationMarkdown(text.slice(2))}</h3>`;
    if (/^- /.test(text)) {
      const items = text.split("\n").map(line => line.replace(/^- /, "")).filter(Boolean);
      return `<ul>${items.map(item => `<li>${inlinePresentationMarkdown(item)}</li>`).join("")}</ul>`;
    }
    return `<p>${inlinePresentationMarkdown(text).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

function inlinePresentationMarkdown(value) {
  return value
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function escapePresentationHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
