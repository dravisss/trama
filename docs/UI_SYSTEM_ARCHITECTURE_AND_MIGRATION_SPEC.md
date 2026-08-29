# LoopViewer — Arquitetura do Sistema de UI e Plano de Migração

Status: especificação arquitetural normativa; a execução incremental compartilhada está registrada
em `docs/UI_SYSTEM_IMPLEMENTATION_LOG.md` e não equivale à conclusão das fases arquiteturais.

Tipo: Spec-Driven Development (SDD) + Test-Driven Development (TDD)

Escopo: aplicação React, shell, editor, Explore, Story Studio, Present, integração com o engine,
persistência local, export standalone, design system Matcha, responsividade, acessibilidade e QA.

Fora de escopo desta especificação: redesenhar o modelo causal, substituir Cytoscape, mudar o
schema SQLite, alterar o contrato Presentation V2 ou redesenhar o produto sem preservar as
funcionalidades atuais.

## 0. Relação entre os planos e Gate 0 compartilhado

`docs/UNIFIED_PRODUCT_DESIGN_SYSTEM_SPEC.md` é a especificação normativa para identidade Matcha,
tokens, primitives, catálogo, migração visual, publication tokens e a sequência R0–R9.

Este documento é a especificação-mãe para arquitetura: bounded contexts, ownership de estado,
ports/adapters, TDD, rollback, compatibilidade e governança. Ele não deve ser tratado como uma
segunda lista de tasks visuais.

Quando houver sobreposição:

- o Unified Design System governa a decisão visual e a ordem de migração das superfícies;
- este documento governa limites de dependência, estado, persistência e runtime;
- ambos usam os mesmos IDs de requisito, fixtures, baselines, Compatibility Manifest e stop
  conditions;
- uma task descrita no Unified não deve ser reimplementada por uma task equivalente aqui;
- a migração `loops → maps` fica fora deste programa e requer uma spec de dados própria.

### Gate 0 — pré-condição para execução

Antes de qualquer mudança de produção, os planos precisam compartilhar um checkpoint aprovado com:

1. classificação das alterações já existentes no worktree, incluindo generated outputs;
2. fixture e banco temporário de QA confirmados;
3. baseline atualizada de testes, roots, mount points, CSS, `!important`, bundles e warnings;
4. lista explícita de baseline exceptions classificadas como `preserve`, `fix` ou `known`;
5. Compatibility Manifest com owner e critério de remoção;
6. defaults da seção 27 da spec unificada aprovados ou substituídos por ADR;
7. primeiro PR limitado a baseline/infraestrutura, sem redesign e sem alteração de persistência.

O Gate 0 pode ser preparado em paralelo nos dois documentos. A execução de produção só começa
quando ele estiver aceito.

### Ordem canônica de execução

A numeração das fases arquiteturais descreve responsabilidades, não autoriza uma sequência
alternativa. A ordem normativa é:

```text
Gate 0 compartilhado
  → Fase 0/1: baseline, fixtures e TDD
    → Fase 2: tokens e cascata sem redesign
      → Fase 3: primitives e catálogo
        → Fase 4: piloto Workspace
          → Fase 6: application services/adapters, sem mudança visual
            → Fase 7: migração visual por superfície
              → Fase 8: standalone/publication
                → Fase 5: single React root e portals
                  → Fase 9: remoção de legado
                    → Fase 10: governança
```

Fase 6 pode avançar em paralelo com as tarefas visuais depois do piloto, desde que preserve
computed styles, comportamento e contratos. Fase 5 não pode começar antes da migração visual
equivalente estar verde. A sequência detalhada de tasks visuais é a do
`UNIFIED_PRODUCT_DESIGN_SYSTEM_SPEC.md`.

### Autoridade do baseline

As métricas factuais de checkout — testes, roots, mount points, folhas de estilo, `!important`,
warnings e exceções visuais — são mantidas na seção de diagnóstico da spec unificada. Este
documento não replica esses números para evitar divergência. O Gate 0 deve reexecutar a coleta e
registrar o snapshot aprovado antes da primeira alteração de produção.

Snapshot final desta execução (21-07-2026): 161 testes unitários, 4 testes Story, 44 E2E UI, 1
teste axe, 237 tokens, 1 `createRoot()`, 0 `!important` no app CSS, 10 faces de fonte locais,
15 baselines sem exceções e zero IDs órfãos. O `AppStore` publica snapshots de composição; os
adapters `renderX` e alguns bridges permanecem como contratos de compatibilidade e têm remoção
separada, sem bloquear a convergência visual desta entrega.

### Status correto desta especificação

O snapshot acima comprova a conclusão da migração visual e dos gates de composição previstos no
programa R0–R9. Ele **não** significa que toda a arquitetura de aplicação ou que uma adoção
completa de DDD esteja concluída.

| Linha de trabalho | Status em 21-07-2026 | Fonte de evidência |
| --- | --- | --- |
| Design System Matcha, tokens e cascata | concluída | `docs/UI_SYSTEM_IMPLEMENTATION_LOG.md`, R1–R2 |
| Migração visual das superfícies | concluída | `docs/UI_SYSTEM_IMPLEMENTATION_LOG.md`, R3–R7 |
| Root React, portals e lifecycle do canvas | concluída para o contrato atual | `docs/UI_SYSTEM_IMPLEMENTATION_LOG.md`, R8 |
| Remoção do CSS legado e governança visual | concluída | `docs/UI_SYSTEM_IMPLEMENTATION_LOG.md`, R9 |
| Application services e ports/adapters | parcialmente extraídos | `src/app/`, bridges, `src/platform/` |
| Bounded contexts, agregados e invariantes DDD | ainda não formalizados de ponta a ponta | backlog pós-R9 |
| Redução de `src/app.js` a composition root | pendente | Fase 6 |

Até que as três últimas linhas tenham critérios próprios aprovados e evidência correspondente,
o rótulo arquitetural correto é **monólito modular com DDD seletivo em evolução**, e não
“sistema completamente refatorado com DDD”.

---

## 1. Resultado esperado

O LoopViewer deve ter uma única identidade visual — **Matcha editorial** — expressa por tokens,
primitives e patterns reutilizáveis. Workspace, Editor, Explore, Story Studio e Present podem ter
densidades e composições diferentes, mas não podem redefinir independentemente cor, tipografia,
espaçamento, forma, estados de controle ou comportamento acessível.

A migração deve melhorar a arquitetura sem interromper os contratos maduros do produto:

- autoria local-first em SQLite;
- edição de mapas e views sem duplicar o modelo causal;
- preview visual sem persistência implícita;
- posições, locks e rotas editoriais preservadas;
- Story Studio e Presentation V2;
- paridade entre editor, playback e export standalone;
- engine reutilizável por `CLD.createCLD()`;
- funcionamento offline dos exports;
- IDs, foco, teclado e atributos de QA necessários durante a transição.

O resultado não é apenas “CSS mais organizado”. É uma arquitetura em que:

1. decisões visuais possuem uma autoridade única;
2. comportamento acessível é reutilizado por componentes;
3. React possui a composição visível da aplicação;
4. o runtime imperativo aparece atrás de portas explícitas;
5. cada estado possui uma única fonte de verdade;
6. mudanças podem ser entregues e revertidas em fatias pequenas;
7. regressões funcionais e visuais são detectadas automaticamente.

---

## 2. Evidências do estado atual

Esta especificação parte do código e da interface observados, não de uma arquitetura idealizada.

### 2.1 Pontos fortes que devem ser preservados

- O domínio causal já está separado em `src/core/`.
- Geometria e roteamento estão separados de DOM e persistência.
- `src/presentation/` oferece um contrato compartilhado entre editor e standalone.
- `src/platform/projectStore.js` mantém SQLite fora do engine público.
- `AppStore`, commands e bridges já iniciaram a extração do entrypoint imperativo.
- Preview e persistência de view são operações conceitualmente distintas.
- O standalone usa o mesmo modelo e compilador de apresentação.
- A suíte atual cobre domínio, roteamento, persistência, Presentation V2, bridges e alguns
  view models da aplicação.

Esses limites são ativos arquiteturais. A migração deve construí-la sobre eles.

### 2.2 Lacunas confirmadas (baseline histórica)

| ID | Evidência atual | Consequência |
| --- | --- | --- |
| GAP-01 | `index.html` carrega seis folhas de estilo da aplicação em sequência | A ordem da cascata funciona como arquitetura implícita. |
| GAP-02 | `styles.css`, `appShell.css` e `storyStudioV2.css` definem conjuntos próprios de tokens | Não existe uma autoridade visual única. |
| GAP-03 | Há centenas de declarações `!important`, concentradas no shell, Story Studio e `uiPolish.css` | Correções dependem de especificidade e ordem, dificultando remoção segura. |
| GAP-04 | `uiPolish.css` é uma camada de correção posterior | A fonte de verdade visual não coincide com o arquivo que declara possuir o shell. |
| GAP-05 | `src/react/main.jsx` monta diversas raízes React, inclusive raízes dentro de árvores montadas por outra raiz | Estado, lifecycle, context, erros e foco não atravessam a aplicação como uma árvore única. |
| GAP-06 | `index.html` ainda contém composição e controles legados enquanto React monta superfícies equivalentes | A propriedade real do DOM permanece híbrida. |
| GAP-07 | `src/app.js` tem mais de seis mil linhas e centenas de acessos a DOM, API e listeners | O composition root também contém políticas e implementação de features. |
| GAP-08 | O `AppStore` guarda callbacks e snapshots de view além do estado efêmero | O store pode virar um service locator e dificultar tipagem e testes. |
| GAP-09 | A suíte não possui infraestrutura declarada para testes React com DOM, acessibilidade e visual regression | Testes do domínio passam sem provar a integridade da interface. |
| GAP-10 | Fontes são carregadas pelo Google Fonts e dependências de runtime são carregadas por CDN no app | O comportamento local-first não está totalmente refletido no shell de desenvolvimento. |
| GAP-11 | O standalone possui DOM e CSS próprios | Convergência visual pode quebrar export se editor e publicação forem acoplados mecanicamente. |
| GAP-12 | Documentos existentes chamam partes da migração de “concluídas” apesar das raízes e bridges transitórias | O status documental não possui um gate objetivo de conclusão. |
| GAP-13 | Responsividade está codificada por superfície, sem contrato único de breakpoints e comportamentos | Mobile pode ser uma compressão acidental do desktop. |
| GAP-14 | Não há catálogo executável de primitives, estados e combinações suportadas | Reuso depende de memória e busca no CSS. |
| GAP-15 | Não há orçamento explícito de dívida de compatibilidade | Mount points, aliases, IDs e seletores transitórios podem permanecer indefinidamente. |

Estas lacunas descrevem o ponto de partida. No estado final desta execução, a maioria foi mitigada
por tokens/layers, catálogo, um root React, fixture Playwright, fontes locais e manifest de
compatibilidade. Permanecem fora desta entrega a redução total de `src/app.js`, a remoção física de
todos os bridges e a independência dos assets de engine/layout do CDN; esses itens têm escopo e
rollback próprios.

### 2.3 Inconsistências que exigem decisão, não correção automática

Estas diferenças podem ser legítimas. A spec não deve eliminá-las sem decisão de produto:

- Workspace pode ser mais editorial e espaçoso que Editor.
- Editor pode ter densidade alta para autoria.
- Explore pode reduzir comandos e enfatizar leitura causal.
- Story Studio pode assumir composição temporal e uma timeline persistente.
- Present pode ser cinematográfico e reduzir o chrome ao mínimo.
- O mapa pode ter uma linguagem visual diferente do chrome, desde que derive da mesma identidade.
- Standalone pode possuir um subconjunto dos componentes do editor para manter tamanho e
  independência.

A regra é: **modos podem variar por função, densidade e composição; não por identidade básica ou
comportamento de controles**.

---

## 3. O que faltava no plano anterior

O diagnóstico anterior acertou ao propor tokens, primitives e uma autoridade visual Matcha. Para
ser executável com segurança, ainda faltavam os seguintes elementos:

1. uma definição mensurável de “consistência” versus “variação intencional”;
2. um inventário dos contratos funcionais e visuais a congelar antes da migração;
3. uma decisão sobre as várias raízes React e a propriedade do DOM;
4. uma arquitetura de estado que separe persistido, domínio, renderer, app e componente;
5. uma arquitetura de dependências entre domínio, aplicação, adapters, features e design system;
6. uma taxonomia completa de tokens — referência, semântico, componente e contexto;
7. uma estratégia de cascata CSS com layers e orçamento de `!important`;
8. critérios para adotar ou rejeitar Radix, shadcn ou uma biblioteca visual completa;
9. infraestrutura de testes de componentes React e acessibilidade;
10. visual regression determinística e matriz de viewports/estados;
11. testes de contrato para standalone, export e funcionamento offline;
12. fases que não misturem mudança visual, mudança estrutural e remoção de compatibilidade;
13. feature flags, critérios de rollback e janela de convivência;
14. Definition of Ready e Definition of Done por fatia;
15. rastreabilidade entre problemas, decisões, histórias, tarefas, testes e aceite;
16. critérios objetivos para declarar o adapter legado removível;
17. governança para impedir que a divergência reapareça depois da migração;
18. revisão formal do plano, com ameaças e melhorias incorporadas.

---

## 4. Decisões propostas

As decisões abaixo devem ser registradas como ADRs curtas antes da implementação. Uma alteração de
decisão atualiza este documento e a matriz de rastreabilidade.

### DEC-01 — Estratégia de arquitetura

Adotar **monólito modular com DDD seletivo e ports/adapters**.

DDD é útil para separar os contextos de produto e nomear invariantes. Não se deve transformar
`Button`, `Panel` ou token CSS em entidade de domínio. O design system pertence à arquitetura de
interface; causalidade, visualização editorial, narrativa e workspace pertencem ao domínio do
produto.

### DEC-02 — Estratégia visual

Construir um design system interno Matcha, versionado no próprio repositório.

Não adotar MUI, Ant Design ou Chakra como autoridade visual. Essas bibliotecas resolveriam
comportamentos e componentes, mas introduziriam outra linguagem visual e um custo alto de
sobrescrita.

### DEC-03 — Primitives externas

Executar um spike pequeno com Radix Primitives somente para comportamentos complexos: Dialog,
Popover, DropdownMenu, Tabs e Tooltip. Adotar cada primitive apenas se:

- funcionar offline e entrar no bundle local;
- preservar SSR não é requisito, mas montagem/desmontagem e foco precisam ser determinísticos;
- não exigir CSS visual externo;
- passar testes de teclado e screen reader;
- não quebrar portals, clipping ou o canvas;
- o aumento de bundle for medido e aceito.

Se o spike falhar, manter primitives internas acessíveis. shadcn pode servir como referência de
código, não como segundo design system instalado por padrão.

### DEC-04 — Autoridade dos tokens

Tokens canônicos devem existir em uma única fonte versionada, com consumo CSS sob o prefixo
`--lv-*`. CSS consumível pelo editor e pelo standalone deve ser gerado ou materializado a partir
dela. Aliases legados como `--ui-*`, `--story-v2-*` e `--primary` foram compatibilidade temporária
durante a migração e foram removidos após uso-zero; nenhuma feature pode criar uma paleta paralela.

### DEC-05 — Propriedade do DOM

O estado final terá uma raiz React para a aplicação, mais portals declarados para modais,
popovers e overlays. Cytoscape permanece imperativo dentro de `CanvasHost`, com lifecycle
controlado por um adapter. Raízes transitórias podem coexistir apenas enquanto registradas no
manifesto de compatibilidade.

### DEC-06 — Standalone

Standalone continua sendo runtime separado e sem dependência de React. Ele reutiliza tokens de
publicação, contratos de domínio, Presentation V2 e view compilada — não componentes do editor.

### DEC-07 — Estratégia de entrega

Cada PR muda apenas um eixo principal:

1. observabilidade/testes;
2. tokens/cascata;
3. primitives/patterns;
4. composição React/estado;
5. compatibilidade/remoção;
6. refinamento visual.

Uma exceção precisa ser justificada no PR e ter rollback independente.

### DEC-08 — Fontes e ícones

Fontes usadas por app e export devem ser locais ou possuir fallback que preserve layout. Ícones
devem vir de um único registry local, com `currentColor`, dimensões e nomes acessíveis. Emoji não é
ícone de produto.

---

## 5. Opções avaliadas

| Opção | Descrição | Vantagens | Riscos | Decisão |
| --- | --- | --- | --- | --- |
| A | Limpar CSS e unificar cores sem mudar arquitetura | Rápida; baixo custo inicial | Divergência volta; roots e bridges continuam; difícil testar | Rejeitada como solução final |
| B | Design system interno + migração incremental + ports/adapters | Preserva identidade; reduz risco; melhora testabilidade | Exige disciplina e fases mais longas | **Recomendada** |
| C | Biblioteca visual completa | Muitos componentes prontos | Nova identidade, overrides, bundle e acoplamento | Rejeitada |
| D | Reescrita React limpa | Arquitetura final aparece mais rápido no papel | Alto risco funcional; rollback difícil; paralisa produto | Rejeitada |
| E | Manter várias raízes e criar somente Context bridges | Menor mudança estrutural | Lifecycle e ownership permanecem fragmentados | Permitida apenas como transição |

---

## 6. Arquitetura de domínio e contextos

### 6.1 Bounded contexts

```text
Causal Modeling
  Map, Node, Edge, Loop, Polarity, causal invariants

Visual Composition
  View, visual rules, position, route, layout, theme, style preview

Narrative Presentation
  Presentation, Chapter, Scene, Beat, Focus, Camera, playback

Workspace & Publication
  Project, repository, version, asset, import, backup, standalone export
```

Relações principais:

- Visual Composition referencia um Map; não duplica seus nós e relações.
- Narrative Presentation referencia mapas reais por `mapRef`.
- Workspace persiste aggregates e versões, mas não define causalidade.
- Publication compila snapshots autocontidos; não altera aggregates durante export.

### 6.2 Aggregate boundaries propostos

| Aggregate | Raiz | Invariantes principais |
| --- | --- | --- |
| Causal Map | `Map` | IDs únicos; edges referenciam nodes; loops são ciclos válidos; polaridade coerente |
| View | `View` | referencia um Map; herança acíclica; preview não implica save |
| Presentation | `Presentation` | cenas referenciam Map; focus resolve; camera V2 explícita; revisão monotônica |
| Project | `Project` | agrega referências a mapas, views, apresentações e assets; import não sobrescreve por acidente |

Não criar um aggregate “Application”. UI mode, painel aberto e hover são estados efêmeros.

---

## 7. Arquitetura de software alvo

### 7.1 Camadas e direção de dependência

```text
┌───────────────────────────────────────────────────────────────┐
│ UI foundation: tokens, primitives, patterns, layouts         │
└───────────────────────────────────────────────────────────────┘
                              ▲
┌───────────────────────────────────────────────────────────────┐
│ Feature UI: Workspace, Editor, Explore, Story, Present        │
└───────────────────────────────────────────────────────────────┘
                              │ intents + view models
                              ▼
┌───────────────────────────────────────────────────────────────┐
│ Application: use cases, commands, queries, state machines     │
└───────────────────────────────────────────────────────────────┘
                     │ ports                 ▲ events/snapshots
                     ▼                       │
┌───────────────────────────────────────────────────────────────┐
│ Adapters: SQLite/API, Cytoscape, browser, files, export       │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│ Domain: core causal, visual composition, presentation         │
└───────────────────────────────────────────────────────────────┘
```

Regras:

- `domain` não importa React, DOM, Cytoscape, HTTP ou SQLite.
- `application` pode importar domínio; não importa React nem seleciona elementos DOM.
- `features` importam application e UI foundation; não importam `src/app.js`.
- `adapters` implementam ports e podem usar browser, Cytoscape, API ou SQLite.
- somente `bootstrap` conhece todas as implementações concretas.
- standalone possui seu próprio bootstrap e adapter de DOM.

### 7.2 Estrutura de diretórios alvo

É uma direção incremental, não uma instrução para mover todos os arquivos de uma vez.

Para os diretórios específicos do design system e das rotas React, a estrutura normativa é a da
seção 9.1 da `UNIFIED_PRODUCT_DESIGN_SYSTEM_SPEC.md` (`src/design-system/`, `src/react/ui/`,
`src/react/patterns/`, `src/react/routes/` e `src/publication/`). A estrutura abaixo complementa
essa decisão com as camadas de domínio, aplicação e adapters; não cria nomes concorrentes para a UI.

```text
src/
  core/                         # domínio causal existente
  presentation/                 # domínio/runtime narrativo existente
  visual/                       # domínio de View e regras visuais puras
  application/
    ports/
    map/
    view/
    presentation/
    workspace/
    publication/
  adapters/
    cytoscape/
    browser/
    api/
    sqlite/                     # servidor; não entra no bundle do browser
    standalone/
  ui/
    tokens/
    primitives/
    patterns/
    layouts/
    icons/
    themes/matcha/
    dev/                        # catálogo interno, não publicado
  features/
    workspace/
    editor/
    explore/
    story-studio/
    present/
  app/
    App.jsx
    routes.js
    bootstrap.js
    legacy/                     # manifesto e adapters temporários
```

Arquivos atuais permanecem onde estão até uma fatia possuir testes e consumidor migrado. Mover
pastas sem mudar dependências não conta como avanço arquitetural.

### 7.3 Ports mínimos

```text
WorkspaceRepository
  loadProject(), listProjects(), openProject(), createProject(), backup(), import()

MapRepository
  list(), get(), create(), update(), remove(), versions(), restore()

ViewRepository
  listForMap(), create(), update(), remove()

PresentationRepository
  list(), get(), create(), update(expectedRevision), remove(), versions(), restore()

AssetRepository
  list(), getUrl(), create(), remove()

GraphRendererPort
  mount(), setModel(), setView(), setInteraction(), getSnapshot(), fit(), destroy()

StandalonePublisher
  compile(), download()
```

O API client implementa repositories no browser. `ProjectStore` implementa os mesmos conceitos no
servidor. Não é necessário expor classes de repository ao usuário final.

---

## 8. Propriedade do estado

| Estado | Fonte de verdade | Pode espelhar? | Regra |
| --- | --- | --- | --- |
| projeto, mapas, views, apresentações, assets | SQLite/API | cache de query | atualização só por use case |
| modelo causal em edição | snapshot de aplicação + engine | renderer | commit transacional preserva layout |
| posições e rotas | engine durante interação; modelo no commit | Cytoscape | captura por `getModel()` antes de persistir |
| view persistida | repository | cache | reload restaura |
| preview de view | `ViewDraft` efêmero | renderer | nunca chama save automaticamente |
| Presentation draft | application state | formulário React | revisão e dirty explícitos |
| modo, seleção, dock, diálogo | App/UI store | URL quando útil | não entra no modelo causal |
| hover, focus ring, input não submetido | componente | não | vida curta |
| zoom/pan de runtime | renderer/camera | app apenas quando capturado | não salva por acidente |

### 8.1 Mudanças propostas para o store

- O store deixa de guardar callbacks; componentes recebem services/hooks estáveis.
- Queries e commands possuem interfaces nomeadas, não objetos ad hoc.
- React consome o store por `useSyncExternalStore` ou adapter equivalente.
- Operações assíncronas usam estados `idle | pending | success | error` com erro preservado.
- Dirty state diferencia `mapDraft`, `viewDraft` e `presentationDraft`.
- Troca de modo consulta uma navigation guard quando houver draft não persistido.
- Renderer state não é clonado para React a cada frame.

---

## 9. Arquitetura do design system Matcha

### 9.1 Quatro níveis de token

1. **Reference tokens**: valores brutos, sem uso direto em components.
2. **Semantic tokens**: intenção de produto — surface, text, border, action, feedback.
3. **Component tokens**: aliases específicos de Button, Panel, Dialog, Timeline.
4. **Context tokens**: density e composition por modo, sem redefinir identidade.

O schema canônico é framework-agnostic, mas o consumo CSS usa o prefixo `--lv-*`. Aliases como
`--ui-*`, `--story-v2-*` e `--primary` são compatibilidade gerada e não podem ser usados em código
novo.

Exemplo:

```css
@layer tokens {
  :root {
    --lv-foundation-color-forest-900: #203d2d;
    --lv-foundation-space-3: 0.75rem;

    --lv-semantic-color-text-primary: var(--lv-foundation-color-forest-900);
    --lv-semantic-color-surface-canvas: #fbfaf4;
    --lv-semantic-space-control-inline: var(--lv-foundation-space-3);

    --lv-component-button-fg: var(--lv-semantic-color-text-primary);
    --lv-component-button-radius: var(--lv-semantic-radius-control);
  }

  [data-density="compact"] {
    --lv-context-control-height: 2rem;
    --lv-context-panel-padding: var(--lv-foundation-space-2);
  }
}
```

Features não podem consumir tokens de fundação diretamente. Contextos podem alterar densidade,
largura de painel e hierarquia; não podem criar outra paleta.

### 9.2 Famílias obrigatórias

- color: text, surface, border, action, focus, selection, positive, negative, warning, danger;
- typography: family, size, line-height, weight, tracking, editorial/utility roles;
- space: escala única;
- size: controls, icons, panels, rail, topbar;
- radius;
- shadow/elevation;
- motion: duration, easing, reduced motion;
- z-index: canvas, chrome, popover, dialog, toast, presentation;
- breakpoint e container behavior;
- opacity e disabled;
- focus ring;
- graph bridge: canvas/background, node/edge emphasis, semantic states.

### 9.3 Cascata

Ordem canônica:

```css
@layer reset, legacy, tokens, primitives, patterns, routes, states, utilities;
```

Regras:

- `legacy` contém somente compatibilidade durante a migração.
- `tokens` contém variables e aliases, sem seletores de componentes.
- `primitives` não conhece rotas.
- `patterns` contém composições recorrentes.
- `routes` contém grid e layout específicos de cada modo.
- `states` contém estados globais raros, como presenting e reduced motion.
- `utilities` é pequeno, documentado e sem regras de produto.
- `uiPolish.css` não recebe novas declarações.
- Novo código não usa `!important`; exceções temporárias ficam em `legacy` ou em regra de
  visibilidade com justificativa e teste.
- CSS de uma feature é escopado pelo componente ou atributo da feature, não por seletores globais
  que alcançam outras rotas.
- `body[data-ui-mode]` controla composição de alto nível apenas.
- Stylelint bloqueia hex, font-size e z-index crus fora de tokens, com allowlists explícitas.
- A ordem dos arquivos deixa de ser mecanismo de override entre produtos.

### 9.4 Primitives mínimas

```text
Button, IconButton, LinkButton
TextField, TextArea, Select, Checkbox, Radio, Switch
Field, Fieldset, Label, HelpText, ValidationMessage
Tabs, Toolbar, Menu, Popover, Tooltip
Dialog, AlertDialog, Drawer
Panel, Card, Section, Divider
Badge, Status, Toast, Spinner, Progress
EmptyState, ErrorState, Skeleton
VisuallyHidden, FocusBoundary, Portal
```

Cada primitive deve documentar:

- variantes suportadas;
- estados normal, hover, active, focus-visible, disabled, loading e invalid;
- keyboard contract;
- nome e descrição acessíveis;
- tokens consumidos;
- comportamento em high zoom e reduced motion;
- exemplos permitidos e anti-patterns.

### 9.5 Patterns de produto

```text
AppNavigation, ProductTopbar, CommandBar
WorkspaceCard, MapCard
ContextRail, InspectorDock, DockTabs
CanvasToolbar, SaveStatus, DirtyGuard
PropertyForm, DataTable, VersionHistory
StoryTimeline, StoryInspector, PresentationControls
```

Pattern compõe primitives. Feature fornece dados e commands. Pattern não chama API nem acessa
Cytoscape.

### 9.6 Catálogo executável

Criar uma rota/dev entry local para renderizar todos os primitives e patterns com estados. Não é
necessário introduzir Storybook no primeiro momento. O catálogo precisa:

- não entrar no bundle de produção;
- permitir troca de viewport e density;
- mostrar teclado/foco;
- expor light Matcha e, somente se aprovado, temas futuros;
- servir de fixture determinística para screenshots.

---

## 10. Contratos por superfície

### Workspace

- editorial e espaçoso;
- cards derivam dados reais de projetos e mapas;
- empty/loading/error states explícitos;
- abrir/criar/importar não pode duplicar registros;
- mobile usa lista de uma coluna sem scroll horizontal.

### Editor

- denso, canvas-first;
- um único `CanvasHost` e lifecycle de renderer;
- rail navega contexto; dock edita propriedades; toolbar manipula canvas;
- preview de Markdown/view nunca persiste implicitamente;
- inputs preservam draft durante render;
- operações estruturais preservam posições, locks e rotas.

### Explore

- leitura causal, menos chrome;
- descrições vêm de conteúdo autorado;
- foco em loop/edge é reversível;
- teclado percorre itens e retorna foco ao canvas/painel corretamente.

### Story Studio

- compartilha primitives e tokens; usa density e layout próprios;
- Visual, Markdown e Split editam a mesma Presentation;
- timeline, inspector e canvas compartilham seleção única;
- camera intent e focus permanecem visíveis e testáveis;
- drag/drop possui alternativa por teclado.

### Present

- reduz chrome e preserva orientação;
- usa o mesmo timeline/compiler do editor e standalone;
- suporta previous/next/escape, reduced motion e explore/resume;
- controles continuam legíveis em 200% de zoom.

### Standalone

- não depende do servidor, React, Google Fonts ou CDN;
- conserva view, presentation, assets e foco;
- usa tokens de publicação gerados da mesma fonte Matcha;
- suporta abrir por `file://` quando esse for o contrato do export;
- não carrega CSS do editor nem primitives desnecessárias.

---

## 11. Requisitos e critérios de aceite globais

### Arquitetura

- **ARCH-01**: nenhum arquivo de domínio importa React, DOM, Cytoscape, HTTP ou SQLite.
- **ARCH-02**: nenhum componente de feature importa `src/app.js`.
- **ARCH-03**: API, renderer e exporter são acessados por ports nomeados.
- **ARCH-04**: `src/app.js` termina como bootstrap/compatibilidade, sem implementação de features.
- **ARCH-05**: a aplicação possui uma raiz React e portals declarados; exceções transitórias constam
  em manifesto com owner e data de remoção.
- **ARCH-06**: cada estado da seção 8 possui uma fonte de verdade confirmada por teste.
- **ARCH-07**: Map, View e Presentation não duplicam o mesmo modelo causal.

### Sistema visual

- **VIS-01**: existe uma única fonte canônica de tokens Matcha.
- **VIS-02**: Story Studio não define paleta própria.
- **VIS-03**: nenhum novo `!important` entra no código.
- **VIS-04**: ao final, `uiPolish.css` é removido e exceções restantes ficam em allowlist.
- **VIS-05**: controles equivalentes têm a mesma tipografia, geometria e estados nos cinco modos.
- **VIS-06**: diferenças de density/layout são implementadas por context tokens.
- **VIS-07**: app, graph chrome e standalone mantêm continuidade Matcha verificável.

### Comportamento

- **BEH-01**: todas as jornadas críticas da seção 13 passam antes e depois de cada fatia.
- **BEH-02**: preview de mapa/view não dispara persistência.
- **BEH-03**: save serializado não perde a edição mais recente.
- **BEH-04**: troca de modo não remonta Cytoscape desnecessariamente.
- **BEH-05**: seleção de map/loop/node/edge/beat não diverge entre UI e engine.
- **BEH-06**: export e editor compilam a mesma Presentation timeline.
- **BEH-07**: abrir/fechar dialogs restaura foco ao disparador.

### Acessibilidade e responsividade

- **A11Y-01**: fluxos críticos são operáveis somente por teclado.
- **A11Y-02**: dialogs, menus, tabs e tooltips seguem os padrões ARIA aplicáveis.
- **A11Y-03**: contraste de texto, controles e focus ring passa WCAG AA.
- **A11Y-04**: zoom de 200% não remove ações críticas nem cria scroll horizontal global.
- **A11Y-05**: `prefers-reduced-motion` elimina movimentos não essenciais.
- **RESP-01**: 390×844, 768×1024, 1024×768 e 1440×900 possuem composições definidas.
- **RESP-02**: mobile não é apenas desktop comprimido; dock e rail viram overlays deliberados.

### Local-first, export e performance

- **LOCAL-01**: shell principal inicia sem Google Fonts ou bibliotecas de runtime via CDN.
- **LOCAL-02**: standalone funciona sem rede.
- **EXP-01**: export inclui apenas tokens e estilos necessários ao runtime de publicação.
- **PERF-01**: mudança paint-only não dispara relayout ou routing.
- **PERF-02**: interaction metrics não regredem além do orçamento documentado.
- **PERF-03**: a migração mede bundle antes/depois e registra dependências adicionadas.

---

## 12. Estratégia TDD

### 12.1 Regra de desenvolvimento

Toda fatia segue:

1. **Caracterizar** o comportamento existente que deve sobreviver.
2. **Red**: escrever teste do novo contrato ou da regressão conhecida.
3. **Green**: implementar a menor mudança que satisfaz o contrato.
4. **Refactor**: remover duplicação mantendo testes verdes.
5. Executar testes de integração, acessibilidade e visual da superfície.
6. Verificar standalone quando a fatia tocar tokens, presentation, view ou export.
7. Remover compatibilidade apenas em PR posterior.

Mudança visual intencional não é “aprovada” por atualizar snapshot. O PR precisa anexar baseline,
resultado e rationale.

### 12.2 Pirâmide de testes alvo

| Camada | Ferramenta proposta | O que prova |
| --- | --- | --- |
| domínio/pure functions | `node:test` existente | invariantes causais, presentation, routing, view |
| arquitetura estática | script Node + lint | imports proibidos, tokens crus, `!important`, roots transitórias |
| primitives/component | Vitest + React Testing Library + user-event | render, estado, eventos, teclado e foco |
| acessibilidade | axe-core integrado aos component tests | violações automatizáveis |
| application integration | fakes de ports | commands, save queue, dirty guard, erro e retry |
| renderer contract | fake `GraphRendererPort` + integração real selecionada | lifecycle, setModel/setView, captura e destroy |
| E2E | Playwright Test | jornadas reais com servidor e SQLite temporário |
| visual regression | Playwright screenshots | composição, tokens, responsividade e estados |
| standalone contract | build + browser offline | paridade, file/offline, assets, presentation |

Manter `node:test` para o domínio evita uma migração desnecessária. Vitest entra apenas para JSX e
DOM. Se a equipe optar por um único runner posteriormente, isso será outra decisão.

### 12.3 Scripts alvo

```json
{
  "test:unit": "node --test tests/*.test.mjs",
  "test:components": "vitest run",
  "test:e2e": "playwright test --project=chromium",
  "test:visual": "playwright test --grep @visual",
  "test:a11y": "playwright test --grep @a11y",
  "test:standalone": "playwright test --grep @standalone",
  "lint:architecture": "node scripts/check-ui-architecture.mjs",
  "check": "npm run test:unit && npm run test:components && npm run lint:architecture && npm run build",
  "check:release": "npm run check && npm run test:e2e && npm run test:visual && npm run test:standalone"
}
```

Nomes finais podem mudar; a separação entre feedback rápido e release gate é obrigatória.

### 12.4 Fixtures determinísticas

- projeto vazio;
- projeto com um mapa simples sem mídia;
- “Sobrecarga de Filas” com mídia, loops, view e Presentation V2;
- mapa denso 8/16/32 para canvas e routing;
- apresentação flagship multi-loop;
- estados de falha: API indisponível, conflito de revisão, asset ausente e save falho.

E2E nunca deve depender do banco pessoal `data/loopviewer.db`. Cada teste cria banco temporário e o
descarta após execução.

---

## 13. Jornadas críticas de não regressão

| ID | Jornada | Asserções essenciais |
| --- | --- | --- |
| J01 | abrir projeto → escolher mapa → Editor | mapa correto, um canvas, sem duplicação, console limpo |
| J02 | criar mapa vazio → adicionar nodes/edge → salvar → reload | IDs e conteúdo preservados |
| J03 | importar `.loop.md` → preview → cancelar | canvas pode mudar; SQLite não muda |
| J04 | importar/aplicar `.loop.md` → salvar | modelo válido, layout conforme contrato |
| J05 | trocar preset/view → preview → reload sem salvar | view persistida anterior retorna |
| J06 | trocar preset/view → salvar → reload | mesma view e composição retornam |
| J07 | selecionar node/edge/loop → editar Inspector | seleção e modelo convergem |
| J08 | drag/lock → salvar → reload | posição, lock e rota preservados |
| J09 | Explore → focar loop → limpar foco | conteúdo real e restauração visual |
| J10 | Story Studio → selecionar/reordenar beat → salvar | timeline e revisão preservadas |
| J11 | editar Story Markdown ↔ Visual | mesma Presentation sem perda silenciosa |
| J12 | Present → next/previous → explore/resume → close | controller e câmera coerentes |
| J13 | export standalone → abrir offline | mapa, view, assets e apresentação funcionam |
| J14 | erro de save → retry | dirty permanece até sucesso; nenhuma edição perdida |
| J15 | mudar modo com draft | guard oferece salvar, descartar ou permanecer |
| J16 | teclado completo | foco visível, ordem lógica, escape e retorno de foco |

---

## 14. Matriz de visual regression

### Viewports mínimas

- desktop amplo: 1440×900;
- desktop compacto: 1024×768;
- tablet retrato: 768×1024;
- mobile: 390×844;
- zoom manual/assistido: 200% em pelo menos desktop compacto.

### Superfícies e estados

| Superfície | Estados mínimos |
| --- | --- |
| Workspace | loading, projeto com mapas, vazio, erro, menu de projeto |
| Editor | sem seleção, node, edge, dock aberto, dirty, save error, dialog |
| Explore | lista, loop focado, relação selecionada, conteúdo ausente |
| Story Studio | beat selecionado, Markdown, Split, dialog de movimento, timeline longa |
| Present | início, beat intermediário, explore, reduced motion, final |
| Standalone | sidebar, sem sidebar, story, asset, presentation-only |
| Catálogo | todos os primitives nos estados suportados |

Screenshots usam dados, fontes e animações determinísticos. Tolerância de pixel não substitui
inspeção semântica de DOM, foco, overflow e console.

---

## 15. Plano de execução por fases

Cada fase possui gate de entrada e saída. Não iniciar a seguinte se o gate anterior estiver
vermelho.

### Fase 0 — Contrato, baseline e ADRs

Objetivo: tornar o sistema atual verificável antes de alterá-lo.

Tarefas:

- criar ADRs DEC-01 a DEC-08;
- criar inventário de todos os CSS, roots React, IDs públicos, bridges e listeners;
- classificar IDs como `public`, `QA`, `legacy` ou `internal`;
- registrar computed styles de primitives aparentes nos cinco modos;
- capturar screenshots baseline da matriz mínima;
- registrar jornadas J01–J16 e quais já são automatizadas;
- criar manifesto `legacy-ui-contract.json` com owner e condição de remoção;
- registrar métricas: bundle, roots, CSS, `!important`, listeners e tempos das jornadas.

Gate:

- nenhuma mudança visual;
- `npm run check` verde;
- baselines reproduzíveis em duas execuções;
- todo contrato crítico possui teste ou risco explícito.

### Fase 1 — Infraestrutura TDD e observabilidade

Objetivo: detectar regressões antes da migração.

Tarefas:

- adicionar Vitest/RTL/user-event/axe para components;
- adicionar Playwright Test com servidor e banco temporários;
- criar fixtures determinísticas;
- automatizar J01, J03, J05, J08, J10, J12, J13 e J14 primeiro;
- criar architecture check inicial em modo relatório;
- capturar erros/warnings de console como falha;
- criar teste de lifecycle: exatamente um renderer montado por canvas;
- criar teste offline do standalone.

Gate:

- testes falham quando se injeta uma regressão conhecida;
- E2E não altera o banco real;
- flaky rate zero em cinco execuções locais consecutivas das jornadas gate.

### Fase 2 — Fonte única de tokens, sem redesign

Objetivo: trocar a autoridade sem alterar pixels deliberadamente.

Tarefas:

- inventariar todos os valores atuais e agrupá-los por intenção;
- criar reference e semantic tokens Matcha;
- mapear aliases `--primary`, `--ui-*` e `--story-v2-*` temporariamente;
- introduzir CSS layers;
- gerar bundle de tokens do editor e subset de publicação;
- self-host ou empacotar fontes;
- criar linter de token cru e `!important` para novo código;
- congelar `uiPolish.css`.

Gate:

- visual diff não intencional dentro do baseline acordado;
- nenhum modo perde computed values essenciais;
- standalone continua offline e visualmente equivalente;
- uma única fonte gera os tokens consumidos.

Rollback: restaurar apenas os imports/aliases de token; components e React não mudam nesta fase.

### Fase 3 — Primitives e catálogo

Objetivo: centralizar comportamento e estados mantendo a aparência atual.

Tarefas:

- implementar Button, IconButton, Field, Select, Checkbox, Tabs, Panel e Dialog;
- realizar spike Radix conforme DEC-03;
- implementar foco, disabled, loading e invalid;
- criar catálogo executável;
- criar teste de contrato e axe para cada primitive;
- criar registry de ícones;
- definir API de composição e proibir variant names específicos de feature.

Gate:

- primitives passam teclado, foco e axe;
- nenhum primitive chama API, store global ou renderer;
- catálogo cobre 100% das variantes públicas;
- nenhuma feature foi redesenhada ainda.

### Fase 4 — Piloto vertical no Workspace

Objetivo: validar o processo completo na superfície de menor acoplamento com Cytoscape.

Tarefas:

- migrar cards, empty/loading/error states e ações do Workspace;
- usar patterns derivados de primitives;
- preservar callbacks/use cases existentes atrás de interfaces explícitas;
- remover CSS e DOM legado somente do Workspace em PR posterior;
- executar visual QA nas quatro viewports.

Gate:

- J01 e criação/abertura/import passam;
- zero regressão de persistência;
- zero seletor legado do Workspace fora do manifesto;
- rollback da fatia não afeta Editor/Story/standalone.

### Fase 5 — Shell e composição React (após a migração visual)

Objetivo: estabelecer uma árvore React e navegação estável sem refinamento visual simultâneo.

Precondição normativa: esta fase só começa depois que as superfícies previstas na seção 7 tiverem
passado pelo fluxo visual do Unified Design System — equivalentes às tasks T-027 a T-042 — e seus
contratos funcionais, acessibilidade e baselines estiverem verdes. A ordem dos títulos desta
especificação não substitui a ordem normativa R0–R9 do documento unificado.

Tarefas:

- criar `App` único com boundaries por modo;
- mover dialogs/overlays para portals declarados;
- conectar AppStore com hook estável;
- remover callbacks do store;
- manter CanvasHost estável entre rotas que compartilham o mapa;
- substituir roots secundárias uma por vez;
- manter aliases de IDs enquanto bridges dependem deles;
- adicionar error boundary por feature.

Gate:

- uma raiz React de aplicação;
- nenhum nested root;
- renderer não remonta ao trocar apenas dock/modo compatível;
- navegação e foco passam J01, J09, J10, J12 e J16;
- nenhuma mudança visual ampla nesta fase.

Rollback: feature flag volta a montar a composição anterior; schema e dados não mudam.

### Fase 6 — Application services e adapters

Objetivo: retirar políticas de `src/app.js` sem redesenhar UI.

Ordem sugerida:

1. WorkspaceRepository/API;
2. ViewDraft + persistência de view;
3. Map editing commands;
4. Presentation draft/revision;
5. GraphRendererPort;
6. standalone publisher;
7. transient overlays e keyboard commands.

Para cada extração:

- escrever characterization test;
- definir port e fake;
- mover use case;
- adaptar implementação atual;
- trocar um consumidor;
- remover caminho antigo em PR posterior.

Gate:

- `src/app.js` é composition/compatibility root, sem regra de domínio;
- imports proibidos passam architecture check;
- save, retry, conflict e dirty guard possuem testes;
- nenhum component acessa `document.querySelector` para operar outra feature.

### Fase 7 — Migração visual por superfície

Objetivo: convergir a identidade com mudanças deliberadas e revisáveis.

Esta fase é a execução arquitetural dos fluxos visuais definidos no Unified Design System. Ela
deve ocorrer antes da Fase 5 desta especificação, embora permaneça numerada aqui para manter a
separação entre controle arquitetural e catálogo de tasks visuais.

Ordem:

1. Workspace;
2. global navigation/topbar;
3. Explore;
4. Editor chrome e forms;
5. Story Studio;
6. Present;
7. modais, menus e estados raros.

Cada superfície passa por:

- inventário antes/depois;
- tokens e patterns aplicados;
- responsividade definida, não inferida;
- keyboard/a11y;
- screenshots baseline/result;
- revisão de hierarquia, densidade e consistência;
- aceite explícito do visual intencional.

Gate por superfície:

- nenhuma regra nova em `uiPolish.css`;
- nenhum token paralelo;
- todos os estados da matriz cobertos;
- jornada funcional da superfície verde;
- standalone verificado quando contrato compartilhado for tocado.

### Fase 8 — Standalone e publicação

Objetivo: compartilhar identidade sem acoplar runtime.

Tarefas:

- consumir publication tokens gerados;
- alinhar primitives visuais mínimas em CSS próprio;
- empacotar fontes/assets necessários;
- testar `file://`, servidor estático e embed;
- verificar mensagens `postMessage`, allowed origins e presentation-only;
- comparar editor/standalone para view e Presentation.

Gate:

- LOCAL-02, EXP-01 e BEH-06 verdes;
- bundle e tempo de export dentro dos budgets;
- nenhuma dependência do CSS do editor ou de React.

### Fase 9 — Remoção de legado

Objetivo: apagar a ponte somente depois de provar que não é mais necessária.

Tarefas:

- remover mount points do manifesto um por PR;
- remover seletores CSS mortos com coverage/evidência;
- remover `uiPolish.css`;
- reduzir aliases de IDs públicos aos contratos realmente externos;
- remover bridges sem consumidores;
- atualizar docs de status com evidência atual;
- transformar architecture check de relatório em bloqueio.

Gate:

- busca não encontra import ou selector legado não permitido;
- J01–J16 e release gate verdes;
- rollback continua possível pelo commit anterior, não por dois runtimes ativos;
- documentação e código concordam sobre ownership.

### Fase 10 — Governança contínua

Objetivo: impedir nova fragmentação.

- PR template pergunta sobre primitive existente, token, a11y, visual diff e standalone;
- novos components entram pelo catálogo;
- architecture lint e visual gate rodam no CI;
- versão de tokens e changelog para mudanças visuais relevantes;
- revisão trimestral de exceptions/allowlists;
- nenhuma pasta `v2`, `new`, `polish` ou `final` permanece sem plano de remoção.

---

## 16. Feature flags, rollout e rollback

Flags locais sugeridas:

```text
ui.tokens.v2
ui.primitives.v1
ui.react.singleRoot
ui.surface.workspace.v2
ui.surface.editor.v2
ui.surface.explore.v2
ui.surface.story.v2
ui.surface.present.v2
```

Regras:

- flags não alteram schema persistido;
- formato de dados permanece backward-compatible durante a transição;
- cada flag possui owner, data de expiração e teste dos dois caminhos;
- no máximo um caminho alternativo por superfície;
- flag removida no máximo duas fases após estabilização;
- rollback nunca exige restaurar banco;
- antes de remoção de compatibilidade, gerar backup e testar import do bundle atual.

---

## 17. Definition of Ready

Uma fatia só começa quando:

- possui problema e resultado observável;
- lista contratos funcionais preservados;
- possui design/estados necessários;
- identifica source of truth e ports envolvidos;
- declara se toca standalone;
- possui testes Red definidos;
- possui fixtures determinísticas;
- possui plano de rollback;
- não mistura outro eixo principal sem justificativa;
- não conflita com alterações locais em andamento.

## 18. Definition of Done

Uma fatia termina quando:

- critérios de aceite têm evidência;
- testes unitários/component/integration aplicáveis estão verdes;
- jornada E2E da superfície passa;
- teclado, foco, axe e responsividade foram verificados;
- visual diff foi aprovado ou é zero quando deveria ser;
- console não possui erros/warnings novos;
- standalone foi verificado quando aplicável;
- bundle/performance foram medidos quando aplicável;
- compatibilidade adicionada está no manifesto;
- CSS/bridge morto foi removido em PR separado ou possui tarefa explícita;
- docs e status foram atualizados.

---

## 19. Riscos e mitigação

| Risco | Probabilidade/impacto | Mitigação | Sinal de rollback |
| --- | --- | --- | --- |
| remount do Cytoscape perde estado | alta/alta | CanvasHost estável + lifecycle test | segundo renderer ou perda de zoom/layout |
| estado duplicado React/adapter | alta/alta | tabela de ownership + commands | UI e engine mostram seleção/modelo diferentes |
| preview salva sem intenção | média/alta | ViewDraft + repository spy | chamada PUT/POST durante preview |
| CSS novo altera standalone | média/alta | bundle separado + offline test | diff não intencional/export quebrado |
| roots removidas quebram IDs/listeners | alta/média | manifesto + characterization | ação deixa de responder/duplicação de handler |
| screenshot flakiness | média/média | fixtures/fontes/animação determinísticas | baseline muda sem alteração |
| biblioteca externa impõe visual | média/média | spike e wrapping mínimo | CSS de override cresce |
| refatoração longa congela features | média/alta | fatias verticais e flags curtas | branches grandes ou mais de um eixo/PR |
| `!important` reaparece | alta/média | lint e layers | aumento do orçamento |
| mobile perde funcionalidade | alta/alta | contrato por viewport + J16 | ação crítica inacessível/overflow global |
| dados pessoais usados em E2E | baixa/alta | banco temporário obrigatório | teste aponta para `data/loopviewer.db` |
| docs ficam otimistas | alta/média | status derivado de gates | “concluído” sem evidência atual |

---

## 20. Rastreabilidade inicial

| Lacuna | Decisão/feature | Aceite | Testes/jornadas | Fase |
| --- | --- | --- | --- | --- |
| GAP-01/02/03/04 | tokens + cascade layers | VIS-01–04 | visual matrix + architecture lint | 2, 7, 9 |
| GAP-05/06 | single React root | ARCH-05, BEH-04 | J01, J09, J10, lifecycle | 5 |
| GAP-07/08 | application ports/state ownership | ARCH-03/04/06 | J02–J15, integration fakes | 6 |
| GAP-09 | test infrastructure | BEH-01, A11Y-01–05 | full pyramid | 1 |
| GAP-10 | local assets | LOCAL-01/02 | offline app/standalone | 2, 8 |
| GAP-11 | publication boundary | EXP-01, BEH-06 | J13 + parity test | 8 |
| GAP-12/15 | gates + legacy manifest | ARCH-04/05 | architecture check | 0, 9 |
| GAP-13 | context layout contract | RESP-01/02 | viewport matrix | 7 |
| GAP-14 | primitives/catalog | VIS-05/06 | component + catalog visuals | 3 |

Uma versão executável desta matriz deve ganhar IDs de tasks/PRs durante o planejamento de cada
fase. Nenhum requisito P0 pode ficar sem teste ou evidência manual nomeada.

---

## 21. Ordem sugerida de PRs iniciais

1. ADRs + manifesto de compatibilidade + métricas baseline.
2. Playwright com banco temporário e J01/J13.
3. React component test harness + Button/Dialog characterization.
4. Source de tokens + aliases sem visual diff.
5. CSS layers + freeze de `uiPolish.css`.
6. Catálogo + Button/IconButton/Field.
7. Workspace patterns preservando aparência.
8. Remoção do CSS/DOM legado apenas do Workspace.
9. Hook do AppStore sem callbacks no store.
10. App root walking skeleton atrás de flag.

Essa sequência valida o método antes de tocar Editor, Story Studio e Present, que carregam maior
risco de engine, timeline e câmera.

---

## 22. Questões abertas que precisam de decisão

Estas perguntas não bloqueiam a escrita da spec, mas bloqueiam fases específicas:

1. A aplicação desktop precisa funcionar totalmente sem internet ou apenas o standalone? A
   recomendação é tornar ambos independentes de CDN.
2. A versão mobile precisa permitir autoria completa ou prioriza leitura + ajustes essenciais?
3. Há interesse real em tema escuro? Se não, removê-lo do escopo para evitar duplicar tokens.
4. O ID público é contrato externo ou apenas bridge transitória? Classificar individualmente.
5. Radix será aceito como dependência se o spike passar?
6. Qual tolerância visual vale para a Fase 2 “sem redesign”: pixel-perfect ou thresholds por região?
7. Quais browsers além de Chromium entram no release gate local?
8. O catálogo interno deve ser uma rota `?ui-catalog=1` ou entry HTML separado?
9. A árvore React única deve manter todas as rotas montadas ou preservar somente CanvasHost entre
   modos compatíveis?
10. Quando `loops` legados deixarem de ser fonte de compatibilidade, essa migração será projeto
    separado? A recomendação é sim, para não misturar persistência com UI.

---

## 23. Revisão crítica do plano

### O que esta versão melhora

- separa identidade, components, React ownership e runtime;
- usa DDD onde há linguagem e invariantes de negócio;
- preserva standalone como produto de publicação independente;
- torna TDD aplicável a React sem substituir a suíte de domínio;
- define gates e rollback por fase;
- transforma CSS e roots transitórias em dívida mensurável;
- inclui estados raros, acessibilidade, offline, performance e dados reais;
- evita que “migração concluída” seja uma afirmação sem evidência.

### Ameaças restantes

- visual regression não avalia sozinho qualidade editorial;
- line count de `src/app.js` é sintoma, não objetivo;
- single root pode virar outro monólito se features não tiverem boundaries;
- primitives podem se tornar uma biblioteca genérica excessiva;
- flags podem prolongar duplicação se não expirarem;
- DDD pode aumentar cerimônia se repositories/use cases forem criados sem uma variação real de
  infraestrutura ou regra de negócio;
- migrar todas as telas antes de validar o Workspace piloto seria desperdício.

### Melhorias incorporadas após a revisão

1. O plano começa por testes e baseline, não por tokens.
2. Tokens são migrados sem redesign antes de qualquer convergência visual.
3. Primitives são validados em catálogo e Workspace piloto.
4. Single root é uma fase estrutural separada da fase visual.
5. Application services são extraídos antes de remover bridges.
6. Standalone possui fase e gate próprios.
7. Remoção de legado acontece somente depois da estabilização.
8. DDD é limitado aos quatro bounded contexts reais.
9. Cada PR possui um eixo principal e rollback independente.
10. O plano inclui governança para impedir recaída.

---

## 24. Recomendação final

Executar a **Opção B** como uma sequência de fatias verificáveis. O primeiro milestone não deve ser
“a UI nova”; deve ser **baseline + TDD + tokens canônicos + primitives mínimas + Workspace piloto**.

Somente depois desse milestone deve-se consolidar a árvore React e avançar pelas superfícies de
maior risco. Isso entrega evidência cedo, preserva as funcionalidades maduras e cria um caminho
em que cada remoção de legado é consequência de um contrato já provado — não uma aposta.

## 25. Pós-R9 — Arquitetura de aplicação e DDD

Esta etapa é o backlog arquitetural posterior à convergência visual. Ela não reabre as fases R0–R9
nem autoriza uma reescrita ampla. Seu objetivo é tornar explícitos os limites de domínio,
aplicação e infraestrutura sem alterar o contrato funcional já validado.

### 25.1 Contextos candidatos

Os contextos abaixo são hipóteses de trabalho e devem ser confirmados por ADR antes da extração:

- **Map Authoring**: modelo CLD, nós, relações, polaridades, loops, posições e rotas editoriais;
- **Presentation/Story**: Presentation V2, capítulos, cenas, beats, foco e intenção de câmera;
- **View/Style**: views, Style Packs, regras compiladas e preview sem persistência implícita;
- **Workspace**: projeto, mapas, seleção, dirty state, autosave e versões;
- **Publication**: export standalone, payload, fontes, assets e modos de publicação.

Layout, Cytoscape, DOM, SQLite e HTTP são infraestrutura/adapters, não entidades de domínio.

### 25.2 Ordem segura de extração

1. Congelar o comportamento atual com testes de caracterização para salvar, retry, dirty guard,
   edição de mapa, edição de Presentation, preview de view e export.
2. Definir comandos de aplicação pequenos: `EditMap`, `SaveMap`, `EditPresentation`, `SaveView` e
   `ExportStandalone`.
3. Definir ports para `MapRepository`, `PresentationRepository`, `ViewRepository`,
   `AssetRepository`, `ProjectRepository` e `GraphRendererPort`.
4. Adaptar os contratos atuais de API, `ProjectStore`, Cytoscape e export para essas ports, sem
   mudar o schema SQLite.
5. Mover uma política por vez de `src/app.js` para um application service, começando por Workspace,
   depois View, Map, Presentation e Publication.
6. Tornar `src/app.js` progressivamente um composition root e compatibility root, sem regras de
   domínio nem acesso direto a detalhes de persistência.
7. Formalizar invariantes e value objects somente onde houver comportamento real: IDs, sinais,
   referências de Presentation, camera intent, dirty state e revisão/versionamento.
8. Remover bridges apenas quando o Compatibility Manifest e os testes de contrato demonstrarem
   uso-zero.

### 25.3 Critérios de aceite do backlog pós-R9

- nenhum caso de uso de produto depende de React, DOM, Cytoscape ou SQLite;
- cada contexto possui linguagem, invariantes e dependências documentadas;
- repositories são consumidos por ports, e não por componentes React;
- `src/app.js` contém composição, wiring e compatibilidade, não política de domínio;
- falhas de persistência, conflito, retry e dirty guard têm testes de aplicação;
- editor, Story Studio, Present e standalone preservam comportamento e contratos existentes;
- o schema e os dados existentes continuam compatíveis e não exigem migração destrutiva;
- cada bridge removido tem evidência de uso-zero, rollback e teste de regressão;
- `npm run check`, `npm run check:ui` e os testes de contrato permanecem verdes após cada fatia.

### 25.4 Regra de execução

O backlog pós-R9 pode ser executado em paralelo com refinamentos visuais, desde que não altere
tokens, primitives ou contratos de superfície sem passar pelos gates do Unified Design System.
Uma mudança que altere simultaneamente domínio, persistência e UI deve ser dividida em fatias
independentes ou precedida por ADR e plano de rollback específico.

### 25.5 Estado da primeira fatia — SaveMap

Em 21-07-2026, a primeira fatia foi limitada ao contexto **Workspace** e ao
caso de uso `SaveMap`, conforme `docs/adr/0003-save-map-application-slice.md`.

- `src/application/workspace/saveMap.js` recebe um snapshot de mapa e não
  depende de React, DOM, Cytoscape ou SQLite.
- `MapRepository.update(map)` é a port mínima usada pelo caso de uso.
- `src/adapters/api/mapRepository.js` preserva o `PUT /api/maps/:id`, a
  disponibilidade offline e a serialização por mapa.
- `workspacePersistence.saveMap({ entry })` continua como wrapper de
  compatibilidade; o autosave map-first em `src/app.js` usa `SaveMap`.
- O schema SQLite, Presentation V2, tokens, engine, bridges e export standalone
  não foram alterados.
- A primeira fatia foi encerrada nesse limite; a segunda fatia, `EditMap` no
  submit do Inspector, está documentada em
  `docs/adr/0004-edit-map-inspector-application-slice.md`.
- `npm test` (165), `npm run check` e axe passaram; `npm run check:ui` mantém
  uma pendência independente no baseline visual `map-tablet` (7.186 pixels,
  1%), reproduzida isoladamente. Nenhum snapshot foi atualizado.

### 25.6 Estado da segunda fatia — EditMap no Inspector

Em 21-07-2026, a segunda fatia foi limitada ao comando de edição submetido
pelos Inspectors de mapa, conforme
`docs/adr/0004-edit-map-inspector-application-slice.md`.

- `src/application/map/editMap.js` recebe `{ target, changes }` e conhece
  apenas a `MapEditorPort`.
- A port explicita `updateNode`, `updateNodes` e `updateEdge`; o adapter do
  engine preserva o `CLDEngine` como dono de história, render e eventos.
- O submit do Inspector e o popover legado usam o caso de uso; criação,
  remoção, movimento, rotas, views, Presentation e export permanecem fora.
- Testes cobrem nó único, seleção múltipla, relação, validação de comando e
  forwarding do adapter.
- O schema SQLite, Presentation V2, tokens, bridges e standalone não foram
  alterados.

### 25.7 Fechamento de QA browser após a segunda fatia

Após a integração de `EditMap`, a validação browser foi repetida com foco em
timing de câmera, seleção no canvas, rota manual e persistência de View.

- `src/app.js` publica `data-qa-camera-stable` somente depois do fit de layout
  assentado; os helpers de E2E usam essa condição e pontos reais renderizados
  pelo Cytoscape.
- A reconciliação do autosave preserva o contexto de view mais recente, e o
  `SaveView` usa a view selecionada como alvo explícito. Isso evita gravar o
  preset na view errada durante requests concorrentes.
- `npm run check`: 170 testes unitários, 4 Story Studio e build aprovados.
- `npm run check:ui`: contratos/legacy aprovados, 44 E2E UI aprovados em todos
  os viewports e 1 teste axe aprovado sem violações critical/serious.
- `map-tablet` e `map-mobile` têm snapshots atualizados intencionalmente. A
  mudança ficou restrita ao canvas resultante da câmera determinística; não
  houve atualização de Explore ou Story.
- `git diff --check` passou. A fatia não altera schema SQLite, Presentation V2,
  tokens ou export standalone.

### 25.8 Estado da terceira fatia — SaveView

Em 21-07-2026, a terceira fatia foi limitada ao contexto **View/Style** e à
persistência explícita da view ativa, conforme
`docs/adr/0005-save-view-application-slice.md`.

- `src/application/view/saveView.js` normaliza o snapshot autorado e não
  depende de UI ou infraestrutura.
- `src/application/ports/viewRepository.js` define o contrato mínimo; o
  adapter `src/adapters/api/viewRepository.js` preserva listagem/PUT/POST,
  serialização por view e retry após falha.
- Preview permanece local e só o comando de salvar alcança a port. Criação,
  duplicação, remoção e herança de views permanecem fora da fatia.
- `npm test`: 175 aprovados; `npm run check`: 175 + 4 Story + build aprovados.
- `npm run check:ui`: 44 E2E aprovados; axe: 1 aprovado sem violações
  critical/serious; `git diff --check`: aprovado.
