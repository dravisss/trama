import { hostedContext } from "./api.js";

/**
 * Interface copy that depends on where projects live. Local-first mode keeps
 * its original wording; hosted mode (secret-link workspaces on a server) must
 * not claim that data stays in a local SQLite file.
 */
const LOCAL_COPY = {
  heroText: "Abra um projeto local para editar seus mapas e construir as narrativas que os tornam compreensíveis.",
  projectCount: count => `${count} ${count === 1 ? "projeto local" : "projetos locais"}`,
  storageBadge: "SQLite · nenhum envio externo",
  libraryCount: count => `${count} ${count === 1 ? "local" : "locais"}`,
  openProject: "Abrir projeto",
  newProject: "Novo projeto",
  newProjectHint: "Crie um banco local para organizar mapas relacionados.",
  defaultDescription: "Projeto SQLite local da Trama.",
  loadingKicker: "Workspace local",
  loadingText: "Carregando o projeto local e suas narrativas salvas.",
  navFootTitle: "Local-first",
  navFootText: "Seus mapas permanecem no projeto SQLite local.",
  editorEyebrow: "Editor local",
  serverOffline: "Servidor local offline. Rode npm run serve."
};

export function deploymentCopy() {
  const hosted = hostedContext();
  if (!hosted) return LOCAL_COPY;
  const product = hosted.productName || "Trama";
  return {
    heroText: "Abra um espaço para editar seus mapas e construir as narrativas que os tornam compreensíveis.",
    projectCount: count => `${count} ${count === 1 ? "espaço" : "espaços"}`,
    storageBadge: `Salvo em ${product} · acesso por link secreto`,
    libraryCount: count => `${count} ${count === 1 ? "espaço" : "espaços"}`,
    openProject: "Abrir espaço",
    newProject: "Novo espaço",
    newProjectHint: "Crie um espaço novo, com link secreto próprio.",
    defaultDescription: `Espaço de mapas causais em ${product}.`,
    loadingKicker: "Espaço online",
    loadingText: "Carregando o espaço e suas narrativas salvas.",
    navFootTitle: "Sem conta",
    navFootText: "Quem tiver o link de edição pode editar. Guarde-o e compartilhe só o link de leitura.",
    editorEyebrow: "Editor",
    serverOffline: `Não foi possível falar com ${product}. Verifique a conexão e tente de novo.`
  };
}
