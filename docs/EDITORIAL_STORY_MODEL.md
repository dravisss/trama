# Editorial Story Model

This document defines the target authoring contract for Story Studio. It is
deliberately separate from the current V2 wire format so the UI can become
simple without breaking saved presentations.

## Authoring principle

One `Presentation` is edited through two equivalent surfaces:

- the visual timeline, scenes, beats and Inspector;
- editorial Markdown.

The presentation runtime, preview and export consume the same normalized
model. Technical playback state is configuration, not the primary authoring
language.

## Editorial hierarchy

```text
Presentation
  Scene = um loop inteiro do mapa (ou uma abertura/fecho narrativo)
    Beat = uma relação, variável ou momento dentro desse loop
      title
      narration
```

The editorial Markdown uses readable headings and paragraphs:

```md
# QA · Capacidade e Confiança · apresentação

Loop novo de 16 variáveis para inspeção e teste de estresse visual.

## Cena: Loop 1

### Promessas comerciais → Prioridades conflitantes

Mais demanda estimula novas promessas comerciais.

### Capacidade de atendimento → Fila de solicitações

As filas aumentam quando a capacidade não acompanha a demanda.
```

Uma apresentação com três loops deve ter três cenas de loop. Nunca se cria
uma cena nova apenas porque o loop tem outra relação: as relações entram como
beats dentro da mesma cena. Cenas adicionais ficam reservadas para abertura,
contexto, comparação ou síntese.

Scene and beat IDs are generated from titles and remain implementation
details. The persisted format is V2; Markdown is compiled into that same
contract before saving.

## Content versus configuration

Editorial content includes title, scene headings, beat headings, narration,
scene explanations and presenter notes. Configuration includes map focus,
camera, duration, transition, autoplay and semantic beat type. Configuration
is edited through the Inspector's advanced area and is preserved when a
visual edit does not target it.

## Synchronization contract

1. Visual edits update the normalized presentation.
2. Markdown edits are parsed and validated before application.
3. Applying Markdown replaces editorial structure while preserving matching
   technical configuration where stable IDs or authored titles can be matched.
4. Invalid Markdown never replaces the current presentation.
5. Preview and export use the same normalized presentation as the editor.

## Camera authoring

Camera intent is explicit configuration, not an inferred runtime fallback. A
focused scene should serialize `fit-focus`, a whole-map scene should serialize
`fit-map`, and path/set/fixed/split scenes should use their corresponding V2
mode. The same resolved camera plan is consumed by editor preview and
standalone export.

## Import and migration

One-time migration utilities may accept older inputs, but migrated records are
saved as Presentation V2. Runtime playback does not depend on an old step
shape or on implicit camera defaults.
