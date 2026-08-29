export const FLAGSHIP_MODEL = {
  id: "flagship-growth",
  title: "Crescimento sob pressão",
  nodes: [
    { id: "demand", label: "Demanda", tags: ["motor", "growth"] },
    { id: "planning", label: "Planejamento", tags: ["capacity"] },
    { id: "capacity", label: "Capacidade", tags: ["capacity"] },
    { id: "availability", label: "Disponibilidade", tags: ["service"] },
    { id: "pressure", label: "Pressão operacional", tags: ["limit"] },
    { id: "adoption", label: "Adoção", tags: ["growth"] },
    { id: "trust", label: "Confiança", tags: ["outcome"] },
    { id: "support", label: "Suporte", tags: ["capacity"] }
  ],
  edges: [
    edge("demand-planning", "demand", "planning", "+"),
    edge("planning-capacity", "planning", "capacity", "+"),
    edge("capacity-availability", "capacity", "availability", "+"),
    edge("availability-demand", "availability", "demand", "+"),
    edge("availability-pressure", "availability", "pressure", "+"),
    edge("pressure-demand", "pressure", "demand", "-"),
    edge("availability-adoption", "availability", "adoption", "+"),
    edge("adoption-demand", "adoption", "demand", "+"),
    edge("support-trust", "support", "trust", "+"),
    edge("trust-adoption", "trust", "adoption", "+"),
    edge("capacity-support", "capacity", "support", "+")
  ],
  loops: [
    { id: "R-growth", title: "Motor de crescimento", type: "reinforcing", edgeIds: ["demand-planning", "planning-capacity", "capacity-availability", "availability-demand"] },
    { id: "B-limit", title: "Limite operacional", type: "balancing", edgeIds: ["capacity-availability", "availability-pressure", "pressure-demand", "demand-planning", "planning-capacity"] },
    { id: "R-adoption", title: "Adoção e confiança", type: "reinforcing", edgeIds: ["availability-adoption", "adoption-demand", "demand-planning", "planning-capacity", "capacity-availability"] }
  ]
};

export const FLAGSHIP_ASSETS = [{ id: "flagship-cover", filename: "growth-cover.png", mime_type: "image/png", data_url: "data:image/png;base64,ZmFrZQ==" }];

export const FLAGSHIP_PRESENTATION = {
  schemaVersion: 2,
  id: "flagship-growth-story",
  title: "Crescimento sob pressão — uma história do sistema",
  summary: "Uma apresentação editorial que atravessa motores, limites, intervenção e consequência.",
  intent: "explain-and-persuade",
  audience: { type: "executive", knowledge: "introductory", expectedOutcome: "Escolher uma alavanca" },
  settings: { autoplay: false, allowExplore: true, resumeAfterExplore: true, reducedMotion: "respect-system" },
  chapters: [
    {
      id: "setup", title: "Começar pelo padrão", role: "setup", summary: "Orientação e tensão inicial.",
      scenes: [
        scene("opening", "title", "A promessa de crescer", "Crescer parece simples até o sistema responder.", [beat("opening-context", "focus", "Onde começa a história", "Começamos no mapa completo para reconhecer o terreno."), beat("opening-question", "question", "A pergunta-guia", "O que mantém o crescimento vivo — e onde ele encontra seu limite?", { kind: "node", nodeId: "demand" })]),
        scene("map-overview", "stage", "O mapa em uma vista", "Veja as oito variáveis como um sistema conectado.", [beat("overview-map", "focus", "O sistema inteiro", "O mapa combina crescimento, capacidade e consequências.", { kind: "set", nodeIds: ["demand", "planning", "capacity", "availability", "pressure", "adoption", "trust", "support"] }), beat("overview-growth", "focus", "O motor aparece", "A demanda é o ponto de entrada do motor de crescimento.", { kind: "node", nodeId: "demand" }), beat("overview-capacity", "focus", "A capacidade responde", "Planejamento e capacidade traduzem desejo em serviço.", { kind: "path", edgeIds: ["demand-planning", "planning-capacity", "capacity-availability"] })]),
        scene("evidence", "media", "Um sinal no mundo", "A evidência não substitui o modelo: ela dá textura à pergunta.", [beat("evidence-cover", "reveal", "A observação", "Este marcador representa a observação que motivou a investigação.", { kind: "node", nodeId: "availability" }), beat("evidence-return", "focus", "Voltar ao sistema", "Agora conectamos a evidência à disponibilidade percebida.", { kind: "edge", edgeId: "capacity-availability" })], { assetId: "flagship-cover", altText: "Ilustração abstrata de crescimento e capacidade" }),
        scene("tension", "narrative", "A tensão que merece atenção", "A mesma dinâmica que acelera o crescimento também cria pressão.", [beat("tension-pressure", "focus", "A pressão se acumula", "Quando a disponibilidade cresce, a pressão operacional também pode crescer.", { kind: "edge", edgeId: "availability-pressure" }), beat("tension-limit", "traverse", "O limite retorna ao motor", "O limite reduz a demanda e fecha o ciclo de balanceamento.", { kind: "path", edgeIds: ["availability-pressure", "pressure-demand", "demand-planning", "planning-capacity", "capacity-availability"] }), beat("tension-choice", "question", "Qual dinâmica lidera?", "Precisamos separar o motor do limite antes de escolher uma ação.", { kind: "loop", loopId: "B-limit" })])
      ]
    },
    {
      id: "mechanism", title: "Atravessar os mecanismos", role: "mechanism", summary: "Loops, caminhos e handoffs.",
      scenes: [
        scene("growth-loop", "stage", "O motor de crescimento", "O primeiro ciclo reforça a expansão.", [beat("growth-intro", "focus", "Nomear o motor", "A demanda inicia planejamento, capacidade e disponibilidade.", { kind: "loop", loopId: "R-growth" }), beat("growth-path", "traverse", "Percorrer o reforço", "Siga a cadeia até a disponibilidade devolver força à demanda.", { kind: "path", edgeIds: ["demand-planning", "planning-capacity", "capacity-availability", "availability-demand"] }), beat("growth-phase", "focus", "Fase de aceleração", "Neste momento o motor está mais visível que o limite.", { kind: "set", loopIds: ["R-growth"], nodeIds: ["demand", "availability"] })]),
        scene("limit-loop", "stage", "O limite operacional", "O segundo ciclo não é um vilão: é um freio adaptativo.", [beat("limit-intro", "focus", "Nomear o limite", "Disponibilidade gera pressão, que reduz a demanda.", { kind: "loop", loopId: "B-limit" }), beat("limit-path", "traverse", "Percorrer o balanceamento", "O caminho do limite atravessa pressão e retorna ao motor.", { kind: "path", edgeIds: ["capacity-availability", "availability-pressure", "pressure-demand", "demand-planning", "planning-capacity"] }), beat("limit-role", "focus", "Função do limite", "O balanceamento preserva o sistema quando a expansão excede a capacidade.", { kind: "set", loopIds: ["B-limit"], nodeIds: ["pressure", "capacity"] })]),
        scene("adoption-loop", "stage", "Adoção e confiança", "Um circuito lateral muda a qualidade do crescimento.", [beat("adoption-intro", "focus", "Adoção entra na história", "Disponibilidade também aumenta adoção.", { kind: "loop", loopId: "R-adoption" }), beat("adoption-path", "traverse", "A ponte para a confiança", "Adoção volta à demanda, enquanto suporte sustenta confiança.", { kind: "path", edgeIds: ["availability-adoption", "adoption-demand", "demand-planning", "planning-capacity", "capacity-availability"] }), beat("adoption-outcome", "focus", "Resultado percebido", "O crescimento pode ser mais saudável quando confiança acompanha adoção.", { kind: "node", nodeId: "trust" })]),
        scene("handoff", "narrative", "Da expansão para a intervenção", "A história muda de escala: do padrão para uma escolha.", [beat("handoff-growth-limit", "handoff", "Motor para limite", "O handoff acontece em capacity-availability, onde crescimento encontra pressão.", { kind: "edge", edgeId: "capacity-availability" }), beat("handoff-limit-adoption", "handoff", "Limite para adoção", "Agora seguimos a ponte entre serviço, adoção e confiança.", { kind: "path", edgeIds: ["availability-adoption", "adoption-demand"] }), beat("handoff-synthesis", "focus", "Preparar a escolha", "Com os loops nomeados, podemos testar uma alavanca sem apagar o padrão.", { kind: "set", loopIds: ["R-growth", "B-limit", "R-adoption"] })])
      ]
    },
    {
      id: "synthesis", title: "Escolher e retornar", role: "synthesis", summary: "Intervenção, consequência e fechamento.",
      scenes: [
        scene("comparison", "comparison", "E se reforçarmos suporte?", "Compare o padrão atual com uma intervenção qualitativa.", [beat("comparison-baseline", "focus", "Linha de base", "O padrão atual combina reforço e balanceamento.", { kind: "loop", loopId: "R-growth" }), beat("comparison-intervention", "intervention", "Intervenção", "Reforçar suporte pode proteger confiança sem alterar a topologia.", { kind: "node", nodeId: "support" }, { kind: "qualitative", target: { nodeId: "support" }, label: "Reforçar suporte" }), beat("comparison-consequence", "consequence", "Consequência", "Observe se confiança sustenta adoção antes de a pressão dominar.", { kind: "loop", loopId: "R-adoption" })]),
        scene("consequence", "stage", "A consequência distribuída", "A mudança em um ponto aparece em vários loops.", [beat("consequence-support", "focus", "Suporte conecta", "Suporte aumenta confiança e muda a adoção.", { kind: "path", edgeIds: ["support-trust", "trust-adoption", "adoption-demand"] }), beat("consequence-return", "focus", "Retorno ao motor", "O efeito retorna à demanda, mas agora com uma condição diferente.", { kind: "loop", loopId: "R-growth" })]),
        scene("recommendation", "narrative", "Uma recomendação condicional", "A alavanca depende da fase do sistema.", [beat("recommendation-phase", "focus", "Ler a fase", "Em aceleração, proteja capacidade; sob pressão, reduza o acúmulo.", { kind: "set", loopIds: ["R-growth", "B-limit"] }), beat("recommendation-guardrail", "focus", "Guardar a decisão", "Monitore disponibilidade, pressão e confiança juntos.", { kind: "set", nodeIds: ["availability", "pressure", "trust"] })]),
        scene("close", "title", "Voltar ao mapa", "A história termina onde a investigação continua.", [beat("close-question", "question", "O que você testa primeiro?", "Escolha uma hipótese, registre a fase e observe o loop que responde.", { kind: "node", nodeId: "support" }), beat("close-map", "focus", "Mapa completo", "O valor está em enxergar as relações e retornar ao sistema.", { kind: "set", loopIds: ["R-growth", "B-limit", "R-adoption"] })])
      ]
    }
  ]
};

function edge(id, source, target, sign) {
  return { id, source, target, sourceSign: sign, targetSign: sign, description: `${source} influencia ${target}.` };
}

function scene(id, type, title, bodyMd, beats, content = {}) {
  return {
    id, type, title,
    content: { title, bodyMd, speakerNotesMd: `Nota do apresentador: ${title}.`, ...content },
    mapRef: { mapId: FLAGSHIP_MODEL.id },
    stage: { camera: { mode: "fit-focus", padding: 180 }, visibility: { context: ["demand", "capacity"] } },
    transition: { type: "dissolve", durationMs: 320 },
    timing: { durationMs: 5000, advance: "manual" },
    beats
  };
}

function beat(id, type, title, narrationMd, focus, intervention) {
  return { id, type, title, narrationMd, focus, ...(intervention ? { intervention } : {}), timing: { durationMs: 4200, advance: "manual" } };
}

