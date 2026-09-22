# Roadmap da Trama

## Direção do produto

A Trama deve gerar diagramas interativos autocontidos para relatórios. O relatório final não
dependerá de um servidor Trama ou deste repositório estar em execução.

## 1. Fundação de domínio

- descrições de relações;
- loops curados como objetos de primeira classe;
- descoberta e classificação R/B;
- posições persistentes e locks;
- API para foco e serialização do estado editorial.

## 2. Modo de edição

- [x] alternar explicitamente entre leitura e edição;
- [x] arrastar nós;
- [x] fixar e soltar nós individualmente;
- [x] salvar posições e locks por mockup na demo;
- [ ] exportar o modelo editorial como JSON;
- [x] editar rotas através de pontos de controle persistentes;
- desfazer e refazer;
- [x] salvar rotas no modelo;
- distinguir reorganização automática de ajustes manuais.

As rotas editadas devem ser representadas como dados de roteamento, não como coordenadas
específicas da demo ou alterações diretas no renderer.

## 3. Exportação standalone

Gerar uma pasta ou ZIP contendo:

```text
loop-report/
├── index.html
├── assets/
│   ├── trama.js
│   └── trama.css
└── model.json
```

Requisitos:

- [x] funcionar em hospedagem estática;
- [x] não depender do projeta Trama rodando;
- [x] não depender de APIs remotas;
- [x] preservar zoom, pan, foco e navegação de loops;
- [x] aceitar embed por `iframe`;
- [x] oferecer opção de arquivo único HTML;
- [x] incluir integridade e versionamento do formato exportado (payload V3 + digest FNV-1a).

Abrir diretamente por `file://` pode impor restrições a arquivos JSON separados. O exportador de
arquivo único deve embutir modelo e assets para esse caso.

## 4. Modo apresentação

- [x] story como dados separados do motor;
- [x] passos focando nós, relações ou loops;
- [x] narrativa e foco por passo;
- [x] avançar, voltar e progresso;
- [x] exportar apresentação no HTML standalone;
- [x] autoplay;
- [x] câmera editorial por passo;
- [x] revelar progressivamente sem alterar o modelo-base;
- [x] Story Mode V2 com apresentações de projeto, capítulos, cenas e beats;
- [x] storyboard visual inicial e direção por seleção/topologia;
- [x] coreografia inicial de múltiplos loops, percursos e handoffs;
- [x] Story Director determinístico e Story Lint;
- [x] presenter mode, explorar/retomar e paridade determinística do standalone;
- [x] respeitar preferências de movimento reduzido em todo o player.

A especificação detalhada, as user stories, features, tasks, fases e critérios de aceitação estão em
`docs/STORY_MODE_V2_PRODUCT_AND_IMPLEMENTATION_SPEC.md`.

## 5. Publicação

- pacote ESM;
- Web Component opcional;
- exportação de imagem e SVG;
- testes visuais automatizados;
- documentação de integração para relatórios e plataformas de publicação.
