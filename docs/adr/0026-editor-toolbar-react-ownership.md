# ADR 0026 — Toolbar dinâmico do editor sob posse do React

## Contexto

Os controles do toolbar de edição eram renderizados por React, mas o
`workspaceDomBridge` ainda instalava os cliques e `updateEditToolbar()` mutava
diretamente `disabled`, texto e estado de atenção. Isso criava duas fontes de
verdade e podia perder o estado quando a composição React fosse atualizada.

## Decisão

Publicar um snapshot `editorToolbar` no `AppStore` e entregar as ações dos
controles por `editorActions`. React passa a controlar visibilidade, rótulos,
estado desabilitado e callbacks de conectar, fixar/liberar rota, salvar,
restaurar, duplicar, alinhar e copiar/colar estilo.

O bridge mantém somente as interações imperativas do canvas — handles de rota e
conexão, formulário de edição, eventos globais e atalhos — porque elas dependem
do estado transitório do Cytoscape e de pointer capture. A posição dos handles,
classes de conexão e popover continuam fora do snapshot.

## Verificação

- contrato estrutural impede o retorno dos listeners dos controles migrados;
- o estado `editorToolbar` preserva os disabled/labels derivados da seleção;
- Playwright estrutural, mobile e ciclo de reload devem validar conexão,
  desbloqueio de rota, layout e ações de seleção;
- o schema, Presentation V2, persistência e exportação não são alterados.
