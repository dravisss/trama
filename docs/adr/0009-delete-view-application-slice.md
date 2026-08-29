# ADR 0009 — Remoção de View/Style

Status: aceito em 21-07-2026

## Contexto

Depois das operações de criação, duplicação e derivação, `deleteActiveView()`
continuava chamando `DELETE /api/views/:id` diretamente em `src/app.js`.
Isso deixava a última operação de View/Style fora do boundary de aplicação e
impedia testar a política de fila e retry pelo port.

## Decisão

- Criar o caso de uso `DeleteView` no contexto View/Style.
- Estender `ViewRepository` com `delete(view)`, mantendo a identidade
  normalizada no port e uma fila por view para serializar tentativas.
- Usar `DELETE /api/views/:id` no adaptador HTTP, sem alterar o schema SQLite
  nem o contrato de mapas.
- Manter no composition root a reconciliação da view ativa: remover o record,
  selecionar o fallback local e preservar o mapa ativo, o dirty state e os
  fluxos de Presentation/Publication.
- Manter o caminho offline/local já existente; a chamada remota só ocorre
  para views persistidas com id não-local.

## Critérios de aceite

- Remoção usa `DeleteView` e `ViewRepository.delete()` em vez de fetch direto
  no app shell.
- Sucesso remove a view criada da seleção e mantém o mapa renderizado.
- Falha mostra o erro existente e permite retry sem perder a view local.
- O request usa `DELETE /api/views/:id` e não cria, promove ou altera mapas.
- Preview, dirty state, Presentation V2, câmera, Story Studio, standalone,
  schema SQLite e operações de criação/duplicação/derivação permanecem
  inalterados.
- `npm test`, `npm run check`, `npm run check:ui`, axe, Playwright focal e
  `git diff --check` passam.

## Rollback

Restaurar o wrapper remoto anterior de `deleteActiveView()`, remover
`DeleteView`, o método `ViewRepository.delete()`, os testes e o wiring no
composition root. Não há migração de dados nem alteração de schema para
reverter.

## Dependências

- ADR 0005 — SaveView.
- ADR 0006 — CreateView.
- ADR 0008 — Duplicação e derivação de View/Style.

## Validação

- `node --test tests/delete-view.test.mjs`: 3 testes aprovados.
- `npm run build`: build do engine, app e standalone aprovado.
- `npm test`: 183 testes aprovados.
- `npm run check`: 183 testes, 4 testes Story Studio e build aprovados.
- `npm run check:ui`: contratos e legado aprovados, 48 E2E UI e 1 teste axe
  aprovados.
- Playwright focal: 18 jornadas aprovadas em 3 repetições, incluindo preview,
  criação, duplicação, derivação, remoção, reload e descarte de Markdown.
- `git diff --check`: aprovado antes do commit.
