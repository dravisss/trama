# Sobrecarga de Filas

## Variables

- DCP: Demandas em\nCanal Paralelo
- AFC: Adesão ao\nFunil Corporativo
- CCD: Custo de Coordenação\npor Demanda
- VF: Visibilidade\nda Fila
- BLD: Backlog\ndas Áreas
- TCD: Tempo de Ciclo\nda Demanda
- CAR: Atalho Hierárquico\n/ Carteirada
- CRF: Demandas via\nFluxo Formal
- DRC: Handoffs\nentre Áreas
- ACE: Eficiência dos\nAceleradores
- SCL: Satisfação\ndo Cliente
- TKT: Tickets de\nAtendimento
- RC: Demandas para\nRelacionamento

## Relations

CRF ++ BLD: Demandas que entram pelo fluxo formal viram itens no backlog.
RC ++ BLD: Demandas do Relacionamento alimentam o backlog.
TKT ++ RC: Cada ticket vira uma demanda pro Relacionamento.
SCL -+ TKT: Satisfação baixa gera mais tickets de clientes insatisfeitos.
SCL -+ CAR: Satisfação baixa ativa a carteirada.
TCD +- SCL: Tempo de ciclo alto reduz a satisfacao do cliente.
DCP ++ BLD: Canal paralelo tambem alimenta o backlog.
BLD ++ DRC: Backlog alto gera mais handoffs entre areas.
DRC ++ CCD: Cada handoff adiciona custo de coordenacao.
ACE +- CCD: Aceleradores reduzem o custo de coordenacao.
ACE ++ AFC: Aceleradores aumentam a adesao ao funil.
DCP +- VF: Canal paralelo reduz a visibilidade da fila.
AFC ++ VF: Adesão ao funil aumenta a visibilidade da fila.
VF ++ CCD: Visibilidade da fila aumenta o custo de coordenacao.
CCD ++ BLD: Custo de coordenacao infla o backlog.
CCD ++ TCD: Custo de coordenacao aumenta o tempo de ciclo.
TCD ++ CAR: Tempo alto ativa a carteirada.
CAR ++ DCP: Carteirada alimenta o canal paralelo.
CAR +- CRF: Carteirada reduz o fluxo formal.
CRF +- DCP: Menos fluxo formal gera mais canal paralelo.
CAR +- ACE: Carteirada reduz a eficiencia dos aceleradores.
CAR +- AFC: Carteirada reduz a adesao ao funil.

## Loops

- r1: R1 — Gargalo que se alimenta
  edges:
    - BLD -> DRC
    - DRC -> CCD
    - CCD -> BLD
- r2: R2 — Cliente insatisfeito amplia a pressão
  edges:
    - CCD -> TCD
    - TCD -> SCL
    - SCL -> TKT
    - TKT -> RC
    - RC -> BLD
    - BLD -> DRC
    - DRC -> CCD
- r3: R3 — Carteirada acelera o desvio
  edges:
    - CAR -> DCP
    - DCP -> BLD
    - BLD -> DRC
    - DRC -> CCD
    - CCD -> TCD
    - TCD -> CAR
- r4: R4 — Carteirada corroe os aceleradores
  edges:
    - CAR -> ACE
    - ACE -> CCD
    - CCD -> TCD
    - TCD -> CAR

