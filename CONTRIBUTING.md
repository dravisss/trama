# Contribuindo com o LoopViewer

Obrigado por considerar uma contribuição. Antes de começar, abra uma issue descrevendo o
problema ou proposta, principalmente para mudanças no modelo de domínio, geometria, roteamento,
persistência ou API pública.

## Ambiente local

- Node.js 22.5 ou superior;
- `npm ci` para instalar exatamente o lockfile;
- `npm run check` antes de enviar uma mudança.

Para alterações visuais, execute também `npm run check:ui`. Essa verificação usa Playwright e
pode exigir a instalação prévia dos navegadores compatíveis com o ambiente.

Consulte também [Código de Conduta](CODE_OF_CONDUCT.md), [Suporte](SUPPORT.md) e
[Segurança](SECURITY.md).

## Princípios de arquitetura

- domínio não deve depender da renderização;
- geometria deve permanecer pura sempre que possível;
- `Presentation` V2 é a única entidade narrativa persistida; não adicione `model.story`;
- não edite `dist/` manualmente: gere-o com `npm run build`;
- `reference.html` é uma referência visual congelada.

Inclua testes para mudanças de comportamento e atualize a documentação quando o contrato público
mudar. Não envie bancos locais, segredos, logs ou capturas temporárias.
