# Assessment A — revisão independente de design

Método: fonte + inspeção visual de screenshots before (workspace, editor, Story Studio, apresentação em desktop 1440×900; workspace/editor mobile 390). Nenhum detector executado ou consultado. Não houve teste físico de leitor de tela, navegação completa por teclado ou reprodução inteira. Pontuações são diagnóstico dessas superfícies, não certificação.

## Especificidade e impressão
A linguagem Matcha é coerente e autoral: papel quente, verde moderado, serifas editoriais e mapas com curvas discretas combinam com investigação sistêmica. O canvas e a apresentação têm caráter próprio. A biblioteca, porém, usa composição de landing page: uma promessa em tamanho monumental, status técnico e criação de projetos ocupam a dobra antes dos mapas. A oportunidade é tornar a investigação causal protagonista desde a entrada, mantendo o caráter editorial.

## Heurísticas de Nielsen
| Heurística | Nota /4 | Evidência |
|---|---:|---|
| Visibilidade do estado | 2 | Salvo e seleção existem; contagem 3 ciclos no seletor contra 4 encontrados no painel; toast de encerramento invade apresentação. |
| Mundo real | 2 | Variável/relação são adequados; Story Studio, beat, Inspector, vars, view e feedback de relação exigem tradução mental. |
| Controle/liberdade | 3 | Fechar, histórico, restaurar e confirmações existem; alternativas por teclado de manipulação gráfica não comprovadas. |
| Consistência | 2 | Vocabulário muda entre telas; ajustar/centralizar/ver tudo parecem redundantes; modos e controles sobrepõem-se no mobile. |
| Prevenção | 3 | Confirmação de remoção e histórico; estrutura de seleção restringe ações. |
| Reconhecimento | 2 | Navegação desktop iconográfica; loops truncados iniciam com a mesma sequência; menu de edição concentra comandos. |
| Eficiência | 2 | Ações de alinhamento/duplicação existem; biblioteca não oferece busca visível nem abertura claramente hierárquica. |
| Minimalismo | 2 | Boa paleta; headline da biblioteca, controles repetidos e tipografia minúscula enfraquecem prioridade. |
| Recuperação | 2 | Tentar novamente e preservação de rascunho na fonte; mensagens de erro reais não exercitadas. |
| Ajuda | 2 | Dicas locais; nenhum ponto claro de ajuda causal/atalhos identificado nas capturas. |
| Total | **22/40** | **Aceitável; melhorias significativas.** |

## Forças
1. Relações curvas e signos discretos preservam a leitura espacial sem aspecto de painel administrativo.
2. Editor mantém canvas e detalhe lado a lado, enquanto apresentação remove ferramentas de autoria.
3. Hierarquia título/descrição e fundo quente sustentam leitura prolongada; status salvo e histórico oferecem segurança.

## Inventário priorizado
| ID | Prioridade | Problema e consequência | Local / proposta concreta |
|---|---|---|---|
| A01 | P1 | Mobile editor: controles de Apresentar/Foco/Concluir edição estão sob a navegação e quase invisíveis. Canvas ocupa só ~336px, mapa cai a ~200px e rótulos são ilegíveis. | main.jsx, prototypeParity.css, applicationRoutes.css: reservar linhas reais para navegação/comandos; recolher ferramentas contextualmente; fit respeitando área disponível e mínimo legível; botão explícito abrir detalhes. |
| A02 | P1 | Story Studio desktop mostra mapa muito pequeno no centro de grande vazio; fonte dos nós não dá contexto suficiente para selecionar foco. | camera/layout e CSS story: usar viewport livre entre topo, inspector e timeline; ampliar mapa e recalcular fit após modo/painéis mudarem. |
| A03 | P1 | Controles funcionais e metadata têm 9–10px, incluindo ações e trilha de contexto. Timeline é uma faixa de cartões microscópicos. | reactApp.css/prototypeParity.css/story CSS: corpo 14–16px, metadata 12px, ações 13–14px; permitir mais altura e menos informação simultânea; preservar canvas. |
| A04 | P1 | +/- zoom são botões apenas com SVG aria-hidden, sem nome acessível. | canvasSurface.jsx: aria-label Aumentar zoom/Diminuir zoom; verificar teclado e anúncio. |
| A05 | P1 | Legenda chama influência entre variáveis de Feedback positivo/negativo, confundindo sinal de relação e classe do ciclo. | canvasSurface.jsx: Mesmo sentido ++/−−; Sentido oposto +−/−+; explicar R/reforço e B/balanceamento separadamente. |
| A06 | P1 | Seletor diz 3 ciclos e painel diz 4; pode haver distinção curados/encontrados, mas não é nomeada. | appShell/model bridge: nomear ciclos curados e encontrados ou sincronizar mesma fonte; evitar prometer equivalência. |
| A07 | P2 | Biblioteca desktop: headline ocupa quase 300px; mapas ficam abaixo de 900px. Mobile 844px mostra só projeto e criação; continuar trabalho exige rolagem extensa. | workspaceView.jsx/appShell.css: título útil mais compacto, mapas do projeto primeiro ou acesso Continuar mapa, criação de projeto secundária. |
| A08 | P2 | Projeto ativo abre imediatamente mapa 0, embora cartão pareça selecionar projeto. IA projeto→mapa perde previsibilidade. | workspaceView.jsx ProjectCard: selecionar projeto e exibir mapas; ação separada Continuar último mapa. |
| A09 | P2 | Navegação mobile Story Studio quebra e corta a segunda linha; Projetos está próximo da borda. | applicationRoutes.css: 4 células iguais, altura para 2 linhas, ícones/labels alinhados, 44px mínimo. |
| A10 | P2 | R1/R2/B1 começam com Demanda→Planejamento→Capacidade; truncamento elimina a parte que distingue ciclos. | editorDockPanels.jsx: título causal humano com classe e número; caminho completo no detalhe; não usar caminho como única identificação. |
| A11 | P2 | Menu Mais ações de edição contém >15 escolhas incluindo arranjo, estilo, importação, exportação e medição de rotas. | canvasSurface.jsx: grupos por tarefa e submenu; levar conectar e salvar para contexto; métricas de rota em seção avançada. |
| A12 | P2 | Story, beat, Inspector, vars, canvas, sidebar coexistem com história/movimento/variável/mapa. Novato precisa aprender duas palavras por entidade. | JSX: apresentação/História, movimento, Detalhes, variáveis, mapa, painel; manter ids técnicos. |
| A13 | P2 | Apresentação começa com toast Modo edição encerrado e mapa muito apagado fora do foco; texto diz mapa completo mas destaque mostra apenas dois nós. | app.js/presentation CSS/camera: suprimir toast operacional ao apresentar; verificar primeiro beat/estado inicial; manter rótulos contextuais legíveis. |
| A14 | P2 | Descrição no inspector parece campo desativado com texto quase invisível; não se entende se pode editar ou ler. | editorDockPanels.jsx/prototypeParity.css: contraste de texto e placeholder; separar área de leitura de edição, botão Editar descrição explícito. |
| A15 | P2 | Mobile Fechar inspector definido com altura 29px e texto 9px. | applicationRoutes.css: alvo >=44px, fonte 13px e área segura. |
| A16 | P3 | SQLite/nem envio externo, paths, qualidade da rota, layout e termos internos aparecem no fluxo cotidiano. | deploymentCopy.js/canvasSurface.jsx: detalhes técnicos sob informação de armazenamento/avançado; manter informação significativa sem dominar. |

## Carga cognitiva
Falhas: menu edição tem mais de 4 opções simultâneas; rail tem 6 painéis; biblioteca repete criar projeto e contexto do projeto; ajuste da câmera tem nomes próximos em dois locais. Hierarquia dos modos não distingue ler/explorar, editar e narrar de maneira clara para iniciante. Já há boa divulgação progressiva em painéis recolhíveis e ações desabilitadas por seleção. Corrigir carga reduzindo simultaneidade por tarefa, não removendo capacidade do motor.

## Jornada emocional
Entrada: acolhedora mas lenta para quem volta trabalhar. Editor: seguro e calmo até rótulos pequenos e duplicação de controles exigirem esforço. História: sensação de complexidade por timeline/inspector e vazio do canvas. Apresentação: ganho expressivo de foco, mas toast operacional e mapa apagado enfraquecem o primeiro momento. O fim da apresentação não foi exercitado; não afirmar que síntese ou retorno funcionam.

## Personas
Jordan, iniciante: precisa entender ciclo/sinal e diferença mapa/apresentação; labels inglesas e seis ícones prejudicam autonomia. Sam, teclado/baixa visão: zoom sem nome, texto 9px, canvas gráfico sem alternativa comprovada; testar tabela/lista como leitura acessível. Casey, celular: comandos escondidos, labels cortados e mapa pequeno impedem conforto; não declarar uso mobile satisfatório só por ausência de overflow.

## Questões provocativas para síntese
- A entrada deve vender a ideia do Trama ou devolver imediatamente o último mapa ao pesquisador?
- Ciclos devem ser identificados pela sequência técnica ou pelo mecanismo causal que explicam?
- O celular é superfície de leitura/apresentação ou também de autoria completa? A interface precisa assumir uma prioridade explícita.

Não são perguntas enviadas ao usuário: a tarefa atual já autoriza correção abrangente. Questions skipped: decisão de escopo já autorizada pelo usuário; perguntas servem à síntese interna.
