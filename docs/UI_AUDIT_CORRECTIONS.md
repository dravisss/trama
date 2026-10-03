# Correções da auditoria visual do Trama

A auditoria de 78 capturas recebida em 3 de outubro de 2026 foi implementada em uma worktree isolada. A identidade Matcha, o engine reutilizável e o contrato Presentation V2 permanecem a base do produto. Não houve publicação em produção.

## Registro de aceite

| Achado | Correção | Evidência reproduzível |
|---|---|---|
| TRM-01 | ResizeObserver acompanha o espaço real do canvas; novo enquadramento substitui a animação anterior no shell e respeita gestos deliberados e “Ver tudo” devolve o controle à aplicação. | `audit-corrections`: sete larguras, abertura/fechamento de painel, resize e roda; `editor-safe-viewport`. |
| TRM-02 | Seletor com nomes completos no tablet; painel como folha no mobile, inicialmente recolhido. | Sete larguras; assert de largura do seletor e ausência de tabs comprimidos; capturas Editor. |
| TRM-03 | Mapa/Movimento/Timeline no mobile; inspector retrátil no tablet; formulário rolável até o último controle. | Sete larguras; `story-mobile-inspector`; captura da folha. |
| TRM-04 | Atributo hidden prevalece sobre regras de layout; empty/variável/relação exclusivos; CTA segue o formulário e reserva espaço. | Seleção de nó/aresta e acesso ao último campo; `editor-inspector-edit` + undo. |
| TRM-05 | Seleção de aresta atualiza o inspector com origem, destino, sinais e descrição; destaque do engine acompanha a seleção. | Assert antes da captura `edge-inspector`; edição de relação sem remontar canvas. |
| TRM-06 | Menu Story está sempre montado, com ações conectadas; duplicação/exclusão usam diálogo; notas visíveis; captures exigem estado semântico. | `capture:ui`; diálogos abertos, resultado de lint, painel de notas e view-actions aberto. |
| TRM-07 | Aviso permanente de edição removido; menus suprimem tooltips e toast; abrir/fechar inspector dispensa toast. | Capturas de menus; assert de toast ausente; teclado conserva foco. |
| TRM-08 | Glossário aplicado a fonte, descrição, vistas, exports e mensagens. | `DOMAIN_GLOSSARY.md`; capturas de descrição, código e standalone. APIs/IDs legados preservados. |
| TRM-09 | Guided abre diretamente a narrativa na faixa inferior, com mapa contextual e controles no primeiro viewport; sidebar vira exploração secundária e a câmera V2 prevalece sobre o fit inicial. | `audit-public-surfaces`: guided offline integralmente dentro de 1440×900. |
| TRM-10 | Página pública estreita inicia com canvas e botão “Informações do mapa”. | Página pública vazia e preenchida em 390 px. |
| TRM-11 | Narração reflui e tem altura natural; cartão móvel pode crescer/rolar sem cortar o texto. | Assert scrollHeight/clientHeight em 320–430 px; capturas Present. |
| TRM-12 | Um único aria-current; hover/focus separados de active. | Assert de seleção única nas sete larguras; capturas Dados/Histórico. |
| TRM-13 | Retry oculto inicialmente e no sucesso; falha explica alterações pendentes; retry reconecta e repete gravação. | Falha real de PUT simulada, recuperação, refresh e valor persistido. |
| TRM-14 | Foco recolhe header, navegação, inspector e comandos secundários. | Área do canvas >85% de 1440×900; captura Foco. |
| TRM-15 | Configuração integra o inspector; instruções refluem; cena atual como padrão, overview explícito e inspector retrátil. | `story-timeline-long-story`; capturas Studio; alternância cena/overview. |
| TRM-16 | Fonte inválida conserva último modelo válido e texto digitado, mostra diagnóstico em português e bloqueia apply; hidratação tardia não sobrescreve uma nova edição. | `audit-corrections`; `source-diagnostics`; isolamento e descarte de prévia. |
| TRM-17 | Share dialog tem header estável e corpo com scroll interno dentro da viewport. | Backup final e título alcançáveis em 1440×768 e 390×844. |
| TRM-18 | Edição, MCP e CLI mascarados por padrão; Revelar/Ocultar deliberado, Copiar continua disponível. | Assert de três campos password e aria-pressed de revelação. |
| TRM-19 | Espaços semânticos após br; decoração não provoca scroll horizontal estreito. | Headings e largura em 320/375/390/430 px. |
| TRM-20 | Padding adaptativo do enquadramento compartilhado privilegia foco sem alterar modo/IDs/zoom máximo autorados. | `camera`, `present-atlas-editorial`, `present-relation-tooltip`, capturas de movimentos. |
| TRM-21 | Descrição real usa contraste normal, sem opacity de placeholder. | Axe com contraste; captura e revisão do painel Mapa. |
| TRM-22 | Empty público explica que ainda não há relações. | Assert de ausência de “Clique em uma aresta” no mapa vazio. |
| TRM-23 | Legenda editorial Reforço/Balanceamento, sem type: e sem duplicatas. | Export offline; capturas Clean/Guided/Explore. |
| TRM-24 | Nome da seção ativa permanece visível no rail desktop; demais ações conservam nome acessível e tooltip. | Capturas Workspace/Editor/Story; teclado e Axe. |
| TRM-25 | X com nome acessível no header; Cancelar no footer de operação; exclusão com consequência explícita; foco retorna ao controle atual e não interfere na próxima tarefa. | Capturas de diálogos Editor/Story/Hosted; ESC e retorno de foco. |

## Como repetir

```sh
npm run check
npm run check:ui-contract
npm run check:ui-legacy
npm run test:ui
npm run test:a11y
npm run test:audit:matrix
npm run capture:ui
```

Os testes usam banco SQLite e servidor hosted efêmeros. Não escrevem no projeto pessoal nem na produção. Capturas e traces das suítes de auditoria ficam em `artifacts/`, ignorados pelo Git; a suíte padrão usa `test-results/`. O corpus mantém manifesto com URLs privadas redigidas e asserts semânticos anteriores aos screenshots. As baselines versionadas refletem a composição corrigida.

## Contratos

O engine continua usando geometry pura (`fitViewportToRect`) e a câmera Presentation V2 compartilhada. O shell mede o retângulo real após o layout; gestos do usuário suspendem somente o fit automático do editor, até ajuste explícito ou troca de mapa. Câmeras `fixed`, focos e referências persistidas continuam autoritativos. A montagem do export reaplica a câmera da apresentação após o layout e o harness espera o fim da animação. Padding de tela é limitado pela área útil (12% em orientação, 8% em foco) para não reduzir o conteúdo a uma miniatura.

Mapas sem nenhuma variável não são uma prévia válida para substituir um mapa existente no editor de fonte. A importação/engine continuam aceitando o contrato próprio; exclusão de todo o conteúdo segue comandos estruturais deliberados. Diagnósticos são traduzidos no limite da UI, preservando as mensagens da API dos compiladores.

## Limites da verificação

Chromium, Firefox e WebKit executam a aplicação local e os exports; WebKit é um motor de teste, não uma instalação de Safari. No WebKit, a chave offline do Playwright rejeita file:// antes de carregar; os testes bloqueiam toda requisição HTTP(S) para verificar o arquivo sem acesso à rede. Nos demais motores, usa-se offline nativo.

Há emulação de telas/touch, reduced-motion, contraste automatizado, nomes acessíveis, navegação/foco por teclado e reflow equivalente a zoom de 200%. Não foram usados iPhone/Android físicos, VoiceOver ou NVDA. Essas verificações humanas dependem de equipamento/sessão externa e não são apresentadas como concluídas. Nenhum teste automatizado prova sozinho reconhecimento cognitivo, leitura projetada ou fluidez percebida em hardware real.

## Resultado final — 3 de outubro de 2026

- `npm run check`: 266 testes principais + 4 testes auxiliares, zero falhas; build gerado com sucesso.
- `npm run check:ui-contract` e `npm run check:ui-legacy`: aprovados; 237 tokens, 17 IDs estáticos e nenhum `!important` legado.
- Regressão de interface: 80/80 testes aprovados, com comparação das baselines corrigidas sem atualização durante a execução final.
- Matriz de auditoria: 102/102 testes aprovados em Chromium, Firefox, WebKit, iPhone 13 emulado e Pixel 5 emulado. Inclui Axe, foco/teclado, falha e recuperação de gravação, backup inválido, fontes inválidas, exports offline e superfícies públicas.
- `npm run capture:ui`: 15/15 cenários; manifesto e arquivos conferidos, 78/78 capturas. Corpus revisado visualmente; apresentação e Guided revistos novamente após estabilização da câmera no harness.
- `git diff --check`: aprovado. Checkout original preservado. Nenhum deploy, push ou merge realizado.

Evidências locais: `artifacts/audit-verification/`, `artifacts/audit-browser-matrix/` e `artifacts/ui-capture/`. SHA-256 do manifesto final: `e303850aed77e197c2ea0ff1eb8c88e3891db37af74edb91ddc14229b60b998b`. O corpus é regenerável pelo comando acima; as evidências volumosas ficam fora do Git.
