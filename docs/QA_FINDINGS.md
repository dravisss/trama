# QA Findings

Rodada exploratória iniciada em 2026-07-10 contra `http://localhost:4173/`.

## QA-001: Menu Mapa permanece aberto após ação interna

Status: corrigido e revalidado no browser.

- Categoria: bug de UX
- Severidade: P2
- Área: navegação / menus
- Reprodução:
  1. Abrir o menu `Mapa`.
  2. Selecionar `Renomear mapa` ou entrar em `Editar`.
- Esperado: a ação é executada e o menu fecha.
- Observado: o `details.command-menu` continua com `open=true`; o painel fica sobre o canvas e permanece aberto durante a edição.
- Evidência: DOM observado após a ação: `Mapa` com `open: true` e diálogo de renomeação visível; screenshot da rodada.
- Hipótese: os handlers dos botões não fecham o `details` proprietário e não existe um controlador global de popovers.

## QA-002: Mesmo menu permanece aberto ao entrar no modo de edição

Status: corrigido e revalidado no browser.

- Categoria: bug de UX
- Severidade: P2
- Área: navegação / edição
- Reprodução:
  1. Abrir `Mapa`.
  2. Clicar `Editar`.
- Esperado: o modo de edição abre com canvas livre.
- Observado: o menu permanece sobre a parte superior do canvas enquanto o toolbar de edição é ativado.
- Evidência: screenshot da rodada com menu aberto e botão `Concluir edição` ativo.
- Relação: mesma causa provável de QA-001, mantido como cenário separado por afetar o fluxo crítico de edição.

## QA-003: Menus não fecham com Escape nem ao clicar fora

Status: corrigido e revalidado no browser.

- Categoria: bug de UX / acessibilidade
- Severidade: P2
- Área: navegação / menus
- Reprodução:
  1. Abrir o menu `Mapa`.
  2. Pressionar `Escape` ou clicar no canvas fora do menu.
- Esperado: o menu fecha e o foco retorna ao contexto de edição.
- Observado: o menu continua aberto nos dois casos.
- Evidência: `details.command-menu[open]` permaneceu verdadeiro após as duas interações.
- Hipótese: o uso de `<details>` não possui tratamento de `Escape` e clique externo.

## QA-004: Dock de edição expande o grid para além da viewport

Status: corrigido; dock aberto agora permanece em `634px` dentro de viewport de `720px`, com scroll interno de `1351px`.

- Categoria: bug visual / responsividade
- Severidade: P1
- Área: layout do editor
- Reprodução:
  1. Abrir o mapa no viewport desktop.
  2. Abrir o painel `Vista visual`.
- Esperado: sidebar, canvas e dock permanecem contidos na altura disponível e cada painel rola internamente.
- Observado: `.editor-dock` e `#map-area` medem 1351 px de altura em viewport de 720 px; o canvas fica parcialmente fora da área visível e o dock força conteúdo abaixo da viewport.
- Evidência: medições DOM: viewport `1280x720`, stage `636px`, dock/map `1351px`; screenshot da rodada.
- Hipótese: itens do grid/flex não têm `min-height: 0`, permitindo que o conteúdo do dock imponha sua altura mínima ao grid.

## QA-005: Painel visual mantém estado do mapa anterior

Status: corrigido e revalidado ao alternar entre mapas com e sem view.

- Categoria: bug de estado / editor
- Severidade: P1
- Área: views / estilo
- Reprodução:
  1. Abrir o painel `Vista visual`.
  2. Alterar a forma de uma view para `Losango`.
  3. Trocar para outro mapa sem a mesma view.
- Esperado: o painel é reidratado com a view do mapa atual ou informa que o mapa usa a view padrão.
- Observado: o seletor de view mostra `Matcha padrão`, mas o painel continua mostrando `Losango` e valores da view anterior.
- Evidência: após voltar ao mapa inicial, `#active-view-select.value` era vazio enquanto `#view-node-shape.value` permanecia `diamond`.
- Hipótese: `selectModel`/`refreshDockEditors` não chama `hydrateViewBuilder` quando o painel de estilo já está aberto.

## QA-006: Entrar em edição produz estado visual transitório inconsistente

Status: corrigido e revalidado; entrada agenda `resize`/`fit` em dois frames e o canvas mantém fundo estável.

- Categoria: bug de renderização / performance percebida
- Severidade: P1
- Área: canvas / roteamento
- Reprodução:
  1. Abrir um mapa carregado.
  2. Clicar `Editar`.
  3. Observar imediatamente o canvas antes de mover qualquer nó.
- Esperado: o canvas permanece íntegro enquanto o algoritmo recalcula as rotas.
- Observado: durante a entrada no modo de edição, a captura mostra o conteúdo da sidebar escurecido e o diagrama parcialmente renderizado; depois de um pequeno arraste, a renderização volta ao estado normal e o mapa aparece completo.
- Evidência: screenshots consecutivos antes e depois do arraste; o indicador de rota muda de estado e o topo passa a mostrar `Alterações pendentes`.
- Hipótese: a transição de edição dispara renderização/fit/roteamento em ordem não coordenada; falta um estado de loading/commit visual atômico para o canvas.

## QA-007: Editores de código não têm nome acessível

Status: corrigido e revalidado; ambos os textareas possuem label associado.

- Categoria: acessibilidade
- Severidade: P2
- Área: DSL / editor
- Reprodução: abrir `Código do loop` e inspecionar os controles visíveis.
- Esperado: cada `textarea` possui `<label>`, `aria-label` ou `aria-labelledby` associado.
- Observado: `#loop-source-editor` não tem rótulo acessível; o editor de estilo usa o mesmo padrão quando aberto.
- Evidência: auditoria DOM encontrou `TEXTAREA#loop-source-editor` sem `aria-label`, `title` ou `labels`.

## QA-008: Handler de renomeação é registrado duas vezes

Status: não reproduzido no estado atual; a inspeção atual encontrou um único registro. Mantido como verificação de regressão.

- Categoria: bug de implementação / manutenção
- Severidade: P2
- Área: comandos de mapa
- Evidência estática: `src/app.js` registra `elements.renameLoopMenu.addEventListener("click", renameActiveLoop)` em duas linhas consecutivas.
- Risco: a ação pode abrir/reinicializar o diálogo duas vezes ou gerar efeitos duplicados conforme o estado do controlador de diálogo.
- Regressão recomendada: clicar uma vez em `Renomear mapa` deve produzir exatamente uma abertura de diálogo.

## QA-009: DSL visual aceita propriedade desconhecida sem aviso

Status: corrigido e revalidado; agora retorna linha e propriedade desconhecida.

## QA-010: Reorganizar degrada mapas com rotas manuais

- Categoria: bug de qualidade geométrica
- Severidade: P1
- Status: corrigido e revalidado com baseline protegido e busca multi-candidato
- Reprodução: em `Reuniao`, a primeira rodada com `randomize: true` chegou a 18 cruzamentos; após preservar a estrutura editorial, a reorganização caiu para 3 cruzamentos, enquanto o layout inicial restaurado permanece em 2.
- Resultado: o layout atual sempre participa como candidato e não é substituído por uma solução
  com custo editorial maior. A matriz dos 9 mapas preservou `0` cruzamentos internos nos loops,
  sem overlaps de nós e sem erros de página.

## QA-011: Curvas automáticas escolhiam o lado interno do loop

- Categoria: bug geométrico
- Severidade: P1
- Status: corrigido e revalidado
- Reprodução: no mapa `Reuniao`, três das sete arestas automáticas estavam no lado oposto ao vetor externo calculado pelo roteador.
- Correção: o custo de candidato agora penaliza fortemente o lado interno, mantendo cruzamentos/sobreposição como sinais de diagnóstico.
- Resultado: as sete arestas automáticas do cenário passaram a respeitar o lado externo; o mapa manteve `2 cruzamentos` no baseline.

## QA-012: Alguns mapas densos ainda excedem o limite editorial de cruzamentos

- Categoria: qualidade geométrica
- Severidade: P1
- Status: aberto
- Evidência: rodada nos 9 mapas: `Responsabilidade sem Autonomia` terminou com 10 cruzamentos e `Sobrecarga de Filas` com 5; `Reuniao` ficou em 2.
- Qualificação: os 10 cruzamentos de `Responsabilidade` estão fora dos ciclos curatoriais; `Sobrecarga` tem 1 cruzamento dentro do loop `r3`. Os demais ciclos curatoriais mediram 0 cruzamentos.
- Observação: todas as polaridades permaneceram visíveis. O próximo refinamento deve tratar rotas manuais/locked e loops concorrentes sem sacrificar o lado externo das curvas.
- Refinamento implementado: a qualidade agora mede também curvas internas, overlaps de labels e
  congestionamento de portas; fCoSE e remoção incremental de overlaps são candidatos opcionais
  no modo `thorough`.
- Teste local: o conflito de `Sobrecarga.r3` só zera ao deslocar `e18` de `-159` para aproximadamente `+71`, invertendo o lado externo da curva. Essa alternativa foi rejeitada para preservar a regra editorial de curvas externas.

## QA-013: Views com o mesmo nome falhavam em mapas diferentes

- Categoria: bug de persistência
- Severidade: P1
- Status: corrigido e revalidado por teste de store e browser
- Reprodução: aplicar a view `Matcha` em um mapa legado sem view anterior.
- Causa: o gerador de IDs verificava colisões apenas dentro do mapa, mas `views.id` é uma chave primária global.
- Correção: geração de IDs agora considera todas as views do projeto; `Matcha` pode existir em múltiplos mapas.

- Categoria: bug de linguagem / feedback
- Severidade: P2
- Área: `.loop.css`
- Reprodução: aplicar `variable { unknown-property: nope; }`.
- Esperado: erro de sintaxe/semântica com linha e propriedade, ou aviso explícito de que a propriedade será ignorada.
- Observado: a view é aceita como `Vista válida e aplicada`, embora a propriedade não tenha efeito no renderer.
- Risco: o autor acredita que personalizou o mapa, mas o resultado visual não muda.

## Observações ainda em investigação

- Persistência de posições e rotas precisa de teste destrutivo controlado em uma cópia de projeto.
- A diferença entre roteamento inicial e roteamento após nudge precisa ser medida com screenshots e métricas do engine.
- Customizações visuais precisam ser verificadas em UI, DSL e HTML standalone.

## QA-014: Curvatura automática excessiva em relações sem obstáculo

- Categoria: qualidade geométrica
- Severidade: P1
- Status: aberto; especificado em `docs/LAYOUT_ROUTING_ENGINE_V2_PLAN.md`
- Evidência: nos mapas `QA · Circuito da Autonomia`, `QA · Capacidade e Confiança` e
  `Stress 16 variáveis`, relações sem obstáculo suficiente para justificar desvio recebem curvas
  médias ou profundas. Em arestas longas, o arco passa a dominar a composição.
- Causa confirmada no código: o conjunto automático de candidatos não inclui curvatura `0` e começa
  em fatores não nulos; o custo usa principalmente distância absoluta, não curvatura normalizada
  pelo comprimento da aresta.
- Esperado: testar rota reta e curvas rasas primeiro, escolhendo a menor curvatura que passe pelos
  critérios de colisão, cruzamento, tangência, portas e leitura de loop.

## QA-015: Ausência de overlap literal não garante folga visual suficiente

- Categoria: qualidade geométrica
- Severidade: P1
- Status: aberto; especificado em `docs/LAYOUT_ROUTING_ENGINE_V2_PLAN.md`
- Evidência: em `QA · Circuito da Autonomia`, `Capacidade de melhoria` e `Confiança da equipe`
  quase se tocam, enquanto múltiplas setas, arrowheads e polaridades disputam o mesmo corredor.
- Causa: o solver atual separa colisões de nós, mas não trata o envelope visual completo nem uma
  distância editorial preferida; o roteador também não reserva portas e faixas angulares.
- Esperado: envelopes derivados do tema, folga mínima e preferida, separação de portas e validação
  conjunta de nós, arestas, arrowheads e polaridades.
