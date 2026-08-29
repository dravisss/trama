# ADR 0022 — Migrar controles do player de apresentação para o owner React

## Contexto

O player de apresentação já era renderizado por `PresentationCard`, mas
anterior/Próximo, exploração, retomada, presenter mode e fechamento ainda eram
ligados pelo `workspaceDomBridge`. Isso separava o markup React dos eventos de
interação do próprio player.

## Decisão

`PresentationCard` recebe `presentationActions` e emite os seis intents pelo
React. `app.js` permanece como adaptador do `PresentationController`, incluindo
a regra de concluir no último beat e o ciclo explorar/retomar. O card continua
`React.memo` para que as atualizações imperativas de copy, `disabled`, `hidden`
e `data-mode` não sejam reescritas por renders de estado não relacionados.

Os listeners correspondentes e ações duplicadas saem do
`workspaceDomBridge`. Não houve alteração de IDs, schema, Presentation V2,
persistência ou export standalone.

## Validação

- `npm run build`: concluído;
- Playwright do player de apresentação: 1 teste em duas repetições;
- o fluxo cobre avanço, exploração, retomada, presenter mode, Escape e ausência
  de erros de console.

## Rollback

Reverter este commit restaura os listeners do player no bridge e remove o
contrato `presentationActions`. Não há migração de dados.
