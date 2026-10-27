// A fila de questões do caderno em andamento, guardada na aba do navegador.

const CHAVE = "fila-questoes";

export function salvarFila(ids: string[]): void {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(ids));
  } catch {
    // navegação privada sem storage: a fila só não sobrevive a um recarregamento
  }
}

export function lerFila(): string[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as string[]) : [];
  } catch {
    return [];
  }
}

/** Até n ids em ordem aleatória. */
export function sortear(ids: string[], n: number): string[] {
  const copia = [...ids];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}
