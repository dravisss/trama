# ADR 0019 — Migrar comandos do shell para o owner React

## Contexto

Os comandos do shell principal ainda eram ligados por listeners no
`workspaceDomBridge`, embora os respectivos botões fossem renderizados por
`ReactShell`. Isso mantinha a intenção de ação dividida entre a árvore React e
o adaptador DOM.

## Decisão

`ReactShell` passa a emitir ações semânticas para os comandos de projeto, mapa,
exportação, reorganização, sidebar e saída do Story Studio. O `app.js` continua
sendo o composition root que traduz essas ações para os casos de uso existentes.

O bridge conserva apenas fronteiras que ainda dependem de DOM imperativo ou de
eventos nativos: `change` dos inputs de arquivo, edição de metadados (que
controla o foco de retorno do `commandDialog`), listas delegadas de projetos,
editor dock e controles com disponibilidade dinâmica. Não houve alteração de
IDs, CSS, persistência, schema, Presentation V2 ou export standalone.

## Validação

- `npm test`: 199 testes;
- `npm run build`: concluído;
- Playwright valida a abertura do diálogo `Novo mapa` pelo canal React e os
  fluxos existentes de shell/topbar;
- `git diff --check`: aprovado.

## Rollback

Reverter este commit restaura os listeners dos comandos no
`workspaceDomBridge` e remove as ações semânticas correspondentes de
`ReactShell`. Não há migração de dados.
