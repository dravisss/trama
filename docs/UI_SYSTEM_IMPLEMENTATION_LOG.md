# Trama UI System — Implementation Log

Fonte normativa: `docs/UNIFIED_PRODUCT_DESIGN_SYSTEM_SPEC.md`.

Este log registra evidência de execução sem reescrever a especificação. Cada
fase só avança quando seus critérios e rollback permanecem verificáveis.

## Estado atual

| Fase | Estado | Evidência principal |
|---|---|---|
| R0 — Baseline e isolamento | concluída | fixture SQLite temporária, reset por teste, fixture flagship e 15 baselines |
| R1 — Tokens e cascata | concluída | 237 tokens canônicos gerados, fontes locais, `matchaTheme` adaptado e contrato de cascade |
| R2 — Primitives e catálogo | concluída | catálogo isolado, teclado/foco, axe e prova de zero escrita |
| R3 — Shell e Workspace | concluída | navegação, Workspace, save status, project switcher e command dialog cobertos |
| R4 — Explore | concluída | detalhe do loop, foco/câmera, ações de leitura e overlay móvel cobertos; baselines revisados |
| R5 — Editor | concluída | CanvasHost estável, toolbar responsiva, edição/preview, estrutura, reload e teclado cobertos |
| R6 — Story/Present | concluída | inspector móvel, Present keyboard/explore/resume/reduced motion e timeline V2 |
| R7 — Standalone/fonts | concluída | três perfis offline, 10 faces WOFF2 locais e sem React/rede |
| R8 — Root/composição | concluída | um `createRoot()`, portals, AppStore observável, mode churn e mount único |
| R9 — Retirement/governance | concluída | `uiPolish.css` removido, aliases de token removidos, 0 `!important` no app |

## R0 — Baseline e isolamento

- `qa/fixtures/unified-ui-fixture.js` cria projeto determinístico com mapas de
  8, 16 e 32 nós, asset, Presentation V2 e duas views persistidas no flagship
  (Matcha e Boardroom).
- `e2e/support/qa-server.mjs` importa a fixture em banco temporário, expõe o
  reset somente nesse processo efêmero e encerra junto com o runner; nenhum
  teste aponta para `data/trama.db`.
- `e2e/support/qa-test.mjs` restaura a fixture antes de cada teste Playwright;
  um fluxo com persistência não contamina o baseline ou a jornada seguinte.
- `docs/UI_COMPATIBILITY_MANIFEST.json` inventaria mount points e bridges.
- `qa/known-baseline-exceptions.json` está vazio; o warning histórico do
  Cytoscape foi removido após a verificação sem warnings.
- Há 15 baselines Playwright: cinco modos em desktop, tablet e mobile.

Rollback: remover a infraestrutura de QA não toca em dados de usuário.

## R1 — Tokens e cascade

- `src/design-system/tokens.js` é a fonte canônica; o gerador produz
  `dist/trama-ui-tokens.css` e manifest versionado e hasheado. O manifest
  final declara `aliases: {}`: nenhum alias deprecated é publicado.
- `src/design-system/generatedManifest.js` é gerado junto com o CSS. App,
  engine e standalone publicam o mesmo schema/tema/hash; o contrato falha se
  esse artefato, o CSS ou o manifest em `dist/` divergirem.
- As cores existentes das folhas de produto foram normalizadas em
  `foundation.color.editorialTones`, preservando pixels durante a migração e
  removendo hex e aliases de consumidores CSS.
- A ordem canônica de layers é
  `reset, legacy, tokens, primitives, patterns, routes, states, utilities`.
- `src/themes/matcha.js` consome foundation tokens para as cores de shell que
  compartilha, preservando a paleta especializada do canvas.
- `scripts/check-ui-contract.mjs` bloqueia tokens gerados desatualizados,
  confirma a ordem de cascade, bloqueia aliases/hex em CSS e JSX de produto e
  não permite nenhum `!important` no app.
- O bloco gerado é carregado antes dos demais stylesheets do produto, e o
  standalone publica o mesmo schema/hash de tokens sem introduzir React.

Rollback: restaurar os links CSS e o adapter de tema não exige alteração de
record, engine ou Style Pack.

## R2 — Primitives e catálogo

- `ui-catalog.html` é local e não carrega projeto, engine ou persistência.
- O catálogo demonstra variants, tamanhos, loading, disabled, fields,
  surfaces, density, tabs, toolbar, dialog, menu e tooltip.
- `e2e/ui/catalog-interactions.spec.mjs` cobre densidade sem escrita, roving
  focus, Escape com retorno de foco e accessible name/tooltip de icon action.
- `e2e/a11y/catalog.spec.mjs` bloqueia violações axe critical/serious.
- A decisão de comportamento está registrada em
  `docs/adr/0001-ui-primitive-behavior.md`.
- Nenhum `<button>`, `<input>`, `<select>` ou `<textarea>` permanece fora do
  diretório de primitives no código React migrado.

Rollback: catálogo e primitives podem ser removidos sem alterar rotas ou
persistência enquanto não forem o único consumer de comportamento.

## R3 — Shell e Workspace

- A navegação entre Workspace e Editor não agenda `PUT /api/loops/:id`:
  callbacks do engine durante a hidratação são leitura, não edição.
- Save status e project switcher fecham por Escape ou clique externo sem
  persistir dados. O foco retorna ao controle que continua visível.
- O command dialog recebe foco no primeiro campo. Ao ser fechado por Escape a
  partir do menu de projeto, fecha o menu proprietário e retorna foco ao seu
  `summary` visível, evitando devolver foco a um item oculto.
- As folhas portaled que ainda recebem conteúdo dos bridges imperativos
  preservam sua identidade entre renders de shell; isto protege a cópia do
  player, o detalhe Explore e a câmera do Cytoscape.
- Presentation inicia a câmera somente depois do viewport final; em QA a
  captura espera o marcador de câmera resolvida.

Rollback: IDs, bridges e records persistidos permanecem inalterados; o
consumer do shell pode ser removido sem mudança de canvas ou Style Pack.

## R4 — Explore

- O detalhe do loop continua um consumer React das primitives, mas preserva o
  DOM preenchido pelo controller imperativo entre renders de shell.
- A troca de loop atualiza título, relações acessíveis e o foco do engine; em
  QA o marcador de câmera torna a seleção verificável sem depender de timing.
- `Ver mapa inteiro` limpa apenas o foco visual/câmera. A seleção editorial
  continua ativa, portanto `Percorrer loop` inicia exatamente o ciclo que o
  leitor estava analisando.
- Em 390px o painel é uma folha sobre o canvas, abaixo da barra de modos. O
  botão Fechar e Escape fecham a folha e devolvem foco ao modo Explorar; a
  barra não intercepta mais o clique no fechamento.
- `e2e/ui/explore-interactions.spec.mjs` prova a jornada sem requests de
  escrita e exige pelo menos 520px úteis de canvas na composição desktop.
- Os baselines Explore de tablet e mobile foram revisados após inspeção: o
  viewport do canvas é medido depois da composição final e a folha móvel fica
  acessível abaixo da navegação.
- Um fit atrasado de um modo é invalidado quando outro modo começa, e Explore
  espera a composição do painel antes de calcular a câmera; isso removeu uma
  fonte de baselines flutuantes.

Rollback: remover o consumer e a regra de composição de Explore não altera o
modelo, loops, Presentation V2, engine ou SQLite.

## R5 — Editor

- `CanvasSurface` mantém a identidade do host depois do mount; Cytoscape e a
  bridge imperativa continuam donos dos descendentes mutáveis, sem React
  reaplicar defaults como `hidden` durante uma interação.
- A toolbar mantém `Adicionar variável` visível e agrupa ações secundárias em
  `Mais ações`; não há overflow horizontal em 390x844 nem no reflow
  equivalente a 200% (512x384 CSS px).
- Inspector, rail, Style Builder e Markdown separam preview de commit; a
  cobertura garante que visualização e descarte não escrevem o projeto.
- O Style Builder remonta por identidade da view, portanto valores não
  controlados nunca preservam defaults de uma vista anterior. O autosave de
  mapa preserva a view selecionada enquanto persiste modelo/layout.
- Conectar variáveis, rota manual, liberação de rota, edição e undo usam o
  canvas real. Clique em aresta não é mais sobrescrito pelo fallback de
  proximidade do shell, e `grab/free` sem movimento não substitui o toast de
  uma ação estrutural.
- Posição de nó e rota manual são verificadas após reload. A fixture é resetada
  entre testes, enquanto cada jornada de reload preserva sua própria escrita.
- `src/design-system/fonts.css` resolve os WOFF2 locais a partir de
  `assets/fonts`, eliminando os 404 observados na captura visual desktop.

Rollback: os consumers e testes do Editor podem ser revertidos sem migração de
schema; o modelo, engine e SQLite permanecem compatíveis.

## R6 — Story Studio e Present

- O inspector móvel abre como folha com `aria-expanded`, `aria-controls`, botão
  de fechar, Escape e retorno de foco ao acionador.
- Present mantém uma única timeline compilada, aceita teclado, explore/resume,
  presenter notes e fechamento por Escape; o estado de presenter respeita o
  modo Story.
- Tokens `--story-v2-*` deixaram de ser consumidos como CSS variables; os nomes
  `story-v2-*` que permanecem são classes/IDs estruturais.
- A jornada flagship edita e reordena um beat real, salva a Presentation V2 e
  percorre Present em desktop; em mobile, valida a folha do inspector e a
  edição do movimento.

Rollback: remover os fluxos E2E e consumers de Story/Present não altera a
Presentation V2 persistida nem o runtime do mapa.

## R7 — Standalone, publicação e fontes

- `assets/fonts` contém 10 faces WOFF2 de Noto Sans/Serif e suas licenças.
- `dist/standalone-fonts.css` embute os mesmos subsets como data URLs.
- O export publica tokens `--lv-*`, fontes, payload e digest sem importar React.
- `e2e/ui/standalone-offline.spec.mjs` abre clean, guided e exploratory em
  `file://`, offline, sem requests externos, e verifica canvas, story, teclado
  e Escape.

Rollback: o export pode voltar ao CSS anterior sem tocar records ou engine.

## R8 — Consolidação estrutural

- `src/react/main.jsx` mantém um único `createRoot()` e usa portals para os
  hosts compatíveis do shell, editor, story e overlays.
- `AppStore` agora publica também os snapshots de composição dos painéis. Os
  métodos `renderX` são adapters transitórios e não possuem estado local
  próprio dentro do mount React.
- `CanvasSurface` é estruturalmente estável e incrementa um mount counter de QA;
  `e2e/ui/mode-churn-lifecycle.spec.mjs` confirma dez trocas de modo, um root,
  um host de canvas e uma identidade Cytoscape.
- O único `flushSync` é a barreira de bootstrap documentada em `main.jsx`.

Rollback: o slice estrutural pode ser revertido preservando tokens e primitives;
nenhum downgrade de SQLite é necessário.

## R9 — Retirement e governance

- `src/react/uiPolish.css` foi removido depois do rehome das regras válidas em
  `applicationRoutes.css` e layers de rota.
- `scripts/check-ui-legacy-usage.mjs` encontra zero IDs órfãos; classes emitidas
  dinamicamente pelo engine são reportadas, não silenciosamente ignoradas.
- O app CSS tem zero `!important`; o standalone mantém somente duas exceções
  de reduced motion, explicitamente justificadas.
- `standalone.css` não consome mais `--primary`, `--surface`, `--line` ou
  outros aliases; todo consumo de token é `--lv-*`.
- O ADR de composição e o manifest documentam owner, rollback e remoção dos
  contratos restantes.

## Pós-R9 — Primeira fatia de aplicação

- O contexto Workspace e o caso de uso `SaveMap` foram formalizados no ADR
  `docs/adr/0003-save-map-application-slice.md`.
- `SaveMap` depende de `MapRepository.update()` e o adapter da API mantém o
  endpoint e a serialização de autosaves por mapa.
- O consumidor map-first de `src/app.js` foi integrado; o wrapper de
  `workspacePersistence` e o caminho de loops permanecem compatíveis.
- Testes cobrem snapshot sem campos de UI, sucesso, falha, retry e ordem das
  atualizações após erro.
- Esta fatia não altera schema SQLite, Presentation V2, tokens, bridges,
  Cytoscape ou standalone.
- `npm test` passou com 165 testes, `npm run check` passou e o axe passou
  isoladamente. O `npm run check:ui` permanece pendente por uma falha reproduzida
  somente no baseline `map-tablet` (7.186 pixels; 1%); não houve atualização de
  snapshot nem mudança visual para mascarar o problema.

## Pós-R9 — Segunda fatia de aplicação

- O contexto **Map Authoring** e o recorte `EditMap` no submit do Inspector
  foram formalizados no ADR `docs/adr/0004-edit-map-inspector-application-slice.md`.
- `EditMap` recebe `{ target, changes }` e depende da `MapEditorPort`, com
  operações explícitas para nó, seleção múltipla e relação.
- O adapter `src/adapters/engine/mapEditor.js` encaminha para o `CLDEngine`;
  histórico, render incremental, `modelmutate`, dirty state e autosave
  continuam no engine/bridge/composition root.
- O Inspector e o popover legado foram migrados para o caso de uso. Nenhum
  fluxo estrutural, de rota, view ou Presentation foi reaberto.
- `src/app.js` passou a publicar uma marca explícita de câmera estável depois
  do fit inicial e do fit assentado; os helpers de interação do Playwright
  aguardam essa marca antes de clicar em nós, relações ou handles.
- A persistência de `View` passou a usar o id da view ativa e a reconciliação do
  autosave preserva o contexto mais recente de mapa/view. O Style Builder
  também materializa o título do preset escolhido, evitando que uma view
  Boardroom seja recarregada com o conteúdo Systems Atlas e o nome antigo.
- O baseline `map-tablet` e `map-mobile` foi atualizado de forma intencional:
  a diferença ficou restrita ao canvas após a câmera determinística; shell,
  Inspector, Explore e Story não tiveram snapshots alterados.

## Pós-R9 — Terceira fatia de aplicação

- O contexto **View/Style** e o caso de uso `SaveView` foram formalizados no
  ADR `docs/adr/0005-save-view-application-slice.md`.
- `SaveView` recebe somente um snapshot autorado e depende da port
  `ViewRepository`; o adapter HTTP preserva o contrato atual de listagem e
  atualização, serializa por view e permite retry após falha.
- O Style Builder continua em preview local até o comando explícito de salvar;
  `src/app.js` apenas compõe o caso de uso e reconcilia a view retornada.
- A fatia não altera schema SQLite, Presentation V2, tokens ou export
  standalone. Criação, duplicação, remoção e herança de views continuam fora
  do escopo.

## Última verificação desta entrega

| Gate | Resultado |
|---|---|
| `npm test` | 175 testes aprovados |
| `npm run qa:story` | 4 testes aprovados |
| `npm run build` | 237 tokens (`ba96f9e1921a`) e bundles gerados sem erro |
| `npm run check:ui-contract` | aprovado; 237 tokens; 18 IDs estáticos; 0 `!important` no app; 2 allowlisted no standalone; 1 root; 10 faces |
| `node scripts/check-ui-legacy-usage.mjs` | aprovado; 0 IDs órfãos; classes dinâmicas reportadas |
| `playwright test e2e/ui` | 44 testes aprovados em todos os viewports; flagship, Inspector, reload/rota, Explore, Story, standalone e baselines verdes |
| `playwright test e2e/a11y` | 1 teste aprovado; sem violações critical/serious |
| `npm run check:ui` | aprovado; contract, legacy, 44 E2E UI e axe passaram |
| `npm run check` | aprovado; 175 testes + 4 Story + build |
| `npm run test:ui` focal flagship `--repeat-each=5` | 5/5 aprovados após a correção de persistência e seleção |
| `git diff --check` | aprovado |

## Exceções e próximos gates

- Não há baseline exception aceita; nenhuma nova exceção de console é permitida.
- Backlog pós-R9: separar snapshots de shell/canvas, automatizar forced-colors,
  medir bundle/CLS por PR e autohospedar assets de engine/layout. Esses itens
  não estão escondidos como parte desta migração e devem ter specs próprias.
