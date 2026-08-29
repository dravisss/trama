# ADR 0013 — Composition root e auditoria dos bridges pós-R9

Status: aceito em 21-07-2026

## Contexto

Após as extrações de Map/View, Presentation e Publication, `src/app.js` ainda
montava diretamente o engine adapter, repositories, casos de uso e adapters de
export. O Compatibility Manifest também mantém bridges transitórios enquanto
eles possuem consumidores reais.

## Decisão

- Criar `createApplicationComposition()` como boundary único para montar
  `MapEditor`, `WorkspacePersistence`, repositories, casos de uso View,
  Presentation e Publication e seus adapters concretos.
- Manter `src/app.js` como composition/compatibility root de UI: ele fornece
  callbacks e estado efêmero ao composition boundary, preserva as políticas de
  feedback/dirty state e instala os listeners transitórios existentes.
- Não remover nenhum bridge nesta fatia. A busca estática e o browser smoke
  mostram uso ativo de `workspaceDomBridge`, `transientDomBridge`,
  `storyStudioDomBridge` e `engineBridge`; os IDs necessários permanecem no
  `docs/UI_COMPATIBILITY_MANIFEST.json`.
- Tratar a ausência de uso-zero como uma decisão de segurança, não como uma
  pendência escondida: nova remoção exige ADR própria, atualização do manifest,
  busca estática sem lookup, teste de contrato e smoke de teclado/foco.

## Dependências e critérios de aceite

- O módulo de composição não importa React nem seleciona elementos DOM.
- `src/app.js` não instancia diretamente repositories ou application services.
- O schema SQLite, Presentation V2, tokens, bridges e export V3 permanecem
  compatíveis.
- Cada bridge ativo continua com `destroy()` testado e seus IDs continuam
  cobertos pelo manifest/check-ui-contract.
- `npm test`, `npm run check`, `npm run check:ui`, axe e Playwright focal
  permanecem verdes.

## Rollback

Restaurar a instanciação dos adapters/casos de uso em `src/app.js` e remover
`createApplicationComposition` e seu teste. Nenhum dado, schema, endpoint,
Presentation ou bridge é alterado; o rollback é puramente de composição.

## Validação

- `npm test`: 197 testes aprovados.
- `npm run check`: 197 testes, 4 testes Story Studio e build aprovados.
- `npm run check:ui`: contratos e legado aprovados, 50 E2E UI e 1 teste axe
  aprovados.
- O smoke browser mantém os quatro bridges ativos e não encontrou IDs órfãos;
  a remoção física fica fora desta mudança por falta de evidência de uso-zero.
- `git diff --check`: aprovado antes do commit.
