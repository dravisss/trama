# ADR 0025 — Ações do Explore sob posse do React

## Contexto

O painel Explore já era montado por React, mas o controller imperativo ainda
registrava listeners diretamente em `#explore-walk-loop` e
`#explore-show-map`. Isso deixava a mesma superfície com duas fronteiras de
evento e dificultava a destruição/recomposição do painel.

## Decisão

Os botões passam a emitir `onWalkLoop` e `onShowMap` pelo componente React.
`createExplorePanelController` permanece responsável por derivar e atualizar o
conteúdo do loop, o estado de abertura e a câmera; ele não registra mais
listeners DOM para as ações do painel.

## Verificação

- a leitura do loop continua usando o controller existente;
- “Percorrer loop” mantém a apresentação do loop ativo;
- “Ver mapa inteiro” mantém o fit-map e o loop selecionado;
- QA estrutural impede o retorno de listeners no controller;
- Playwright focal do Explore e os gates completos permanecem obrigatórios.
