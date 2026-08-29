# ADR 0001 — Comportamento dos primitives de UI

Status: aceito para R0–R3

## Contexto

O LoopViewer precisa convergir sua identidade Matcha sem introduzir uma segunda
linguagem visual, uma dependência prematura ou um comportamento de overlay
inacessível. `docs/UNIFIED_PRODUCT_DESIGN_SYSTEM_SPEC.md` recomenda Radix
apenas quando um primitive nativo ou local não puder cumprir o contrato de
foco, teclado, portal e acessibilidade.

## Decisão

- Primitives visuais continuam próprios do LoopViewer e consomem somente
  tokens `--lv-*`.
- O UI Catalog é uma página estática isolada; não carrega projeto, engine ou
  persistência. Ele é a bancada inicial de comportamento.
- Para o primeiro Dialog usamos o elemento nativo `dialog`, que fornece top
  layer e contenção de foco. O contrato adicional do catálogo exige Escape e
  retorno explícito ao gatilho.
- Tabs, menu e tooltip locais só avançam para uma rota quando seus testes de
  teclado, foco e acessibilidade existirem.
- Radix não é instalado antecipadamente. Antes do primeiro consumer de
  produção que exija portal, menu composto, popover ancorado ou comportamento
  que o primitive local/nativo não cubra, reavaliar packages individuais do
  Radix e registrar outro ADR.
- O standalone não ganha React nem Radix por causa desta decisão.

## Consequências

O primeiro incremento mantém bundle e superfícies de produto estáveis e torna
o comportamento observável sem tocar em registros persistidos. A contrapartida
é que cada overlay levado ao produto deve comprovar seu contrato antes da
migração; não é permitido copiar o markup demonstrativo do catálogo como uma
nova implementação imperativa.

## Rollback

O catálogo e os primitives ainda não são a única dependência comportamental de
nenhuma rota. Se o contrato falhar, remover seu consumer ou o catálogo não
requer migração de dados, alteração de engine ou mudança de Style Pack.
