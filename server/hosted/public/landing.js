// Recent workspaces are remembered by the editor itself (localStorage key
// shared with the local-first app). Nothing leaves the browser.
const RECENT_KEY = "loopviewer:recent-projects";

function readRecent() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value) ? value.filter(item => typeof item?.path === "string" && /^\/w\/[A-Za-z0-9_-]{32,64}$/.test(item.path)) : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const section = document.querySelector("#recent");
const list = document.querySelector("#recent-list");
const recent = readRecent();
section.hidden = false;
if (!recent.length) {
  list.hidden = true;
} else {
  for (const item of recent) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.path;
    const title = document.createElement("span");
    title.textContent = item.title || "Espaço sem título";
    const when = document.createElement("small");
    when.textContent = formatDate(item.lastOpenedAt);
    link.append(title, when);
    li.append(link);
    list.append(li);
  }
}

document.querySelector("#open-form").addEventListener("submit", event => {
  event.preventDefault();
  const value = document.querySelector("#open-link").value.trim();
  const match = value.match(/\/w\/([A-Za-z0-9_-]{32,64})/) || value.match(/^([A-Za-z0-9_-]{32,64})$/);
  if (match) window.location.assign(`/w/${match[1]}`);
  else document.querySelector("#open-link").setCustomValidity("Esse não parece um link de espaço (…/w/…).");
  document.querySelector("#open-link").reportValidity();
});
document.querySelector("#open-link").addEventListener("input", event => event.target.setCustomValidity(""));
