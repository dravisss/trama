# Auditoria crítica da interface Trama / LoopViewer

Método: avaliações independentes A (design) e B (detector/acessibilidade), inventário Playwright da task Luna `01a0f02c-69ba-7e30-acd9-78f4102f2128`, correções no checkout local e confirmação funcional. Estado inicial preservado em pre-existing.patch e pre-existing-status.txt. Nenhum deploy executado. As capturas before foram produzidas enquanto a implementação avançava; o manifesto identifica cobertura e limitações. As primeiras capturas são a evidência visual de partida, não uma reprodução imutável de um único commit.

## Diagnóstico

A identidade Matcha tem caráter: papel quente, verde contido e títulos editoriais. A mediocridade estava na execução operacional: controles microscópicos, terminologia duplicada, áreas de interação sobrepostas, biblioteca com hierarquia de landing page e mecanismos acessíveis incompletos. Uma interface bonita em desktop não compensava ações inacessíveis no celular.

A revisão de design pontuou 22/40. Não recalculamos uma nota para simular certificação após os patches. Os relatórios independentes preservam o diagnóstico integral: design-review.md e technical-review.md.

## Problemas e intervenções

| Achado | Intervenção | Evidência |
|---|---|---|
| Navegação e comandos sobrepostos no mobile | Quatro linhas reais: título, modos, comandos e mapa. Comandos repetidos removidos da barra compacta; Apresentar continua no modo principal. | confirmação map-390; testes toolbar/reflow/journey |
| Biblioteca corta conteúdo no mobile | Header realmente vira grid; tracks minmax(0,1fr), filhos min-width:0 e quebra de títulos. | workspace-final-360/390: scrollWidth igual innerWidth |
| Biblioteca esconde mapas sob headline e projetos | Título compacto; mapas do projeto antes do catálogo. Projeto ativo leva à seção de mapas em vez de abrir arbitrariamente o mapa zero. | workspace-final e before |
| Zoom sem nome e sob toolbar | Nomes acessíveis; controles no rodapé mobile, alvos de 44px. | axe aplicação; captura mobile final |
| Padding desktop reduz mapa compacto | Engine limita padding à área segura com helper geométrico existente. | testes viewport/geometria |
| Tipografia 7–10px e timeline microscópica | Escala de controles/metadata 12px; cartões maiores, ações maiores e contraste reforçado. | story desktop/mobile; axe aplicação |
| Ícone mapa mal fechado; external incompleto; glifo de foco | Paths SVG corrigidos; foco usa sistema SVG. | ui/Icon.jsx e editorInspector.jsx |
| Tooltip intercepta clique em História | Pseudo tooltip não recebe pointer; oculto onde o rótulo já aparece no mobile. | teste axe navegando por clique entre modos |
| Legenda confunde relação e feedback | Mesmo sentido / sentido oposto; circuitos distinguem reforço e balanceamento. | canvasSurface.jsx/editorDockPanels.jsx |
| 3 ciclos vs 4 sem distinção | Seletor identifica curados/encontrados; cards de circuitos indicam sua origem. | fonte e captura final |
| Circuitos truncados indistinguíveis | Título editorial quando existe; caminho completo no title; classe e estado separados. | painel mapa |
| Menu com >15 ações e métricas técnicas | Grupos por tarefa e roteamento em seção avançada. | menu export/edição |
| Story/beat/Inspector/vars na UI portuguesa | História/movimento/Detalhes/variáveis, preservando IDs técnicos. | navegação, detalhes e apresentação |
| Toast operacional ao apresentar | Limpo antes da primeira cena. | apresentação e testes playback |
| Dialog sem nome; descrição sem controle modal | Semântica modal, nome, Tab/ShiftTab, Escape, contenção focusin e restauração ao gatilho. | teste editor-panel-navigation |
| Drag conflita com rolagem e perde cleanup | pan-y no eixo de rolagem; cancelamento em blur além de pointercancel/unmount. | fonte; jornada mobile |
| CSS quebra contrato de tokens | Fallback hex retirado em favor do token existente. | check:ui-contract |

| Ações de projeto ausentes no mobile | Botão Projeto com menu fixo/rolável, nome acessível e alvo44px; acesso a edição/backups. | teste shell mobile360 |
| Viewer público sem nome no seletor | aria-label Selecionar mapa no standalone; playback textual Reproduzir/Pausar. | hosted final/public viewer |
| Close de compartilhamento usa glifo/36px | SVG de20px, botão44px. | hosted settings mobile |
| Timeline mobile corta Próximo | Cabeçalho em duas linhas, última linha automática, timeline320px, ações44px e label Prévia curto com nome completo. | screenshot story actions final |
| Hierarquia de títulos e regiões redundantes | Workspace h1; apresentação nível2; região hero duplicada retirada. | axe final |

| Favicon ausente gera404 no hosted | Favicon SVG da marca servido por aliases explícitos. | HTTP e recheck hosted apósrestart |

## Critérios de leitura

O mapa completo é uma visão de orientação; mapas densos exigem zoom ou foco para leitura de cada variável. A correção preserva posições e estilos autorais. Não elevamos automaticamente zoom ou tamanho dos rótulos persistidos para cortar o mapa ou sobrescrever decisões do autor. A tabela e o painel de detalhes são vias complementares de inspeção. As capturas não demonstram todos os possíveis mapas, quantidades de elementos ou dispositivos físicos.

## Validação

- npm run check: 265 testes unitários/integração, 4 testes do editor de história e build passaram.
- Playwright UI: os65 casos passaram entre a rodada completa (64) e a repetição dirigida das jornadas desktop/mobile após ajuste do seletor de teste. Comparação visual desktop/tablet/mobile passou. Inclui edição, undo, persistência/reload, modos, export standalone offline e reprodução.
- Axe:3 testes passaram, incluindo biblioteca, Editor, História, menus Projeto/Mais em1440/390 e catálogo, sem violações critical/serious nos estados exercitados.
- check:ui-contract passou. IDs e mounts mantidos.
- Snapshots visuais atualizados somente após inspeção das composições. Resultados finais registrados em validation.md.

## Evidências e limites

before/inventory.md e before/manifest.json descrevem a cobertura inicial; after reúne versão posterior, screenshots e scripts. confirmation guarda as verificações do integrador. Todos usam dados QA descartáveis. Hosted foi exercitado em instância local isolada, com segredos omitidos. Não há publicação nem prova de produção nesta entrega. Gesto touch físico e leitor de tela físico não foram exercitados; não usamos a expressão funcionamento perfeito como resultado de testes automatizados.

## Detector final e exceções
O detector final está em detector-final.json. Os avisos de imagem sem src em presentationCard.jsx e standalone.js foram classificados e ignorados apenas nesses arquivos: as imagens ficam hidden até receberem src/alt válidos. Não há imagem quebrada visível. Outros falsos positivos (stroke-width SVG/checkmark/carregamento) estão explicados em technical-review.md; não foram usados como motivo para apagar capacidades ou alterar estilo.
