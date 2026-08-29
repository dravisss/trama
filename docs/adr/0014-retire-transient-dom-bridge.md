# ADR 0014 — Aposentar `transientDomBridge`

Status: aceito em 21-07-2026

## Contexto

O `transientDomBridge` era o único bridge dedicado exclusivamente à
coordenação de menus `<details>` transitórios e ao clique no backdrop da
descrição do loop. Seus consumidores eram estruturas HTML/React reais, mas a
responsabilidade não dependia de domínio, estado persistido ou Cytoscape.

## Decisão

- Migrar o comportamento para `createTransientDetailsController` em
  `src/adapters/browser/transientDetailsController.js`.
- Manter exatamente os contratos de exclusividade entre menus, fechamento por
  Escape, fechamento por clique externo, proteção quando há `dialog[open]`,
  clique no backdrop e `destroy()`.
- Integrar o adapter diretamente pelo composition/compatibility root e remover
  o import, a instância, o arquivo e o teste do bridge antigo.
- Registrar `transientDomBridge` como aposentado no Compatibility Manifest;
  nenhum mount point ou ID público exclusivo é removido nesta fatia.

## Dependências e critérios de aceite

- O adapter não importa React, Cytoscape, HTTP, SQLite ou domínio.
- Busca estática não encontra import/instanciação de `transientDomBridge`.
- Testes cobrem toggle, exclusividade, Escape, clique externo, modal aberto,
  backdrop e cleanup.
- Editor mobile, menus, Story Studio, modal, foco e modo churn permanecem
  verdes no browser.
- `npm test`, `npm run check`, `npm run check:ui`, axe, Playwright focal e
  `git diff --check` passam.

## Rollback

Restaurar `src/app/transientDomBridge.js`, seu teste e a instanciação anterior
em `src/app.js`; remover o adapter e a marca de aposentadoria do manifest. Não
há alteração de dados, schema, Presentation V2, tokens ou export.

## Validação

- `node --test tests/transient-details-controller.test.mjs`: 3 testes
  específicos aprovados.
- `npm test`: 199 testes aprovados.
- `npm run check`: 199 testes, 4 testes Story Studio e build aprovados.
- Playwright focal de menus/modal/mobile/mode churn: 18/18 em três
  repetições.
- `npm run check:ui`: contratos e legado aprovados, 50 E2E UI e 1 teste axe
  aprovados.
- Busca estática: zero importações/instanciações de `transientDomBridge`;
  `transientDetailsController` é o único owner browser dessa responsabilidade.
- `git diff --check`: aprovado antes do commit.
