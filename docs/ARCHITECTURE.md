# Arquitetura do LoopViewer

## Princípios

O LoopViewer segue quatro separações:

1. dados de domínio não conhecem Cytoscape;
2. geometria não conhece DOM;
3. roteamento não renderiza;
4. o motor coordena módulos, mas não contém as decisões matemáticas.

## Fluxo

```text
Modelo bruto
   ↓
validateModel / normalizeModel
   ↓
resolveDensityProfile
   ↓
Cytoscape + cose-bilkent
   ↓
optimizeRoutes
   ↓
AnnotationRenderer
   ↓
Interações e zoom semântico
```

## Módulos

### `src/core/model.js`

Responsável pelo contrato de entrada.

Também concentra mutações puras do modelo usadas por editores:

- criação de modelo vazio;
- adição, edição e remoção de nós;
- adição, edição e remoção de arestas;
- geração de IDs estáveis;
- poda de loops e passos de apresentação quando referências deixam de existir.

Não deve:

- acessar DOM;
- acessar Cytoscape;
- definir estilos;
- calcular geometria.

### `src/core/density.js`

Transforma características do modelo em parâmetros operacionais.

Overrides devem ser fornecidos através de `densityProfile`, evitando condicionais específicas para exemplos.

### `src/geometry/index.js`

Contém funções puras:

- avaliação Bézier;
- amostragem;
- distância ponto-segmento;
- interseção e proximidade entre curvas;
- comprimento de arco;
- normal alinhada;
- colisão entre retângulos.

Essas funções devem permanecer determinísticas e testáveis em Node.js.

### `src/routing/optimizer.js`

Recebe uma instância Cytoscape já posicionada.

Produz:

- distância do ponto de controle para cada aresta;
- número estimado de cruzamentos;
- quantidade de curvas fortemente desviadas.

O otimizador não cria elementos SVG.

### `src/annotations/renderer.js`

Usa geometria final renderizada pelo Cytoscape para posicionar polaridades.

Responsabilidades:

- calcular tamanho semântico;
- escolher e persistir o lado da aresta;
- ancorar sinais às pontas;
- ocultar colisões inevitáveis;
- revelar detalhes por foco.

### `src/rendering/cytoscape.js`

Converte o modelo normalizado em elementos e estilos Cytoscape.

Não deve conter dados específicos dos exemplos.

### `src/CLDEngine.js`

API pública e ciclo de vida:

- montagem;
- troca de modelo;
- layout;
- roteamento;
- interação;
- mutações estruturais delegadas a `src/core/model.js`;
- destruição.

## Estado

Estado persistente do domínio:

```text
model
profile
loops curados
posições e locks opcionais
```

Estado do renderer:

```text
cy positions
curveDistance
annotationSide
zoom / pan
classes de foco
```

`annotationSide` é armazenado na aresta e invalidado quando `optimizeRoutes()` altera a geometria.

## Loops como domínio

`src/core/loops.js` concentra operações puras relacionadas a ciclos:

- polaridade de uma relação;
- classificação de um loop como reforço ou equilíbrio;
- descoberta determinística de ciclos simples;
- remoção de ciclos equivalentes por rotação.

Loops descobertos não são inseridos automaticamente no modelo. A separação entre descoberta e
curadoria evita transformar grafos densos em listas editoriais pouco úteis.

Para o layout, `src/geometry/loopTopology.js` deriva uma topologia editorial sem alterar o modelo:
quando existem loops curados, eles são a fonte de verdade; quando o modelo é novo e só contém
relações, ciclos simples são descobertos como fallback. A topologia registra membros de cada ciclo,
hubs, arestas de ligação e arestas compartilhadas. `src/geometry/loopSeed.js` usa essa informação
para criar uma semente determinística em anéis suaves antes do CoSE/fCoSE. Isso dá ao algoritmo uma
noção inicial de ciclos e espaço negativo para qualquer modelo, sem transformar os anéis em uma
restrição rígida e sem deslocar nós travados ou posições já editadas.

## Layout persistente

Se todos os nós possuem `position`, o carregamento inicial usa o layout `preset`. Sem posições
completas, o fluxo continua usando `cose-bilkent`.

`getModel({ includePositions: true, includeRoutes: true })` captura as posições, locks e rotas
correntes em um modelo serializável. O modo de edição consome essa API antes de cada mutação
estrutural para preservar a composição editorial.

Rotas manuais usam `edge.route.controlPointDistance` e `edge.route.locked`. O otimizador inclui
rotas travadas na análise de colisões, mas não substitui sua curvatura.

## Apresentação e exportação

`src/presentation/` define a apresentação independente da UI: `PresentationController`, compilador,
redutor, câmera e exportação compartilham o mesmo contrato entre a demo e o runtime standalone.
O antigo controlador linear de `model.story` foi removido do runtime; importações históricas passam
exclusivamente por `src/presentation/migration.js`.

A demo mantém sua própria camada de workspace e apresentação: o servidor Node local cria ou abre
um projeto SQLite, cada loop salvo é um CLD JSON completo, e a sidebar usa um seletor compacto
para escolher o loop ativo enquanto o restante do painel lê o loop, nó, relação ou story step
selecionado. Modo foco, menus, markdown da sidebar e tooltip narrativa são decisões de interface,
não do motor. O core continua expondo apenas modelo, foco e eventos; a posição visual da tooltip
é calculada pela demo a partir do Cytoscape renderizado.

`src/export/standalone.js` compõe um HTML único. `src/standalone.js` é empacotado com Cytoscape,
`cose-bilkent` e o motor, permitindo abrir ou hospedar o resultado sem o projeto em execução.
O payload standalone aceita um loop individual ou uma lista de loops do projeto; o runtime
renderiza sidebar, descrição Markdown, seletor de loops e story mode sem depender do servidor.

## Projeto SQLite

`server.mjs` serve a aplicação e expõe uma API REST local. `src/platform/projectStore.js` concentra
o schema e o CRUD SQLite:

- `projects`: metadata do projeto aberto;
- `loops`: título, descrição Markdown e `model_json` completo;
- `loop_versions`: snapshots simples antes de alterações persistidas.

O servidor também lista projetos locais em `data/*.db` para o Project Switcher. Essa listagem é
infraestrutura da demo; o motor continua recebendo apenas o CLD JSON ativo.

O schema evoluído mantém `loops` como camada de compatibilidade e acrescenta:

- `maps`, que guardam o grafo semântico e podem apontar para um loop legado;
- `views`, que guardam settings, regras compiladas e o fonte `.loop.css` sem duplicar o mapa;
- `presentations`, para roteiros independentes no nível do projeto e vinculados aos mapas;
- `assets`, para imagens e mídia binária locais.

A aplicação promove um loop legado para mapa quando sua primeira view é salva. A promoção é
idempotente e não remove nem reescreve o registro original. O export standalone inclui a view ativa,
cenas e assets referenciados como data URLs, portanto continua funcionando sem servidor.

## Autoria textual e views

`src/language/loopMarkdown.js` compila e serializa a fonte semântica `.loop.md`.
`src/language/styleLanguage.js` faz o mesmo para a linguagem visual `.loop.css`.
`src/rendering/view.js` aplica as regras compiladas como overrides do stylesheet Matcha; decorações
diretas do elemento têm precedência sobre a view.

O editor oferece os mesmos dados por canvas, Inspector, tabela e código. Edições de propriedades
comuns são incrementais; mudanças estruturais incompatíveis continuam usando o caminho seguro de
reconstrução. Durante drag, o canvas atualiza a curva interativamente e roda o otimizador final apenas
ao soltar o nó.

O roteador expõe três orçamentos sem alterar sua função de custo: `draft`, `balanced` e `publish`.
`getState().metrics` registra duração de troca de modelo e as últimas 30 execuções de rota, incluindo
qualidade e número de arestas.

Budgets de produto para o hardware-alvo local:

- drag não executa otimização completa durante pointer move;
- edição incremental de rótulo/metadado: até 50 ms;
- troca de view: até 100 ms em mapas de 100 elementos;
- rota `draft`: p95 até 100 ms em mapas de 25 arestas;
- rota `balanced`: p95 até 350 ms em mapas de 25 arestas;
- rota `publish`: até 1.500 ms em mapas de 25 arestas;
- geração do standalone: até 2 s em projetos de 100 elementos sem mídia pesada.

Esses valores são budgets e devem ser avaliados com as métricas do motor em fixtures representativas,
não usados para enfraquecer a qualidade canônica do modo `balanced`.

Essa camada não deve entrar em `src/core/`, porque persistência de projeto não faz parte do motor
reutilizável `CLD.createCLD()`.

## Função de custo do roteamento

A função atual considera:

- colisão com nós;
- cruzamento de arestas;
- proximidade entre curvas;
- separação angular de portas;
- magnitude da curvatura;
- distância da preferência orientada pelo centróide local.

Os pesos são heurísticos. Mudanças devem ser avaliadas nos três exemplos e em fixtures adicionais.

## Por que SVG para os sinais

O renderer nativo de labels do Cytoscape não oferece controle suficiente para:

- posicionamento por comprimento de arco real;
- tamanho semântico;
- persistência de lado;
- ocultação individual;
- inspeção e testes por atributo.

O SVG acompanha as coordenadas renderizadas do Cytoscape e permanece separado do canvas.

## Build

`build.mjs` gera:

- `dist/cld-engine.iife.js`: API global `CLD`;
- `dist/app.iife.js`: aplicação local-first.

O código-fonte permanece ESM.

## Compatibilidade

O motor depende de:

- Cytoscape.js `3.30.4`;
- layout-base;
- cose-base;
- cytoscape-cose-bilkent `4.1.0`.

Alterações de versão exigem nova validação visual e de console.
## Imagens opcionais nos nós

Um nó pode declarar `media` com um `assetId` local e metadados de crop/label. O core valida e normaliza esse contrato, o renderer resolve o asset através de uma função injetada, e `src/platform/projectStore.js` mantém os bytes e metadados fora do modelo. O envelope usado por roteamento e qualidade inclui a imagem circular, o label abaixo e o gap; isso mantém arestas e polaridades semanticamente separados.

O export standalone coleta referências de mídia dos modelos, incorpora os assets como data URLs e bloqueia referências ausentes. Geração de imagem é responsabilidade de agentes/workflows, não do runtime do editor.
