# ADR 0002 — Composição React por snapshots do AppStore

Status: aceito para R8

## Contexto

O shell imperativo ainda precisa atualizar regiões que possuem IDs públicos e
bridges históricos. Remover esses adapters de uma vez aumentaria o risco de
quebrar autosave, Cytoscape, Story Studio e foco. Ao mesmo tempo, manter estado
privado em `mountReactApp()` recriaria a fragmentação que R8 deveria remover.

## Decisão

- `createRoot()` é criado uma única vez em `src/react/main.jsx`.
- `AppStore` mantém o snapshot de navegação, shell e composição dos painéis.
- Os métodos `renderX()` continuam como uma API de compatibilidade temporária;
  cada um publica uma atualização no snapshot observável e não mantém estado
  privado da superfície.
- Os hosts portaled permanecem estáveis para que bridges imperativos possam ser
  aposentados em uma mudança posterior, com busca de uso-zero e E2E específico.
- `CanvasSurface` monta o host estrutural uma vez; Cytoscape e seus descendentes
  mutáveis continuam fora do estado React até existir um adapter observável do
  engine.
- O único `flushSync()` permitido é a barreira de bootstrap documentada, usada
  antes de `app.js` instalar bridges que dependem dos IDs públicos.

## Consequências

A troca de modo e as atualizações de painéis têm uma fonte observável comum, o
que permite detectar churn, renders e vazamentos sem acoplar o domínio ao React.
A contrapartida é a existência temporária dos métodos de compatibilidade; eles
devem ser removidos apenas quando os consumidores do `app.js` forem migrados
para comandos/props e o manifest não tiver mais esses IDs como dependências.

## Rollback

Reverter o adapter de composição restaura a implementação anterior sem tocar
SQLite, Presentation V2, Style Packs ou dados de mapa. Tokens, primitives e
baselines permanecem independentes desse rollback.
