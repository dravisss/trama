#!/usr/bin/env node
/**
 * presentation-from-dsl.mjs — Converte uma DSL simples em uma Presentation V2.
 *
 * Uso:
 *   node scripts/presentation-from-dsl.mjs <caminho-do-arquivo.dsl> [loop-id] [db-path]
 *
 * O loop-id padrão é "sobrecarga-filas".
 * O db-path padrão é "data/trama.db" relativo à raiz do projeto.
 *
 * DSL format:
 *   # Título da Apresentação
 *   R1 — Opcional:
 *     [Label do Nó]: "Texto explicativo do step"
 *     [Origem] → [Destino]: "Texto sobre a relação"
 *     loop:R1: "Texto sobre o loop"
 *
 * Regras:
 *   - # Título define o título da Presentation
 *   - [Label] → step com focus.nodeId (fuzzy match no label)
 *   - [Origem] → [Destino] → step com focus.edgeId da aresta entre os nós
 *   - loop:R1 → step com focus.loopId
 *   - Se body vazio, gera texto automático
 *   - Nodes não encontrados geram warning e são pulados
 *   - Preserva posições dos nodes existentes
 *   - Persiste uma Presentation V2 vinculada ao mapa
 */

import { readFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ProjectStore } from "../src/platform/projectStore.js";
import { validateModel } from "../src/core/model.js";
import { migrateStoryToPresentation } from "../src/presentation/migration.js";
import { compilePresentation } from "../src/presentation/compiler.js";
import { lintPresentation } from "../src/presentation/lint.js";

// ── Help ─────────────────────────────────────────────────────────────────────

const HELP = `Uso: node scripts/presentation-from-dsl.mjs <arquivo.dsl> [loop-id] [db-path]

Argumentos:
  arquivo.dsl   Caminho para o arquivo DSL (obrigatório)
  loop-id         ID do loop no banco (padrão: "sobrecarga-filas")
  db-path         Caminho do SQLite (padrão: "data/trama.db")

Exemplos:
  node scripts/presentation-from-dsl.mjs seeds/sobrecarga.dsl
  node scripts/presentation-from-dsl.mjs seeds/meu-loop.dsl meu-loop-id
  node scripts/presentation-from-dsl.mjs seeds/meu-loop.dsl meu-loop-id /tmp/outro.db
`;

// ── Root resolution ──────────────────────────────────────────────────────────

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const dslPath = args[0];
  const loopId = args[1] || "sobrecarga-filas";
  const dbPathRaw = args[2] || "data/trama.db";
  const dbPath = isAbsolute(dbPathRaw) ? dbPathRaw : resolve(ROOT, dbPathRaw);

  return { dslPath, loopId, dbPath };
}

// ── DSL parser ───────────────────────────────────────────────────────────────

/**
 * Parseia o arquivo DSL para steps estruturados.
 *
 * Formato:
 *   # Título
 *   R1 — Opcional:
 *     [Label do Nó]: "body"
 *     [Origem] → [Destino]: "body"
 *     loop:R1: "body"
 *   R2:
 *     ...
 */
export function parseDSL(dsl) {
  const lines = dsl.split("\n");
  let title = "";
  /** @type {{ type: "node"|"relation"|"loop"; label: string; targetLabel?: string; body: string; loopRef: string|null }[]} */
  const steps = [];
  let currentLoopRef = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Título: # qualquer coisa
    const titleMatch = trimmed.match(/^#\s+(.+)$/);
    if (titleMatch) {
      title = titleMatch[1];
      continue;
    }

    // Cabeçalho de seção: R1:, R2a:, etc. com ou sem descrição.
    const headerMatch = trimmed.match(/^(R\d+[a-zA-Z]?)(?:\s*[—-]\s*(.+))?:$/);
    if (headerMatch) {
      currentLoopRef = headerMatch[1];
      continue;
    }

    // Step de node: [Label]: "body"   ou   [Label]:
    const nodeMatch = trimmed.match(/^\[([^\]]+)\]\s*:\s*(?:"([^"]*)")?\s*$/);
    if (nodeMatch) {
      steps.push({
        type: "node",
        label: nodeMatch[1],
        body: nodeMatch[2] ?? "",
        loopRef: currentLoopRef,
      });
      continue;
    }

    // Step de relação: [Origem] → [Destino]: "body"
    const relationMatch = trimmed.match(/^\[([^\]]+)\]\s*(?:→|->)\s*\[([^\]]+)\]\s*:\s*(?:"([^"]*)")?\s*$/);
    if (relationMatch) {
      steps.push({
        type: "relation",
        label: relationMatch[1],
        targetLabel: relationMatch[2],
        body: relationMatch[3] ?? "",
        loopRef: currentLoopRef,
      });
      continue;
    }

    // Step de loop: loop:R1: "body"   ou   loop:R1:
    // Aceita loop:R1:, loop:R1: "texto", loop:R1 : "texto"
    const loopMatch = trimmed.match(/^loop:(R\d+[a-zA-Z]?)\s*:\s*(?:"([^"]*)")?\s*$/);
    if (loopMatch) {
      steps.push({
        type: "loop",
        label: loopMatch[1],
        body: loopMatch[2] ?? "",
        loopRef: currentLoopRef,
      });
      continue;
    }

    console.warn(`⚠ Linha ignorada (formato não reconhecido): ${trimmed}`);
  }

  return { title, steps };
}

// ── Fuzzy matching ───────────────────────────────────────────────────────────

/** Normaliza string: lowercase, sem acentos, sem "/..." */
function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove combining diacritics
    .replace(/\/.*$/, "")              // remove "/" and everything after
    .toLowerCase()
    .trim();
}

/**
 * Busca node por fuzzy match no label.
 * Estratégia: normalizar ambos, colapsar \n → espaço, remover espaços duplos,
 * comparar com includes bidirecional.
 *
 * @param {import("../src/core/model.js").Node[]} nodes
 * @param {string} label
 * @returns {string|null} nodeId
 */
export function findNodeId(nodes, label) {
  const needle = normalize(label).replace(/\n/g, " ").replace(/\s+/g, " ");

  for (const node of nodes) {
    const haystack = normalize(node.label)
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ");

    if (
      haystack === needle ||
      haystack.includes(needle) ||
      needle.includes(haystack)
    ) {
      return node.id;
    }
  }

  return null;
}

export function buildPresentationStepsFromDSL(model, parsedSteps = [], loopIdByRef = {}) {
  const nodesById = new Map((model.nodes || []).map(node => [node.id, node]));
  const presentationSteps = [];
  let stepIndex = 0;

  for (const ps of parsedSteps) {
    if (ps.type === "node") {
      const nodeId = findNodeId(model.nodes, ps.label);
      if (!nodeId) {
        console.error(`⚠ Node não encontrado para label "${ps.label}" — pulando`);
        continue;
      }

      stepIndex++;
      const node = nodesById.get(nodeId);
      const titleLabel = node?.label?.replace(/\n/g, " ") || `Passo ${stepIndex}`;
      const body =
        ps.body ||
        (node
          ? `Explore a variável "${titleLabel}" neste contexto do diagrama.`
          : `Passo ${stepIndex} do storyboard.`);

      presentationSteps.push({
        id: `step-${stepIndex}`,
        title: titleLabel,
        body,
        focus: { nodeId },
      });
      continue;
    }

    if (ps.type === "relation") {
      const sourceId = findNodeId(model.nodes, ps.label);
      const targetId = findNodeId(model.nodes, ps.targetLabel);
      if (!sourceId || !targetId) {
        console.error(`⚠ Relação não encontrada para "${ps.label}" → "${ps.targetLabel}" — pulando`);
        continue;
      }

      const edge = (model.edges || []).find(item => item.source === sourceId && item.target === targetId);
      if (!edge) {
        console.error(`⚠ Aresta não encontrada para "${ps.label}" → "${ps.targetLabel}" — pulando`);
        continue;
      }

      stepIndex++;
      const source = nodesById.get(sourceId);
      const target = nodesById.get(targetId);
      const titleLabel = source && target
        ? `${source.label.replace(/\n/g, " ")} → ${target.label.replace(/\n/g, " ")}`
        : `Relação ${stepIndex}`;
      const body = ps.body || edge.description || `Explore a relação causal entre ${titleLabel}.`;

      presentationSteps.push({
        id: `step-${stepIndex}`,
        title: titleLabel,
        body,
        focus: { edgeId: edge.id },
      });
      continue;
    }

    if (ps.type === "loop") {
      stepIndex++;
      const resolvedLoopId = loopIdByRef[ps.label] || ps.label;
      const loopObj = model.loops?.find(loop => loop.id === resolvedLoopId);
      const titleLabel = loopObj?.label || `Passo ${stepIndex}`;
      const body =
        ps.body ||
        (loopObj
          ? `Detalhe sobre o loop "${titleLabel}".`
          : `Passo ${stepIndex} do storyboard.`);

      presentationSteps.push({
        id: `step-${stepIndex}`,
        title: titleLabel,
        body,
        focus: { loopId: resolvedLoopId },
      });
    }
  }

  return presentationSteps;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const { dslPath, loopId, dbPath } = parseArgs();

  // 1. Ler DSL
  console.log(`▶ Lendo DSL: ${dslPath}`);
  const dslContent = readFileSync(dslPath, "utf-8");
  const { title, steps: parsedSteps } = parseDSL(dslContent);

  if (!title) {
    console.error("✗ Nenhum título encontrado no arquivo DSL (use # Título na primeira linha)");
    process.exit(1);
  }
  console.log(`  Título: "${title}"`);
  console.log(`  Steps brutos: ${parsedSteps.length}`);

  // 2. Conectar ao banco
  console.log(`\n▶ Conectando ao banco: ${dbPath}`);
  const store = new ProjectStore(dbPath, {
    project: { id: "trama-example", title: "Trama Example" },
  });

  const existingLoop = store.getLoop(loopId);
  if (!existingLoop) {
    console.error(`✗ Loop "${loopId}" não encontrado no banco!`);
    console.error(`  Loops disponíveis: ${store.listLoops().map((l) => l.id).join(", ")}`);
    store.close();
    process.exit(1);
  }

  console.log(`✓ Loop encontrado: "${existingLoop.title}" (${loopId})`);
  const model = existingLoop.model;
  console.log(`  Nodes: ${model.nodes.length}, Edges: ${model.edges.length}, Loops: ${model.loops.length}`);

  // 3. Montar lookup R1 → loop-id do modelo
  /** @type {Record<string, string>} */
  const loopIdByRef = {};
  for (const loop of model.loops || []) {
    const match = loop.label?.match(/^(R\d+[a-zA-Z]?)/);
    if (match) {
      loopIdByRef[match[1]] = loop.id;
    }
  }

  if (Object.keys(loopIdByRef).length === 0) {
    console.warn("⚠ Nenhum loop com label R1/R2/… encontrado no modelo — steps loop: serão pulados");
  }

  // 4. Gerar steps
  const resolvedSteps = parsedSteps.map((step) => {
    if (step.type !== "loop") return step;
    const targetLoopId = loopIdByRef[step.label];
    if (!targetLoopId) {
      console.error(`⚠ Loop ref "${step.label}" não encontrado no modelo — pulando`);
      return null;
    }
    return { ...step, label: targetLoopId };
  }).filter(Boolean);

  const presentationSteps = buildPresentationStepsFromDSL(model, resolvedSteps, loopIdByRef);
  for (const [index, step] of presentationSteps.entries()) {
    const focusLabel = step.focus.edgeId
      ? `edge:${step.focus.edgeId}`
      : step.focus.nodeId
        ? `node:${step.focus.nodeId}`
        : `loop:${step.focus.loopId}`;
    console.log(`  [${index + 1}] ${focusLabel} ${step.title}`);
  }

  if (presentationSteps.length === 0) {
    console.error("✗ Nenhum step foi gerado!");
    store.close();
    process.exit(1);
  }

  console.log(`\n✓ ${presentationSteps.length} steps gerados`);

  // 5. Montar a Presentation V2 vinculada ao mapa.
  const migrated = migrateStoryToPresentation({ title, steps: presentationSteps }, model, {
    id: `${loopId}-presentation`
  });
  const presentation = migrated;

  // 6. Validar o contrato oficial antes de persistir.
  console.log("▶ Validando Presentation V2...");
  const validation = validateModel(model);
  if (!validation.valid) {
    console.error("✗ ERRO DE VALIDAÇÃO DO MAPA:");
    for (const err of validation.errors) {
      console.error(`  - ${err}`);
    }
    store.close();
    process.exit(1);
  }
  const compiled = compilePresentation(presentation, { model });
  const lint = lintPresentation(presentation, { model });
  const presentationErrors = [...compiled.errors, ...lint.errors.map(item => item.message)];
  if (presentationErrors.length) {
    console.error("✗ ERRO DE VALIDAÇÃO DA APRESENTAÇÃO:");
    presentationErrors.forEach(error => console.error(`  - ${error}`));
    store.close();
    process.exit(1);
  }
  console.log("✓ Mapa e Presentation V2 válidos!");

  // 7. Persistir
  console.log("▶ Persistindo Presentation V2 no banco...");
  const existingPresentation = store.listPresentations().find(record =>
    record.id === presentation.id ||
    (record.presentation?.chapters || []).some(chapter =>
      (chapter.scenes || []).some(scene => scene.mapRef?.mapId === loopId))
  );
  if (existingPresentation) {
    store.updatePresentation(existingPresentation.id, { title: presentation.title, presentation });
  } else {
    store.createPresentation({ id: presentation.id, title: presentation.title, presentation });
  }
  store.close();

  console.log(`✓ Presentation V2 salva com sucesso no mapa "${loopId}"!`);
  console.log(`  Banco: ${dbPath}`);
  console.log(`  Steps: ${presentationSteps.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
