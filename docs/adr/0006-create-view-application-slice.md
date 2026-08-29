# ADR 0006 — Quarta fatia de aplicação do View/Style: CreateView

Status: aceito em 21-07-2026

## Contexto

O comando “Nova” ainda construía e persistia uma view diretamente em
`src/app.js`, enquanto `SaveView` já possuía uma port para atualizar views
existentes. A criação precisa compartilhar o mesmo contrato de infraestrutura
sem misturar fallback offline com HTTP ou SQLite no caso de uso.

Esta fatia cobre somente a criação de uma view nova associada ao mapa ativo.
Duplicação, derivação e remoção permanecem fora do escopo e terão contratos
próprios.

## Decisão

- Confirmar **View/Style** como o contexto da fatia.
- Criar `CreateView`, que normaliza um draft autorado e depende de
  `ViewRepository.create()`.
- Adicionar `create()` ao adapter API existente, mantendo `POST /api/views` e
  serializando criações por mapa.
- Manter o fallback offline local no composition root; o caso de uso não
  conhece disponibilidade de rede, DOM, React, Cytoscape ou SQLite.
- Reutilizar o snapshot de view compartilhado por `CreateView` e `SaveView`.

## Critérios de aceite

- “Nova” cria uma view sem duplicar o mapa.
- O draft não precisa de id de cliente; o servidor devolve o id persistido.
- Falha no repository propaga e uma nova tentativa pode avançar.
- A view criada aparece no seletor e retorna após reload.
- Preview continua sem persistência implícita.
- `npm test`, `npm run check`, `npm run check:ui`, axe e
  `git diff --check` permanecem verdes.

## Rollback

Restaurar `createNewView()` para chamar `saveNewView()`, remover o wiring de
`CreateView`, o método `create()` do adapter e os testes desta fatia. Nenhum
registro ou schema exige migração reversa.

## Validação

- Testes específicos de View/Style: aprovados.
- Playwright focal `editor-preview-isolation` repetido 3 vezes: aprovado.
- `npm test`: 177 testes aprovados.
- `npm run check`: 177 testes, 4 testes Story Studio e build aprovados.
- `npm run check:ui`: contratos e legado aprovados, 45 E2E UI e 1 teste axe
  aprovados.
- Playwright focal `editor-preview-isolation`: 9 testes aprovados em 3
  repetições, incluindo criação, preview e reload.
- `git diff --check`: aprovado antes do commit.
- O ADR 0007 registra a estabilização independente dos baselines responsivos;
  nenhum contrato de produto ou persistência foi alterado por essa correção.
