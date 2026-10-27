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
