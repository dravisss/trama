# Protocolo de QA do Story Studio

Este protocolo existe para que uma alteração de Story Studio só seja considerada concluída depois de validar modelo, interação e apresentação visual. A compilação do código, sozinha, não é suficiente.

## Comandos obrigatórios

```bash
npm run qa:story
npm run check
```

`qa:story` protege os contratos críticos da interface e testa as operações de edição da apresentação. `check` executa toda a suíte do projeto, repete o QA do Story Studio e gera o build distribuível.

## Critérios de aceite

Toda mudança que tocar a timeline, o inspector, o Markdown ou a apresentação deve verificar:

### Estrutura e edição

- Uma cena pode conter vários beats.
- É possível criar uma cena e adicionar um beat.
- Beats podem ser reordenados dentro da mesma cena.
- Beats podem ser movidos para outra cena sem mutar a história original.
- Cenas continuam sendo a unidade narrativa; um beat não é promovido silenciosamente a cena.
- IDs permanecem únicos e a apresentação continua válida.

### Navegação e mapa

- Clicar num beat atualiza a seleção do inspector.
- Clicar num beat também foca o mapa no alvo causal correspondente.
- A timeline permanece horizontal, com rolagem horizontal quando necessário.
- A cena de destino fica visualmente destacada durante um arraste.

### Edição de conteúdo

- O inspector essencial continua editável por usuários não técnicos.
- O Markdown permanece acessível como aba da sidebar.
- Alterações no Markdown podem ser validadas e aplicadas sem apagar a estrutura visual compatível.
- A troca entre Inspector e Markdown não remove o mapa nem comprime o editor de forma ilegível.

### Persistência e exportação

- A história salva e recarrega com a mesma ordem de capítulos, cenas e beats.
- O preview usa a mesma timeline compilada do editor.
- A exportação mantém a ordem, o conteúdo e a animação autorada.

## Revisão visual obrigatória

Para mudanças de UI, abrir `http://localhost:4173/` no navegador e verificar pelo menos:

1. Story Studio em viewport desktop.
2. Story Studio em viewport estreita.
3. Inspector aberto.
4. Markdown aberto.
5. Timeline com uma cena de vários beats.
6. Timeline com cenas suficientes para overflow horizontal.
7. Drop de um beat em outra cena.
8. Clique no beat com confirmação de foco no mapa.

Em cada estado, procurar especificamente por sobreposição, clipping, colunas colapsadas, texto ilegível, espaço vazio inesperado, controles duplicados e perda de seleção.

## Regra de encerramento

Não declarar a tarefa pronta quando apenas `npm run test` passar. A entrega precisa registrar:

- comandos executados;
- quantidade de testes aprovados;
- fluxos de interação verificados;
- screenshots ou estados visuais inspecionados;
- limitações que ainda não puderam ser verificadas.

Se um fluxo falhar, corrigir e repetir o ciclo completo. O relatório deve descrever a falha observável, a causa provável, a correção e a nova evidência.
