# ADR 0028 — Parar animações de câmera na troca de modo

## Contexto

`engine.fit()` usa animações Cytoscape. O scheduler da aplicação já cancelava
frames e timers pendentes, mas uma animação que havia começado continuava viva.
Ao trocar rapidamente de Editor para Explore, ela podia terminar depois da
câmera focada do loop e produzir um viewport visualmente incorreto ou flakey no
baseline.

## Decisão

`setWorkspaceMode()` para as animações Cytoscape ativas (`cy.stop(true)`) logo
após invalidar o scheduler e antes de instalar o novo modo. A câmera do modo
seguinte passa a ser a última intenção válida, sem alterar dados, layout
persistido ou o contrato Presentation V2.

## Verificação

- baseline `explore-desktop` passou após a troca de modo;
- a câmera focada continua publicada somente após o frame de pintura do
  Cytoscape;
- a suíte completa de UI e axe deve permanecer verde.
