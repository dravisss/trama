# Estendendo a Trama

## Adicionar um novo diagrama

Crie um modelo seguindo o contrato:

```js
const model = {
  id: "supply-chain",
  title: "Supply Chain",
  nodes: [
    { id: "demand", label: "Demanda" },
    { id: "inventory", label: "Estoque" }
  ],
  edges: [
    {
      id: "demand-inventory",
      source: "demand",
      target: "inventory",
      sourceSign: "+",
      targetSign: "−",
      description: "Mais demanda reduz o estoque disponível."
    }
  ],
  loops: [{
    id: "B1",
    title: "Reposição de estoque",
    edgeIds: ["demand-inventory", "inventory-supply", "supply-demand"]
  }]
};
```

Para exibir na demo, adicione-o a `src/models/examples.js`.

Loops editoriais devem usar IDs estáveis. Use `discoverLoops()` como apoio para encontrar
candidatos, mas salve no modelo apenas os ciclos que ajudam a explicar o sistema.

## Criar e editar pela demo

A demo também aceita diagramas fora de `src/models/examples.js`:

- `Projeto > Novo projeto` cria um SQLite local em `data/` com um primeiro loop vazio;
- o Project Switcher lista projetos locais e recentes, com abertura por caminho `.db` como opção avançada;
- `Loop > Novo loop` cria um modelo vazio válido no projeto SQLite aberto;
- duplo clique no canvas adiciona nós;
- `Conectar` cria arestas a partir do nó selecionado;
- o popover de seleção edita rótulos, polaridades e descrições;
- `Loop > Importar JSON` valida o modelo antes de abrir;
- `Loop > Exportar JSON` baixa o loop ativo com posições, rotas e story;
- `Loop > Exportar HTML` gera um viewer standalone do loop ativo com sidebar e story mode;
- `Projeto > Exportar projeto HTML` gera um viewer standalone com seletor para todos os loops do projeto;
- a sidebar esquerda usa um seletor compacto para alternar loops e mostra descrição Markdown quando nada está selecionado;
- `Apresentar` executa exclusivamente a `Presentation` V2 persistida no projeto. O antigo `model.story` só é aceito pela ferramenta de migração histórica e nunca deve ser escrito por novas integrações. Se não houver apresentação, a interface pode oferecer um rascunho por relações.

Esse fluxo salva no SQLite local servido por Node. Para transformar um loop editado em exemplo
versionado, exporte o JSON e converta o modelo para `src/models/examples.js`.

## Criar um tema

O tema mínimo precisa fornecer:

```js
export const theme = {
  colors: {
    primary: "#000",
    secondary: "#777",
    tertiary: "#0a0",
    neutral: "#eee",
    surface: "#fff",
    line: "#ddd"
  },
  nodePalette: [
    ["#333", "#fafafa"]
  ],
  nodeSize: 90,
  fontFamily: "system-ui",
  annotationFontFamily: "system-ui"
};
```

Passe-o em `createCLD({ theme })`.

## Ajustar densidade

```js
createCLD({
  container,
  model,
  densityProfile: {
    idealEdgeLength: 280,
    nodeRepulsion: 120000,
    routingPasses: 8,
    minimumSignSize: 6,
    hideCollisions: true
  }
});
```

Evite criar regras como `if (nodes.length === 14)`. Prefira métricas contínuas ou novos perfis generalizáveis.

## Alterar o roteamento

Ao modificar pesos:

1. mantenha as funções geométricas puras;
2. rode `npm test`;
3. rode `npm run build`;
4. teste os três exemplos;
5. confira console;
6. teste zoom, seleção, reorganização e arraste;
7. compare com `reference.html`.

## Adicionar nova estratégia

Estratégias futuras podem implementar uma interface semelhante:

```js
function optimizeRoutes(cy, profile) {
  return {
    crossings: 0,
    diverted: 0,
    distances: new Map()
  };
}
```

O `CLDEngine` deveria receber a estratégia como dependência antes que outra implementação seja adicionada diretamente.

## Testes

Testes puros ficam em `tests/`.

Boas fixtures incluem:

- curva horizontal;
- curva vertical;
- curva fortemente arqueada;
- dois sinais na mesma aresta;
- duas arestas disputando uma porta;
- aresta tangenciando nó;
- zoom baixo e zoom alto;
- sinais ocultados e revelados por foco.

## Critérios de aceite visual

- os dois sinais de uma aresta ficam no mesmo lado;
- nenhum sinal é deslocado para o meio do grafo;
- sinais acompanham zoom;
- arestas não atravessam nós;
- polaridades continuam associáveis às pontas;
- trocar modelos não deixa canvas ou SVG antigos;
- nenhuma configuração gera warning do Cytoscape.
### Anexar imagem a uma variável

Use `node.media` somente com um asset local já importado:

```js
engine.updateNode("BLD", {
  media: {
    assetId: "sobrecarga-filas-bld",
    altText: "Caixa de entrada transbordando com demandas acumuladas",
    size: 112,
    labelGap: 14,
    labelPlacement: "below",
    fit: "cover",
    focalPoint: { x: 0.5, y: 0.5 }
  }
});
```

Ao criar o engine, injete `assetResolver(assetId)` para retornar uma URL local ou data URL. Nunca coloque bytes no modelo. Para o workflow completo e a validação do lote, use `.agents/skills/node-images-for-trama/`.

### Curvatura editorial em composições espaçadas

Uma composição autoral com espaço reservado para textos pode passar
`densityProfile: { routingCurvatureRange: [0.28, 0.32] }` ao motor. Os valores
são a distância do controle dividida pelo comprimento da relação, entre
0.085 e 0.55, em ordem crescente. O roteador compara três curvaturas nos dois
lados e continua decidindo por colisões, cruzamentos e continuidade do loop.
Sem essa opção, a busca automática mantém seus candidatos habituais. Use o
intervalo somente após conferir os corredores entre imagens e rótulos; ele
não garante que um layout apertado tenha uma solução sem colisões.
