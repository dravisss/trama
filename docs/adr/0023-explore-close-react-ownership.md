# ADR 0023 — Migrar o fechamento do painel Explore para o owner React

## Contexto

O botão `#explore-detail-close` já fazia parte do componente React de detalhes
do Explore, mas seu clique ainda era instalado pelo `workspaceDomBridge`.

## Decisão

`ExploreDetailPanel` recebe `exploreActions.onClose` e emite o intent pelo
React. `app.js` continua aplicando a transição visual, o `fit` do canvas e a
restauração de foco. O listener e o ref obsoleto saem do bridge; o controller
imperativo de exploração permanece intacto.

Não houve alteração de IDs, CSS, persistência, schema, Presentation V2 ou
export standalone.

## Validação

- `npm test`: 199 testes;
- `npm run qa:story`: 4 testes;
- `npm run build`: concluído;
- Playwright do fluxo Explore: valida abertura, fechamento e foco de retorno.

## Rollback

Reverter este commit restaura o listener do bridge e remove o contrato
`exploreActions`. Não há migração de dados.
