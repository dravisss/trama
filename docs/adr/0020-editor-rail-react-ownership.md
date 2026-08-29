# ADR 0020 — Migrar a rail do editor para o owner React

## Contexto

A rail de painéis já era renderizada por `EditorUtilityRail`, mas seus cliques
eram instalados pelo `workspaceDomBridge`. Além de duplicar a fronteira de
ownership, o estado visual do painel ativo era corrigido imperativamente após
cada clique.

## Decisão

`EditorUtilityRail` passa a emitir `onOpenPanel` e `onClose` pelo React. O
`activeDockPanel` já existente no `AppStore` alimenta `aria-pressed` e a classe
visual ativa, evitando que uma nova renderização React reverta a seleção.
`app.js` continua traduzindo a intenção para `openDockPanel`, mantendo por ora
a atualização compatível de conteúdo, título e classes do dock legado.

Os listeners de `data-dock-panel` e `#close-editor-dock` saem do
`workspaceDomBridge`. Não houve alteração de IDs, CSS, persistência, schema,
Presentation V2 ou export standalone.

## Validação

- `npm test`: 199 testes;
- `npm run qa:story`: 4 testes;
- `npm run build`: concluído;
- Playwright de navegação da rail: 1 teste em duas repetições;
- `git diff --check`: aprovado.

## Rollback

Reverter este commit restaura os listeners da rail no bridge e remove o canal
`editorDockActions`. Não há migração de dados.
