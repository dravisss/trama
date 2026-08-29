/**
 * Deterministic graph fixtures used by the browser QA surface and the unit
 * suite. They intentionally combine rings, shared hubs and long bridges so a
 * routing regression cannot hide behind a trivial chain.
 */
export function createRoutingFixture({ id = "qa-fixture", nodeCount = 8 } = {}) {
  const count = Math.max(3, Math.floor(Number(nodeCount) || 8));
  const nodes = Array.from({ length: count }, (_, index) => ({
    id: `factor-${String(index + 1).padStart(2, "0")}`,
    label: `Fator ${String(index + 1).padStart(2, "0")}`
  }));
  const edges = [];
  const addEdge = (sourceIndex, targetIndex, type = "reinforcing") => {
    const source = nodes[sourceIndex % count].id;
    const target = nodes[targetIndex % count].id;
    const id = `${source}-${target}`;
    if (edges.some(edge => edge.id === id)) return id;
    edges.push({
      id,
      source,
      target,
      sourceSign: "+",
      targetSign: type === "balancing" ? "-" : "+",
      type,
      description: `${source} influencia ${target}.`
    });
    return id;
  };

  const ring = [];
  for (let index = 0; index < count; index++) ring.push(addEdge(index, (index + 1) % count));
  const loops = [{
    id: `${id}-main-loop`,
    edgeIds: ring,
    type: "reinforcing",
    label: "Ciclo principal"
  }];

  // Chords create realistic port competition and opportunities for the
  // router to choose outward lanes without changing the model semantics.
  const chordStep = count > 10 ? 3 : 2;
  for (let index = 0; index < count; index += 2) {
    addEdge(index, (index + chordStep) % count, "balancing");
  }
  if (count >= 8) {
    addEdge(0, Math.floor(count / 2), "balancing");
    addEdge(Math.floor(count / 2), 1, "reinforcing");
  }

  return {
    id,
    title: `${count} variáveis QA`,
    description: "Fixture determinística para validar posicionamento, curvatura, cruzamentos e persistência.",
    nodes,
    edges,
    loops
  };
}

export const routingFixtures = [8, 16, 32].map(nodeCount =>
  createRoutingFixture({ id: `qa-${nodeCount}`, nodeCount })
);
