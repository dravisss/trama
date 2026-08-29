# LoopViewer

LoopViewer é uma aplicação local-first para criar, explorar e apresentar Diagramas de Loops
Causais (CLDs). O repositório também contém o motor front-end reutilizável exposto por
`CLD.createCLD()`.

O projeto é distribuído sob a licença [MIT](LICENSE) e está na série `0.x`: a aplicação funciona,
mas contratos públicos ainda podem evoluir antes da versão `1.0`.

## O que está incluído

- editor visual de variáveis, relações, posições e rotas;
- descoberta e curadoria de ciclos de feedback;
- autoria por Markdown para mapas, estilos e apresentações;
- Presentation V2 com cenas, beats, foco semântico e câmera explícita;
- persistência local em SQLite;
- export HTML standalone sem dependência de CDN;
- um único exemplo anônimo: **Sobrecarga de Filas**, com mapa e apresentação.

Dados criados pelo usuário ficam em `data/*.db`, que não são versionados. O repositório público
não contém bancos de clientes, corpus de pesquisa privado ou projetos reais.

## Requisitos

- Node.js 22.5 ou superior (`node:sqlite` é utilizado);
- npm compatível com o lockfile;
- macOS, Linux ou Windows com um navegador moderno.

## Instalação

```bash
git clone <URL-DO-REPOSITORIO>
cd LoopViewer
npm ci
npm run check
npm run serve
```

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). Na primeira execução, o SQLite local é criado
com a demonstração Sobrecarga de Filas e sua Presentation V2.

O servidor escuta somente `127.0.0.1` por padrão. Ele não possui autenticação e não deve ser
publicado diretamente na internet. Definir `HOST` amplia deliberadamente a interface de rede.

## Uso da aplicação

- **Projetos** cria ou abre projetos SQLite dentro de `data/`;
- **Editor** altera o mapa, Markdown, estilo, dados e histórico;
- **Story Studio** cria e valida a Presentation V2 associada ao mapa;
- **Apresentar** executa a narrativa persistida;
- **Exportar HTML** gera uma publicação autocontida.

Por segurança, caminhos de bancos ficam restritos a `data/`. Um operador local pode permitir
explicitamente caminhos externos com `LOOPVIEWER_ALLOW_EXTERNAL_DB=1`. O limite padrão para JSON
da API é 5 MiB e pode ser ajustado por `LOOPVIEWER_MAX_JSON_BYTES`.

## Motor em browser

O build gera `dist/cld-engine.iife.js`. Carregue Cytoscape e o layout antes do motor:

```html
<link rel="stylesheet" href="styles.css">
<div id="graph" style="width:100%;height:700px"></div>

<script src="https://unpkg.com/cytoscape@3.30.4/dist/cytoscape.min.js"></script>
<script src="https://unpkg.com/layout-base/layout-base.js"></script>
<script src="https://unpkg.com/cose-base/cose-base.js"></script>
<script src="https://unpkg.com/cytoscape-cose-bilkent@4.1.0/cytoscape-cose-bilkent.js"></script>
<script src="dist/cld-engine.iife.js"></script>
<script>
  cytoscape.use(cytoscapeCoseBilkent);
  const viewer = CLD.createCLD({
    container: "#graph",
    model: {
      id: "example",
      nodes: [
        { id: "demand", label: "Demanda" },
        { id: "backlog", label: "Backlog" }
      ],
      edges: [{
        id: "demand-backlog",
        source: "demand",
        target: "backlog",
        sourceSign: "+",
        targetSign: "+",
        description: "Mais demanda aumenta o backlog."
      }],
      loops: []
    }
  });
</script>
```

O contrato exportado está centralizado em [`src/index.js`](src/index.js). Narrativas não pertencem
ao modelo do mapa: a entidade oficial é a `Presentation` V2 persistida separadamente, e cada cena
referencia um mapa real com `mapRef`.

## Desenvolvimento

```bash
npm test                 # testes Node
npm run qa:story         # contrato do Story Studio
npm run build            # bundles em dist/
npm run check            # gate local principal
npm run check:ui         # Playwright + acessibilidade
npm run serve            # aplicação local
```

`dist/` é gerado por `npm run build`; não edite bundles manualmente. A CI executa instalação limpa
e `npm run check` em pushes e pull requests.

## Estrutura

```text
src/core/          modelo de domínio e loops
src/geometry/      matemática pura
src/routing/       cálculo e diagnóstico de rotas
src/annotations/   polaridades e zoom semântico
src/rendering/     adaptação para Cytoscape
src/presentation/  Presentation V2, câmera, lint e export
src/platform/      persistência SQLite local
src/app/           composição da aplicação
seeds/             única demonstração pública
tests/             testes Node
e2e/               testes Playwright
```

Detalhes adicionais estão em [Arquitetura](docs/ARCHITECTURE.md),
[Extensão](docs/EXTENDING.md), [Contribuição](CONTRIBUTING.md) e [Segurança](SECURITY.md).

## Limitações atuais

- a versão `0.x` ainda não promete estabilidade semântica até `1.0`;
- self-loops e múltiplas arestas paralelas têm suporte limitado;
- o roteamento é heurístico e não uma solução ótima global;
- a API ESM não é publicada como pacote npm;
- exposição do servidor além de loopback exige uma camada externa de autenticação e segurança.

## Licença

[MIT](LICENSE). As fontes Noto incluídas mantêm seus próprios arquivos de licença em
`assets/fonts/`.
