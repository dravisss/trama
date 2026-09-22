# Trama Unified Product Design System

## Especificação de convergência visual, arquitetura React e migração segura

Status: especificação normativa; a execução e a auditoria final estão registradas em
`docs/UI_SYSTEM_IMPLEMENTATION_LOG.md`.
Versão da spec: 1.1
Data da análise: 2026-07-21
Escopo do repositório: raiz do projeta Trama.

## 0. Relação com a especificação arquitetural

Esta é a especificação normativa para a identidade visual, tokens, primitives, superfícies,
standalone visual e a sequência de migração R0–R9.

`docs/UI_SYSTEM_ARCHITECTURE_AND_MIGRATION_SPEC.md` é a especificação-mãe dos contratos de
arquitetura: bounded contexts, ownership de estado, ports/adapters, TDD, rollback e governança.
Ela não cria uma segunda lista de implementação visual. Quando houver sobreposição:

- esta spec governa o design system e a ordem de migração das superfícies;
- a spec arquitetural governa limites de dependência, estado, persistência e adapters;
- ambos compartilham o mesmo Gate 0, Compatibility Manifest, fixtures, baselines e stop conditions;
- uma task visual não pode ser implementada duas vezes por estar descrita nos dois documentos;
- a migração `loops → maps` continua fora deste programa e exige uma spec de dados própria.

### Gate 0 compartilhado — pré-condição de execução

Nenhuma task R1–R9 ou Fase 1–10 começa antes de:

1. classificar o worktree atual e separar alterações preexistentes, generated outputs e mudanças
   pertencentes a este programa;
2. confirmar a fixture e o banco temporário de QA;
3. atualizar os números de testes, roots, mount points, CSS, `!important`, bundles e warnings;
4. aprovar a lista `preserve / fix / known exception` das baselines;
5. registrar o Compatibility Manifest com owner e critério de remoção;
6. aprovar ou rejeitar os defaults da seção 27;
7. confirmar que o primeiro PR altera apenas baseline/infraestrutura e não redesenha a UI.

O Gate 0 pode ser executado em paralelo com a preparação dos dois planos, mas nenhuma mudança de
produção deve começar antes de seu aceite.

## 1. Resumo executivo

A Trama não precisa de uma nova identidade visual nem de uma biblioteca visual completa. Ele
precisa transformar a identidade Matcha já existente em um sistema explícito, compartilhado e
verificável.

Hoje a aplicação apresenta boa coerência de paleta e tipografia em vários estados renderizados,
mas essa coerência é mantida por sobreposição de CSS, repetição de valores e correções tardias. O
risco não é apenas estético: a visibilidade de superfícies React, o layout dos modos e parte da
compatibilidade com o adaptador imperativo dependem da ordem de seis folhas de estilo e de centenas
de regras `!important`.

A arquitetura proposta separa quatro contratos:

```text
Identidade Matcha
  -> tokens de fundação e tokens semânticos
    -> primitives de produto independentes de rota
      -> composições Workspace / Editor / Explore / Story / Present
        -> adapters de Canvas e Publicação
```

O plano não combina uma mudança visual ampla com a consolidação estrutural do React. A migração é
organizada por risco e a ordem normativa é:

1. capturar baselines e isolar dados de QA;
2. introduzir tokens e camadas de CSS sem alteração visual;
3. criar e validar primitives sem migrar rotas;
4. migrar Workspace, shell, Explore, Editor, Story Studio e Present por superfície;
5. levar os mesmos tokens ao standalone sem adicionar React ao export;
6. somente depois consolidar os múltiplos roots React e remover a camada de compatibilidade visual;
7. remover CSS legado apenas com prova de não utilização.

O resultado esperado é uma aplicação que pode continuar tendo modos deliberadamente diferentes —
Workspace editorial, Editor denso, Story Studio narrativo e Present imersivo — sem parecer que cada
modo pertence a um produto distinto.

### 1.1 Estado de execução desta revisão

Esta seção consolida o estado observável da execução no checkout, sem substituir os requisitos,
critérios de aceite e regras de rollback definidos nas seções seguintes. O estado abaixo é o
resultado da revisão final desta implementação; os gates listados no log
precisam continuar verdes no checkout que consumir esta mudança.

| Área | Estado atual | Evidência |
|---|---|---|
| R0 — baseline/isolamento | concluído | fixture SQLite temporária, reset por teste e 15 baselines |
| R1 — tokens/cascade | concluído | 237 tokens, CSS/manifest gerados, hash `ba96f9e1921a` |
| R2 — primitives/catalog | concluído | catálogo isolado, contratos de teclado/foco, axe e zero writes |
| R3 — shell/workspace | concluído | consumers de primitives, overlays e jornada de shell cobertos |
| R4 — Explore | concluído | detalhe, foco/câmera determinística, ações, overlay móvel e baselines |
| R5 — Editor | concluído | CanvasHost estável, ações estruturais, preview/commit, reload e reflow 200% |
| R6 — Story Studio/Present | concluído | inspector móvel, foco, keyboard, explore/resume e timeline compartilhada |
| R7 — standalone/fonts | concluído | três perfis offline, 10 faces locais embutidas, sem React/rede |
| R8 — root/composição | concluído | um `createRoot()`, portals, AppStore observável, mode churn e mount único |
| R9 — retirement/governance | concluído | `uiPolish.css` removido, 0 `!important` no app, aliases de token removidos |

Os números acima são um snapshot de execução. O log é a fonte operacional e contém os comandos,
quantidades e limites da auditoria. Os aliases de tokens não são mais publicados; os nomes
`story-v2-*` que ainda existem são classes/IDs estruturais, não CSS variables deprecated.

## 2. Resultado de produto esperado

Ao concluir esta spec:

- a Trama terá uma identidade Matcha reconhecível em todas as superfícies;
- diferenças entre modos serão expressas como densidade, composição e contexto, não como sistemas
  visuais independentes;
- componentes comuns terão os mesmos estados, dimensões e semântica em toda a aplicação;
- o canvas continuará especializado e configurável por views e Style Packs;
- a personalização do mapa não vazará para o shell do produto;
- o standalone continuará autocontido, offline e sem dependência de React;
- mudanças visuais serão avaliáveis por testes de contrato, acessibilidade, interação e regressão
  visual;
- a composição React poderá evoluir para um root principal sem colocar Cytoscape, autosave,
  Story Studio ou export em risco;
- não haverá migração de banco nem reescrita de dados para adotar o design system.

## 3. Diagnóstico do estado atual

### 3.1 Arquitetura funcional preservável

O projeto já possui fronteiras maduras que não devem ser refeitas para resolver coerência visual:

- domínio em `src/core/`;
- geometria pura em `src/geometry/`;
- roteamento em `src/routing/`;
- adaptação Cytoscape em `src/rendering/`;
- anotações SVG em `src/annotations/`;
- apresentações V2 em `src/presentation/`;
- persistência local em `src/platform/projectStore.js` e `server.mjs`;
- comandos e bridges de aplicação em `src/app/`;
- runtime standalone separado em `src/standalone.js`;
- export autocontido em `src/export/standalone.js`.

Essas fronteiras são ativos do produto. O programa de design system deve trabalhar ao redor delas.

### 3.2 Superfícies de produto atuais

| Superfície | Papel | Fonte de dados | Runtime visual atual |
|---|---|---|---|
| Workspace | projetos e mapas | SQLite/API + `workspaceViewModel` | React + `appShell.css` + overrides React |
| Editor | autoria e inspeção | modelo ativo + engine + view + Markdown | React em vários roots + Cytoscape imperativo |
| Explore | leitura de loops | loops e relações reais do engine | React + classes de modo + foco do engine |
| Story Studio | autoria de Presentation V2 | apresentação persistida + compiler/controller | React + DOM bridge + CSS específico V2 |
| Present | experiência guiada | timeline compilada | React para o card + controller compartilhado |
| Standalone | publicação offline | payload V3 compilado | DOM imperativo + CSS standalone + engine |
| Canvas | mapa causal | modelo, view e theme | Cytoscape + SVG + Style Pack |

### 3.3 Autoridades visuais concorrentes

Na análise inicial, o `index.html` carregava, nesta ordem:

1. `styles.css`;
2. `src/app/appShell.css`;
3. `src/app/storyStudio/storyStudio.css`;
4. `src/react/reactApp.css`;
5. `src/react/storyStudioV2/storyStudioV2.css`;
6. `src/react/uiPolish.css`.

Além disso:

- `standalone.css` implementa outro contrato de tokens;
- `src/themes/matcha.js` define o tema do engine;
- `src/styles/library.js` define Style Packs editoriais para o mapa;
- valores Matcha são repetidos em vários desses arquivos;
- `uiPolish.css` declara explicitamente que é carregado por último para corrigir regras anteriores;
- `reactApp.css` contém regras para ocultar irmãos legados e resolver propriedade visual por ordem de
  cascata;
- `storyStudioV2.css` cria o namespace `--story-v2-*`, embora vários valores sejam idênticos a
  `--ui-*`.

Na execução final, o token CSS gerado e `fonts.css` entram antes das folhas de produto, as regras
foram distribuídas em layers explícitas, `uiPolish.css` foi removido e o standalone passou a
consumir somente variáveis `--lv-*`.

### 3.4 Métricas de dívida da cascata (baseline histórica)

Métricas observadas antes da execução no checkout em 2026-07-21. Elas são baseline de diagnóstico
histórico, não descrevem o estado final.

| Arquivo | Linhas | `!important` | Hex literals | Seletores com escopo em `body` |
|---|---:|---:|---:|---:|
| `styles.css` | 2.639 | 60 | 136 | 78 |
| `src/app/appShell.css` | 2.309 | 293 | 36 | 573 |
| `src/app/storyStudio/storyStudio.css` | 98 | 1 | 2 | 2 |
| `src/react/reactApp.css` | 151 | 12 | 7 | 48 |
| `src/react/storyStudioV2/storyStudioV2.css` | 498 | 163 | 43 | 26 |
| `src/react/uiPolish.css` | 370 | 127 | 1 | 130 |
| `standalone.css` | 17 minificadas | 2 | 11 | 0 |

O conjunto carregado pela aplicação somava 656 ocorrências de `!important`. A execução rehomeou as
regras e eliminou essa dívida do app; o standalone mantém somente duas declarações justificadas
para `prefers-reduced-motion`, fora do CSS de rotas.

Valores fundamentais também aparecem em múltiplos contratos. Exemplos:

| Valor | Quantidade de arquivos em que aparece | Significado recorrente |
|---|---:|---|
| `#6f9a5b` | 6 | moss/accent |
| `#fffdf5` | 6 | paper/surface |
| `#2b3a2e` | 4 | primary ink |
| `#7a8a72` | 4 | secondary/muted |
| `#f7f3e7` | 4 | canvas/surface |

### 3.5 Composição React (baseline histórica e destino verificado)

Na análise inicial, `src/react/main.jsx` criava 16 roots React diretamente e a aplicação renderizada continha 18 mount
points identificáveis. A composição usa:

- múltiplos `createRoot()`;
- estados mutáveis locais por superfície;
- métodos imperativos como `renderLoopBrowser()` e `renderStyleBuilder()`;
- 12 chamadas a `flushSync()` no entrypoint React;
- roots React aninhados, criados depois que outro root já montou o contêiner;
- IDs públicos como contrato com `src/app.js` e os DOM bridges.

Isto preservou o produto durante a migração, mas impedia que contexto, tema, primitives e estados de
interação fossem compartilhados naturalmente por toda a árvore. O estado final usa um único root,
portals para os hosts compatíveis e snapshots de composição publicados no `AppStore`; os métodos
`renderX` restantes são adapters de compatibilidade, não fontes privadas de estado.

O código React possui aproximadamente:

- 140 elementos `<button>`;
- 35 `<input>`;
- 25 `<select>`;
- 7 `<textarea>`;
- 8 `<details>`;
- um `<dialog>`.

O catálogo e as rotas finais usam `Button`, `Field`, `Tabs`, `Overlay`, `Icon` e `Surface`; o
canvas continua sendo a única região especializada que mantém descendentes mutáveis do engine.

### 3.6 Evidência da aplicação renderizada

O smoke visual inicial foi executado no app real em `http://localhost:4173/`, usando o projeto
SQLite então aberto. As exceções históricas abaixo são mantidas para explicar a motivação da
migração; o estado atual e os gates verdes estão no log de implementação.

Achados confirmados:

- Workspace, Editor, Explore, Story Studio e Present carregam e trocam de modo sem IDs duplicados;
- a paleta e a combinação Noto Sans/Noto Serif já formam uma base Matcha coerente;
- Workspace usa uma composição editorial espaçosa;
- Editor usa composição compacta e controles de várias famílias e alturas;
- Explore mantém a linguagem editorial, mas possui um painel de leitura próprio;
- Story Studio usa tokens duplicados com os mesmos valores de `--ui-*` e outra escala de botões,
  tabs e cards;
- Present é deliberadamente imersivo e escuro no chrome, mas ainda pertence à linguagem Matcha;
- existem 215 botões no DOM em Story Studio, dos quais apenas 23 estavam visíveis no estado
  inspecionado — sinal de que visibilidade e compatibilidade ainda dependem de uma árvore ampla;
- não havia IDs duplicados no DOM;
- o navegador carregava as seis folhas de estilo listadas acima;
- a console repetia o warning Cytoscape `The style property label: data(label) is invalid`;
- em viewport 390 x 844, Workspace apresentava uma faixa superior vazia de 112 px;
- no mesmo viewport, o Editor mantinha 340 px para mapa e 50 px para rail, mas o cabeçalho ficava
  visualmente recortado e a toolbar dependia de overflow horizontal;
- Story Studio móvel reduzia corretamente para mapa + timeline, mas o acesso ao inspector dependia
  de um controle compacto e precisava ser validado como fluxo de foco/teclado.

### 3.7 Baseline automatizada (histórico e estado final)

Na data da análise inicial:

- `npm test`: 151 testes aprovados;
- `npm run qa:story`: 4 testes aprovados;
- o build não foi executado durante a elaboração da spec para não reescrever `dist/` em um
  worktree que já continha alterações de implementação;
- o worktree já estava modificado antes deste documento, inclusive em engine, rendering, Style
  Library, testes e bundles gerados.

Após a execução, o snapshot operacional está no log de implementação: 161 testes unitários,
4 testes Story, 44 E2E UI, 1 teste axe, 237 tokens, 1 root React, 0 controles raw fora de
`src/react/ui/`, 0 `!important` no app CSS, 10 faces de fonte locais e nenhuma exceção visual.

### 3.8 Problema central

O problema não é “cada tela possui layout diferente”. Isso é esperado em um produto complexo.

O problema é que diferenças intencionais e diferenças acidentais usam o mesmo mecanismo:
seletores globais, ordem de carregamento, valores literais e overrides por modo. Assim, não é
possível saber, sem seguir a cascata completa, se uma diferença é decisão de design ou efeito
colateral.

## 4. Escopo

### 4.1 Incluído

- identidade Matcha do produto;
- tokens de fundação, semânticos e de componentes;
- tipografia, iconografia, espaçamento, raios, sombras, motion e estados;
- primitives React do app;
- comportamento acessível de overlays e navegação;
- composição visual de Workspace, Editor, Explore, Story Studio e Present;
- integração visual do CanvasHost sem alterar o algoritmo do engine;
- paridade visual e de tokens no standalone;
- arquitetura de cascata e redução de CSS legado;
- estratégia de migração dos múltiplos roots React;
- QA unitário, estrutural, E2E, visual, responsivo, acessível e de performance;
- rollback e isolamento de dados de teste;
- documentação para contribuição futura.

### 4.2 Fora de escopo

- reescrever o engine Cytoscape;
- alterar modelo causal, loops, sinais ou roteamento;
- alterar schema SQLite para armazenar preferências do design system;
- substituir Presentation V2;
- converter o standalone para React;
- criar dark mode completo;
- permitir que Style Packs do mapa restilizem o shell do produto;
- redesenhar todas as jornadas de produto simultaneamente;
- editar `reference.html`;
- editar `dist/` manualmente;
- resolver todos os defeitos de routing durante a migração visual;
- transformar o design system em pacote público antes de estabilizá-lo internamente.

### 4.3 Dívidas adjacentes registradas, mas não absorvidas automaticamente

- o app de autoria ainda carrega alguns assets de engine/layout por CDN no `index.html`;
- o warning histórico de estilo Cytoscape não reapareceu na fixture UI;
- a lista de projetos renderizada apresentou duas representações do mesmo projeto no workspace
  atual;
- `docs/QA_TEST_MATRIX.md` ainda possui cenários pendentes de responsividade, standalone e drag.

Esses itens devem ser classificados no Gate 0. Os itens de fontes, determinismo e paridade foram
absorvidos nesta execução; CDN do engine e demais dívidas não bloqueiam o design system e ficam
registrados para uma iniciativa de runtime própria.

## 5. Princípios do sistema

### PR-01 — Uma identidade, várias densidades

Workspace pode ser confortável; Editor e Story Studio podem ser compactos; Present pode ser
imersivo. Todos continuam usando o mesmo vocabulário de cor, tipo, forma, estados e motion.

### PR-02 — Semântica antes de literal

Componentes consomem `surface`, `text-muted`, `border-strong`, `accent` e `danger`, não valores hex
nem nomes de tonalidade diretamente.

### PR-03 — O mapa é personalizável; o produto é estável

Style Packs controlam canvas, nós, relações, loops, legendas e perfis de publicação. Eles não
controlam navegação, campos, menus, dialogs ou status de salvamento.

### PR-04 — Tokens são independentes de React

React consome o sistema, mas não o define. Standalone e engine devem poder usar os mesmos tokens
sem importar React.

### PR-05 — Comportamento e aparência são contratos separados

Radix ou outro primitive headless pode implementar foco, teclado e portal. Aparência continua
sendo propriedade da Trama.

### PR-06 — Um eixo de risco por mudança

Uma entrega não deve combinar:

- troca de token + reorganização de estado;
- redesign de rota + consolidação de root;
- troca de markup + alteração de persistência;
- remoção de CSS legado + mudança funcional do engine.

### PR-07 — Compatibilidade é explícita e temporária

IDs, `data-*`, classes e mount points preservados para bridges devem constar em um manifesto de
compatibilidade com owner e critério de remoção.

### PR-08 — Não existe “pixel perfeito” sem comportamento perfeito

Screenshot não substitui hover, focus, teclado, drag, scroll, reduced motion, zoom a 200%, reload e
offline.

### PR-09 — O estado persistente não muda por causa de UI

Navegar, trocar tema do shell, abrir panels ou visualizar o UI Catalog não cria versões, não
modifica mapas e não agenda autosave.

### PR-10 — Remoção exige prova negativa

Um seletor, ID ou bridge só pode ser removido quando busca estática, testes e smoke demonstram que
nenhum consumidor permanece.

## 6. Linguagem ubíqua

| Termo | Definição |
|---|---|
| Foundation token | valor bruto controlado, como uma cor Matcha, escala espacial ou duração |
| Semantic token | papel contextual, como `color.text.primary` ou `surface.canvas` |
| Component token | decisão restrita a um primitive, como altura ou padding de Button |
| Primitive | componente reutilizável de baixo nível com estados e acessibilidade definidos |
| Pattern | composição recorrente de primitives, como toolbar, inspector section ou empty state |
| Route composition | layout de um modo de produto: Workspace, Editor, Explore, Story ou Present |
| Density | escala de spacing e controles: comfortable, compact ou immersive |
| App theme | identidade do produto; inicialmente apenas Matcha |
| Map theme | fallback visual do engine para nós, arestas e anotações |
| Style Pack | regras editoriais persistíveis de uma view do mapa |
| Publication profile | composição e tokens aplicados ao standalone/apresentação |
| Compatibility manifest | lista temporária de IDs, classes, selectors e events consumidos por adapters |
| Visual baseline | screenshot aprovado de fixture determinística, não uma imagem do banco pessoal |
| Known baseline exception | defeito atual registrado que não pode ser interpretado como regressão nova |

## 7. Invariantes não negociáveis

### 7.1 Domínio e persistência

- nenhum token ou primitive altera o shape de map, view ou presentation;
- nenhuma fase visual exige migração destrutiva de SQLite;
- preview de estilo continua sem persistir;
- posição, lock e rota sobrevivem a reload;
- Story Studio salva e recarrega a mesma hierarquia Presentation V2;
- trocar de modo não cria snapshot nem versão;
- autosave continua serializado por registro;
- E2E nunca usa `data/trama.db` diretamente.

### 7.2 Engine e canvas

- um único ciclo de vida Cytoscape por CanvasHost ativo;
- re-render de shell não desmonta o engine;
- edição normal não chama `setModel()`;
- mudança paint-only não dispara relayout;
- nenhum redesign altera sinais, setas, routing ou semântica causal sem uma spec própria;
- atributos QA de routing permanecem disponíveis;
- fixture 8, 16 e 32 preservam fingerprints quando nenhuma mudança de geometria é autorizada.

### 7.3 Story e apresentação

- editor, preview e standalone continuam usando a mesma timeline compilada;
- foco, câmera, reveal, autoplay e reduced motion mantêm paridade;
- um beat continua selecionando o alvo causal real;
- drag/reorder permanece imutável e persistível;
- Present pode ter chrome imersivo, mas usa tokens semânticos do mesmo sistema.

### 7.4 Standalone

- permanece arquivo único e funcional em `file://`;
- não ganha dependência de React nem do servidor;
- inclui apenas assets referenciados;
- preserva payload V3 e digest de integridade;
- continua aceitando sidebar, presentation-only, deep links e embed;
- usa a mesma fundação visual e o resolved style da view.

### 7.5 Acessibilidade

- foco sempre visível;
- teclado não depende de hover;
- dialogs e menus restauram foco ao trigger;
- tabs seguem orientação e teclas esperadas;
- texto normal alcança contraste 4,5:1;
- texto grande e iconografia essencial alcançam 3:1;
- targets móveis possuem pelo menos 44 x 44 CSS px, salvo controles agrupados com alternativa
  equivalente e justificativa documentada;
- `prefers-reduced-motion` remove movimento não essencial;
- zoom a 200% não esconde ações essenciais.

## 8. Diferença intencional versus variação acidental

| Superfície | Diferença permitida | Elementos que devem permanecer compartilhados |
|---|---|---|
| Workspace | density comfortable, cards largos, heading display | cores semânticas, buttons, focus, fields, menus, status |
| Editor | density compact, três zonas, rail de ferramentas | buttons, tabs, fields, tooltips, panel hierarchy, icons |
| Explore | leitura guiada e foco de loop | shell, controls, cards, typography roles, badges |
| Story Studio | timeline, inspector e seleção narrativa | controls, tabs, fields, status, panel surfaces, motion |
| Present | chrome immersive e content layouts | palette aliases, type roles, controls, focus, reduced motion |
| Standalone | publicação sem ferramentas de autoria | foundation tokens, publication primitives, map style resolution |
| Canvas/Style Pack | cores/formas autoradas da view | separação do shell, semântica causal e acessibilidade mínima |

Regra de revisão: se uma diferença não puder ser explicada por papel, densidade, estado ou perfil
de publicação, ela deve ser tratada como variação acidental.

## 9. Arquitetura-alvo

### 9.1 Visão geral

```text
src/design-system/
├── tokens.js                 # fonte canônica, versionada e sem dependência de DOM
├── tokenSchema.js            # validação e aliases permitidos
├── matcha.js                 # foundation + semantic assignments
├── componentContracts.js     # sizes, variants, states e defaults
├── generateCss.js            # geração determinística de CSS variables/layers
└── README.md                 # regras de contribuição

src/react/ui/
├── Button.jsx
├── IconButton.jsx
├── Icon.jsx
├── Field.jsx
├── Input.jsx
├── Select.jsx
├── Textarea.jsx
├── Tabs.jsx
├── Toolbar.jsx
├── Surface.jsx
├── Card.jsx
├── Badge.jsx
├── Status.jsx
├── Tooltip.jsx
├── Menu.jsx
├── Popover.jsx
├── Dialog.jsx
├── EmptyState.jsx
└── ui.css

src/react/patterns/
├── AppNavigation.jsx
├── AppHeader.jsx
├── InspectorSection.jsx
├── PropertyGrid.jsx
├── CanvasControls.jsx
├── SaveStatus.jsx
└── ResponsivePanel.jsx

src/react/routes/
├── WorkspaceRoute.jsx
├── EditorRoute.jsx
├── ExploreRoute.jsx
├── StoryStudioRoute.jsx
└── PresentationRoute.jsx

src/publication/
├── publicationTokens.js
├── publication.css
└── README.md

scripts/
├── build-design-tokens.mjs
├── check-ui-contract.mjs
└── build-ui-fixture.mjs

tests/ui/
e2e/ui/
ui-catalog.html
```

Os nomes são proposta de destino. A migração não deve mover arquivos existentes apenas para
“arrumar pastas”; mover e refatorar comportamento na mesma entrega viola PR-06.

### 9.2 Camadas de token

#### Fundação

Valores sem significado de componente:

- `palette.forest.*`;
- `palette.moss.*`;
- `palette.sage.*`;
- `palette.paper.*`;
- `palette.ink.*`;
- escala de spacing;
- escala tipográfica;
- radius;
- shadows;
- durations/easings;
- z-index roles;
- breakpoints.

#### Semântica

Papéis estáveis:

```text
color.bg.app
color.bg.surface
color.bg.subtle
color.bg.canvas
color.text.primary
color.text.muted
color.text.inverse
color.border.default
color.border.strong
color.action.primary
color.action.primaryHover
color.action.danger
color.focus.ring
```

#### Componentes

Decisões específicas:

```text
button.height.sm
button.height.md
button.height.touch
button.radius
field.height
panel.padding.compact
panel.padding.comfortable
toolbar.gap
tooltip.maxWidth
dialog.maxWidth
```

Component tokens podem referenciar tokens semânticos; nunca o contrário.

### 9.3 Prefixo e tema

- todas as CSS variables geradas usam `--lv-*`;
- `data-theme="matcha"` é aplicado ao root do app;
- `data-density="comfortable|compact|immersive"` é aplicado à composição da rota;
- `--ui-*`, `--story-v2-*` e `--primary/--surface` foram aliases de transição e foram removidos no
  R9 após uso-zero; nenhum alias deprecated é gerado no estado final;
- novos componentes só podem consumir `--lv-*` e o check de contrato falha quando uma variável
  antiga reaparece.

### 9.4 Fonte canônica e geração

`src/design-system/tokens.js` é a fonte canônica por ser consumível por Node, esbuild, engine e
scripts sem depender do DOM.

O gerador deve produzir deterministicamente:

- `dist/trama-ui-tokens.css` para o app;
- um bloco de variables para `standalone.css`/publication bundle;
- um adapter JS para `src/themes/matcha.js` ou permitir que `matcha.js` importe diretamente os
  foundation tokens;
- um manifest JSON de tokens para inspeção e testes, contendo versão do schema, versão do tema,
  hash do conteúdo e lista de aliases deprecated.

Arquivos gerados:

- não são editados à mão;
- trazem cabeçalho de geração;
- falham o check quando estiverem desatualizados;
- mantêm ordem estável para diffs pequenos.

O contrato deve declarar `DESIGN_SYSTEM_SCHEMA_VERSION`. Adicionar tokens de forma compatível não
incrementa a versão major; remover ou reinterpretar um token, variant ou alias exige deprecation,
changelog, consumidor-zero comprovado e incremento major. App, engine e publication manifest devem
registrar a mesma versão/hash para que uma combinação incompatível falhe no build, e não apenas em
runtime.

O CSS de tokens e o CSS crítico do shell precisam estar disponíveis antes do primeiro paint útil.
Não pode haver um frame em que painel legado, sibling oculto ou typography sem contrato apareça e
seja corrigido somente após o mount React.

### 9.5 CSS e cascade layers

Ordem canônica:

```css
@layer reset, legacy, tokens, primitives, patterns, routes, states, utilities;
```

Regras:

- `legacy`: somente compatibilidade durante a migração;
- `tokens`: variables e aliases, sem seletores de componentes;
- `primitives`: componentes de baixo nível, sem conhecimento de rota;
- `patterns`: composições recorrentes;
- `routes`: grid e layout específicos de cada modo;
- `states`: estados globais raros, como presenting e reduced motion;
- `utilities`: conjunto pequeno, documentado e sem regras de produto.

`!important` é proibido em `tokens`, `primitives` e `patterns`. Exceções temporárias só podem viver
em `legacy` ou em uma regra de visibilidade com justificativa e teste.

### 9.6 Contrato dos primitives

Todo primitive deve definir:

- API e variants permitidos;
- estados default, hover, active, focus-visible, disabled, loading e error quando aplicável;
- density support;
- teclado e ARIA;
- contrato de ref;
- slot/icon behavior;
- comportamento em reduced motion;
- testes unitários e exemplo no UI Catalog.

Exemplo de Button:

```jsx
<Button variant="primary" size="md" leadingIcon="sparkles">
  Gerar rascunho
</Button>
```

Variants iniciais:

- `primary`;
- `secondary`;
- `ghost`;
- `danger`;
- `quiet` para chrome de canvas;
- `immersive` somente no perfil Present.

Sizes iniciais:

- `sm`: controles densos de desktop;
- `md`: controles padrão;
- `touch`: mínimo móvel;
- `icon`: usa dimensões de density, não um tamanho arbitrário.

### 9.7 Biblioteca de comportamento

Decisão recomendada:

- manter aparência e primitives básicos no própria Trama;
- adotar Radix Primitives seletivamente para Dialog, Popover, Dropdown Menu, Tooltip e Tabs quando
  o comportamento nativo atual não cobrir foco, teclado e portal com robustez;
- não adotar MUI, Ant, Chakra ou outro sistema visual completo;
- não introduzir Tailwind como pré-requisito desta migração;
- não usar Radix no standalone.

Justificativa:

- Radix é unstyled e pode ser adotado incrementalmente;
- resolve comportamento complexo sem impor uma segunda identidade;
- um kit visual completo tornaria a convergência dependente de overrides;
- Tailwind criaria um terceiro dialeto durante uma migração já baseada em CSS global.

Fontes de decisão:

- <https://www.radix-ui.com/primitives/docs/overview/introduction>
- <https://www.radix-ui.com/primitives/docs/overview/accessibility>

Gate: instalar somente os packages usados pela primeira superfície aprovada. Não adicionar um
metapackage completo “para uso futuro”.

### 9.8 Iconografia

- criar um único componente `Icon` e um registry SVG;
- migrar SVGs já existentes antes de adicionar dependência externa;
- não usar `+`, `×`, `□`, `☰`, `↔`, `✦` ou glifos Unicode como ícones de interface sem fallback e
  accessible name;
- todos os ícones usam `currentColor`, viewBox consistente e stroke/fill controlado;
- icon-only buttons exigem `aria-label` e Tooltip;
- significado nunca depende apenas de cor ou forma do ícone.

### 9.9 Tipografia e offline

Papéis tipográficos:

- `display`: títulos editoriais de Workspace e Present;
- `heading`: títulos de panel/section;
- `body`: conteúdo e formulários;
- `label`: labels compactos;
- `meta`: status, métricas e eyebrows;
- `code`: `.loop.md`, `.story.md` e `.loop.css`.

Decisão recomendada:

- manter Noto Serif + Noto Sans como identidade;
- self-host de WOFF2 licenciadas no app;
- incluir fonts no manifest de publicação ou escolher subset embutido para o standalone;
- manter fallback explícito para Georgia/system-ui;
- teste offline deve verificar que fallback não quebra layout mesmo quando o font asset falha.

Esta tarefa é separada da primeira migração de tokens para evitar que métricas de fonte alterem
todas as baselines ao mesmo tempo.

### 9.10 Estado e eventos

Destino:

- `AppStore`: estado efêmero serializável de UI;
- command bus: intenções do usuário;
- services/adapters: engine, persistence, export e DOM compatibility;
- React: `useSyncExternalStore` ou adapter equivalente para snapshots;
- componentes: nenhum acesso direto a SQLite, `cy` ou globals;
- callbacks de domínio: não armazenados como conteúdo de apresentação ou view.

Durante a migração:

- IDs públicos continuam estáveis;
- DOM bridges permanecem responsáveis pelos listeners legados;
- cada listener migrado para React é removido do bridge na mesma entrega;
- todo bridge mantém `destroy()` testado;
- nenhuma ação pode ser registrada duas vezes.

### 9.11 Consolidação dos roots React

Estado-alvo:

- um `createRoot()` principal;
- portals React para overlays e, temporariamente, hosts ainda externos;
- CanvasHost como filho estável que monta/desmonta o engine explicitamente;
- nenhum root React criado dentro de DOM produzido por outro root;
- nenhum `flushSync()` para render normal de produto;
- métodos `renderX()` substituídos por estado observável e commands.

Regra de sequência: esta consolidação acontece depois da convergência funcional das superfícies.
Não deve ser combinada com redesign de Workspace, Editor ou Story Studio.

### 9.12 Canvas, Map Theme e Style Packs

Três níveis permanecem separados:

```text
Product Design System -> shell, controls, panels, status
Map Theme             -> fallback do engine
Style Pack/View       -> aparência autorada e persistível do mapa
```

`src/styles/library.js` continua sendo a biblioteca de Style Packs do mapa. Ela pode importar cores
de fundação Matcha como defaults, mas não deve importar component tokens.

Critérios:

- trocar Style Pack não altera shell;
- trocar product density não altera modelo ou view;
- export usa resolved view;
- app usa product tokens;
- legenda traduz a view atual sem reestilizar controls.

### 9.13 Standalone e publicação

O standalone não reutiliza componentes React. Ele reutiliza:

- tokens gerados;
- classes semânticas de publication;
- resolved map style;
- timeline compilada;
- contratos de acessibilidade e motion.

O runtime imperativo pode manter seu markup próprio, desde que os estados visuais sejam derivados
dos mesmos tokens e validados por paridade.

## 10. User stories

| ID | Prioridade | User story | Resumo de aceite |
|---|---|---|---|
| DS-001 | P0 | Como usuário, reconheço a Trama em qualquer modo. | identidade Matcha e estados compartilhados |
| DS-002 | P0 | Como autor, controles equivalentes se comportam e parecem equivalentes. | primitives e variants canônicos |
| DS-003 | P0 | Como autor, a migração não altera meus mapas, rotas ou histórias. | nenhuma migração de dados; reload parity |
| DS-004 | P0 | Como leitor, o standalone mantém a experiência autorada offline. | file://, view e timeline paritários |
| DS-005 | P0 | Como usuário de teclado, acesso todas as ações essenciais. | foco, keyboard, overlays e tabs |
| DS-006 | P1 | Como usuário móvel, não encontro chrome vazio, clipping ou ações inacessíveis. | três viewports e touch targets |
| DS-007 | P1 | Como autor avançado, Style Packs mudam o mapa sem mudar o produto. | isolamento shell/view |
| DS-008 | P1 | Como desenvolvedor, sei qual primitive usar e quais variants existem. | UI Catalog, docs e checks |
| DS-009 | P1 | Como mantenedor, consigo remover legado com evidência. | manifest, uso zero e gates |
| DS-010 | P1 | Como mantenedor, consigo reverter uma fase sem rollback de banco. | commits isolados e sem schema changes |
| DS-011 | P1 | Como apresentador, Present é imersivo sem parecer outra marca. | immersive aliases e reduced motion |
| DS-012 | P2 | Como contribuidor, novos modos herdam o sistema por padrão. | templates, lint e Definition of Done |

## 11. Catálogo de features

| ID | Feature | Stories |
|---|---|---|
| F-001 | Baseline determinística e banco de QA isolado | DS-003, DS-004, DS-009, DS-010 |
| F-002 | Schema e geração de tokens | DS-001, DS-007, DS-008 |
| F-003 | Cascade layers e aliases de compatibilidade | DS-001, DS-009, DS-010 |
| F-004 | UI Catalog | DS-002, DS-005, DS-008 |
| F-005 | Primitives de controles e fields | DS-002, DS-005, DS-012 |
| F-006 | Primitives headless para overlays | DS-002, DS-005 |
| F-007 | Icon registry | DS-001, DS-002, DS-005 |
| F-008 | Shell e Workspace unificados | DS-001, DS-002, DS-006 |
| F-009 | Explore unificado | DS-001, DS-002 |
| F-010 | Editor chrome unificado | DS-001, DS-002, DS-003, DS-006 |
| F-011 | Story Studio unificado | DS-001, DS-002, DS-003, DS-005, DS-006 |
| F-012 | Present e publication profile | DS-001, DS-004, DS-011 |
| F-013 | Standalone token parity | DS-004, DS-007 |
| F-014 | React root consolidation | DS-003, DS-009, DS-010, DS-012 |
| F-015 | Legado e override retirement | DS-008, DS-009, DS-012 |
| F-016 | Visual, accessibility e E2E QA | todas |
| F-017 | Typography offline | DS-001, DS-004, DS-006 |
| F-018 | Contributor contract e governance | DS-008, DS-009, DS-012 |

## 12. Catálogo de tasks

### 12.1 Baseline e infraestrutura

| Task | Feature | Descrição | Dependências | Evidência |
|---|---|---|---|---|
| T-001 | F-001 | Criar inventário versionado de stylesheets, roots, IDs e bridges. | — | relatório gerado e revisado |
| T-002 | F-001 | Criar fixture JSON de UI com mapas 8/16/32, view, assets e Presentation V2. | — | fixture valida e reproduzível |
| T-003 | F-001 | Permitir `TRAMA_DB_PATH` ou data root no server de QA. | T-002 | E2E usa temp dir |
| T-004 | F-001 | Criar lifecycle de server E2E que inicia, aguarda, encerra e limpa temp DB. | T-003 | nenhum processo/DB residual |
| T-005 | F-016 | Adicionar runner Playwright versionado para UI E2E/visual. | T-004 | execução local determinística |
| T-006 | F-016 | Capturar baselines dos cinco modos em 1440x900, 1024x768 e 390x844. | T-005 | 15 estados aprovados |
| T-007 | F-001 | Registrar Known Baseline Exceptions com owner e critério de saída. | T-006 | nenhum warning ignorado implicitamente |
| T-008 | F-016 | Criar check de IDs duplicados, roots visíveis e console warnings/errors. | T-005 | teste falha em regressão |

### 12.2 Tokens e cascata

| Task | Feature | Descrição | Dependências | Evidência |
|---|---|---|---|---|
| T-009 | F-002 | Definir schema foundation/semantic/component. | T-001 | schema aprovado |
| T-010 | F-002 | Mapear `--ui-*`, `--story-v2-*`, standalone e `matchaTheme` para o schema. | T-009 | matriz completa sem órfãos |
| T-011 | F-002 | Implementar tokens Matcha canônicos em JS. | T-010 | unit tests |
| T-012 | F-002 | Implementar gerador determinístico de CSS/manifest com versão e hash. | T-011 | output idempotente e versões alinhadas |
| T-013 | F-002 | Fazer `matchaTheme` consumir foundation tokens sem mudar API pública. | T-011 | tests engine/theme passam |
| T-014 | F-003 | Declarar cascade layers e colocar CSS existente em legacy. | T-012 | computed-style parity |
| T-015 | F-003 | Gerar aliases antigos a partir de `--lv-*`. | T-012 | nenhuma mudança visual |
| T-016 | F-003 | Adicionar check de hex literals e tokens antigos em código novo. | T-015 | script bloqueia violação |
| T-017 | F-003 | Adicionar budget de `!important` por layer. | T-014 | relatório e gate incremental |

### 12.3 Primitives e catálogo

| Task | Feature | Descrição | Dependências | Evidência |
|---|---|---|---|---|
| T-018 | F-004 | Criar `ui-catalog.html` sem acesso a projeto/persistência. | T-014 | catálogo isolado |
| T-019 | F-005 | Implementar Button/IconButton e matriz de variants/sizes. | T-018 | visual + keyboard tests |
| T-020 | F-005 | Implementar Field/Input/Select/Textarea/Checkbox. | T-018 | labels/errors/help tests |
| T-021 | F-005 | Implementar Surface/Card/Badge/Status/EmptyState. | T-018 | catálogo completo |
| T-022 | F-005 | Implementar Tabs/Toolbar/InspectorSection/PropertyGrid. | T-019, T-020 | roving/arrow keyboard |
| T-023 | F-006 | Adotar Dialog headless e migrar command dialog no catálogo. | T-019, T-020 | focus trap/restore |
| T-024 | F-006 | Adotar Popover/Menu/Tooltip headless. | T-019 | escape/outside/focus tests |
| T-025 | F-007 | Criar Icon registry e migrar ícones do shell no catálogo. | T-019 | sem glifos na amostra |
| T-026 | F-016 | Integrar axe ao catálogo e criar gate de zero violations críticas/sérias. | T-018 | relatório automatizado |

### 12.4 Migração de superfícies

| Task | Feature | Descrição | Dependências | Evidência |
|---|---|---|---|---|
| T-027 | F-008 | Migrar AppNavigation e AppHeader usando primitives. | T-019, T-024, T-025 | shell parity |
| T-028 | F-008 | Migrar Workspace cards/actions/status. | T-021, T-027 | jornada Workspace |
| T-029 | F-008 | Corrigir contrato móvel do Workspace sem faixa superior órfã. | T-027, T-028 | 390x844 screenshot + DOM |
| T-030 | F-006 | Migrar project/map menus e save popover. | T-024, T-027 | focus/escape/outside |
| T-031 | F-009 | Migrar Explore detail panel e ações. | T-021, T-027 | foco de loop preservado |
| T-032 | F-010 | Migrar editor rail, toolbar e canvas controls. | T-019, T-022, T-025 | engine lifecycle estável |
| T-033 | F-010 | Migrar WorkspaceSidebar/loop browser/view switcher. | T-021, T-022 | loop focus/view switch |
| T-034 | F-010 | Migrar Inspector e property fields. | T-020, T-022 | edits/persistence/undo |
| T-035 | F-010 | Migrar Markdown, Style Builder, Data Table e History surfaces. | T-020, T-022 | tabs e edits preservados |
| T-036 | F-010 | Corrigir contrato móvel do Editor e toolbar overflow. | T-032, T-034 | 390x844 + 200% zoom |
| T-037 | F-011 | Migrar Story header, status, tabs e Inspector. | T-019–T-024 | story edit parity |
| T-038 | F-011 | Migrar timeline cards, controls e drag states para tokens/primitives. | T-021, T-022 | drag/reorder parity |
| T-039 | F-011 | Remover `--story-v2-*` do consumo e manter aliases gerados temporários. | T-037, T-038 | zero uso em código novo |
| T-040 | F-011 | Validar inspector móvel, foco e retorno à timeline. | T-037, T-038 | mobile E2E |
| T-041 | F-012 | Migrar PresentationCard e immersive chrome para profile tokens. | T-019, T-021 | player parity |
| T-042 | F-012 | Validar reduced motion, keyboard e explore/resume em Present. | T-041 | E2E completo |

### 12.5 Standalone, fonts e publicação

| Task | Feature | Descrição | Dependências | Evidência |
|---|---|---|---|---|
| T-043 | F-013 | Gerar publication token block a partir dos tokens canônicos. | T-012 | output determinístico |
| T-044 | F-013 | Migrar standalone CSS para semantic publication tokens. | T-043 | screenshot parity |
| T-045 | F-013 | Testar Style Pack isolation e resolved view no export. | T-044 | shell não recebe view rules |
| T-046 | F-017 | Self-host Noto no app com fallback explícito. | T-012 | network-off app typography |
| T-047 | F-017 | Definir subset/embedding de fonts no standalone. | T-046 | file:// sem network |
| T-048 | F-012 | Validar perfis clean, guided e exploratory. | T-044 | três export fixtures |
| T-049 | F-013 | Comparar editor/standalone em mapa, story, assets e motion. | T-045, T-048 | parity snapshots |

### 12.6 Consolidação estrutural e remoção

| Task | Feature | Descrição | Dependências | Evidência |
|---|---|---|---|---|
| T-050 | F-014 | Criar `AppComposition` com um root e portals transitórios. | T-028–T-042 | sem visual diff |
| T-051 | F-014 | Substituir estados mutáveis `renderX()` por snapshots observáveis. | T-050 | store/component tests |
| T-052 | F-014 | Migrar roots estáticos de baixo risco para `AppComposition`. | T-051 | root count reduzido |
| T-053 | F-014 | Migrar Story/overlays preservando IDs e focus. | T-052 | story E2E |
| T-054 | F-014 | Migrar CanvasHost por último, com lifecycle test. | T-053 | um engine mount |
| T-055 | F-014 | Remover `flushSync()` de render normal. | T-054 | zero uso não justificado |
| T-056 | F-015 | Criar uso-zero check para selectors/classes/IDs legados. | T-050 | relatório automático |
| T-057 | F-015 | Rehome regras válidas de `uiPolish.css`. | T-039, T-056 | arquivo vazio sem diff |
| T-058 | F-015 | Remover `uiPolish.css` da carga e então do repo. | T-057 | todos gates verdes |
| T-059 | F-015 | Dividir `appShell.css` em layers target sem alterar resultado. | T-058 | visual parity |
| T-060 | F-015 | Reduzir `styles.css` ao engine/legacy realmente necessário. | T-059 | usage report |
| T-061 | F-015 | Remover mount points HTML e bridges sem consumidores. | T-054, T-056 | um root + manifest limpo |

### 12.7 Governance e release

| Task | Feature | Descrição | Dependências | Evidência |
|---|---|---|---|---|
| T-062 | F-018 | Escrever guia “como criar uma superfície Trama”. | T-022 | doc com exemplos |
| T-063 | F-018 | Escrever ADRs de tokens, Radix, roots, CSS e standalone. | decisões aprovadas | ADRs versionados |
| T-064 | F-016 | Integrar `check:ui-contract`, `test:ui`, `test:a11y`, `test:visual`. | T-005, T-016, T-026 | scripts estáveis |
| T-065 | F-016 | Criar relatório de budgets por PR. | T-017, T-064 | diff de métricas |
| T-066 | F-018 | Atualizar `UI_REDESIGN_ARCHITECTURE.md` e `REACT_REFACTOR_PLAN.md`. | T-061 | docs sem contradição |
| T-067 | F-016 | Rodar flagship acceptance e registrar evidências. | todas P0 | relatório final |
| T-068 | F-018 | Marcar aliases/bridges restantes com deprecation release. | T-061 | manifest final |

## 13. Traceability story -> feature -> task

| Story | Features | Tasks principais |
|---|---|---|
| DS-001 | F-002, F-003, F-007–F-013, F-017 | T-009–T-017, T-025, T-027–T-049 |
| DS-002 | F-004–F-012 | T-018–T-042 |
| DS-003 | F-001, F-010, F-011, F-014, F-016 | T-002–T-008, T-032–T-042, T-050–T-055 |
| DS-004 | F-001, F-012, F-013, F-017 | T-002–T-007, T-041–T-049 |
| DS-005 | F-004–F-006, F-010–F-012, F-016 | T-018–T-026, T-032–T-042, T-064 |
| DS-006 | F-008, F-010, F-011, F-016, F-017 | T-006, T-029, T-036, T-040, T-046–T-047 |
| DS-007 | F-002, F-010, F-013 | T-010–T-015, T-035, T-043–T-045 |
| DS-008 | F-004, F-005, F-015, F-018 | T-018–T-022, T-056–T-063 |
| DS-009 | F-001, F-003, F-014, F-015, F-018 | T-001, T-007, T-014–T-017, T-050–T-068 |
| DS-010 | F-001, F-003, F-014 | T-003–T-008, T-014–T-017, T-050–T-055 |
| DS-011 | F-012, F-013, F-016 | T-041–T-049, T-064–T-067 |
| DS-012 | F-005, F-014, F-018 | T-019–T-022, T-050–T-055, T-062–T-068 |

## 14. Plano de entrega e release gates

O plano é sequenciado por dependência e risco, não por datas.

### R0 — Baseline, isolamento e decisões

Objetivo: tornar toda regressão observável antes de alterar a aparência.

Inclui:

- T-001 a T-008;
- ADR preliminar de biblioteca;
- inventário de compatibilidade;
- fixture de UI isolada;
- screenshot matrix inicial;
- classificação de warnings existentes.

Critérios de saída:

- E2E nunca abre o banco pessoal;
- 15 baselines mínimas aprovadas;
- console baseline tem lista explícita de exceções;
- IDs e contracts consumidos por bridges estão inventariados;
- nenhuma mudança visual foi feita.

Rollback: remover apenas infraestrutura de QA; nenhum dado de produção foi alterado.

### R1 — Tokens e cascata como visual no-op

Objetivo: criar uma autoridade visual única sem mudar pixels deliberadamente.

Inclui:

- T-009 a T-017.

Critérios de saída:

- token generation idempotente;
- public API `matchaTheme` preservada;
- computed style de amostras canônicas igual ao baseline;
- visual diff apenas por antialiasing dentro do threshold aprovado;
- aliases antigos são gerados, não mantidos manualmente;
- nenhum novo `!important` fora de legacy;
- `npm test` e `qa:story` passam.

Rollback: restaurar links CSS anteriores e adapter de `matchaTheme`; sem alteração de records.

### R2 — Primitives e UI Catalog

Objetivo: provar o sistema antes de migrar produto real.

Inclui:

- T-018 a T-026.

Critérios de saída:

- todos os states documentados;
- teclado e foco testados;
- zero axe violations critical/serious no catálogo;
- density comfortable/compact demonstradas;
- themes/style packs não participam do catálogo;
- catálogo não faz nenhuma request de escrita.

Rollback: remover catálogo/primitives não consumidos; rotas permanecem intactas.

### R3 — Shell, Workspace e overlays globais

Objetivo: migrar a superfície de menor risco para validar primitives em produto real.

Inclui:

- T-027 a T-030.

Critérios de saída:

- Projects -> open map funciona;
- project menu, save status e dialogs preservam focus/escape;
- nenhuma faixa vazia no mobile Workspace;
- navegação não agenda autosave;
- cards usam o mesmo conteúdo e ordem do baseline;
- desktop, compact e mobile aprovados.

Rollback: revert da rota e dos consumers; primitives permanecem.

### R4 — Explore

Objetivo: validar composição de leitura com o mesmo shell.

Inclui:

- T-031.

Critérios de saída:

- seleção de loop e foco do engine iguais ao baseline;
- relações do ciclo permanecem acessíveis;
- painel não comprime canvas abaixo do budget;
- mobile usa overlay deliberado com close/focus corretos.

### R5 — Editor

Objetivo: convergir a superfície mais dependente do engine sem tocar engine/persistência.

Inclui:

- T-032 a T-036.

Critérios de saída:

- engine monta uma vez;
- selecionar/editar variável e relação funciona;
- criar/conectar/arrastar/lock/route funciona;
- Markdown preview/apply/discard preserva guardrails;
- Style Builder preview não persiste;
- View, Data, History e Inspector são alcançáveis por teclado;
- reload preserva posição/rota;
- nenhum `setModel()` em mutation normal;
- budgets de interação permanecem;
- 390x844 e zoom 200% mantêm ações essenciais.

Rollback: consumers do Editor revertidos; nenhum schema ou modelo alterado.

### R6 — Story Studio e Present

Objetivo: convergir autoria e audiência preservando Presentation V2.

Inclui:

- T-037 a T-042.

Critérios de saída:

- criar, editar, reordenar e mover beat passa;
- Inspector/Markdown preservam conteúdo;
- foco do mapa acompanha seleção;
- preview usa a mesma timeline;
- Present keyboard/explore/resume/reduced motion passa;
- Story Studio mobile oferece acesso explícito ao inspector e retorna foco corretamente;
- `--story-v2-*` não é consumido por código migrado.

### R7 — Standalone, publicação e fonts

Objetivo: garantir que convergência do app não crie uma segunda identidade no export.

Inclui:

- T-043 a T-049.

Critérios de saída:

- arquivo único abre por `file://` sem network;
- clean/guided/exploratory passam;
- editor/standalone têm parity de map style e timeline;
- fonts/fallback não causam overflow;
- payload/digest permanecem compatíveis;
- standalone não inclui React.

### R8 — Um root React, sem mudança visual

Objetivo: remover a composição imperativa fragmentada depois que componentes e rotas estão
estáveis.

Inclui:

- T-050 a T-055.

Critérios de saída:

- um `createRoot()` principal;
- portals documentados para overlays;
- composição publicada como snapshot observável no `AppStore`; adapters `renderX` não mantêm
  estado privado de painel;
- nenhum nested root;
- nenhuma diferença visual acima do threshold;
- nenhum listener duplicado;
- Cytoscape monta uma vez e sobrevive a mudanças de modo;
- no normal render path, zero `flushSync()` não justificado.

Rollback: revert estrutural preserva componentes e tokens já aprovados.

### R9 — Retirement e governance

Objetivo: apagar a dívida temporária somente depois da prova de equivalência.

Inclui:

- T-056 a T-068.

Critérios de saída:

- `uiPolish.css` removido;
- aliases de CSS variables deprecated removidos após busca de uso zero; nomes `story-v2-*` que
  restam são classes/IDs estruturais e não aliases de token;
- zero selector/ID removido com consumidor;
- CSS metrics cumprem budgets finais; as duas declarações `!important` do standalone são somente
  as exceções de `prefers-reduced-motion` e permanecem documentadas;
- docs refletem arquitetura real;
- flagship acceptance completo;
- `npm run check` e `check:ui` passam em checkout limpo.

## 15. Estratégia de commits e reversibilidade

Cada release é composta por commits temáticos pequenos. Ordem recomendada por superfície:

1. testes/baseline;
2. token source + unit tests;
3. outputs gerados;
4. primitive source + tests;
5. migração de markup da superfície;
6. migração de CSS da superfície;
7. remoção específica comprovada;
8. bundles gerados.

Nunca misturar em um commit:

- source e um grande formatter mecânico;
- mudança de UI e mudança de ProjectStore;
- root consolidation e redesign;
- remoção de CSS e mudança de breakpoint;
- atualização manual de `dist/`.

Em worktree sujo:

- inventariar alterações preexistentes por arquivo;
- não editar arquivos com mudanças sobrepostas sem entender o diff;
- criar a spec e infraestrutura em arquivos novos quando possível;
- só atualizar bundles depois que source/tests estiverem aprovados;
- registrar no handoff quais diffs pertenciam ao programa.

## 16. Compatibility Manifest

Criar um arquivo versionado, por exemplo `docs/UI_COMPATIBILITY_MANIFEST.md`, com:

| Contrato | Consumidor | Owner | Status | Critério de remoção |
|---|---|---|---|---|
| `#cld-root` | CLDEngine/app | CanvasHost | permanente | não remover |
| `#presentation-card` | app controller | PresentationRoute | temporário | controller por props/commands |
| `#story-inspector-*` | story DOM bridge | StoryRoute | temporário | bridge sem lookup |
| `data-ui-mode` | CSS, store, QA | AppShell | permanente enquanto útil | ADR |
| `data-qa-*` | routing QA | QA runtime | permanente | somente spec routing |
| `--ui-*`, `--story-v2-*`, `--primary` etc. | CSS legado | tokens | removido | não são mais gerados nem consumidos |

Regras:

- nenhum contrato temporário sem owner;
- nenhum contrato removido no mesmo PR em que seu substituto é introduzido, salvo se cobertura for
  integral e o diff for pequeno;
- check automatizado confirma uso zero antes de exclusão.

## 17. Critérios de aceite por primitive

### Button e IconButton

- variants são finitos e documentados;
- altura e padding derivam de density;
- `disabled` não dispara ação;
- loading preserva largura e accessible name;
- focus-visible é perceptível em paper, sage e immersive surfaces;
- icon-only tem Tooltip e `aria-label`;
- não aceita hex/style inline para customização casual.

### Fields

- label associado;
- help/error ligado por `aria-describedby`;
- error não depende apenas de cor;
- input não persiste por tecla quando o contrato exige commit;
- tamanho compacto continua legível;
- color input do Style Builder mantém valor sem duplicar source of truth.

### Tabs

- `role=tablist/tab/tabpanel` coerente;
- seta navega conforme orientação;
- seleção e foco não são confundidos;
- hidden panel não contém elementos tabbable;
- Inspector/Markdown não desmontam estado não salvo sem decisão explícita.

### Dialog/Popover/Menu

- foco inicial correto;
- Escape fecha quando seguro;
- outside click segue contrato explícito;
- foco retorna ao trigger;
- overlay não fica preso ao trocar de modo;
- portal não é filho de container com transform/overflow que corte conteúdo;
- ação destrutiva exige intenção clara.

### Surface/Panel/Card

- hierarchy de elevation é finita;
- border/radius/shadow vêm de tokens;
- cards clicáveis têm um único target sem botões interativos aninhados;
- density muda spacing, não identidade;
- scroll ownership é explícito.

## 18. Acceptance scenarios

### AS-01 — Jornada completa desktop

1. abrir fixture isolada;
2. Workspace -> Editor;
3. selecionar variável;
4. editar label e confirmar;
5. abrir Style Builder e aplicar preview;
6. descartar/reload e confirmar view persistida anterior;
7. Explore -> selecionar loop -> percorrer;
8. Story Studio -> selecionar e editar beat;
9. preview Present -> next/previous/explore/resume/close;
10. voltar ao Workspace.

Aceite:

- sem erro de console;
- sem IDs duplicados;
- sem autosave causado apenas por navegação;
- estado persistido somente após ações de commit;
- foco e contexto preservados;
- identidade visual reconhecível em todo percurso.

### AS-02 — Editor local-first e reload

- mover nó;
- editar rota e lock;
- salvar;
- recarregar;
- verificar posição, lock, rota e active view;
- confirmar que shell/density não foram persistidos no modelo causal.

### AS-03 — Style Pack isolation

- abrir Matcha Executive;
- alternar para Boardroom Ink;
- verificar canvas, relações e legenda;
- verificar que AppNavigation, Header, Dialog e Inspector não mudaram cores/typography;
- exportar e verificar a view no standalone.

### AS-04 — Story authoring

- criar cena manual;
- adicionar beat por seleção;
- mover beat para outra cena;
- editar narração;
- alternar Inspector/Markdown;
- salvar/reload;
- comparar timeline compilada do editor e standalone.

### AS-05 — Standalone offline

- gerar os três perfis;
- desconectar network;
- abrir por `file://`;
- trocar loop;
- inspecionar relação;
- iniciar história;
- usar teclado;
- testar reduced motion;
- verificar fonts ou fallback sem layout quebrado.

### AS-06 — Mobile 390 x 844

- Workspace não possui faixa superior órfã;
- navegação de modo é alcançável;
- Editor mantém canvas utilizável e actions essenciais;
- toolbar pode ser percorrida sem body overflow;
- Inspector abre como overlay/drawer e restaura foco;
- Story Studio alterna mapa/timeline/inspector;
- Present cabe sem clipping.

### AS-07 — Compact desktop 1024 x 768

- Editor não comprime canvas abaixo de 480 px úteis sem fallback deliberado;
- sidebars colapsam de forma previsível;
- controls não se sobrepõem;
- Story timeline continua horizontal;
- Explore panel mantém scroll próprio.

### AS-08 — Keyboard e focus

- Tab percorre apenas controles visíveis;
- Shift+Tab retorna;
- arrows operam tabs/timeline conforme contrato;
- Escape fecha overlays/present sem perder contexto;
- focus ring nunca é cortado;
- drag possui alternativa de teclado.

### AS-09 — Regressão estrutural

- modo muda sem remount de engine;
- root count corresponde à fase declarada;
- nenhum listener duplica após dez trocas de modo;
- nenhum hidden React sibling aparece durante load;
- nenhum legacy panel concorre com sua versão migrada.

### AS-10 — Rollback de uma superfície

- reverter o commit da superfície;
- abrir o mesmo temp DB;
- confirmar leitura dos mesmos records;
- suite P0 continua passando;
- nenhum down migration é necessário.

### AS-11 — Inicialização e conteúdo extremo

- carregar cada modo com cache vazio e CPU desacelerada;
- observar os frames entre HTML, CSS, mount React e engine ready;
- confirmar que nenhum painel legado ou controle duplicado pisca antes da superfície final;
- confirmar que não há layout shift causado por tokens ou font swap acima do budget aprovado;
- testar nomes de projeto, mapa, variável, cena e beat com 2x o comprimento mediano;
- testar labels em português com acentos, quebra de linha e uma amostra com expansão textual de 30%;
- confirmar que truncamento tem tooltip/accessible name quando esconde informação essencial;
- confirmar que títulos longos não empurram ações P0 para fora da viewport.

## 19. Estratégia de testes

### 19.1 Unitários

- token schema e aliases;
- generation idempotente;
- map theme adapter;
- component variants;
- AppStore reducers;
- command bus;
- bridge destroy;
- resolved view isolation;
- publication token adapter.

### 19.2 Contract tests estáticos

- nenhum hex em component CSS/JSX;
- nenhum token deprecated em código novo;
- nenhum raw `<button>` fora de primitives/allowlist após migração da superfície;
- nenhuma regra `!important` fora de allowlist;
- IDs obrigatórios presentes enquanto manifest exigir;
- nenhuma ID duplicada nos templates;
- nenhum import React no standalone;
- generated files atualizados;
- `reference.html` intacto.

O raw-control check é incremental por diretório/rota. Ativá-lo globalmente antes da migração
produziria uma allowlist permanente e inútil.

### 19.3 Component tests

- render e variants;
- keyboard/focus;
- ARIA;
- portal e focus restoration;
- density;
- reduced motion;
- error/help states.

### 19.4 Integration tests

- primitive -> command;
- command -> store;
- store -> route;
- route -> bridge;
- bridge -> engine/persistence;
- save queue serializada;
- nenhum write em preview/navegação;
- CanvasHost lifecycle.

### 19.5 Browser E2E

Usar Playwright versionado e fixture isolada. O atual `qa:browser` com `agent-browser` continua
protegendo performance/routing durante a transição, mas não deve ser a única infraestrutura de UI
release.

Matriz mínima:

| Dimensão | Valores |
|---|---|
| Viewport | 1440x900, 1024x768, 390x844 |
| Modo | Workspace, Editor, Explore, Story, Present |
| Motion | normal, reduced |
| Conteúdo | 8, 16 e 32 nós; story; assets; nomes curtos e conteúdo extremo |
| Persistência | fresh, commit/reload, restore |
| Publicação | clean, guided, exploratory |
| Inicialização | cache quente, cache vazio e CPU desacelerada |

### 19.6 Visual regression

Regras:

- fixture, viewport, font e motion determinísticos;
- animações desabilitadas durante captura, exceto testes de motion;
- nenhuma screenshot do banco pessoal vira baseline;
- thresholds definidos por superfície, não um valor global permissivo;
- update de baseline exige motivo no PR;
- diff de mapa é avaliado separadamente do shell para não mascarar defeito de routing;
- antialiasing permitido não autoriza deslocamento de layout.

Threshold inicial recomendado:

- component catalog: pixel ratio <= 0,1%;
- app shell sem mudança intencional: <= 0,2%;
- mapa: comparação por geometry/QA fingerprint mais screenshot;
- redesign aprovado: baseline novo acompanhado de revisão humana.

### 19.7 Acessibilidade

- axe no catálogo e rotas;
- teclado completo;
- focus order;
- screen-reader names de icon buttons;
- zoom 200%;
- contrast automatizado + amostra manual;
- reduced motion;
- high contrast/forced colors como teste exploratório antes do release final.

### 19.8 Performance

Budgets existentes continuam válidos:

- metadata commit p95 <= 50 ms;
- draft route p95 <= 100 ms em 25 edges;
- balanced route p95 <= 350 ms em 25 edges;
- um preview por animation frame;
- uma persistência por commit;
- zero `setModel()` em mutation normal.

Budgets adicionais de UI:

- mudança de mode/route: feedback visual inicial <= 100 ms;
- abrir panel/menu: <= 100 ms;
- nenhuma long task > 50 ms causada apenas por troca de theme/density;
- root consolidation não aumenta mounts do engine;
- CSS bundle e JS delta reportados por release;
- Radix packages são tree-shaken e medidos.

Budgets de inicialização:

- zero flash de sibling/panel legado em vídeo desacelerado;
- CLS causado por shell, tokens e typography <= 0,05 nas rotas canônicas;
- font swap não desloca ação P0 para fora da viewport;
- mismatch de versão/hash de tokens falha no build;
- arquivos de tokens entram na ordem crítica de carregamento, sem depender do mount React para
  corrigir identidade ou visibilidade.

### 19.9 Scripts propostos

```json
{
  "test:ui-contract": "node scripts/check-ui-contract.mjs",
  "test:ui": "playwright test e2e/ui",
  "test:a11y": "playwright test e2e/a11y",
  "test:visual": "playwright test e2e/visual",
  "check:ui": "npm run test:ui-contract && npm run test:ui && npm run test:a11y"
}
```

`npm run check` só deve incorporar E2E completo quando tempo, server lifecycle e flakiness estiverem
estáveis. Até lá, `check:ui` é gate obrigatório das entregas de interface.

## 20. Budgets de convergência

### 20.1 CSS

| Métrica | Baseline | Gate intermediário | Meta final |
|---|---:|---:|---:|
| `!important` no app CSS | 656 | nunca aumentar; reduzir por rota | 0 |
| `!important` em primitives/patterns | 0 esperado | 0 | 0 |
| hex literals fora de tokens/map styles | alto | 0 em código novo | 0 |
| namespaces de product token | `--ui`, `--story-v2`, legacy root | aliases gerados | apenas `--lv` gerado e consumido |
| stylesheets de produto carregadas | 6 | bundle/layers rastreáveis | 1 bundle do app + engine/legacy necessário |
| `uiPolish.css` | 370 linhas | reduzir por rehome | removido |

O app atingiu zero. O standalone mantém duas exceções locais de reduced motion, fora do budget de
rotas do app, porque remover `!important` nesse caso permitiria que uma transição específica
vencesse o contrato de acessibilidade.

### 20.2 React

| Métrica | Baseline | Meta final |
|---|---:|---:|
| `createRoot()` em `main.jsx` | 16 | 1 |
| roots/mount points observados | 18 | 1 root + portal hosts sem roots próprios |
| `flushSync()` em `main.jsx` | 12 | 1 somente no bootstrap documentado |
| raw buttons em React | 140 | 0 fora de primitives/allowlist migrada |
| nested React roots | presente | 0 |
| imperative `renderX()` surface APIs | presente | adapters finos para snapshots do AppStore; sem estado privado |

### 20.3 Responsividade

- zero horizontal body overflow em viewports canônicas;
- nenhuma região vazia de chrome sem função;
- nenhuma ação P0 apenas por hover;
- map viewport mínimo deliberado por breakpoint;
- panels possuem owner de scroll;
- mobile navigation continua alcançável em todos os modos;
- topbar height corresponde ao contrato da rota, sem row órfã.

## 21. Matriz de riscos e mitigação

| Risco | Impacto | Mitigação | Detecção | Rollback |
|---|---|---|---|---|
| Cascade layer muda precedência | superfícies somem ou vazam | R1 visual no-op + computed styles | visual/DOM contract | restaurar load order |
| Remover `!important` revela legado | painéis duplicados | rehome por selector, nunca em massa | visible-root check | revert do selector |
| Alterar ID quebra `src/app.js` | ação deixa de funcionar | Compatibility Manifest | bridge/unit/E2E | manter alias/ID |
| Primitive muda evento | autosave/command duplica | um listener owner | call-count tests | revert consumer |
| React re-render desmonta engine | canvas perde estado | CanvasHost lifecycle | mount counter/fingerprint | adiar root migration |
| Root consolidation perde foco | keyboard quebrado | portals + focus tests | E2E | fallback bridge |
| Dialog headless conflita com native | overlay preso | migrar um overlay por vez | escape/focus tests | voltar native |
| Style Pack vaza para shell | identidade instável | token domains separados | isolation scenario | bloquear adapter |
| Tokens mudam routing geometry | mapa desloca | type/font changes em fase separada | fingerprint/quality | revert font/token |
| Fonts offline alteram layout | overflow/line wrap | fallback baseline + subset | offline visual | fallback system |
| Standalone diverge | publicação não confiável | generated publication tokens | parity E2E | manter CSS anterior |
| E2E escreve banco real | perda/ruído de dados | env DB path + temp dir | startup assertion | abort test |
| Baseline congela defeito atual | dívida vira contrato | Known Exceptions | review gate | reclassificar baseline |
| Baseline permissiva mascara bug | falso verde | thresholds por região | human diff review | bloquear update |
| Mobile fica sem navegação | modo inacessível | mobile journey P0 | 390x844 E2E | revert route |
| Performance piora por library | editor lento | bundle/mount metrics | budgets | remover package |
| Worktree mistura autoria existente | perda de mudanças | inventário e commits temáticos | git diff | não sobrescrever |
| Warning de console vira ruído | regressão passa despercebida | exception registry com expiry | console gate | bloquear novos warnings |

## 22. Stop conditions

Uma fase não avança se:

- `npm test` ou `qa:story` falhar;
- ocorrer write no banco real durante QA;
- houver nova exceção de console sem owner;
- CanvasHost montar mais de uma vez para uma troca de shell;
- visual diff não puder ser explicado;
- uma ação P0 não tiver keyboard path;
- standalone perder file:// ou payload integrity;
- o diff misturar mudança de persistência não prevista;
- o rollback exigir migração de dados;
- a equipe não conseguir identificar se uma diferença é intencional ou acidental.

## 23. Definition of Ready

Uma task de migração de superfície está pronta quando:

- story e feature estão identificadas;
- baseline da superfície existe;
- states e viewports aplicáveis estão listados;
- IDs/bridges afetados constam no manifest;
- primitive necessário existe e passou no catálogo;
- ações de leitura, preview e commit estão separadas;
- dados de E2E são isolados;
- risco e rollback estão descritos;
- não há mudança de engine/persistência escondida;
- arquivos do worktree afetados foram inventariados.

## 24. Definition of Done

Uma task só está concluída quando:

- código e tokens seguem o contrato;
- acceptance criteria da task passam;
- unit, integration e UI contract passam;
- E2E dos fluxos tocados passa;
- keyboard/focus foi verificado;
- desktop, compact e mobile foram inspecionados quando aplicável;
- console está limpo ou contém apenas exceções registradas;
- nenhuma persistência inesperada ocorreu;
- standalone foi verificado quando o contrato compartilhado mudou;
- performance budgets não regrediram;
- docs/manifest foram atualizados;
- source e generated outputs estão em commits distinguíveis;
- limitações restantes estão registradas explicitamente.

## 25. Flagship acceptance

O programa é aceito quando uma fixture local-first contendo:

- mapa de 16 nós;
- loops reinforcing e balancing;
- uma view Matcha e uma view alternativa;
- uma imagem de nó;
- uma Presentation V2 com chapters/scenes/beats;
- rota e posições persistidas;

pode completar, em desktop e mobile:

```text
Workspace
  -> Editor
    -> editar variável
    -> preview Style Pack
    -> salvar e recarregar
  -> Explore
    -> percorrer loop
  -> Story Studio
    -> editar e reordenar beat
  -> Present
    -> next / explore / resume / close
  -> Export standalone
    -> abrir offline
```

Condições finais:

- identidade Matcha contínua;
- diferenças de density deliberadas;
- zero perda de dados;
- zero novo warning/error;
- keyboard e reduced motion válidos;
- editor/standalone parity;
- um root React no app;
- `uiPolish.css` removido;
- no código migrado, zero token deprecated e zero controle raw fora da allowlist;
- todos os gates P0 aprovados.

## 26. Decisões recomendadas

| ID | Decisão | Razão |
|---|---|---|
| D-001 | Matcha continua sendo a identidade default. | já é distintiva e adequada ao produto |
| D-002 | Design system próprio, não kit visual completo. | evita importar outra identidade |
| D-003 | Radix apenas para behavior complexo. | acessibilidade sem aparência imposta |
| D-004 | Tokens canônicos em JS, CSS gerado. | consumo por engine, app, Node e standalone |
| D-005 | Prefixo novo `--lv-*`. | separa contrato final de aliases legados |
| D-006 | Style Pack não controla shell. | estabilidade do produto e liberdade editorial do mapa |
| D-007 | Standalone permanece sem React. | portabilidade, tamanho e arquitetura existente |
| D-008 | Visual migration precede root consolidation. | um eixo de risco por fase |
| D-009 | Playwright versionado para UI release. | QA reproduzível e independente do ambiente do agente |
| D-010 | E2E usa temp DB obrigatório. | proteção do workspace real |
| D-011 | Fonts são fase separada. | métricas tipográficas afetam todas as baselines |
| D-012 | No dark mode nesta entrega. | evita multiplicar token states antes da convergência |
| D-013 | Não usar CSS Modules/Tailwind na primeira onda. | reduz dialetos durante migração |
| D-014 | Root único via portals transitórios. | preserva placement e contexto durante redução de bridges |

## 27. Questões abertas com default recomendado

| Questão | Default recomendado | Momento de decisão |
|---|---|---|
| Radix package por primitive ou pacote agregado? | packages individuais usados | antes de T-023 |
| CSS bundle por import do React ou build dedicado? | build dedicado com output explícito | antes de T-012 |
| Font subset embutido no standalone? | sim, subset WOFF2 apenas dos pesos usados | antes de T-047 |
| UI Catalog separado ou rota QA? | `ui-catalog.html` separado | antes de T-018 |
| Manter legacy fallback runtime após root único? | uma release/etapa de validação, depois remover | antes de T-050 |
| Breakpoints atuais ou novos? | preservar valores atuais primeiro; corrigir por evidência | antes de T-029 |
| `!important` meta zero? | não; <=20 justificadas é mais honesto | R9 |
| Icon library externa? | começar com registry interno; reavaliar custo depois | antes de T-025 |
| CSS Modules após convergência? | backlog, não requisito | pós-R9 |
| Incorporar E2E em `npm run check`? | apenas quando runtime estável e não-flaky | R9 |

Os defaults acima são a decisão de trabalho para o Gate 0. Se nenhum ADR os substituir antes da
task indicada, o implementador deve aplicá-los e registrar a decisão no relatório da fase. Isso
evita que uma questão aberta interrompa uma task sem risco material, mantendo decisão explícita e
reversível.

## 28. Instruções para o agente implementador

### Antes de qualquer fase

1. ler esta spec, `UI_SYSTEM_ARCHITECTURE_AND_MIGRATION_SPEC.md`, `REACT_REFACTOR_PLAN.md`,
   `UI_REDESIGN_ARCHITECTURE.md`, `ARCHITECTURE.md` e
   `PERFORMANCE_ARCHITECTURE.md`;
2. executar `git status --short --branch`;
3. identificar mudanças preexistentes nos arquivos da fase;
4. executar os gates baseline permitidos sem reescrever generated outputs prematuramente;
5. registrar a task e acceptance scenarios aplicáveis;
6. confirmar que o banco de teste é temporário;
7. limitar a fase a um eixo de risco.

### Durante a implementação

1. adicionar teste de contrato antes ou junto da mudança;
2. preservar IDs/attributes até remover o consumidor;
3. não acessar `cy` em componente;
4. não persistir em effect de render;
5. não criar novo literal visual fora de tokens;
6. não adicionar `!important` para “fazer funcionar” sem identificar o owner anterior;
7. migrar uma família de control por vez;
8. comparar computed style e screenshot;
9. verificar console depois de mudança de modo;
10. testar narrow viewport antes de chamar a superfície de concluída.

### Ao remover legado

1. buscar selector/ID/class com `rg`;
2. consultar Compatibility Manifest;
3. executar uso-zero check;
4. remover link/import em uma entrega reversível;
5. executar smoke completo;
6. somente depois apagar o arquivo/regra;
7. atualizar manifest e docs.

### Ao concluir uma fase

Registrar:

- tasks concluídas;
- critérios aprovados;
- comandos executados;
- quantidades de testes;
- screenshots/baselines atualizadas;
- CSS/root/bundle metrics antes e depois;
- known exceptions restantes;
- arquivos gerados;
- procedimento de rollback validado.

## 29. Revisão crítica do plano

Esta seção registra a revisão executada depois da primeira formulação da estratégia.

### 29.1 Risco identificado: tratar consistência como uniformidade

Problema da primeira abordagem: unificar todos os modos poderia apagar o caráter editorial do
Workspace e a imersão de Present.

Melhoria incorporada:

- matriz explícita de diferença intencional;
- density e publication profiles como variants de primeira classe;
- aceite exige identidade compartilhada, não layout idêntico.

### 29.2 Risco identificado: fazer design system e “React correto” ao mesmo tempo

Problema da primeira abordagem: reduzir 16 roots enquanto botões, CSS e layouts mudam tornaria
regressões difíceis de atribuir.

Melhoria incorporada:

- visual migration termina antes da consolidação estrutural;
- R8 exige visual no-op;
- portals são ponte, não redesign.

### 29.3 Risco identificado: baseline capturar bugs atuais como requisitos

Problema da primeira abordagem: screenshot baseline poderia legitimar a faixa móvel vazia, warnings
e clipping.

Melhoria incorporada:

- Known Baseline Exceptions;
- classificação preserve/fix/known;
- baseline update exige justificativa;
- defeitos confirmados viraram acceptance criteria específicos.

### 29.4 Risco identificado: QA tocar o banco pessoal

Problema da primeira abordagem: E2E de save/reload poderia escrever no `data/trama.db`.

Melhoria incorporada:

- `TRAMA_DB_PATH`/data root como task P0;
- fixture JSON e temp dir;
- stop condition para qualquer uso do banco real.

### 29.5 Risco identificado: escolher biblioteca por estética

Problema da primeira abordagem: adotar um kit completo resolveria velocidade inicial e criaria
outra identidade e nova camada de override.

Melhoria incorporada:

- biblioteca somente para comportamento complexo;
- aparência e tokens próprios;
- instalação incremental por primitive usado;
- bundle delta medido.

### 29.6 Risco identificado: design system React não alcançar standalone

Problema da primeira abordagem: componentes compartilhados poderiam unificar o app e aprofundar a
diferença do export.

Melhoria incorporada:

- tokens são framework-agnostic;
- publication adapter específico;
- standalone continua sem React;
- parity scenarios são P0.

### 29.7 Risco identificado: apagar CSS legado em massa

Problema da primeira abordagem: muitos `!important` existem justamente porque superfícies antigas e
novas coexistem.

Melhoria incorporada:

- cascade layers primeiro;
- rehome por selector;
- uso-zero check;
- link removido antes do arquivo;
- budget decrescente, não meta instantânea.

### 29.8 Risco identificado: testes atuais validarem presença, não experiência

Problema da primeira abordagem: vários testes de Story Studio procuram strings/IDs no source e não
substituem browser E2E.

Melhoria incorporada:

- Playwright versionado;
- matrix de viewport e motion;
- keyboard, focus, reload e offline;
- testes atuais continuam como contrato estrutural, não evidência visual final.

### 29.9 Risco identificado: font change contaminar todas as comparações

Problema da primeira abordagem: self-host e subset poderiam mudar line wrapping junto da primeira
troca de tokens.

Melhoria incorporada:

- typography offline é release separada;
- fallback tem baseline própria;
- nenhuma avaliação de layout mistura troca de fonte e troca de component.

### 29.10 Risco identificado: plano grande demais para ser executável

Problema da primeira abordagem: uma “refatoração do design system” monolítica ficaria meses aberta e
misturada ao desenvolvimento do produto.

Melhoria incorporada:

- releases R0-R9 com gates independentes;
- tasks pequenas e rastreáveis;
- rollback por superfície;
- primitives aprovados antes do consumo;
- nenhum release depende de prazo arbitrário.

### 29.11 Risco identificado: app e standalone consumirem gerações incompatíveis

Problema encontrado na segunda revisão: uma fonte canônica não basta se bundles gerados em momentos
diferentes puderem combinar schema, aliases e publication CSS incompatíveis.

Melhoria incorporada:

- versão e hash no manifest gerado;
- regra de deprecation e breaking change;
- build falha quando app, engine e publicação não compartilham o mesmo contrato;
- changelog e consumidor-zero antes de remoções.

### 29.12 Risco identificado: a interface convergir depois do primeiro paint

Problema encontrado na segunda revisão: screenshots do estado estável não detectariam um flash de
painel legado, font swap destrutivo ou ação deslocada por conteúdo longo.

Melhoria incorporada:

- AS-11 cobre cache vazio, CPU desacelerada e frames de inicialização;
- budget explícito de CLS e zero flash legado;
- matriz E2E inclui conteúdo extremo e expansão textual;
- CSS crítico não depende do mount React para definir visibilidade ou identidade.

## 30. Melhorias adicionais recomendadas após a revisão

Estas melhorias tornam o programa mais robusto do que uma migração visual convencional:

1. adicionar no UI Catalog uma página “do not use” com patterns deprecated e substitutos;
2. gerar automaticamente a documentação de tokens a partir do schema;
3. registrar metrics de CSS/root/bundle como artifact de cada PR;
4. criar um teste de “mode churn” que alterna modos repetidamente e mede listeners, roots e mounts;
5. criar teste de “no write on navigation” contra o server de QA;
6. separar screenshot do shell e screenshot do canvas para não mascarar regressões;
7. adicionar semantic region snapshots, não apenas pixel diff;
8. incluir forced-colors como exploração antes do release final;
9. adicionar expiry a toda Known Baseline Exception;
10. criar owner explícito para Product Design System, Map Style Library e Publication Profile;
11. manter um changelog do design system com breaking changes e deprecations;
12. exigir que todo novo modo declare density, scroll ownership e responsive collapse strategy.

### 30.1 Auditoria das melhorias

Na revisão final, as melhorias abaixo já foram incorporadas ao programa e não são mais apenas
recomendações: fixture/reset por teste, catálogo isolado, relatório de tokens/root/CSS, mode churn,
no-write de navegação, isolamento de Style Pack, publicação offline nos três perfis, fontes locais,
mount counter do CanvasHost, cancelamento de fits obsoletos e registro explícito de classes dinâmicas
no uso-zero check.

Permanecem como backlog deliberado, sem bloquear a convergência visual: snapshot separado de shell e
canvas, forced-colors automatizado, métricas de bundle por PR, teste de CPU desacelerada/CLS e
autohospedagem dos assets de engine/layout. Cada item tem risco e rollback próprios; não deve ser
misturado a uma nova migração de componentes.

## 31. Recomendação final

Executar a convergência nesta ordem:

```text
Baseline isolada
  -> tokens sem mudança visual
    -> primitives no catálogo
      -> Workspace e shell
        -> overlays
          -> Explore
            -> Editor
              -> Story + Present
                -> Standalone + fonts
                  -> root único
                    -> remoção de legado
```

Não começar instalando uma biblioteca visual. Para a próxima evolução, preservar a mesma ordem de
risco: primeiro atualizar fixture/baselines/manifest, depois tokens/primitives, depois uma superfície
por vez. Não apagar CSS ou mover componentes junto com uma mudança de persistência/engine.

O programa implementado deixa uma rede de segurança reproduzível: qualquer alteração futura deve
passar por `npm run check`, `npm run check:ui` e pela revisão dos critérios de aceite da superfície
afetada antes de atualizar baselines.
