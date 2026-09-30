// Hosted-only additions to the application shell: sharing, agent access and
// the "keep your secret link" reminder. The editor itself is unchanged.
const context = window.__TRAMA__;
if (context?.hosted) mount(context);

function mount(ctx) {
  let links = ctx.links || {};
  const seenKey = `trama:link-notice:${ctx.workspacePath}`;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "trama-share-trigger";
  trigger.textContent = "Compartilhar";
  trigger.setAttribute("aria-haspopup", "dialog");
  // Keep sharing in the application header, in normal document flow.
  // The shell can be replaced when switching modes, so reattach when needed.
  trigger.hidden = true;
  const dockTrigger = () => {
    const header = document.querySelector(".topbar");
    if (!header) { trigger.hidden = true; return; }
    let actions = header.querySelector(".trama-workspace-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "trama-workspace-actions";
      actions.setAttribute("aria-label", "Ações do espaço");
      header.append(actions);
    }
    if (trigger.parentElement !== actions) actions.append(trigger);
    trigger.hidden = false;
  };
  const shellObserver = new MutationObserver(dockTrigger);
  shellObserver.observe(document.body, { childList: true, subtree: true });
  dockTrigger();

  const dialog = document.createElement("dialog");
  dialog.className = "trama-share-dialog";
  dialog.setAttribute("aria-labelledby", "trama-share-title");
  document.body.append(dialog);

  function field(label, value, hint, { secret = false } = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = `trama-field${secret ? " secret" : ""}`;
    const id = `trama-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    const row = document.createElement("div");
    row.className = "trama-row";
    const input = document.createElement("input");
    input.id = id;
    input.readOnly = true;
    input.value = value || "";
    input.addEventListener("focus", () => input.select());
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "trama-copy";
    copy.textContent = "Copiar";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(input.value);
      } catch {
        input.select();
        document.execCommand?.("copy");
      }
      copy.textContent = "Copiado";
      setTimeout(() => { copy.textContent = "Copiar"; }, 1600);
    });
    row.append(input, copy);
    wrapper.append(labelEl, row);
    if (hint) {
      const small = document.createElement("small");
      small.textContent = hint;
      wrapper.append(small);
    }
    return wrapper;
  }

  function render() {
    dialog.replaceChildren();
    const header = document.createElement("header");
    const title = document.createElement("h2");
    title.id = "trama-share-title";
    title.textContent = "Compartilhar e conectar";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "trama-close";
    close.setAttribute("aria-label", "Fechar");
    close.textContent = "×";
    close.addEventListener("click", () => dialog.close());
    header.append(title, close);

    const read = document.createElement("section");
    read.append(heading("Para ler e apresentar"),
      field("Link de leitura", links.share_url, "Qualquer pessoa com este link vê os mapas e as apresentações, mas não pode editar."),
      field("Abrir direto na apresentação", links.present_url, "Acrescente ?map=<id> para escolher um mapa específico."));
    const rotate = document.createElement("button");
    rotate.type = "button";
    rotate.className = "trama-secondary";
    rotate.textContent = "Gerar novo link de leitura";
    rotate.addEventListener("click", async () => {
      if (!confirm("O link de leitura atual vai parar de funcionar. Continuar?")) return;
      const response = await fetch(`${ctx.apiBase}/api/hosted/share/rotate`, { method: "POST" });
      if (response.ok) {
        links = { ...links, ...(await response.json()).links };
        render();
      }
    });
    read.append(rotate);

    const edit = document.createElement("section");
    edit.append(heading("Chave de edição"),
      field("Link secreto de edição", links.edit_url, "Quem tiver este link pode editar e apagar tudo. Ele não pode ser recuperado se for perdido.", { secret: true }));

    const agents = document.createElement("section");
    agents.append(heading("Agentes"),
      field("MCP deste espaço", links.mcp_url, "Adicione como conector MCP remoto (Streamable HTTP). O endereço já inclui a chave de edição.", { secret: true }),
      field("CLI", `curl -fsSLo trama.mjs ${links.cli_url || "/cli/trama.mjs"} && TRAMA_TOKEN='${links.edit_url || ""}' node trama.mjs status`, null, { secret: true }));
    const guide = document.createElement("p");
    guide.className = "trama-muted";
    guide.innerHTML = "Guia de autoria para agentes: ";
    const guideLink = document.createElement("a");
    guideLink.href = links.guide_url || "/llms.txt";
    guideLink.target = "_blank";
    guideLink.rel = "noopener";
    guideLink.textContent = "llms.txt";
    guide.append(guideLink);
    agents.append(guide);

    const backup = document.createElement("section");
    backup.append(heading("Backup"));
    const download = document.createElement("button");
    download.type = "button";
    download.className = "trama-secondary";
    download.textContent = "Baixar backup completo (.json)";
    download.addEventListener("click", async () => {
      const response = await fetch(`${ctx.apiBase}/api/project/backup`);
      if (!response.ok) return;
      const bundle = await response.json();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${(bundle.project?.title || "trama").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}.loopviewer.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "trama-danger";
    remove.textContent = "Excluir este espaço";
    remove.addEventListener("click", async () => {
      const answer = prompt("Isso apaga permanentemente todos os mapas e apresentações deste espaço. Digite EXCLUIR para confirmar.");
      if (answer !== "EXCLUIR") return;
      const response = await fetch(`${ctx.apiBase}/api/hosted/workspace`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "delete" })
      });
      if (response.ok) {
        forgetRecent(ctx.workspacePath);
        window.location.assign("/");
      }
    });
    backup.append(download, remove);

    dialog.append(header, read, edit, agents, backup);
  }

  function heading(text) {
    const h = document.createElement("h3");
    h.textContent = text;
    return h;
  }

  trigger.addEventListener("click", () => {
    render();
    dialog.showModal();
  });

  // First visit to a workspace: make sure the author knows the link is the key.
  if (!localStorage.getItem(seenKey)) {
    const notice = document.createElement("div");
    notice.className = "trama-notice";
    notice.setAttribute("role", "status");
    const text = document.createElement("p");
    text.innerHTML = "<strong>Guarde o link desta página.</strong> Ele é a única chave de edição deste espaço e não pode ser recuperado. Para mostrar seu trabalho, use “Compartilhar” e envie o link de leitura.";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copiar link de edição";
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(links.edit_url || window.location.href); copy.textContent = "Copiado"; } catch { /* ignore */ }
    });
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "trama-secondary";
    dismiss.textContent = "Entendi";
    dismiss.addEventListener("click", () => {
      localStorage.setItem(seenKey, "1");
      notice.remove();
    });
    const actions = document.createElement("div");
    actions.className = "trama-notice-actions";
    actions.append(copy, dismiss);
    notice.append(text, actions);
    document.body.append(notice);
  }
}

function forgetRecent(path) {
  try {
    const key = "loopviewer:recent-projects";
    const recent = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify(recent.filter(item => item.path !== path)));
  } catch {
    // ignore
  }
}
