# ADR 0015 — Transferir as ações do seletor de mapas para React

## Contexto

`CanvasSurface` já renderizava o seletor de mapas, mas `workspaceDomBridge` ainda
instalava listeners imperativos para o filtro, a troca de mapa e os botões de
criação, duplicação e remoção. `src/app.js` também mantinha uma segunda função
imperativa que reconstruía `#scenario-tabs`, criando duas possíveis fontes de
verdade para o mesmo DOM.

## Decisão

O contrato `mapSelector` publicado no `AppStore` passa a carregar os itens e as
ações do seletor:

- `onFilter` atualiza a consulta e recompõe os itens;
- `onSelect` fecha o menu e troca o mapa no próximo frame;
- `onCreate`, `onDuplicate` e `onDelete` delegam aos comandos existentes.

`CanvasSurface` continua dono dos mesmos IDs e da mesma marcação visual. O
`workspaceDomBridge` deixa de ouvir esses quatro pontos, e a função imperativa
duplicada de renderização de tabs é removida. Nenhum contrato público, dado
persistido, endpoint, CSS, mount point ou regra de layout foi alterado.

## Evidência de uso-zero no bridge

Após a migração, a busca estática não encontra `elements.tabs`,
`elements.loopFilter`, `elements.sidebarNewLoop`, `elements.sidebarDuplicateLoop`,
`elements.sidebarDeleteLoop` nem `filterLoops` no bridge. Os IDs continuam
renderizados pelo owner React e cobertos pelo fluxo browser.

## Validação

- `node --test tests/*.test.mjs tests/design-system/*.test.mjs`: 199 testes;
- `npm run build`: concluído;
- `e2e/ui/editor-canvas-lifecycle.spec.mjs --repeat-each=3`: 6/6;
- o fluxo de troca de mapa preservou o mesmo `#cld-root` conectado;
- o filtro reduziu o seletor a um mapa e a limpeza restaurou o mapa Flagship.

## Rollback

Reverter este commit restaura os listeners do bridge e a função imperativa de
tabs. A mudança é isolada e não exige migração de dados.
