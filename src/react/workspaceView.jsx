import React from "react";
import { mapPreviewGeometry } from "../app/appShell.js";
import { Button } from "./ui/Button.jsx";
import { Icon } from "./ui/Icon.jsx";
import { Input } from "./ui/Field.jsx";

/**
 * React-owned Projects surface. This deliberately consumes the existing shell
 * view model and callbacks: workspace persistence stays outside the view.
 */
export function WorkspaceView({ view = {}, callbacks = {} }) {
  if (view.hydrating) return <WorkspaceLoadingState />;
  const project = view.project || { title: "Projeto local", description: "" };
  const maps = view.maps || [];
  const projects = [project, ...(view.otherProjects || [])];
  const projectCount = projects.length;
  const activeTitle = project.title || "Projeto local";

  return (
    <div className="projects-workspace">
      <section className="projects-hero" aria-labelledby="workspace-home-title">
        <div className="projects-hero-copy">
          <span className="workspace-kicker">Continue de onde parou</span>
          <h2 id="workspace-home-title">Seu trabalho sistêmico, em um só lugar</h2>
          <p>Abra um projeto local para editar seus mapas e construir as narrativas que os tornam compreensíveis.</p>
        </div>
        <div className="projects-hero-actions">
          <span className="projects-local-status"><Icon name="folder" size="sm" /><strong>{projectCount} {projectCount === 1 ? "projeto local" : "projetos locais"}</strong><small>SQLite · nenhum envio externo</small></span>
          <Button id="workspace-open-project" onClick={() => callbacks.onOpenProject?.()} variant="secondary" leadingIcon="folder">Abrir projeto</Button>
          <Button className="workspace-primary" id="workspace-new-project" onClick={() => callbacks.onNewProject?.()} variant="primary" leadingIcon="plus">Novo projeto</Button>
        </div>
      </section>

      <section className="projects-library" aria-labelledby="workspace-projects-title">
        <div className="projects-section-heading">
          <div>
            <span className="workspace-kicker">Projetos recentes</span>
            <h3 id="workspace-projects-title">Biblioteca de projetos</h3>
          </div>
          <span className="projects-library-count">{projectCount} {projectCount === 1 ? "local" : "locais"}</span>
        </div>
        <div className="projects-library-grid" id="workspace-project-grid">
          {projects.map((item, index) => <ProjectCard
            key={item.path || item.title || index}
            item={item}
            active={index === 0}
            previewModel={index === 0 ? project.previewModel : null}
            onClick={() => index === 0 ? callbacks.onOpenMap?.(0) : callbacks.onOpenProjectPath?.(item.path)}
          />)}
          <Button className="projects-new-card" aria-label="Criar novo projeto" onClick={() => callbacks.onNewProject?.()} variant="quiet" size="touch">
            <span className="projects-new-card-icon" aria-hidden="true"><Icon name="plus" /></span>
            <strong>Novo projeto</strong>
            <small>Crie um banco local para organizar mapas relacionados.</small>
          </Button>
        </div>
      </section>

      <section className="projects-selected" aria-labelledby="workspace-maps-title">
        <header className="projects-selected-header">
          <div>
            <div className="projects-breadcrumb"><Icon name="folder" size="sm" /><span>Projetos</span><b>›</b><strong>{activeTitle}</strong></div>
            <span className="workspace-kicker">Projeto selecionado</span>
            <h3 id="workspace-maps-title">{activeTitle}</h3>
            <p>{project.description || "Projeto SQLite local do LoopViewer."}</p>
          </div>
          <div className="projects-selected-actions">
            <Button id="workspace-import-markdown" onClick={() => callbacks.onImportMarkdown?.()} variant="secondary" leadingIcon="download">Importar Markdown</Button>
            <Input unstyled id="workspace-loop-source-file" type="file" accept=".md,.loop.md,text/markdown,text/plain" hidden />
            <Button className="workspace-primary" id="workspace-create-map" onClick={() => callbacks.onCreateMap?.()} variant="primary" leadingIcon="plus">Novo mapa</Button>
          </div>
        </header>

        {maps.length ? <div className="projects-map-grid" id="workspace-map-list">
          {maps.map(map => <MapCard key={map.id} map={map} onOpen={() => callbacks.onOpenMap?.(map.index)} />)}
        </div> : <div className="projects-empty-state">
          <span className="projects-empty-icon" aria-hidden="true"><Icon name="map" /></span>
          <strong>Este projeto ainda não possui mapas.</strong>
          <p>Crie um mapa vazio ou importe uma fonte Markdown para começar uma investigação.</p>
          <div><Button onClick={() => callbacks.onImportMarkdown?.()} variant="secondary">Importar Markdown</Button><Button onClick={() => callbacks.onCreateMap?.()} variant="primary">Novo mapa</Button></div>
        </div>}
      </section>
    </div>
  );
}

function WorkspaceLoadingState() {
  return <div className="projects-workspace projects-workspace-loading" aria-busy="true" aria-live="polite">
    <section className="projects-loading-panel">
      <span className="projects-loading-mark" aria-hidden="true"><Icon name="map" /></span>
      <span className="workspace-kicker">Workspace local</span>
      <h2>Preparando seus mapas</h2>
      <p>Carregando o projeto local e suas narrativas salvas.</p>
      <span className="projects-loading-line" aria-hidden="true" />
    </section>
  </div>;
}

function ProjectCard({ item = {}, active = false, previewModel = null, onClick }) {
  const metrics = item.metrics || {};
  const count = Number(metrics.maps || 0);
  const description = item.description || (active
    ? "Mapas sistêmicos para investigar relações, coordenação e exceções operacionais."
    : "Projeto local preparado para os próximos mapas de investigação.");
  return <Button className={`projects-project-card${active ? " active" : ""}`} onClick={onClick} variant="quiet" size="touch" aria-current={active ? "page" : undefined}>
    <span className="projects-project-card-head">
      <span className="projects-project-icon" aria-hidden="true">{previewModel ? <MapPreview model={previewModel} label="Prévia do projeto selecionado" compact /> : <Icon name="folder" />}</span>
      <span className="projects-project-state">{active ? "Projeto aberto" : "Projeto local"}</span>
    </span>
    <strong>{item.title || "Projeto local"}</strong>
    <span className="projects-project-description">{description}</span>
    {item.path ? <code className="projects-project-path">{shortPath(item.path)}</code> : null}
    <span className="projects-project-footer"><b>{count}</b><small>{count === 1 ? "mapa" : "mapas"}</small><em>{formatUpdated(item.updatedAt)}</em>{active ? <Icon name="arrowRight" size="sm" /> : null}</span>
  </Button>;
}

function MapCard({ map = {}, onOpen }) {
  return <Button className={`projects-map-card${map.active ? " active" : ""}`} onClick={onOpen} variant="quiet" size="touch">
    <span className="projects-map-preview"><MapPreview model={map.model} label={`Prévia do mapa ${map.title || "sem título"}`} /></span>
    <span className="projects-map-kicker"><Icon name="map" size="sm" /> Mapa local</span>
    <strong>{map.title || "Mapa sem título"}</strong>
    <small>{map.nodes || 0} variáveis · {map.edges || 0} relações · {map.loops || 0} ciclos</small>
    <span className="projects-map-footer"><span className={map.hasPresentation ? "ready" : ""} />{map.storySteps ? `${map.storySteps} passos de apresentação` : "Sem apresentação"}<b>Abrir no editor <Icon name="arrowRight" size="sm" /></b></span>
  </Button>;
}

function MapPreview({ model, label, compact = false }) {
  const geometry = mapPreviewGeometry(model, compact ? { width: 92, height: 46, padding: 5 } : { width: 360, height: 138, padding: 14 });
  return <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-label={label} className={`workspace-map-svg${compact ? " compact" : ""}`}>
    {geometry.edges.map(edge => <line key={edge.id} x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} className={edge.type} />)}
    {geometry.nodes.map((node, index) => <circle key={node.id || index} cx={node.x} cy={node.y} r={compact ? (index === 0 ? 3.2 : 2.4) : (index === 0 ? 5 : 3.9)} />)}
  </svg>;
}

function shortPath(path = "") {
  const normalized = String(path).replace(/\\/g, "/");
  const pieces = normalized.split("/").filter(Boolean);
  return pieces.length > 3 ? `…/${pieces.slice(-3).join("/")}` : normalized;
}

function formatUpdated(value) {
  if (!value) return "Local";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Local";
  return `Atualizado ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(date)}`;
}
