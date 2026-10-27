// Banco local no aparelho (IndexedDB). Tudo é salvo aqui primeiro, então o app funciona offline.
// A sincronização com o Supabase entre aparelhos entra numa etapa seguinte.

import Dexie, { type EntityTable } from "dexie";
import { proximaRevisao } from "./analise";
import type { Revisao, Tentativa } from "./tipos";
import type { Apostila, PaginaIndexada } from "./biblioteca/tipos";

class BancoLocal extends Dexie {
  tentativas!: EntityTable<Tentativa, "id">;
  revisoes!: EntityTable<Revisao, "questaoId">;
  apostilas!: EntityTable<Apostila, "id">;
  paginas!: EntityTable<PaginaIndexada, "chave">;

  constructor() {
    super("plataforma-residencia");
    this.version(1).stores({
      tentativas: "++id, questaoId, data, acertou",
      revisoes: "questaoId, proxima",
    });
    // Biblioteca: índice das apostilas do Drive, guardado só neste aparelho.
    this.version(2).stores({
      apostilas: "id, status, caminho",
      paginas: "chave, apostilaId, *termos",
    });
  }
}

export const db = new BancoLocal();

/** Salva a tentativa e atualiza a agenda de revisão da questão. */
export async function registrarTentativa(t: Tentativa): Promise<number> {
  return db.transaction("rw", db.tentativas, db.revisoes, async () => {
    const id = await db.tentativas.add(t);
    const atual = await db.revisoes.get(t.questaoId);
    const nova = proximaRevisao(atual, t);
    if (nova) await db.revisoes.put(nova);
    else if (atual) await db.revisoes.delete(t.questaoId);
    return id as number;
  });
}

/** Completa a tentativa com o tipo de erro e o "o que aprendi". */
export async function anotarErro(id: number, tipoErro: Tentativa["tipoErro"], aprendi: string): Promise<void> {
  await db.tentativas.update(id, { tipoErro, aprendi: aprendi.trim() || undefined });
}

/** Cópia de segurança de tudo o que está no aparelho, em JSON. */
export async function exportarDados(): Promise<string> {
  const [tentativas, revisoes] = await Promise.all([db.tentativas.toArray(), db.revisoes.toArray()]);
  return JSON.stringify({ versao: 1, exportadoEm: new Date().toISOString(), tentativas, revisoes }, null, 2);
}
