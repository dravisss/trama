# ADR 0021 — Migrar ações do cabeçalho do dock para o owner React

## Contexto

Os botões `Renomear` e `Descrição` do painel “Mapa e descrição” eram
renderizados por `EditorDockPanels`, mas ligados pelo `workspaceDomBridge`.
Isso mantinha uma segunda fonte de ownership para ações que já pertencem à
árvore React.

## Decisão

Os botões emitem `onRename` e `onEditDescription` pelo contrato
`editorDockActions`. `app.js` continua sendo o composition root e traduz as
intenções para os fluxos existentes de `commandDialog` e modal de descrição.
Os listeners correspondentes e os refs obsoletos saem do bridge; IDs, foco,
persistência, schema e Presentation V2 permanecem inalterados.

## Validação

- `npm test`: 199 testes;
- `npm run qa:story`: 4 testes;
- `npm run build`: concluído;
- Playwright valida renomeação e abertura/cancelamento da descrição pelo owner
  React, além da navegação existente da rail;
- `git diff --check`: aprovado.

## Rollback

Reverter este commit restaura os dois listeners do bridge e remove as ações de
mapa de `editorDockActions`. Não há migração de dados.
