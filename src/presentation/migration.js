import { normalizePresentation } from "./schema.js";

export function migrateStoryToPresentation(story = {}, model = {}, options = {}) {
  const nodes = new Map((model.nodes || []).map(node => [node.id, node]));
  const edges = new Map((model.edges || []).map(edge => [edge.id, edge]));
  const loops = new Map((model.loops || []).map(loop => [loop.id, loop]));
  const usedIds = new Set();
  const scenes = [];
  const sceneByLoop = new Map();
  for (const [index, step] of (story.steps || []).entries()) {
    const loopId = loopIdForStep(step, loops, edges);
    let scene = loopId ? sceneByLoop.get(loopId) : null;
    if (!scene) {
      const loop = loopId ? loops.get(loopId) : null;
      const sceneId = uniqueId(loopId ? `scene-loop-${loopId}` : (step.id || `scene-${index + 1}`), usedIds);
      usedIds.add(sceneId);
      scene = {
        id: sceneId,
        type: migrateSceneType(step.type),
        title: loop?.title || step.title || `Cena ${index + 1}`,
        content: {
          title: loop?.title || step.title || `Cena ${index + 1}`,
          bodyMd: step.body || "",
          speakerNotesMd: step.speakerNotesMd || "",
          ...(step.src ? { src: step.src } : {}),
          ...(step.assetId ? { assetId: step.assetId } : {})
        },
        mapRef: model.id ? { mapId: model.id } : undefined,
        stage: {
          ...(step.camera ? { camera: { ...step.camera, mode: "fixed" } } : {}),
          ...(step.reveal ? { visibility: {
            hidden: [], ghost: [], context: [], focused: [
              ...(step.reveal.nodeIds || []), ...(step.reveal.edgeIds || [])
            ], emphasized: []
          } } : {})
        },
        transition: step.transition || "dissolve",
        timing: { durationMs: step.duration_ms || story.default_duration_ms || 5000, advance: story.autoplay ? "auto" : "manual" },
        beats: []
      };
      if (loopId) {
        scene.causalFrame = { primaryLoopId: loopId };
        sceneByLoop.set(loopId, scene);
      }
      scenes.push(scene);
    }

    // A loop-focused legacy step already expands into all of the loop's
    // relations. Repeated steps for that same loop must not create duplicate
    // scenes or duplicate beats; the loop is the scene, its relations are
    // beats inside it.
    const alreadyExpandedLoop = loopId && scene.beats.some(beat => beat.causalFrame?.loopId === loopId);
    if (!alreadyExpandedLoop || !step.focus?.loopId) {
      scene.beats.push(...migrateBeats(step, { nodes, edges, loops, usedIds, preserveLegacyExpansion: options.preserveLegacyExpansion !== false }));
    }
  }
  return normalizePresentation({
    schemaVersion: 2,
    id: options.id || `${model.id || "diagram"}-presentation`,
    title: story.title || model.title || "Apresentação",
    summary: options.summary || model.description || "",
    intent: options.intent || "explain",
    settings: {
      autoplay: Boolean(story.autoplay),
      defaultBeatDurationMs: story.default_duration_ms || 5000
    },
    chapters: [{
      id: "chapter-1",
      title: options.chapterTitle || "Apresentação",
      role: "custom",
      scenes
    }]
  });
}

function loopIdForStep(step, loops, edges) {
  if (step.focus?.loopId && loops.has(step.focus.loopId)) return step.focus.loopId;
  if (!step.focus?.edgeId) return null;
  const matches = [...loops.values()].filter(loop => (loop.edgeIds || []).includes(step.focus.edgeId));
  return matches.length === 1 ? matches[0].id : null;
}

export function promoteLegacyModel(model, options = {}) {
  return migrateStoryToPresentation(model?.story || {}, model, options);
}

function migrateBeats(step, { nodes, edges, loops, usedIds, preserveLegacyExpansion }) {
  const focus = step.focus;
  if (!focus) return [];
  if (focus.edgeId) {
    return [createBeat(step, {
      id: uniqueId(`${step.id || "scene"}-${focus.edgeId}`, usedIds),
      type: "focus",
      focus: { kind: "edge", edgeId: focus.edgeId },
      edge: edges.get(focus.edgeId)
    }, usedIds)];
  }
  if (focus.loopId) {
    const loop = loops.get(focus.loopId);
    if (!loop || !preserveLegacyExpansion) {
      return [createBeat(step, {
        id: uniqueId(`${step.id || "scene"}-loop`, usedIds),
        type: "focus",
        focus: { kind: "loop", loopId: focus.loopId }
      }, usedIds)];
    }
    return loop.edgeIds.map((edgeId, index) => createBeat({ ...step, body: "" }, {
      id: uniqueId(`${step.id || "scene"}-${edgeId}`, usedIds),
      type: "traverse",
      title: edgeTitle(edges.get(edgeId), index),
      focus: { kind: "edge", edgeId },
      edge: edges.get(edgeId),
      loopId: focus.loopId
    }, usedIds));
  }
  if (focus.nodeId) {
    const connected = (modelEdges(nodes, edges, focus.nodeId));
    if (!connected.length || !preserveLegacyExpansion) {
      return [createBeat(step, {
        id: uniqueId(`${step.id || "scene"}-${focus.nodeId}`, usedIds),
        type: "focus",
        focus: { kind: "node", nodeId: focus.nodeId }
      }, usedIds)];
    }
    return connected.map((edge, index) => createBeat(step, {
      id: uniqueId(`${step.id || "scene"}-${edge.id}`, usedIds),
      type: "focus",
      title: edgeTitle(edge, index),
      focus: { kind: "edge", edgeId: edge.id },
      edge
    }, usedIds));
  }
  return [];
}

function createBeat(step, data, usedIds) {
  const edgeDescription = data.edge?.description || "";
  const id = data.id;
  usedIds.add(id);
  return {
    id,
    type: data.type || "focus",
    title: data.title || step.title || "Foco",
    narrationMd: step.body || edgeDescription,
    focus: data.focus,
    ...(data.loopId ? { causalFrame: { loopId: data.loopId } } : {}),
    timing: { durationMs: step.duration_ms || 5000, advance: "manual" },
    transition: { type: step.transition || "fade" }
  };
}

function modelEdges(nodes, edges, nodeId) {
  return [...edges.values()].filter(edge => edge.source === nodeId || edge.target === nodeId);
}

function edgeTitle(edge, index) {
  if (!edge) return `Relação ${index + 1}`;
  return `${edge.source} → ${edge.target}`;
}

function migrateSceneType(type) {
  if (type === "title") return "title";
  if (type === "text") return "narrative";
  if (type === "image") return "media";
  return "stage";
}

function uniqueId(base, used) {
  const root = String(base || "item").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "item";
  let id = root;
  let suffix = 2;
  while (used.has(id)) id = `${root}-${suffix++}`;
  return id;
}
