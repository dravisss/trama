# ADR 0011 — Persistência de Presentation V2

Status: aceito em 21-07-2026

## Contexto

`saveActivePresentation()` ainda construía requests HTTP diretamente no
composition root. O fluxo precisava preservar criação versus atualização,
`expected_revision`, conflitos 409, dirty state e a fonte Markdown sem expor
detalhes de HTTP/SQLite ao caso de uso.

## Decisão

- Criar o port `PresentationRepository` com `create()` e `update()` para esta
  fatia, além do adaptador HTTP correspondente.
- Criar `SavePresentation`, que normaliza o snapshot Presentation V2 e escolhe
  criação quando não há id ou atualização quando há id e revisão esperada.
- Serializar writes por apresentação no adaptador e permitir retry após falha;
  não descartar a edição nem marcar sucesso antes da resposta persistida.
- Preservar `source_md`, capítulos, cenas, beats, `mapRef`, foco, câmera,
  timeline e campos V2 no payload.
- Propagar metadados de conflito (`current`) pelo helper HTTP para que a
  composição atual possa carregar a versão canônica e manter o dirty guard.
- Manter no composition root a política de lint, mensagens, atualização da
  lista, dirty state, Story Studio e renderização.

## Critérios de aceite

- Criação usa `POST /api/presentations`; atualização usa `PUT /api/presentations/:id`.
- Atualização inclui `expected_revision` quando disponível e rejeita payloads
  incompletos antes do repository.
- Falha mantém retry possível; conflito preserva a versão canônica retornada.
- Reload continua recuperando o Presentation V2 salvo, incluindo foco, câmera,
  timeline e `source_md`.
- Editor, Story Studio, Present, standalone, assets, fontes e schema SQLite
  permanecem com o mesmo contrato.
- `npm test`, `npm run check`, `npm run check:ui`, axe, Playwright focal e
  `git diff --check` passam.

## Rollback

Restaurar os dois ramos de `apiFetch()` em `saveActivePresentation()`, remover
`SavePresentation`, o port, o adaptador e seus testes. Não há migração de dados
nem alteração de endpoint ou schema para reverter.

## Dependências

- ADR 0010 — Edição de Presentation V2.
- ADR 0002 — composição React e store.
- ADR 0007 — captura determinística dos baselines responsivos.

## Validação

- `node --test tests/save-presentation.test.mjs`: 5 testes aprovados.
- `npm test`: 191 testes aprovados.
- `npm run check`: 191 testes, 4 testes Story Studio e build aprovados.
- Playwright focal SavePresentation: 6 jornadas aprovadas em 3 repetições,
  cobrindo criação/atualização, revisão, fonte V2, reload, erro, dirty state e
  retry.
- Baseline Explore tablet: 3 repetições aprovadas após sincronização pelo
  marcador semântico do loop focado.
- `npm run check:ui`: contratos e legado aprovados, 50 E2E UI e 1 teste axe
  aprovados.
- `git diff --check`: aprovado antes do commit.
