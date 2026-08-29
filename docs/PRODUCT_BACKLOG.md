# Product Backlog From QA

Este backlog contém capacidades ausentes ou refinamentos descobertos durante o QA. Bugs reproduzíveis
ficam em `QA_FINDINGS.md`.

## BLG-001: Preview visual em tempo real — entregue

- Objetivo: atualizar o canvas ao escrever Markdown, sem persistir automaticamente.
- Escopo entregue: estados `draft`, `preview` e `applied`; erro não destrutivo; aplicar e descartar.
- Critério atendido: `Pré-visualizar` altera apenas o canvas, `Descartar prévia` restaura o modelo salvo e `Aplicar prévia ao mapa` entra no fluxo normal de persistência.

## BLG-002: Linguagem visual natural e curta

- Objetivo: permitir comandos como `nós de pressão ficam vermelhos` sem exigir conhecimento de CSS.
- Escopo: aliases em linguagem natural, exemplos, autocomplete e mensagens de erro acionáveis.

## BLG-003: Editor visual completo de componentes

- Objetivo: editar tipografia, forma, tamanho, posição, borda, sombra, arestas, polaridades e regras por campo diretamente na UI.

## BLG-004: Diagnóstico visual de rotas

- Objetivo: mostrar cruzamentos, sobreposição, rota automática/manual e tempo de cálculo para mapas densos.

## BLG-005: Presets e sincronização UI/DSL

- Objetivo: criar presets visuais e manter UI e linguagem textual sincronizadas sem perder alterações do autor.

## BLG-006: Preview ao alterar controles visuais

- Observação de QA: alterar `Forma` pela UI muda o valor do controle, mas não atualiza o editor textual nem sinaliza uma alteração pendente; a aplicação depende de `Sincronizar controles`/`Aplicar estilo`.
- Objetivo: separar claramente preview, aplicação e persistência, com feedback de alteração não salva.

## BLG-007: Fluxo de salvamento de layout mais explícito

- Observação de QA: a posição é persistida quando `Salvar alterações` é acionado, mas um arraste não salvo pode ser perdido ao sair/recarregar.
- Objetivo: tornar a política explícita com autosave opcional, confirmação ao sair ou estado persistente de draft.

## BLG-008: Política para conflito entre locks e loops editoriais

- Problema: algumas arestas bloqueadas só deixam de cruzar quando são curvadas para o lado interno, contrariando a leitura circular.
- Decisão necessária: preservar exatamente o lock, fazer uma correção mínima mantendo o lado externo, ou permitir ao autor um modo explícito de “reparar geometria”.
- Critério recomendado: nunca alterar silenciosamente uma rota manual; oferecer preview de alternativas e registrar a escolha no histórico.

## BLG-009: Layout and Routing Engine V2

- Objetivo: fazer mapas causais pequenos e médios saírem automaticamente próximos de uma composição
  editorial final, com comportamento progressivo para mapas grandes.
- Problemas cobertos: curvatura excessiva, nós visualmente próximos, cruzamentos, tangências,
  congestionamento de hubs, ausência de portas/faixas, loops pouco reconhecíveis e instabilidade.
- Fonte de verdade: `docs/LAYOUT_ROUTING_ENGINE_V2_PLAN.md`.
- Primeira entrega: benchmark determinístico, candidatos retos/rasos, curvatura normalizada,
  envelopes reais e seleção lexicográfica de layouts.

## BLG-010: Story Mode V2

- Objetivo: transformar o story mode linear em um estúdio de narrativa causal para histórias de
  loops complexos.
- Escopo: apresentações no nível do projeto, capítulos, cenas, beats, storyboard visual, direção
  pelo canvas, travessia ordenada, handoffs entre loops, fases, intervenções, Story Director, Story
  Lint, presenter mode e export standalone determinístico.
- Fonte de verdade: `docs/STORY_MODE_V2_PRODUCT_AND_IMPLEMENTATION_SPEC.md`.
- Entregas atuais: schema V2, migração não destrutiva, compilador/reducer compartilhado, Story
  Director, Story Lint, storyboard inicial, biblioteca SQLite, histórico de revisões e paridade
  entre preview e standalone.
- Entrega atual: focus picker no canvas, seleção/path/captura, comparação/intervenção, lint com
  scores e safe-fixes, reduced motion, deep links, embed seguro e export V3 com integridade.
- Entrega desta fatia: seleção múltipla explícita de cenas e beats, seleção por capítulo, duplicação e
  remoção em lote, movimentação de cenas entre capítulos, IDs estáveis, confirmação destrutiva e
  integração completa com undo/redo editorial.
- Próxima fatia: revisão visual completa em mapas muito densos, colaboração multiusuário e simulação
  quantitativa de intervenções. O contrato Markdown, o compilador/reducer compartilhado e as opções de
  exportação com ou sem sidebar permanecem como guardrails para cada nova capacidade.
- Refinamento de autoria manual: busca no storyboard por texto editorial, ids e focos; controles explícitos
  para abrir/recolher cenas; seleção que abre a cena no editor e a leva para a viewport; e marcador AO VIVO
  durante o ensaio para manter o beat atual legível.
