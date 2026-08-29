# ADR 0029 — Present mobile mantém chrome imersivo

## Contexto

O baseline de `Present` em 390×844 mostrava o rail React de modos sobre o
canvas. Como o modo usa a classe legada `story-mode`, a regra mobile genérica
do shell reexibia o rail que o desktop já ocultava. O item ativo `Apresentar`
expandia verticalmente pela altura disponível, encobrindo o mapa e os controles
da apresentação.

## Decisão

No Present mobile, o rail de modos permanece oculto e o palco ocupa a segunda
linha inteira do shell. O botão explícito `Fechar` continua sendo o caminho de
retorno ao Editor; não há alteração de navegação semântica, estado da
apresentação, câmera, dados ou persistência.

## Verificação

- baseline focal `present baseline at mobile`: passou 2/2;
- contrato estrutural confirma rail oculto e `#presentation-close` visível;
- snapshot atualizado somente para `present-mobile` após inspeção visual;
- baseline completo das cinco superfícies: passou 15/15;

## Rollback

Reverter o commit desta fatia restaura a regra mobile anterior e o snapshot
correspondente, sem migração de dados ou impacto no schema SQLite.
