# ADR 0027 — Retirar listeners legados de navegação e projeto

## Contexto

O shell atual renderiza a navegação de modos e o menu superior com React, mas o
bridge ainda registrava listeners em seletores da navegação antiga e no botão de
edição de projeto. Esses seletores não aparecem mais no DOM ativo. O diálogo
nativo já possui seu próprio ciclo de fechamento e restauração de foco.

## Decisão

Remover os listeners e referências órfãs de `[data-ui-mode]` e do clique de
`#edit-project-metadata`. O botão React dispara o mesmo comando por
`onAction`, passando o próprio elemento como fallback de foco. O listener
`close` duplicado do bridge também é removido; a responsabilidade fica no
`createCommandDialogController`, que já restaura o foco após o fechamento nativo.

## Verificação

- busca estática confirmou que a navegação ativa usa `data-react-ui-mode`;
- QA estrutural impede o retorno dos listeners legados;
- o fluxo de edição de projeto preserva o foco pelo controller do diálogo;
- smoke de shell e os gates completos permanecem obrigatórios.
