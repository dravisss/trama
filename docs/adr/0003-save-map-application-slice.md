# ADR 0003 — Primeira fatia de aplicação do Workspace: SaveMap

Status: aceito em 21-07-2026

## Contexto

O backlog pós-R9 pede a redução progressiva de `src/app.js` sem reabrir a
migração visual R0–R9, mudar o schema SQLite ou alterar Presentation V2. O
autosave map-first é um fluxo pequeno e já possui comportamento caracterizado
em `workspacePersistence.test.mjs`: usa `PUT /api/maps/:id`, preserva o modelo
autorado e precisa continuar serializando writes por registro.

`workspacePersistence` ainda mistura o formato de `entry` usado pela UI com o
payload de persistência. Isso dificulta testar a política de salvar sem trazer
DOM, React ou Cytoscape para o teste.

## Decisão

- Confirmar **Workspace** como o contexto da primeira fatia; sua linguagem é
  mapa, snapshot autorado, dirty state, autosave e retry.
- Introduzir `SaveMap` como caso de uso em
  `src/application/workspace/saveMap.js`. Ele recebe um snapshot de mapa e
  depende somente da port `MapRepository.update(map)`.
- Introduzir o contrato runtime mínimo da port em
  `src/application/ports/mapRepository.js`.
- Implementar `MapRepository` para a API atual em
  `src/adapters/api/mapRepository.js`. O adapter mantém `PUT /api/maps/:id`,
  disponibilidade offline e fila serializada por mapa.
- Manter `workspacePersistence.saveMap({ entry })` como wrapper de
  compatibilidade. O autosave map-first de `src/app.js` passa pelo caso de uso;
  o caminho legado de loops não muda nesta fatia.
- Deixar `persistActiveLoop()` responsável pela política transitória de
  dirty/save status e pelo acionamento de retry. O caso de uso propaga a falha;
  não cria estado de UI.

## Dependências e limites

O caso de uso conhece somente o snapshot e a port. O adapter conhece o
`fetcher` da API. `src/app.js` faz o wiring e continua sendo composition/
compatibility root. `ProjectStore`, schema SQLite, engine Cytoscape, React,
DOM, Presentation V2, tokens e export standalone não são alterados.

## Critérios de aceite

- `SaveMap` funciona com um fake `MapRepository` em Node, sem browser ou banco.
- O snapshot enviado ao port não contém `label`, `persisted` ou outros campos
  da UI.
- Sucesso, falha propagada e retry são cobertos por testes.
- O adapter mantém a ordem das atualizações do mesmo mapa e permite que a
  próxima tentativa prossiga depois de uma falha.
- O consumidor atual preserva o endpoint e o comportamento de autosave.
- Não há alteração de schema ou de registros Presentation V2.

## Validação desta fatia

`npm test` passou com 165 testes, `npm run check` passou com os testes Story e
build, e o teste axe passou isoladamente. `npm run check:ui` passou pelo
contrato UI, pelo relatório de legado e por 34 dos 44 testes de UI, mas parou
no baseline visual `map-tablet`: 7.186 pixels (1%) divergiram e a mesma falha
foi reproduzida no teste isolado. O diff está concentrado no posicionamento do
canvas; shell e Inspector permanecem iguais, sem erro de console reportado.

Decisão: não atualizar snapshot nem alterar layout nesta fatia, porque isso
reabriria R0–R9 e não é necessário para o contrato SaveMap. O baseline deve ser
investigado antes de declarar o gate UI totalmente verde ou iniciar outra
extração estrutural.

## Rollback

Remover o wiring de `createSaveMap()` em `src/app.js` e restaurar o wrapper
`workspacePersistence.saveMap()` como consumidor devolve o fluxo à implementação
anterior. Os novos módulos e testes podem ser removidos sem migração de dados;
`ProjectStore`, schema, views, presentations e export permanecem intactos.

## Próxima decisão

Não iniciar outra extração nesta entrega. A próxima fatia deve ser proposta
somente após revisar estes gates e escolher explicitamente entre `EditMap` e
`SaveView`, com novos testes de caracterização e ADR/rollback próprios.
