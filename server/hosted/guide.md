# {{PRODUCT}} — guide for agents

{{PRODUCT}} ({{PUBLIC_URL}}) hosts interactive causal loop diagrams (systems-thinking maps) and narrated,
step-by-step presentations of those maps. Anyone can use it without an account. Agents can talk to it
through MCP, a REST API, or the `trama` CLI.

## Access model: secret links, no accounts

- A **workspace** holds maps and presentations. Creating one returns:
  - `edit_token` / `edit_url` (`{{PUBLIC_URL}}/w/<edit_token>`): full edit access. Treat it like a
    password. Do not publish it. It cannot be recovered if lost.
  - `share_url` (`{{PUBLIC_URL}}/p/<share_token>`): a read-only interactive publication. Safe to share.
    Append `?map=<map_id>` to open a map and `&mode=presentation` to start its presentation.
  - `mcp_url` (`{{PUBLIC_URL}}/w/<edit_token>/mcp`): an MCP endpoint already bound to that workspace.
- Workspaces that are never edited are removed after {{UNTOUCHED_DAYS}} days. Workspaces nobody opens for
  {{INACTIVE_DAYS}} days are removed too. Export a backup (`GET /api/v1/workspace/export`) if the work matters.

## Connecting

- **MCP (Streamable HTTP):** `{{PUBLIC_URL}}/mcp`. Pass `Authorization: Bearer <edit_token>`, or use the
  workspace URL `{{PUBLIC_URL}}/w/<edit_token>/mcp`, or give the `workspace_token` argument to each tool.
  Call `create_workspace` first if you have no workspace yet.
- **REST:** `{{PUBLIC_URL}}/api/v1` with `Authorization: Bearer <edit_token>`. OpenAPI:
  `{{PUBLIC_URL}}/api/v1/openapi.json`.
- **CLI:** the CLI is a single dependency-free file (Node 18+):
  `curl -fsSLo trama.mjs {{PUBLIC_URL}}/cli/trama.mjs && node trama.mjs help`. Configure it with
  `TRAMA_URL={{PUBLIC_URL}}` and `TRAMA_TOKEN=<edit_token>`, or run `node trama.mjs init`.

## Recommended workflow

1. Understand the phenomenon first. Name the question the map answers, the variables, the direction of
   each influence and the trajectory a reader should follow. Include the point where a local response
   creates a system-level consequence.
2. Write the **map** as loop Markdown (`.loop.md`, below). Run `validate_map` (or
   `POST /api/v1/validate/map`). Read the report: `errors` block saving. Each `warnings` entry says a
   loop's R/B label disagrees with its signs, or that a "loop" is not a closed directed cycle.
3. Save it with `save_map` (or `POST /api/v1/maps`).
4. Write the **presentation** as story Markdown (`.story.md`) that references the real ids of the map.
   Validate with `validate_story`, then save with `save_presentation`
   (`POST /api/v1/maps/<map_id>/presentation`). Each map has one presentation; saving again updates it.
5. Share `links.share_url` / `links.present_url` from the response.

`publish` (MCP) or `POST /api/v1/publish` does steps 3–5 in one call.

## Map format: loop Markdown (`.loop.md`)

```markdown
---
id: sobrecarga-filas
title: Sobrecarga de filas
summary: Como atalhos individuais alimentam o backlog que pretendiam contornar.
tags: [operacoes, filas]
---

# Sobrecarga de filas

## Variables

- backlog: Backlog de demandas
- handoffs: Handoffs entre áreas
- tempo-ciclo: Tempo de ciclo
- atalhos: Uso de atalhos hierárquicos
- capacidade: Capacidade disponível

## Relations

backlog ++ handoffs: Quando o backlog cresce, cada demanda atravessa mais áreas.
handoffs ++ tempo-ciclo: Mais handoffs alongam o tempo total de ciclo.
tempo-ciclo ++ atalhos: Esperas longas estimulam atalhos hierárquicos.
atalhos +- capacidade: Cada atalho desvia capacidade do fluxo regular.
capacidade +- backlog: Menos capacidade disponível faz o backlog crescer.

## Loops

- R1: Atalhos que alimentam a fila
  edges:
    - backlog -> handoffs
    - handoffs -> tempo-ciclo
    - tempo-ciclo -> atalhos
    - atalhos -> capacidade
    - capacidade -> backlog
  description: O alívio individual consome capacidade e reforça o backlog que motivou o atalho.
```

Rules:

- Variable ids are stable slugs (`[a-zA-Z][\w-]*`). Labels are the text people read.
- A relation is `source SIGN target: causal sentence`. **Use `++` when both move in the same direction
  and `+-` when they move in opposite directions.** Each sign is the direction of movement at that end
  (source ↑/↓, target ↑/↓), so `--` also means same direction and `-+` also means opposite direction.
  Prefer `++` and `+-` anyway: they are harder to misread. The sentence must be a clean causal
  explanation. Never put evidence, provenance or notes in it.
- Declare at most one relation per ordered pair of variables. The relation id is `source-target`, and
  presentations use that id.
- Loops list ordered `source -> target` edges that form a closed directed cycle. Start the id with `R`
  (reinforcing) or `B` (balancing). The server derives the real type from the signs and warns when
  they disagree. An even number of opposite-direction relations (`+-` or `-+`) makes a loop
  reinforcing; an odd number makes it balancing.
- If an important connection is not a valid directed cycle, tell it as a presentation path instead of
  forcing it into `## Loops`.

Mermaid (`graph TD` with `A[Label] -->|+| B[Label]` / `-->|-|`) is also accepted for quick imports.
Loop Markdown gives better ids and descriptions.

## Presentation format: story Markdown (`.story.md`)

```markdown
# Sobrecarga de filas

Resumo da história em um parágrafo.

## Cena: A fila deixa de ser um problema isolado
focus: path backlog-handoffs, handoffs-tempo-ciclo

### O backlog cresce
focus: node backlog

O backlog concentra demandas que disputam a mesma capacidade.

### O backlog produz handoffs
focus: edge backlog-handoffs

Quando o backlog cresce, cada demanda atravessa mais áreas.

## Cena: O alívio alimenta o problema
focus: loop R1

### O ciclo se fecha
focus: loop R1

O alívio individual consome capacidade e reforça a necessidade de novos atalhos.
```

- `## Cena: …` headings are narrative turns (scenes). `### …` headings are beats: one causal move each.
- Focus syntax (ids must exist in the map):
  - `node <id>`;
  - `edge <source-target>`;
  - `loop <loop id>`;
  - `path e1, e2, e3`: an ordered, connected chain;
  - `set node:X, edge:Y, loop:Z`: a deliberate composite.
- A good trajectory: triggering condition → accumulation or gap → behavioral response → immediate
  relief or consequence → feedback that reinforces the original condition → secondary loop →
  synthesis. Begin with an orienting scene and end with a synthesis beat.
- Every beat explains the movement it highlights and its consequence. Do not repeat sentences or
  narrate implementation details.
- The server binds every scene to the map and derives the camera for you (`fit-focus`, `follow-path`,
  `fit-set`, or `fit-map`).

## Limits

- Request bodies up to {{JSON_LIMIT}}.
- Images up to {{ASSET_LIMIT}} (PNG/JPEG/GIF/WebP/AVIF/SVG).
- {{MAP_LIMIT}} maps per workspace.
- Rate limits apply per client. Responses with status 429 include `Retry-After`.
