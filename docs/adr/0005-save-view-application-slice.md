# ADR 0005 — Terceira fatia de aplicação do View/Style: SaveView

Status: aceito em 21-07-2026

## Contexto

O Style Builder já separa preview de persistência na interface, mas o fluxo
de salvar a view ativa ainda concentrava em `src/app.js` a listagem de views,
seleção do alvo e os requests HTTP. Isso misturava uma decisão de aplicação
com o composition root e não permitia testar erro/retry sem browser.

Esta fatia é limitada à persistência de uma view já selecionada. Criação,
duplicação, remoção, herança e regras de composição visual continuam fora do
escopo. Não há mudança de schema SQLite, Presentation V2, tokens ou export
standalone.

## Decisão

- Confirmar **View/Style** como o contexto desta fatia.
- Criar o caso de uso `SaveView`, que recebe um snapshot autorado de view e
  depende apenas da port `ViewRepository`.
- Criar `createApiViewRepository()` como adapter do contrato HTTP atual:
  listagem por mapa, atualização da view pelo id e criação apenas quando o
  snapshot não corresponde a uma view listada.
- Serializar atualizações por view no adapter; uma falha libera a fila para
  retry posterior.
- Manter preview no estado efêmero do app. O caso de uso só é chamado pelo
  comando explícito de salvar, nunca pelo seletor de preset.
- Deixar `src/app.js` responsável somente por compor o caso de uso e
  reconciliar o resultado no entry ativo.

## Dependências

- `src/application/view/saveView.js`
- `src/application/ports/viewRepository.js`
- `src/adapters/api/viewRepository.js`
- `src/app/workspacePersistence.js`
- API existente `/api/maps/:id/views`, `/api/views` e `/api/views/:id`

## Critérios de aceite

- `SaveView` não depende de React, DOM, Cytoscape, HTTP ou SQLite.
- Preview de Style Builder não chama a port nem gera escrita HTTP.
- Save envia somente o snapshot autorado da view e preserva o id selecionado.
- Erro do repository chega ao consumidor e uma nova tentativa pode avançar.
- Atualizações concorrentes da mesma view são serializadas.
- O reload restaura o conteúdo salvo na mesma view.
- `npm test`, `npm run check`, `npm run check:ui`, axe e `git diff --check`
  permanecem verdes.

## Validação desta fatia

- `npm test`: 175 testes aprovados.
- `npm run check`: 175 testes, 4 testes Story Studio e build aprovados.
- Preview de Style Builder: jornada específica passou sem writes não-GET na
  API.
- Save/reload: a jornada flagship passou com persistência da view selecionada.
- `npm run check:ui`: 44 E2E aprovados em 5.8 minutos; `test:a11y`: 1
  aprovado sem violações critical/serious.
- `git diff --check`: aprovado.

## Rollback

Remover o wiring de `createSaveView()` em `src/app.js`, restaurar o corpo
anterior de `persistActiveView()` e excluir os módulos/testes deste ADR. O
schema e os registros existentes não precisam de migração ou restauração.

## Próxima decisão

Não ampliar `SaveView` automaticamente para criação, duplicação, remoção ou
herança. Qualquer uma dessas operações exige contrato e caracterização
próprios.
