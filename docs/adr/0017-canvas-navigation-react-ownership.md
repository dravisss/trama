# ADR 0017 — Transferir a navegação do canvas para React

## Contexto

`CanvasSurface` já renderizava `focus-exit`, Centralizar, zoom e Ver tudo, mas
cinco listeners do `workspaceDomBridge` ainda traduziam esses cliques. O
comportamento real depende do engine e do estado de foco, portanto não deveria
ser duplicado em listeners imperativos separados do owner visual.

## Decisão

O store React passa a publicar um contrato estável `canvasActions`, conectado
uma vez pelo composition root:

- `onFocusExit` encerra o foco;
- `onCenter` ajusta o canvas com padding 90;
- `onFit` ajusta o canvas com padding 45;
- `onZoom` preserva os fatores existentes de 0.85 e 1.18.

`CanvasSurface` executa essas intenções nos elementos existentes. O bridge
continua responsável pelos comportamentos ainda imperativos, como handles
Cytoscape, mutações de estado visual e cliques de stage. A comparação de memo
considera `mapSelector` e `canvasActions` para evitar rerenders posteriores que
reapliquem defaults imperativos.

## Validação

- `npm test`: 199 testes;
- `npm run build`: concluído;
- Playwright focal de canvas, seletor e shell: 12/12 em duas repetições;
- static search: zero listeners do bridge para os cinco controles;
- `git diff --check`: aprovado.

## Rollback

Reverter este commit restaura os cinco listeners e remove o contrato
`canvasActions`. Não há alteração de dados, IDs, CSS ou schema.
