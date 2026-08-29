# LoopViewer Style Library — Spec-Driven Development

## Objetivo

Transformar o sistema de views do LoopViewer em uma biblioteca visual editorial para mapas causais usados em apresentações corporativas, relatórios e exports standalone.

O sistema deve separar:

```text
modelo causal → view salva → estado de interação → perfil de publicação → export
```

Uma troca de estilo deve ser visível imediatamente no canvas. Persistência é uma operação separada: o autor pode experimentar sem salvar e confirmar a view quando quiser.

## Invariantes

- A polaridade permanece semanticamente ancorada no início/fim da relação.
- Uma regra visual não pode apagar a distinção causal entre relações positivas e negativas.
- Nenhuma aresta, seta ou polaridade pode atravessar imagem ou label de nó.
- Labels de nós com imagem permanecem abaixo da imagem, sem placa branca.
- O envelope imagem + label participa do roteamento.
- Nós sem imagem continuam funcionando com a apresentação original.
- View, editor, standalone e export usam a mesma resolução visual.
- Estilo paint-only não dispara relayout; estilo geométrico invalida apenas o que precisa ser recalculado.
- Preview nunca chama API de persistência.
- O mapa não é duplicado quando uma view é criada, duplicada ou derivada.

## Stories e critérios de aceite

### S01 — Experimentar um preset sem salvar

Como autor de uma apresentação, quero selecionar um estilo visual e vê-lo imediatamente no canvas para comparar direções editoriais antes de persistir.

Critérios:

- [ ] O painel de estilo lista os presets disponíveis com nome e intenção.
- [ ] Selecionar um preset atualiza cor, peso, traço, seta, labels e canvas no mesmo ciclo de interação.
- [ ] O status informa `Prévia aplicada` sem indicar que houve salvamento.
- [ ] Recarregar antes de salvar restaura a view persistida anterior.
- [ ] O preview não cria uma nova view no SQLite.

TDD:

- teste unitário de materialização de preset;
- teste de integração de `setView()` sem chamada de persistência;
- QA de navegador: selecionar dois presets e comparar screenshot/DOM.

### S02 — Salvar uma view editorial

Como autor, quero salvar uma combinação visual como uma view do mapa sem duplicar o mapa causal.

Critérios:

- [ ] A view salva mantém `stylePackId`, versão e fonte `.loop.css`.
- [ ] O mapa mantém o mesmo id e o mesmo modelo causal.
- [ ] Reabrir o projeto restaura a view selecionada.
- [ ] Duplicar uma view duplica regras e metadados, não nós nem arestas.
- [ ] Derivar uma view mantém a cadeia de herança validável.

TDD:

- testes de ProjectStore;
- teste de round-trip de export/import;
- QA de reload no navegador.

### S03 — Preservar semântica causal ao estilizar

Como leitor, quero distinguir relações positivas e negativas em qualquer preset.

Critérios:

- [ ] Relações negativas permanecem distinguíveis por traço, forma ou combinação redundante.
- [ ] Uma regra genérica `relation { ... }` não substitui silenciosamente a regra semântica específica.
- [ ] Setas continuam indicando apenas direção.
- [ ] Polaridades continuam visíveis e próximas aos terminais.
- [ ] Legenda reflete a view atual.

TDD:

- teste de cascata semântica;
- teste de validação de regras perigosas;
- QA visual com pelo menos uma relação de cada sinal.

### S04 — Ler loops como unidades editoriais

Como executivo, quero identificar R/B, nome e trajetória de cada loop sem seguir todas as setas primeiro.

Critérios:

- [ ] Loops curados podem exibir badge e nome curto.
- [ ] Badges de loop ficam desligados por padrão; quando ativados, são uma camada experimental e não substituem a lista/legenda editorial.
- [ ] Badge não cobre nó, label, seta ou polaridade.
- [ ] Focar um loop aumenta a presença de suas relações e reduz o ruído contextual.
- [ ] Limpar o foco restaura a composição original.
- [ ] O badge é transportado ao standalone.

TDD:

- teste de posicionamento de badge;
- teste de foco por loop;
- screenshot de mapa com dois loops sobrepostos.

### S05 — Usar setas editoriais

Como designer, quero escolher uma família de terminais coerente com o estilo sem alterar o significado causal.

Critérios:

- [ ] Presets podem escolher seta, preenchimento, escala e peso.
- [ ] Seta nativa tem fallback seguro.
- [ ] Mudar seta é aplicado instantaneamente.
- [ ] Seta e polaridade permanecem fora do envelope do nó.
- [ ] O export mantém o mesmo terminal.

TDD:

- teste de propriedades compiladas;
- teste de clearance terminal;
- QA com quatro famílias de seta.

### S06 — Publicar uma peça editorial

Como apresentador, quero exportar um mapa em uma composição pronta para uma apresentação corporativa.

Critérios:

- [ ] Perfil 16:9 define safe area, título, subtítulo e legenda.
- [ ] Perfil standalone preserva view, assets e interação offline.
- [ ] Perfil de export não altera o modelo ou as posições persistidas.
- [ ] Editor e standalone usam o mesmo resolved style.
- [ ] O usuário pode ativar reduced motion.

TDD:

- teste de payload standalone;
- screenshot de 16:9;
- QA em viewport desktop e narrow.

## Contrato de Style Pack

```js
{
  id: "matcha-executive",
  version: 1,
  title: "Matcha Executive",
  intent: "Mapa ilustrado para narrativa estratégica",
  capabilities: ["edge-arrow-width", "loop-badges"],
  tokens: {
    color: { canvas: "#f7f3e7", text: "#2b3a2e" },
    relation: { primaryWidth: 2.2, secondaryWidth: 1.7 }
  },
  view: {
    settings: {},
    rules: []
  }
}
```

## Classes de impacto

- `paint`: cor, opacidade, traço, fonte e seta sem mudança de envelope.
- `annotation`: tamanho e posição de polaridades, badges e labels.
- `route`: gaps, outline, seta grande e distância terminal.
- `layout`: tamanho de nó, largura de label, regiões e skeletons.

O runtime deve usar essa classificação para atualizar somente as camadas necessárias.

## Matriz de verificação

| Área | Evidência obrigatória |
|---|---|
| Semântica | sinais, tipos e loops continuam corretos |
| Visual | screenshots dos presets em mapas de referência |
| Geometria | diagnósticos de cruzamento, tangência e clearance |
| Interação | troca em tempo real, foco, seleção, drag e lock |
| Persistência | reload e export/import |
| Standalone | view e assets offline |
| Acessibilidade | contraste, teclado, alt text e reduced motion |
| Performance | sem reroute em paint-only e sem regressão de fixtures |

## Ordem de implementação

1. Style Pack + materialização + preview instantâneo.
2. Cascata segura e propriedades nativas de arestas/setas.
3. Loop badges e componentes editoriais.
4. Contrato `EdgePath` para rotas alternativas.
5. Perfis de publicação e export vetorial.
6. Biblioteca de presets, visual regression e documentação.
