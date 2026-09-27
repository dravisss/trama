---
id: capitalismo-exaustao-recursos
title: Capitalismo e exaustão dos recursos naturais
summary: Como a busca por expansão e rentabilidade pode transformar a extração de recursos em um ciclo de exaustão, enquanto a escassez também cria incentivos para eficiência e conservação.
tags: [capitalismo, recursos-naturais, exaustao, sustentabilidade]
---

# Capitalismo e exaustão dos recursos naturais

## Variables

- expectativa-lucratividade: Expectativa de lucratividade da expansão
- expansao-produtiva: Expansão da produção e do consumo
- pressao-extrativa: Pressão para extrair recursos
- deplecao-recursos: Depleção dos recursos naturais
- escassez-renda: Escassez percebida e renda dos recursos
- corrida-rentabilidade: Corrida por novas fontes de rentabilidade
- investimento-eficiencia: Investimento em eficiência e substituição
- intensidade-material: Intensidade material da economia

## Relations

expectativa-lucratividade ++ expansao-produtiva: Quando a expansão parece lucrativa, empresas e investidores ampliam a produção e o consumo.
expansao-produtiva ++ pressao-extrativa: Mais produção e consumo aumentam a demanda por energia, terra, água e matérias-primas.
pressao-extrativa ++ deplecao-recursos: A extração persistente reduz estoques e degrada a capacidade de regeneração dos ecossistemas.
deplecao-recursos ++ escassez-renda: A depleção aumenta a percepção de escassez e pode elevar a renda capturada por quem controla recursos restantes.
escassez-renda ++ corrida-rentabilidade: A escassez cria oportunidades de lucro em novas fronteiras, tecnologias e mercados de recursos.
corrida-rentabilidade ++ expectativa-lucratividade: Novas oportunidades de rentabilidade reforçam a expectativa de que a expansão continuará compensando.
escassez-renda ++ investimento-eficiencia: A escassez e o aumento de custos estimulam investimentos em eficiência, substituição e conservação.
investimento-eficiencia +- intensidade-material: Mais eficiência reduz a quantidade de recursos necessária por unidade de valor produzido.
intensidade-material -- pressao-extrativa: Menor intensidade material reduz a pressão extrativa para um mesmo nível de atividade econômica.
pressao-extrativa -- deplecao-recursos: Quando a pressão extrativa cai, a velocidade de depleção também cai.
deplecao-recursos -- escassez-renda: Menor depleção reduz a escassez e a renda extraordinária associada ao recurso.

## Loops

- R1: Expansão e exaustão
  edges:
    - expectativa-lucratividade -> expansao-produtiva
    - expansao-produtiva -> pressao-extrativa
    - pressao-extrativa -> deplecao-recursos
    - deplecao-recursos -> escassez-renda
    - escassez-renda -> corrida-rentabilidade
    - corrida-rentabilidade -> expectativa-lucratividade
  description: A busca por expansão transforma a depleção em novas oportunidades de rentabilidade, mantendo a pressão por extração.

- B1: Escassez e eficiência
  edges:
    - escassez-renda -> investimento-eficiencia
    - investimento-eficiencia -> intensidade-material
    - intensidade-material -> pressao-extrativa
    - pressao-extrativa -> deplecao-recursos
    - deplecao-recursos -> escassez-renda
  description: A escassez pode estimular eficiência e substituição, reduzindo a intensidade material e desacelerando a depleção.
