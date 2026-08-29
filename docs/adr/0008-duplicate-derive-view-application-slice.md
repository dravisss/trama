# ADR 0008 — Duplicação e derivação de View/Style

Status: aceito em 21-07-2026

## Contexto

Depois de `CreateView`, os comandos `Duplicar` e `Derivar` ainda montavam
snapshots e chamavam diretamente o fluxo legado `promote-loop`/`POST
/api/views` dentro de `src/app.js`. Esse caminho podia promover um loop ou
alterar o contexto do mapa quando a intenção era apenas criar outra view no
mapa ativo.

## Decisão

- Criar os casos de uso `DuplicateView` e `DeriveView` no contexto View/Style.
- Ambos normalizam snapshots, dependem somente de `ViewRepository.create()` e
  produzem drafts sem id de cliente.
- `DuplicateView` clona settings e regras profundamente, atualiza o título e
  serializa o estilo sem reutilizar identidade.
- `DeriveView` mantém o mesmo `map_id`, grava apenas `settings.extends` com o
  id da view base e não copia regras.
- O composition root mantém o fallback offline local e reconcilia o record
  retornado, sem duplicar o mapa e sem alterar `SaveView`.
- O fluxo legado `promote-loop` é removido somente desses dois comandos; a
  remoção de view permanece na próxima fatia.

## Critérios de aceite

- Duplicação e derivação usam `POST /api/views` no mesmo mapa.
- A cópia possui regras independentes, id novo e `style_source` coerente.
- A derivação referencia a view base, tem regras vazias e resolve após reload.
- Falha e retry do repository continuam possíveis.
- Preview, dirty state, Presentation V2, câmera, standalone e schema SQLite
  permanecem inalterados.
- `npm test`, `npm run check`, `npm run check:ui`, axe, Playwright focal e
  `git diff --check` passam.

## Rollback

Restaurar `duplicateActiveView()` e `deriveActiveView()` para o wrapper
anterior, remover os dois casos de uso, os testes e o wiring no root. Não há
migração de dados nem alteração de schema para reverter.

## Dependências

- ADR 0005 — SaveView.
- ADR 0006 — CreateView.
- ADR 0007 — Captura determinística dos baselines responsivos.

## Validação

- `npm test`: 180 testes aprovados.
- `npm run check`: 180 testes, 4 testes Story Studio e build aprovados.
- `npm run check:ui`: contratos e legado aprovados, 47 E2E UI e 1 teste axe
  aprovados.
- Playwright focal de View/Style: 5 jornadas aprovadas, incluindo preview,
  criação, duplicação, derivação, reload e descarte de Markdown.
- `git diff --check`: aprovado antes do commit.
