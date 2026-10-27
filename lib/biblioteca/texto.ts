// Texto das apostilas: normalização, termos para o índice e trechos de resultado.
// Funções puras, testadas em tests/biblioteca.test.ts.

const STOPWORDS = new Set(
  (
    "a ao aos as com como da das de do dos e em entre era essa esse esta este foi ha isso mais mas na nas nao " +
    "no nos o os ou para pela pelas pelo pelos por qual quando que se sem ser seu sua sao tambem tem um uma umas uns"
  ).split(" "),
);

/** Minúsculas, sem acentos, só letras e números separados por espaço. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Termos de busca: palavras normalizadas com 2+ letras, sem as palavras vazias. */
export function termos(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/** Termos únicos de uma página, para o índice. */
export function termosUnicos(texto: string): string[] {
  return [...new Set(termos(texto))];
}

/**
 * Pontua uma página para os termos da busca.
 * Cada termo conta pelas ocorrências (com teto, para uma página repetitiva não dominar),
 * e a frase exata vale um bônus grande.
 */
export function pontuar(textoNormalizado: string, busca: string[]): number {
  if (busca.length === 0) return 0;
  const palavras = textoNormalizado.split(" ");
  let pontos = 0;
  for (const termo of busca) {
    const n = palavras.filter((p) => p === termo || p.startsWith(termo)).length;
    if (n === 0) return 0; // todos os termos precisam aparecer
    pontos += Math.min(n, 10);
  }
  if (busca.length > 1 && textoNormalizado.includes(busca.join(" "))) pontos += 20;
  return pontos;
}

/** Uma letra sem acento por unidade do texto original, para achar posições sem perder os acentos. */
function espelhar(texto: string): string {
  let r = "";
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i].normalize("NFD")[0].toLowerCase();
    r += /[a-z0-9]/.test(c) ? c : " ";
  }
  return r;
}

/** Trecho do texto original em volta da primeira ocorrência de um termo da busca. */
export function trecho(textoOriginal: string, busca: string[], raio = 120): string {
  const original = textoOriginal.normalize("NFC");
  const espelho = espelhar(original);

  let pos = -1;
  for (const termo of busca) {
    const m = new RegExp(`(^| )${termo}`).exec(espelho);
    if (m) {
      pos = m.index + m[1].length;
      break;
    }
  }
  if (pos < 0) return original.slice(0, raio * 2).replace(/\s+/g, " ").trim();

  const inicio = Math.max(0, pos - raio);
  const fim = Math.min(original.length, pos + raio);
  const meio = original.slice(inicio, fim).replace(/\s+/g, " ").trim();
  return (inicio > 0 ? "…" : "") + meio + (fim < original.length ? "…" : "");
}
