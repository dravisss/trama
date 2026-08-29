# ADR 0010 — Edição de Presentation V2

Status: aceito em 21-07-2026

## Contexto

O Story Studio já mantém a Presentation V2 em memória, mas
`commitPresentationEdit()` também fazia diretamente a normalização e a
detecção de no-op junto com histórico, dirty state, lint e renderização. Isso
misturava a política de edição com React/DOM e dificultava testar preservação
de foco, câmera, timeline e referências de mapa.

## Decisão

- Criar o caso de uso puro `EditPresentation` no contexto Presentation/Story.
- O caso de uso recebe a Presentation atual e a próxima versão, normaliza
  ambas com o schema V2 e retorna `changed`, `previous` e `presentation` sem
  mutar a entrada.
- O composition root continua dono de histórico undo/redo, dirty state,
  seleção do Story Studio, lint, mensagens e renderização.
- A edição aceita somente snapshots de Presentation; não conhece React, DOM,
  Cytoscape, HTTP ou SQLite.
- Foco semântico, `mapRef`, `stage.camera`, deltas de beat e timeline são
  preservados pelo snapshot normalizado. Nenhum formato legado ou `model.story`
  é reintroduzido.

## Critérios de aceite

- Uma edição válida retorna uma Presentation V2 normalizada e indica mudança.
- Uma edição equivalente é no-op e não produz histórico implícito.
- Entradas não são mutadas e metadados V2 relevantes permanecem intactos.
- O Story Studio mantém dirty state, undo/redo, lint, seleção, câmera e
  playback com o mesmo comportamento.
- `npm test`, `npm run check`, `npm run check:ui`, axe, Playwright focal e
  `git diff --check` passam.

## Rollback

Remover `EditPresentation` e restaurar em `commitPresentationEdit()` a
normalização e a comparação locais. Nenhum dado persistido ou schema é
alterado por esta fatia.

## Dependências

- ADR 0002 — composição React e store.
- ADR 0004 — edição de mapa pelo Inspector.
- ADR 0009 — conclusão das operações de View/Style.

## Validação

- `node --test tests/edit-presentation.test.mjs`: 3 testes aprovados.
- `npm test`: 186 testes aprovados.
- `npm run check`: 186 testes, 4 testes Story Studio e build aprovados.
- `npm run check:ui`: contratos e legado aprovados, 48 E2E UI e 1 teste axe
  aprovados.
- Playwright focal Story/Present: 9 jornadas aprovadas em 3 repetições,
  incluindo edição de título, reorder de beat, save, playback, exploração,
  responsividade e export offline.
- `git diff --check`: aprovado antes do commit.
