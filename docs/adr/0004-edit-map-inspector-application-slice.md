# ADR 0004 — Segunda fatia de aplicação do Map Authoring: EditMap no Inspector

Status: aceito em 21-07-2026

## Contexto

Depois de `SaveMap`, o submit do Inspector ainda escolhia diretamente entre
`engine.updateNode(s)` e `engine.updateEdge()` dentro de `src/app.js`. Esse
trecho mistura a leitura de formulário com a política de edição do mapa e
dificulta testar a intenção sem DOM, Cytoscape ou browser.

O comportamento já possui caracterização nas jornadas do Inspector: editar o
label de uma variável, editar a descrição de uma relação, preservar a
seleção múltipla e manter undo/autosave funcionando. A falha independente do
baseline visual `map-tablet` continua fora do escopo.

## Decisão

- Confirmar **Map Authoring** como o contexto da segunda fatia.
- Limitar `EditMap` ao submit do Inspector, com três operações explícitas:
  `updateNode`, `updateNodes` para seleção múltipla e `updateEdge`.
- Fazer o caso de uso receber apenas `{ target, changes }`, normalizar o alvo
  e devolver `{ target, result }`. FormData, toast, dirty state e persistência
  continuam no composition root.
- Definir `MapEditorPort` em
  `src/application/ports/mapEditor.js`, sem dependência de React, DOM,
  Cytoscape, HTTP ou SQLite.
- Implementar `createEngineMapEditor()` em
  `src/adapters/engine/mapEditor.js`. O adapter traduz a port para os métodos
  já existentes no `CLDEngine`, preservando sua história, render incremental e
  eventos `modelmutate`.
- Integrar o caso de uso no submit do Inspector e no popover legado, sem
  remover os caminhos de criação/remoção, movimento, rotas, views ou
  Presentation.

## Invariantes preservadas

- Um alvo de nó continua usando `updateNode`; uma seleção com mais de um nó
  continua usando uma única chamada `updateNodes`.
- Uma relação continua usando `updateEdge`, com sinais, descrição e campos
  personalizados intactos.
- O engine continua dono de histórico/undo, atualização incremental do
  canvas, eventos de mutação e modelo em edição.
- O listener existente de `modelmutate` continua acionando sincronização,
  dirty state e autosave; o caso de uso não conhece estado de UI.
- Schema SQLite, Presentation V2, tokens, export standalone e contratos
  visuais não mudam.

## Critérios de aceite

- `EditMap` é testável com fake de `MapEditorPort` em Node.
- Comandos inválidos falham antes de chamar a port.
- Nó único, seleção múltipla e relação são encaminhados para operações
  distintas e explícitas.
- As jornadas existentes de edição do Inspector continuam passando, inclusive
  undo e persistência.
- `npm test`, `npm run check` e os gates de UI/a11y são executados; qualquer
  alteração de baseline precisa ser limitada ao canvas e ter rationale.

## Validação desta fatia

- `npm test`: 170 testes aprovados.
- `npm run check`: aprovado, incluindo 4 testes Story Studio e build.
- `npm run test:a11y`: 1 teste aprovado, sem violações critical/serious.
- A câmera do Editor publica uma estabilidade semântica após os fits de
  layout; os helpers de interação aguardam esse contrato e amostram os pontos
  renderizados reais para nós e relações. Isso removeu as falhas intermitentes
  de seleção e rota.
- A reconciliação de autosave preserva `mapId`, `viewId`, `view` e `views` do
  entry corrente; `SaveView` atualiza a view cujo id foi selecionado, mesmo se
  outro request terminar durante a operação. O preset escolhido passa a
  materializar seu título e seu pacote de estilo.
- `map-tablet` e `map-mobile` foram atualizados intencionalmente porque a
  câmera determinística altera somente a composição do canvas. Shell,
  Inspector, Explore e Story permaneceram sem alteração visual intencional.
- `npm run check:ui`: 44 E2E aprovados em 4.0 minutos; `test:a11y`: 1
  aprovado sem violações critical/serious.
- A jornada flagship repetida cinco vezes também passou, além de
  `git diff --check`.

## Rollback

Restaurar os três pontos de chamada do Inspector para `engine.updateNode`,
`engine.updateNodes` e `engine.updateEdge`, remover o wiring de `EditMap` em
`src/app.js` e excluir os módulos/testes desta fatia. Nenhuma migração de
dados ou alteração de schema é necessária.

## Próxima decisão

Não ampliar `EditMap` automaticamente. Criação/remoção estrutural, movimento
e `SaveView` exigem caracterização própria e uma nova decisão; a próxima fatia
deve começar somente com contrato, ADR e rollback próprios.
