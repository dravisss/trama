# ADR 0012 — ExportStandalone no contexto Publication

Status: aceito em 21-07-2026

## Contexto

Os comandos de exportação de mapa, projeto e apresentação construíam o HTML
standalone no `src/app.js`, carregando runtime, CSS, fontes e assets HTTP e
disparando o download no mesmo fluxo. Isso dificultava testar o contrato de
publicação sem UI e misturava composição, browser e compilação do payload V3.

## Decisão

- Criar o caso de uso `ExportStandalone`, que recebe um snapshot completo,
  carrega recursos por `PublicationAssets`, usa o compilador standalone V3
  existente e entrega o documento por `StandalonePublisher`.
- Implementar adapters de browser para os recursos locais/API e para o
  download, mantendo HTTP, `fetch`, `FileReader` e DOM fora da aplicação.
- Reutilizar `createStandaloneHtml` sem alterar o envelope, o integrity digest,
  a seleção de assets, as fontes, os modos de sidebar/presentation-only ou o
  funcionamento offline por `file://`.
- Manter no composition root apenas `syncWorkspaceFromEngine`, a montagem do
  snapshot de mapa/projeto/apresentação, estados de loading/erro e a composição
  concreta dos ports.

## Dependências e critérios de aceite

- O caso de uso não importa React, DOM, Cytoscape, HTTP ou SQLite.
- Exportação de mapa, projeto e apresentação continua usando o mesmo HTML V3.
- Assets referenciados continuam incorporados como data URLs; fontes e CSS
  continuam incorporados no documento.
- Falha ao carregar recursos não publica um arquivo incompleto e uma nova
  execução permite retry.
- Editor/Story Studio/Present e standalone preservam os contratos de
  Presentation V2 e a paridade do compilador.
- `npm test`, `npm run check`, `npm run check:ui`, axe, Playwright offline
  focal repetido e `git diff --check` passam.

## Rollback

Reverter o wiring do `ExportStandalone` em `src/app.js` e restaurar as três
chamadas locais a `createStandaloneHtml`, mantendo o compilador V3 inalterado.
Remover os ports, adapters, testes e esta ADR. Não há migração de dados,
alteração de endpoint, schema ou formato de arquivo.

## Validação

- `node --test tests/export-standalone.test.mjs`: 5 testes aprovados.
- `npm test`: 196 testes aprovados.
- `npm run check`: 196 testes, 4 testes Story Studio e build aprovados.
- Playwright focal de exportação: 6 jornadas aprovadas em 3 repetições,
  cobrindo o caminho de export pela UI e os perfis `clean`, `guided` e
  `explore` por `file://` sem rede.
- `npm run check:ui`: contratos e legado aprovados, 50 E2E UI e 1 teste axe
  aprovados.
- `git diff --check`: aprovado antes do commit.
