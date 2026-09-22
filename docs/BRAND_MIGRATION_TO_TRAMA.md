# Migração de identidade para Trama

Trama substitui LoopViewer como nome público e técnico preferencial do aplicativo. O rebranding
abrange interface, documentação, pacote npm privado, banco padrão, backups, exports HTML, atributos
de runtime, variáveis de ambiente, fixtures e artefatos do design system.

## Contratos novos

| Superfície | Contrato Trama |
| --- | --- |
| Banco padrão | `data/trama.db` |
| Backup de projeto | `<projeto>.trama.json`, formato `trama-project` |
| Export de apresentação | formato `trama-presentation` |
| Atlas Embed | formato e atributos `trama-atlas-*` |
| Variáveis de ambiente | prefixo `TRAMA_` |
| Runtime React | `window.TramaReact` |
| Runtime de QA/extensão | `window.tramaDemo` e globals `__TRAMA_*` |
| Persistência no navegador | prefixo `trama:` |
| Design tokens gerados | `dist/trama-ui-tokens.*` |
| Skill Mermaid | `.agents/skills/mermaid-to-trama/` |

## Compatibilidade preservada

Os seguintes nomes antigos são aceitos somente como entrada ou fallback:

- `data/loopviewer.db` é aberto automaticamente quando não há `data/trama.db`;
- bundles `loopviewer-project` e arquivos `.loopviewer.json` continuam importáveis;
- variáveis `LOOPVIEWER_*` continuam válidas quando a equivalente `TRAMA_*` não foi definida;
- `window.LoopViewerReact`, `window.loopViewerDemo` e `__LOOPVIEWER_*` essenciais permanecem como
  aliases de runtime;
- chaves `loopviewer:` de projetos recentes, layouts e retomada de apresentações continuam sendo
  lidas, enquanto toda nova gravação usa `trama:`.

Esses aliases não devem aparecer em nova UI, documentação de uso principal ou artefatos gerados.
Eles existem para evitar perda de projetos locais e quebra abrupta de integrações durante a
transição. A API pública do motor continua sendo `CLD`, pois ela descreve o domínio de causal loop
diagrams e não a marca do aplicativo.
