// Localize authoring diagnostics at the UI boundary; compiler errors remain
// stable for engine consumers and remote agents.
export function sourceDiagnostic(error) {
  const first = error.errors?.[0];
  let message = first?.message || error.message;
  const exact = {
    'Unrecognized style syntax.': 'Sintaxe de estilo não reconhecida. Use @view, @settings ou um seletor variable/relation.',
    'Invalid frontmatter entry.': 'Metadado inválido. Use chave: valor entre os delimitadores ---.',
    'Frontmatter is not closed.': 'Feche os metadados com uma linha ---.',
    "Expected '- id: Label'.": 'Variável inválida. Use - id: Nome na seção Variables.',
    "Expected 'source SIGN target'.": 'Relação inválida. Use origem ++ destino ou origem +- destino na seção Relations.',
    'Story sections belong in a separate Presentation Markdown document.': 'Escreva a história em um documento Markdown separado do mapa.',
    'Loop property requires a loop heading.': 'Declare o título do loop antes de suas propriedades.',
    'Loop fields must be valid inline JSON.': 'Os campos do loop precisam conter JSON válido.',
    'Unknown loop property.': 'Propriedade de loop desconhecida. Revise a sintaxe da seção Loops.',
    "Fields suffix must be a valid JSON object after '::'.": 'Use um objeto JSON válido após ::.'
  };
  message = exact[message] || message
    .replace(/^Unknown source variable '(.+)'\.$/, "Variável de origem '$1' não encontrada. Declare-a em Variables.")
    .replace(/^Unknown target variable '(.+)'\.$/, "Variável de destino '$1' não encontrada. Declare-a em Variables.")
    .replace(/^Unknown relation '(.+)'\.$/, "Relação '$1' não encontrada. Declare-a em Relations.")
    .replace(/^Unknown property '(.+)' for (.+)\.$/, "Propriedade '$1' não reconhecida para $2. Revise o nome da propriedade.")
    .replace(/^Unknown selector '(.+)'\.$/, "Seletor '$1' não reconhecido. Use variable, relation, loop, scene ou canvas.")
    .replace(/^Invalid declaration '(.+)'\.$/, "Declaração '$1' inválida. Use propriedade: valor;")
    .replace(/^Duplicate relation '(.+)' \(first declared on line (\d+)\)\. Declare at most one relation per ordered pair\.$/, "Relação '$1' duplicada; primeira declaração na linha $2. Mantenha uma relação por par ordenado.");
  return `${first?.line ? `Linha ${first.line}: ` : ''}${message} O último mapa válido foi preservado. Corrija a fonte para aplicar.`;
}
