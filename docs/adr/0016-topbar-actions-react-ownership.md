# ADR 0016 — Transferir as ações do topbar para React

## Contexto

Os botões `present-toggle`, `focus-toggle`, `edit-toggle` e `fit` já eram
renderizados por `ReactShell`, mas seus cliques ainda eram ligados pelo
`workspaceDomBridge`. O mount React já expunha `onAction`, porém o canal não
estava conectado a esses quatro comandos.

## Decisão

`ReactShell` publica intenções semânticas (`present`, `focus`, `edit` e `fit`)
por `onAction`. O composition root traduz essas intenções para os comandos
existentes de apresentação, foco, edição e câmera. O bridge deixa de registrar
listeners nesses quatro elementos.

As mutações visuais imperativas que ainda atualizam classes, texto, `hidden` e
`aria-pressed` permanecem no app durante esta fatia; não houve redesign,
alteração de IDs, mudança de estado persistido ou remoção de contrato público.

## Validação

- `npm run build`: concluído;
- `e2e/ui/shell-interactions.spec.mjs -g "ações do topbar" --repeat-each=3`:
  3/3;
- o fluxo browser confirmou entrada/saída de edição e entrada/saída de foco;
- a busca no bundle não encontra listeners do bridge para os quatro botões;
- `git diff --check`: aprovado antes do commit.

## Rollback

Reverter este commit restaura os listeners do bridge e remove os callbacks do
`ReactShell`. Nenhuma migração de dados é necessária.
