# QA Test Matrix

Estado: rodada exploratória em andamento.

| Área | Cenário | Status | Evidência |
| --- | --- | --- | --- |
| Smoke | Abrir workspace local | Passou | Canvas, sidebars e mapa carregaram |
| Smoke | Testes automatizados e build | Passou | `npm run check`, 55/55 |
| Menus | Selecionar ação no menu `Mapa` fecha o menu | Corrigido | QA-001 |
| Menus | Entrar em edição fecha menus abertos | Corrigido | QA-002 |
| Menus | Clicar fora fecha menus | Corrigido | QA-003 |
| Menus | `Escape` fecha menus | Corrigido | QA-003 |
| Navegação | Selecionar item no seletor lateral fecha o seletor | Passou | `#loop-select.open === false` após seleção |
| Layout | Dock visual permanece contido na viewport | Corrigido | QA-004 |
| Views | Trocar mapa reidrata painel visual | Corrigido | QA-005 |
| Canvas | Entrar em edição mantém renderização estável | Corrigido | QA-006 |
| Acessibilidade | Textareas de DSL têm nome acessível | Corrigido | QA-007 |
| Código | Handlers de menu são registrados uma vez | Verificado | QA-008 |
| DSL | Propriedade visual desconhecida gera feedback | Corrigido | QA-009 |
| Geometria | Reorganizar preserva baseline editorial | Parcial | QA-010 |
| Geometria | Curvas automáticas ficam no lado externo | Corrigido | QA-011 |
| Cobertura | Todos os 9 mapas carregam e exibem polaridades | Passou | 9/9 sem sinais ocultos; 0 erros novos de renderização |
| Cobertura | Todos os mapas ficam abaixo de 3 cruzamentos totais | Falhou | `Responsabilidade` 10; `Sobrecarga` 5; rotas manuais conflitantes |
| Cobertura | Ciclos curatoriais sem cruzamentos internos | Parcial | 8 mapas com 0; `Sobrecarga.r3` com 1 |
| Diagnóstico | UI distingue cruzamentos de loops e locks | Passou | `Sobrecarga`: `5 cruzamentos · 1 nos loops · 1 bloqueados` |
| Persistência | Aplicar view nomeada em mapa legado sem view | Corrigido | QA-013; IDs globais agora não colidem |
| Canvas | Arrastar nó sem latência | Pendente | — |
| Canvas | Roteamento inicial sem artefatos | Pendente | — |
| Persistência | Posição sobrevive a reload | Pendente | — |
| Persistência | Posição salva explicitamente sobrevive a reload | Passou | `V01` persistiu no SQLite e voltou após reload |
| Rotas | Alterar curvatura, bloquear e reabrir | Passou | `route.locked=true` e distância persistiram; teste restaurado para automático |
| Persistência | Rota/curvatura sobrevive a reload | Pendente | — |
| Views | Preview de estilo via UI | Gap confirmado | BLG-006 |
| DSL | Preview de estilo via texto | Pendente | — |
| DSL | Erro de Markdown mostra linha e preserva modelo | Passou | `Linha 4: Expected '- id: Label'.` |
| Exploração | Alternar Relação, Loops R/B e Apresentação | Passou | 5 loops e 7 cenas renderizados |
| Histórico | Aplicar alteração, `Ctrl+Z` e `Ctrl+Shift+Z` | Passou | Título voltou ao original e refez a alteração |
| Story | Reproduzir storyboard completo | Pendente | — |
| Exportação | HTML standalone fiel ao mapa | Pendente | — |
| Responsivo | Viewport móvel sem comprimir canvas | Pendente | — |
