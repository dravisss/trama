import { importMermaid, normalizeModel, compilePresentationMarkdown, normalizePresentation, compilePresentation, lintPresentation } from "../src/index.js";

export function createLandingDemo(mapSource, storySource) {
  const diagram = mapSource.match(/```mermaid\s*\n([\s\S]*?)```/)?.[1];
  if (!diagram) throw new Error("O exemplo precisa de um diagrama Mermaid.");
  const imported = importMermaid(diagram, { id: "trama-atalhos", title: "O ciclo dos atalhos" });
  const relations = [...mapSource.matchAll(/^- (e\d+) \| ([\w-]+) \| ([\w-]+) \| (?:([+-]{2}) \| )?(.+)$/gm)];
  if (relations.length !== imported.edges.length) throw new Error("Todas as relações precisam de identificação e explicação.");
  const points = [[0, -242], [282, -132], [282, 160], [0, 272], [-282, 160], [-282, -132]];
  const illustrations = ["TCD", "CAR", "DCP", "BLD", "DRC", "CCD"];
  const descriptions = [
    "Tempo entre o pedido e a resposta que a pessoa está esperando.",
    "Exceções e contatos diretos usados para fazer uma demanda avançar.",
    "Portas de entrada que funcionam por fora do fluxo combinado.",
    "Demandas que chegaram e ainda disputam capacidade de execução.",
    "Transferências e negociações necessárias para uma demanda seguir adiante.",
    "Tempo e esforço usados para alinhar pessoas, prioridades e informações."
  ];
  const colors = ["#dce6c8", "#efe2c9", "#e5eadc", "#dce5dc", "#eee6d8", "#e2e7ca"];
  const model = normalizeModel({
    ...imported,
    description: mapSource.split("```mermaid")[0].replace(/^# .+\n/, "").trim(),
    nodes: imported.nodes.map((node, index) => ({
      ...node,
      description: descriptions[index],
      position: { x: points[index][0], y: points[index][1] },
      media: { assetId: `trama-${illustrations[index]}`, altText: descriptions[index], size: 158, labelPlacement: "below", labelGap: 12, fit: "cover" },
      style: { size: 158, fontSize: 19, textMaxWidth: 172, fill: colors[index], borderColor: "#9ca88d", textColor: "#253e30" }
    })),
    edges: relations.map(([, id, source, target, signs = "++", description]) => {
      if (!imported.edges.some(edge => edge.source === source && edge.target === target)) throw new Error(`A relação ${id} diverge do diagrama.`);
      return { id, source, target, sourceSign: signs[0], targetSign: signs[1], description };
    }),
    loops: [{ id: "r1", title: "O ciclo dos atalhos", type: "reinforcing", edgeIds: relations.map(match => match[1]), description: "O uso recorrente de atalhos amplia a coordenação e alimenta a espera que motivou o próprio atalho." }]
  });
  const presentation = normalizePresentation(compilePresentationMarkdown(storySource));
  for (const chapter of presentation.chapters) for (const scene of chapter.scenes) {
    if (scene.mapRef?.mapId !== model.id || !scene.stage.camera.mode) throw new Error("Cena sem mapa ou câmera explícitos.");
  }
  const compiled = compilePresentation(presentation, { model }, { throwOnError: true });
  const lint = lintPresentation(presentation, { model });
  if (!lint.valid) throw new Error(lint.errors.map(error => error.message).join("\n"));
  return { model, presentation, compiled, lint };
}
