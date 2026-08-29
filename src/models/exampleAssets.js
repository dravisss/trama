const assetRoot = new URL("../../assets/demo/sobrecarga-filas/", import.meta.url);

const definitions = [
  ["DCP", "Demandas entrando por canais laterais e contornando a entrada principal"],
  ["AFC", "Pessoas escolhendo entrar por um funil organizado"],
  ["CCD", "Várias mãos tentando coordenar a mesma pasta de trabalho"],
  ["VF", "Uma fila de cartões visível dentro de uma bandeja transparente"],
  ["BLD", "Uma caixa de entrada transbordando com cartões de demandas acumuladas"],
  ["TCD", "Um cartão parado em uma esteira circular ao lado de uma ampulheta"],
  ["CAR", "Uma mão retirando um cartão da fila para colocá-lo à frente"],
  ["CRF", "Cartões avançando por uma única faixa formal e organizada"],
  ["DRC", "Uma pasta sendo passada entre diferentes estações de trabalho"],
  ["ACE", "Engrenagens e uma rampa movendo cartões com pouco atrito"],
  ["SCL", "Uma cliente recebendo uma demanda concluída em um atendimento"]
];

export const exampleAssets = definitions.map(([nodeId, alt_text]) => ({
  id: `sobrecarga-filas-${nodeId.toLowerCase()}`,
  filename: `${nodeId}.webp`,
  path: new URL(`${nodeId}.webp`, assetRoot),
  mime_type: "image/webp",
  kind: "image",
  width: 512,
  height: 512,
  alt_text,
  focal_x: 0.5,
  focal_y: 0.5,
  source_json: { source: "bundled-public-demo", nodeId }
}));
