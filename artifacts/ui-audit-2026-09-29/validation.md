# Validação final — 30 de setembro de 2026

## Resultado

Todas as falhas reais identificadas e documentadas nesta auditoria foram corrigidas no checkout local. A cobertura automatizada passou nos estados e fixtures descritos abaixo. Não houve deploy.

- `npm run check`: 265 testes unitários/integração, 4 testes do editor de história e build passaram.
- Suíte UI com comparação visual: 64 dos 65 testes passaram na rodada completa. O restante falhou por seletor ambíguo no teste após a inclusão de um submenu; corrigido para o summary direto. A repetição das duas jornadas flagship desktop/mobile passou, incluindo exportação standalone offline. Assim, os 65 casos passaram entre a rodada completa e a repetição dirigida.
- Todos os snapshots desktop/tablet/mobile da rodada completa passaram.
- Axe: os 3 testes passaram, cobrindo biblioteca, mapa, História, menus Projeto/Mais em1440/390 e catálogo. Nenhuma violação critical/serious nos estados exercitados.
- Regressões360px: menu Projeto acessível, ausência de overflow horizontal, criação de cenas e navegação da timeline dentro da tela com alvos44px; testes passaram.
- Modal: nome acessível, contenção de foco, Escape e restauração ao gatilho passaram.
- Hosted isolado: share/player e editor exercitados pelo inventário; seletor de mapa nomeado, favicon200, sem overflow ou erros de console/HTTP no recheck final.
- `check:ui-contract` e `git diff --check` passaram.

## Limites

Testes em Chrome/Playwright e dados descartáveis, com1440×900,390×844 e360×844 e snapshots de tablet. Não foram realizados ensaios em dispositivos físicos ou leitores de tela físicos. Nenhuma afirmação de perfeição universal ou validação de produção decorre destes resultados.

O histórico before/after inclui rodadas intermediárias. Consulte os manifestos finais e confirmation para distinguir achados resolvidos de registros anteriores. O estado Git anterior foi preservado em pre-existing.patch/pre-existing-status.txt.

## Fechamento de release

Após integrar os quatro commits remotos, a ordem de cards da fixture variou por timestamps de importação. O reset exclusivo de QA equaliza esses timestamps; os13 testes de baseline e3 de axe passaram sem trocar imagens nessa confirmação. A inspeção hospedada adicional corrigiu contraste das abas públicas, escala tipográfica, controles de reprodução, alvos mobile, painel que cobria comandos e separação de título/métricas nos cards. Somente os3 snapshots de biblioteca foram atualizados após esta correção visual deliberada.

O runner release-smoke.mjs exercitou18 estados (biblioteca, compartilhar, mapa, história, apresentar e share público em1440/390/360), sem violações axe serious/critical, erros de console ou overflow. Workspace descartável removido. Evidências em release-local. A exportação offline passou nos2 testes.
