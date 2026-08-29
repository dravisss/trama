# Sobrecarga de Filas

Esta apresentação mostra como múltiplas portas de entrada e a fragmentação do trabalho produzem filas concorrentes. A latência leva à carteirada, que resolve casos individuais mas amplia os canais paralelos e enfraquece o fluxo formal. Em seguida, a história mostra como o mesmo atalho corrói a eficiência dos aceleradores.

## Cena: A fila deixa de ser um problema isolado
focus: path e01, e08, e09

### O backlog cresce
focus: node BLD

O backlog das áreas concentra demandas que chegaram por diferentes portas e precisam disputar a mesma capacidade interna.

### O backlog produz handoffs
focus: edge e08

Quando o backlog cresce, cada demanda atravessa mais áreas antes de encontrar uma solução.

### Handoffs viram coordenação
focus: edge e09

Cada passagem acrescenta reuniões, negociações e idas e vindas para alinhar escopo.

## Cena: A fragmentação alonga o tempo de ciclo
focus: path e09, e16, e06

### Coordenação consome capacidade
focus: edge e16

O custo de coordenação ocupa capacidade que poderia estar executando as demandas e aumenta o tempo total de ciclo.

### A latência chega ao cliente
focus: edge e06

Quanto mais longa a espera, menor a satisfação do cliente.

## Cena: A carteirada aparece como alívio
focus: set edge:e05, edge:e17, node:CAR

### Insatisfação ativa o atalho
focus: edge e05

A insatisfação cria pressão por uma solução imediata e ativa a carteirada como atalho hierárquico.

### O atalho reduz uma espera
focus: set node:CAR, node:TCD

Para a demanda específica, a carteirada pode reduzir o tempo de ciclo e produzir a sensação de que o sistema voltou a responder.

## Cena: O alívio alimenta o problema
focus: path e18, e07, e08, e09, e16, e17

### O atalho cria canal paralelo
focus: edge e18

Cada exceção bem-sucedida incentiva novas demandas a contornarem o fluxo formal.

### O canal paralelo reduz visibilidade
focus: edge e12

Quando as demandas deixam de aparecer no funil, a visibilidade da fila diminui e a coordenação fica ainda mais difícil.

### O ciclo de sobrecarga se fecha
focus: loop r3

O atalho alivia uma demanda, mas amplia os canais paralelos, aumenta os handoffs e reforça a própria necessidade de novos atalhos.

## Cena: O acelerador também se deteriora
focus: loop r4

### A carteirada corrói os aceleradores
focus: edge e21

Ao substituir o fluxo desenhado, a carteirada reduz a eficiência dos aceleradores que deveriam diminuir o custo de coordenação.

### A deterioração alonga novamente o ciclo
focus: path e10, e16, e17

Com aceleradores menos eficientes, a coordenação fica mais cara, a latência aumenta e a pressão pelo atalho retorna.

## Cena: A armadilha sistêmica
focus: set node:BLD, node:CAR, node:TCD, node:ACE

### Resolver casos não é recuperar o sistema
focus: loop r3

A carteirada pode ser racional para uma urgência individual, mas seu efeito agregado enfraquece a arquitetura que deveria tornar o fluxo visível, coordenável e previsível.
