# Plano de QA — imagens nos nós

## Gates automáticos

- `npm test` e `npm run check` verdes.
- Cada `node.media.assetId` resolve para um asset local.
- Cada imagem importada tem tipo permitido, bytes não vazios, SHA-256 e `altText`.
- `nodeMediaEnvelope()` inclui imagem, label, gap e respiro; a qualidade de layout não aceita colisão de envelope.
- Export standalone incorpora todos os assets referenciados; referência faltante bloqueia o export.

## QA visual no navegador

1. Abrir o mapa de Sobrecarga de Filas com imagens em 112 px.
2. Verificar crop circular, borda, label abaixo sem placa branca e respiro suficiente.
3. Inspecionar um nó no topo, no centro, em uma curva e próximo a múltiplas arestas.
4. Confirmar que arestas começam/terminam fora da imagem ou label; sinais `+`/`−` continuam junto ao início/fim da aresta.
5. Alternar a vista `node-media` e confirmar que o mapa sem imagens continua legível.
6. Selecionar nó, trocar/remover imagem e recarregar; a referência deve persistir no SQLite.
7. Exportar HTML, abrir sem rede e confirmar imagem, alt text de cenas e integridade.

## Falhas que bloqueiam release

Imagem ausente silenciosa, label sobreposto por aresta, polaridade deslocada, crop que esconde o sujeito, foco que não persiste, export que depende de `/api/assets`, console error, regressão de mapa sem mídia ou layout que troca uma colisão por uma curva extrema.
