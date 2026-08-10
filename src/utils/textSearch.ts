export const WORD_RE = /[a-z0-9]+/g;

const STOPWORDS = new Set([
  'a', 'as', 'o', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'da', 'do', 'das', 'dos', 'ao', 'aos',
  'em', 'no', 'na', 'nos', 'nas', 'num', 'numa',
  'e', 'ou', 'que', 'se', 'para', 'por', 'porque',
  'com', 'sem', 'sob', 'sobre', 'como', 'entre', 'desde', 'ate',
  'muito', 'mais', 'menos', 'tambem', 'so', 'ser', 'sao', 'era',
  'sua', 'suas', 'seu', 'seus', 'meu', 'meus', 'minha', 'minhas',
  'teu', 'teus', 'tua', 'tuas', 'este', 'esta', 'estes', 'estas',
  'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas',
  'isto', 'isso', 'aquilo', 'la', 'ali', 'aqui', 'entao', 'ja',
  'ainda', 'nem', 'mas', 'quando', 'onde', 'qual', 'quais', 'quem',
  'não', 'nao', 'e', 'diz', 'disse', 'qual', 'estiver', 'ha',
]);

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function tokens(texto: string): string[] {
  return [...new Set(normalizar(texto).match(WORD_RE) ?? [])];
}

export function tokensSignificativos(texto: string): string[] {
  const todos = tokens(texto);
  return todos.filter((t) => !STOPWORDS.has(t) && t.length > 1);
}