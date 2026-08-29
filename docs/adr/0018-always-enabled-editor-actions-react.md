# ADR 0018 — Migrar somente ações sempre habilitadas da barra de edição

## Contexto

Parte da barra de edição é renderizada por `CanvasSurface`, mas alguns botões
(`Conectar`, `Fixar`, `Liberar`, alinhamento, duplicação e estilos) têm
`disabled` controlado imperativamente por `updateEditToolbar`. React mantém o
estado `disabled` em seu contrato virtual; apenas habilitar a propriedade no
DOM não torna esse elemento um owner React seguro.

## Decisão

Criar o contrato `editorActions` e migrar somente os controles sem estado
`disabled` dinâmico: adicionar variável, salvar/restaurar/resetar layout e
qualidade de rota. Os controles com disponibilidade imperativa permanecem no
`workspaceDomBridge` até que seu estado de disponibilidade também tenha um
owner observável.

Essa decisão deixa explícita uma fronteira parcial e evita que um botão
visualmente habilitado deixe de receber eventos por causa do contrato React.
Não houve alteração de IDs, CSS, persistência, schema ou comportamento de
Cytoscape.

## Validação

- `npm test`: 199 testes;
- `npm run build`: concluído;
- Playwright de lifecycle, conexão e rota: 8/8 em duas repetições;
- busca estática confirma os listeners dinâmicos preservados e os cinco
  comandos sempre habilitados removidos do bridge;
- `git diff --check`: aprovado.

## Próximo passo

Extrair o estado de disponibilidade da barra de edição para um snapshot
observável antes de migrar os sete controles restantes.

## Rollback

Reverter este commit restaura os listeners dos comandos sempre habilitados e
remove o contrato `editorActions`. Não há migração de dados.
