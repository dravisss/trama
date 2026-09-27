# O ciclo dos atalhos
id: trama-atalhos-apresentacao
summary: Como o alívio de uma demanda pode alimentar a espera de muitas outras.
intent: explain
settings: {"autoplay":false,"allowExplore":true,"reducedMotion":"respect-system"}

## Chapter percurso Uma espera, muitas relações
role: setup

### Scene espera Uma demanda está demorando
map: {"mapId":"trama-atalhos"}
stage: {"camera":{"mode":"fit-map","padding":34,"maxZoom":1.35}}
#### Beat comeco O problema parece ser a espera.
focus: node espera
narration: Uma demanda demora a avançar. À primeira vista, parece um caso isolado. Mas o que acontece quando todo mundo tenta resolver o seu caso?

### Scene atalho A resposta individual
map: {"mapId":"trama-atalhos"}
stage: {"camera":{"mode":"fit-focus","padding":54,"maxZoom":1.45}}
#### Beat alivio Um atalho parece resolver.
focus: edge e01
narration: A espera aumenta a pressão por uma exceção. Acionar alguém por fora do fluxo pode acelerar uma demanda — e tornar o atalho uma resposta cada vez mais comum.

### Scene canais A resposta ganha escala
map: {"mapId":"trama-atalhos"}
stage: {"camera":{"mode":"follow-path","padding":46,"maxZoom":1.45}}
#### Beat acumulacao Os atalhos abrem novos caminhos.
focus: path e02, e03
narration: Quando o atalho se repete, surgem canais paralelos. As demandas continuam chegando, agora por mais portas, e se somam ao trabalho acumulado.

### Scene custo A coordenação ocupa o dia
map: {"mapId":"trama-atalhos"}
stage: {"camera":{"mode":"follow-path","padding":46,"maxZoom":1.45}}
#### Beat fragmentacao O trabalho fica mais difícil de coordenar.
focus: path e04, e05, e06
narration: O acúmulo aumenta as passagens entre áreas. Alinhamentos e negociações consomem capacidade de execução. A espera volta a crescer.

### Scene retorno O ciclo se fecha
map: {"mapId":"trama-atalhos"}
stage: {"camera":{"mode":"fit-map","padding":34,"maxZoom":1.35}}
#### Beat sintese O alívio de um caso alimenta o problema.
type: consequence
focus: loop r1
narration: Mais espera, mais atalhos, mais coordenação, mais espera. O mapa torna visível um ciclo de reforço — e abre uma pergunta melhor: o que precisaria mudar nessas relações?

