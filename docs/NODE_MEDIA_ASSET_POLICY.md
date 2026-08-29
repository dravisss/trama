# Política de mídia para imagens nos nós

## Contrato

Imagens de variáveis são opcionais e vivem no mapa como `node.media`. O mapa guarda apenas `assetId` e metadados editoriais: `altText`, `size`, `labelGap`, `labelPlacement`, `fit` e `focalPoint`. Bytes ficam na tabela SQLite `assets`; URLs remotas não são contrato de runtime.

O padrão editorial é raster quadrado, crop circular automático, 112 px, label abaixo, fundo transparente e `fit: cover`. O foco deve ser ajustado entre 0 e 1 quando o sujeito principal não sobreviver ao crop central.

## Formatos e limites

- Entrada aceita: PNG, JPEG, WebP e GIF estático.
- Derivativo de display recomendado: lado de 512 px, sRGB, sem texto ou setas dentro da arte.
- O asset preserva `sha256`, dimensões quando conhecidas, `alt_text`, `kind`, focal padrão e JSON de proveniência.
- O importer deduplica bytes pelo SHA-256 no projeto atual.
- Originais podem permanecer no diretório de trabalho do agente; o runtime deve receber apenas o derivativo revisado.

## Acessibilidade e integridade

`altText` é obrigatório no workflow de importação. O texto do nó continua sendo o nome semântico principal; a imagem é reforço visual, não substituto de significado. Export standalone bloqueia referências inexistentes e incorpora os assets usados como data URLs.

## Ciclo de vida

Remover uma imagem de um nó remove apenas a referência. O asset permanece no projeto para evitar quebrar apresentações, versões ou outros nós; limpeza física exige uma futura operação explícita de garbage collection com contagem de referências.

## Proveniência

Agentes devem registrar no manifest o prompt final, ferramenta/modelo, data, revisão escolhida e relação com o node ID. Essa proveniência não entra em `description_md`, `edge.description` ou copy editorial do mapa.
