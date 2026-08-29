# ADR 0024 — Retirar listeners órfãos do workspace bridge

## Contexto

O `workspaceDomBridge` ainda registrava dois listeners para superfícies que já
não fazem parte do DOM ativo: os antigos botões `data-inspector-tab` e o
`#open-story-studio`. A composição React atual renderiza o inspector e a
navegação de Story Studio por outras superfícies, enquanto `selectInspectorTab`
continua sendo usado internamente pelo inspector legado como compatibilidade
de renderização.

## Decisão

Remover os dois listeners, a referência e o comando órfão de `openStoryStudio`.
Manter `selectInspectorTab` e seus chamados internos até que o renderizador
imperativo de relações seja substituído por um view-model observável; esta fatia
não altera esse contrato visual.

## Verificação

- busca estática confirmou ausência de `#open-story-studio` e
  `data-inspector-tab` no DOM fonte;
- QA estrutural impede o retorno dos dois listeners;
- os gates completos do projeto permanecem obrigatórios antes do fechamento da
  refatoração.
