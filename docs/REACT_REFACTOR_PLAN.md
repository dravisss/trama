# Refatoração React da Trama

Status: migração principal concluída; adapter legado em redução controlada

## Objetivo

Migrar o aplicativo inteiro para uma arquitetura React sem interromper o editor local-first, o
motor Cytoscape, a persistência SQLite, o Story Studio ou a exportação standalone. A migração é
incremental: cada fatia assume uma responsabilidade de UI, expõe contratos explícitos e mantém o
runtime anterior funcionando até que a fatia equivalente esteja coberta por testes.

## Princípios

1. O domínio continua em `src/core`, `src/presentation`, `src/platform` e `src/CLDEngine.js`.
2. React é responsável por composição, estado efêmero de interface e eventos de intenção.
3. Cytoscape continua encapsulado no adaptador de renderização; componentes React não acessam o
   objeto `cy` diretamente.
4. Persistência é feita por comandos/serviços, nunca por efeitos escondidos dentro de componentes.
5. A exportação standalone não depende de React: ela recebe o mesmo modelo compilado e mantém seu
   runtime independente.
6. Cada migração preserva IDs, atributos QA e semântica de teclado existentes.

## Arquitetura alvo

```text
ReactApp
├── AppShell (modo, navegação, ações globais)
├── WorkspaceRoute
│   ├── ProjectLibrary
│   └── MapLibrary
├── EditorRoute
│   ├── ContextRail (views/loops)
│   ├── CanvasHost (adaptador Cytoscape)
│   └── InspectorDock (tabs e formulários)
├── ExploreRoute
├── StoryStudioRoute
│   ├── StoryTimeline
│   ├── StoryCanvasHost
│   ├── BeatInspector
│   └── StoryMarkdownPanel
└── PresentationRoute
```

O `AppStore` fornece estado normalizado e comandos. Adaptadores legados são temporários e ficam
em `src/app/`; nenhum componente novo deve importar `src/app.js`.

## Estado desta implementação

| Fatia | Estado | Evidência |
| --- | --- | --- |
| Dependências, build e ponte de runtime | concluída | `react`, `react-dom`, `dist/react-app.iife.js`, `window.TramaReact` |
| Shell, navegação e workspace | concluída | `src/react/main.jsx`, `src/react/reactApp.css`, mount points preservados |
| Timeline do Story Studio | concluída nesta fatia | `src/react/storyTimeline.jsx`, drag nativo + fallback por ponteiro |
| Rail contextual, seletor de mapas e canvas Cytoscape | concluída nesta fatia | `src/react/workspaceSidebar.jsx`, `src/react/canvasSurface.jsx`, ciclo de vida Cytoscape preservado |
| Inspector, Markdown e painéis de dados | concluída nesta fatia | `src/react/editorInspector.jsx`, `src/react/loopMarkdown.jsx`, `src/react/editorDockPanels.jsx`; tabela, histórico e Style Builder vivem na composição única via portals |
| Seletor de vistas e superfícies auxiliares do editor | concluída nesta fatia | `src/react/workspaceSidebar.jsx`, `src/react/editorDockPanels.jsx`; seleção de vista, tabela, histórico e estilo usam view models e callbacks explícitos |
| Story Studio (frame, Inspector, timeline e Markdown) | concluída nesta fatia | `src/react/storyFrame.jsx`, `src/react/storyInspector.jsx`, `src/react/storyTimeline.jsx`, `src/react/storyMarkdown.jsx`; o frame agora é a composição única da superfície |
| Explorar e Apresentar | concluída nesta fatia | `src/react/explorePanel.jsx`, `src/react/presentationCard.jsx` |
| Estado e intenções de UI | concluída nesta fatia | `src/app/appStore.js`, `src/app/appCommands.js`, `tests/app-store.test.mjs` |
| Comandos de domínio e persistência | boundary explícito em redução controlada | `src/app/workspacePersistence.js`, `src/app/engineBridge.js`, `src/app/transientDomBridge.js`; `src/app.js` ainda orquestra domínio e render legado |
| Exportação standalone | preservada | continua em bundle separado e sem dependência de React |

Essa tabela é deliberadamente explícita: todas as superfícies visíveis passaram pelos critérios de
paridade desta execução. O adapter de domínio em `src/app.js` e seus IDs públicos ainda formam uma
fronteira de compatibilidade; removê-los é uma etapa posterior, não uma condição para declarar a
convergência visual concluída.

## Fases e critérios de aceite

### Fase 0 — contrato e infraestrutura

- React e ReactDOM instalados como dependências de produção.
- Entrypoint React compilado pelo mesmo `build.mjs`.
- `mountReactApp` idempotente e seguro para hot reload/testes.
- Atributos `data-ui-mode`, `data-qa-*` e IDs públicos preservados.

### Fase 1 — shell e workspace

- Navegação, cabeçalho e biblioteca de projetos renderizados por React.
- Mudança de modo mantém os comandos existentes e não duplica o modelo.
- Cards de projeto/mapa continuam derivados do workspace real.

### Fase 2 — editor

- Canvas fica atrás de `CanvasSurface`, com um único ciclo de vida Cytoscape.
- Rail de contexto, toolbar, Inspector, vista, tabela e histórico viram superfícies React
  estáveis (`WorkspaceSidebar`, `CanvasSurface`, `EditorInspectorPanel`, `EditorDockPanels`).
- Markdown e formulários usam os comandos transacionais já existentes no adapter, sem duplicar
  estado editorial.

### Fase 3 — Story Studio

- Frame, ações, timeline, inspector essencial e aba Markdown passam a ser React.
- Drag/drop, seleção, criação, remoção e edição disparam comandos do storyboard.
- O compilador/controller de apresentação permanece compartilhado com standalone.

### Fase 4 — pós-migração e remoção opcional do adapter

- `src/app.js` deixa de ser composição estrutural de UI e vira apenas adaptador temporário de
  comandos, Cytoscape, persistência e exportação.
- Todos os listeners de DOM são removidos ou encapsulados em hooks/adaptadores.
- O HTML estático contém apenas o mount point e metadados.

Nesta entrega, a primeira regra já foi atingida para todas as superfícies visíveis: `src/app.js`
não cria mais a composição visual; ele conecta comandos e o runtime imperativo aos IDs públicos
que os componentes React montam. O estado de navegação, dock, seleção do Story Studio, modo de
edição e status de salvamento agora passa por `createAppStore()` e `createAppCommands()`. A
remoção física dos nós HTML duplicados do Story Studio também foi concluída: `StoryFrame` monta
Inspector, Markdown e ações em uma única árvore React; os IDs públicos continuam estáveis para o
adapter de domínio. Os listeners da superfície Story Studio estão encapsulados em
`src/app/storyStudio/domBridge.js`; navegação, editor, dock, source/style e apresentação do
workspace estão encapsulados em `src/app/workspaceDomBridge.js`. A extração dos listeners de
engine, menus transitórios e controles gerados dinamicamente, além da remoção dos mount-points
legados das demais rotas, continua como limpeza incremental posterior. A persistência de projetos e
mapas agora está atrás de `createWorkspacePersistence`: leituras de projeto/assets, listagem de
projetos, criação de mapas e autosave serializado podem ser testados sem DOM; o entrypoint mantém
apenas a política de estado, feedback e atualização do canvas.

## Estratégia de validação

- Testes de componentes com DOM real e contratos de acessibilidade.
- Testes de comandos/reducers antes de cada migração visual.
- `npm run check` em cada fase.
- Smoke browser: Projetos → Editor → Markdown → Explorar → Story Studio → Apresentar → voltar.
- Verificação de console, dimensões, foco, teclado, drag/drop e paridade da timeline compilada.

### Evidência desta execução

- `npm run check`: 135 testes unitários, 4 testes QA de Story Studio e build aprovados.
- Smoke no navegador em aba limpa: Workspace → Editor → loops → Markdown → Vista → Dados →
  Histórico → Explorar → Story Studio → Apresentar → Fechar apresentação → Workspace, sem erros
  ou warnings de console.
- Validações específicas: canvas React mantém Cytoscape montado uma única vez; loops continuam
  focáveis; painéis React substituem os irmãos legacy visíveis; timeline, Inspector e fonte
  Markdown permanecem acessíveis pelos IDs públicos; os bridges podem ser destruídos sem deixar
  listeners ativos.
- Auditoria estrutural: Story Studio mantém uma única seção `data-dock-content="story"`, um único
  Inspector e um único editor Markdown no DOM; a edição manual de título prevalece sobre o rótulo
  automático do foco causal.
- Smoke visual/interativo: console limpo, aba Markdown com editor de 154px e conteúdo rolável de
  1484px, beat selecionado com `aria-current="step"`/estado visual ativo e título editado refletido
  no cartão da timeline.
- Smoke da árvore React única: cinco modos de navegação, canvas, Story Studio, apresentação e
  Explorar foram percorridos após recarga; cada painel `inspect`, `map`, `code`, `style`, `table` e
  `history` abriu individualmente, com largura útil e sem erro de console. O DOM manteve um único
  topbar React e nenhum topbar/nav legado direto sob `body`.
- Smoke final da timeline após recarga: um único shell React, um único track React, 18 beats em 3
  cenas, nenhum `#story-timeline-track` legado, seleção atualizando status/índice/scrubber e
  `aria-current="step"`; os fluxos de adicionar cena e adicionar movimento abriram o diálogo
  contextual correto, com console limpo.
- Smoke do editor após a extração do rail: o seletor de mapas (`#scenario-tabs`) e o navegador de
  loops (`#loop-list`) são renderizados por React; a troca de mapa atualiza o mapa ativo e os
  metadados sem duplicar itens ou gerar erro de console.
- Smoke das superfícies auxiliares após a migração: Inspector seleciona e salva variável, relação
  e campos customizados; Tabela alterna Variáveis/Relações/Loops e aplica edição inline; Histórico
  carrega versões e expõe restauração; Style Builder hidrata controles, aplica CSS-like e mantém
  os valores ao trocar de vista. Todos os fluxos foram executados após recarga com console limpo.

## Riscos controlados

- **Cytoscape desmontado por re-render:** `CanvasSurface` é montado uma vez e inicializa o host
  Cytoscape fora dos renders dinâmicos, preservando um único ciclo de vida por
  modelo.
- **Estado duplicado:** o adapter publica snapshots imutáveis; React não mantém cópia editorial.
- **Regressão de exportação:** standalone continua compilado em bundle separado e é testado contra a
  mesma timeline do editor.
- **Migração longa:** cada fase é entregável e pode coexistir com o código antigo sem duplicar
  superfícies de produto.
