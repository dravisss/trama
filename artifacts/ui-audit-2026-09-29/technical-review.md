# Assessment B — auditoria técnica independente

Implementação coerente e específica ao produto, com falhas de acessibilidade confirmadas. Não consultei Assessment A. Escopo: src/react, index.html, controladores dos overlays e testes existentes. Dados reais não foram alterados.

| Dimensão | Nota | Evidência |
|---|---:|---|
| Acessibilidade | 2/4 | axe identificou nomes ausentes nos zooms e contraste insuficiente; overlays incompletos |
| Performance | 3/4 | movimento por transform; nenhum layout thrash comprovado |
| Responsividade | 2/4 | reflow e folha móvel têm testes; controles timeline 15×18 px |
| Theming | 3/4 | tokens amplamente aplicados; tons/rgba locais e contraste falho |
| Integridade | 3/4 | sistema consistente de ícones SVG e domínio causal; detector contém falsos positivos |
| Total | 13/20 | Aceitável, trabalho significativo em acessibilidade |

## Evidência runtime antes das correções

Chrome headless instalado, Playwright, fixture temporária de e2e/support/qa-server.mjs, viewport 390×844. axe no Editor: button-name critical em #canvas-zoom-out e #canvas-zoom-in; color-contrast serious em .mode-eyebrow. No Story Studio: mesmos dois button-name. Medição DOM: Remover movimento 15×18px, títulos de cena altura 19px. Não houve teste com leitor de tela físico, dispositivo real ou gesto touch sintetizado. Primeira tentativa falhou pela ausência do Chromium bundled; segunda pela criação do contexto implícito do Playwright; terceira usou Chrome/context explícito e concluiu. Servidores/browser próprios fechados.

## Findings priorizados

- **P1 — Zoom sem nome acessível.** src/react/canvasSurface.jsx, botões canvas-zoom-out/in. Impede compreensão da ação por leitor de tela (WCAG 4.1.2). Adicionar aria-label em português e manter SVG decorativo. `$impeccable harden`.
- **P1 — Contraste de .mode-eyebrow.** Editor, verificado pelo axe. Texto pequeno ilegível para baixa visão (WCAG 1.4.3). Usar token de texto com contraste AA ou remover kicker redundante. `$impeccable colorize`.
- **P1 — Modal de descrição não contém foco.** src/react/overlaySurfaces.jsx:8, src/app.js:4488 e src/app/workspaceDomBridge.js:73. div sem role/name; abrir move foco mas Tab alcança fundo, fechar não devolve foco. WCAG 2.4.3/4.1.2. Semântica dialog, Escape, ciclo de Tab e restauração do gatilho. `$impeccable harden`.
- **P1 — Command dialog sem nome programático.** src/react/overlaySurfaces.jsx:30. h2 existe mas não está associado ao dialog; controller só preenche textContent. Associar aria-labelledby e aria-describedby. `$impeccable harden`.
- **P2 — Alvos pequenos na timeline.** src/react/storyStudioV2/storyStudioV2.css:410, 423–430. Remover movimento medido 15×18 px e títulos 19px de altura; dificulta operação touch. Não afirmar automaticamente violação 2.5.8 sem medir espaçamento. Ampliar área clicável, sobretudo móvel, sem sobreposição. `$impeccable adapt`.
- **P2 — Reordenação pointer sem política touch.** src/react/storyTimeline.jsx:44–110; CSS timeline. pointercancel limpa estado, mas touch-action ausente permite navegador tomar gesto. Declarar política de eixo e verificar reordenação/scroll/cancel com touch sintetizado. Evidência do código, comportamento touch ainda não confirmado. `$impeccable adapt`.
- **P2 — Teste axe cobre somente catálogo.** e2e/a11y/catalog.spec.mjs:4. Shell e estados reais ficam fora da proteção; explica zooms passarem. Acrescentar Editor, Story e overlays abertos na fixture isolada. `$impeccable audit`.

## Detector

Comando: `.agents/skills/impeccable/scripts/impeccable detect src/react index.html`; exit 2, 8 findings + 1 advisory.

1. broken-image presentationCard.jsx:14: **falso positivo**. img hidden sem src; app.js:5237–5242 atribui src/alt antes de exibir e remove src quando esconde.
2. layout-transition storyStudioV2.css:287: **falso positivo**. Transição é stroke-width SVG, não largura de layout.
3. side-tab ui.css:40: **falso positivo**. border-left desenha checkmark de checkbox, não faixa decorativa.
4. cramped-padding stage index.html: **não comprovado**. Canvas deve ocupar superfície inteira; wrapper não exige inset textual por si.
5. kicker Editor local/Inspector: **drift confirmado no shell legado**; verificar cascade/estado real antes de remoção. Não é falha funcional por si.
6. side-tab loop-item.view-highlight: **legado/fora da superfície atual**; card React usa realce inferior em promotion.css:605. Não tratar stripe como defeito confirmado.
7. marquee projects-loading-sweep: **classificação falsa**. Indicador transitório de carregamento, nenhum conteúdo auto-rolando. Conferir alternativa reduced-motion como estado, não remover feedback.
8. dark-glow: **não comprova página escura**. Há realce de seleção/drop em Story, mas scanner agrega CSS/HTML; não adotar verdict visual sem inspeção.
9. repeating-stripes-gradient: **advisory**, não bloqueador; contexto visual pendente.

## Padrões positivos e limites

Button/IconButton usam SVG consistente, aria-label e ícones decorativos ocultos. Field associa hint/error e aria-invalid; checkbox tem foco visível na caixa. Tokens e focus-visible estão presentes. Drag já limpa pointercancel e unmount. Mobile editor tem teste de reflow 390px/512px; Story folha móvel verifica Escape/restauração; longa timeline testa não sobreposição. Estes testes são evidência de cobertura existente, não execução nesta auditoria.

Prioridade: `$impeccable harden` nomes/modais, `$impeccable colorize` contraste, `$impeccable adapt` alvos/gestos, `$impeccable audit` estados reais; finalizar com `$impeccable polish`. Não fazer mudanças de gosto pelos falsos positivos do scanner.

## Correções autorizadas depois do Assessment B

Semântica/nome dos dois overlays; descrição contém Tab/ShiftTab, Escape e focusin e devolve foco ao gatilho. Command dialog mantém seu foco nativo. Pointer drag declara pan-y e limpa ao perder foco da janela, além de pointercancel/unmount. Teste e2e/editor-panel-navigation ampliado verificou dialog com nome, fronteiras Tab e restauração: 2/2 passaram Chrome. workspace-dom-bridge: 3/3; build passou. Gesto touch físico/sintetizado permanece sem prova.

Flagship journey: desktop passou; mobile falhou por timeout ao procurar botão `Inspector` no rail (e2e/ui/flagship-journey.spec.mjs:135). Label atual é `Variáveis e relações`; falha de selector legado, relatada ao integrador. Não atribuir ao gesto touch nem aos modais.
