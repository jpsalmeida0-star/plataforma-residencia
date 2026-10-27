// Índice local das apostilas: lista do Drive, indexação página a página e busca.

import { db } from "@/lib/db";
import type { PdfEncontrado } from "./drive";
import { extrairPaginas, type PdfJs } from "./pdf";
import { normalizar, pontuar, termos, termosUnicos, trecho } from "./texto";
import type { Apostila, PaginaIndexada, Resultado } from "./tipos";

/** Páginas com menos letras que isso são tratadas como imagem (PDF escaneado). */
const MINIMO_LETRAS_POR_PAGINA = 40;

/**
 * Atualiza a lista de apostilas com o que está no Drive.
 * Novas ou modificadas ficam pendentes; as que sumiram do Drive saem do índice.
 */
export async function sincronizarLista(pdfs: PdfEncontrado[]): Promise<{ novas: number; removidas: number }> {
  return db.transaction("rw", db.apostilas, db.paginas, async () => {
    const atuais = new Map((await db.apostilas.toArray()).map((a) => [a.id, a]));
    let novas = 0;
    for (const p of pdfs) {
      const atual = atuais.get(p.id);
      atuais.delete(p.id);
      if (atual && atual.modificado === p.modificado) {
        if (atual.nome !== p.nome || atual.caminho !== p.caminho) await db.apostilas.update(p.id, { nome: p.nome, caminho: p.caminho });
        continue;
      }
      if (!atual) novas++;
      await db.paginas.where("apostilaId").equals(p.id).delete();
      await db.apostilas.put({ ...p, status: "pendente" });
    }
    for (const id of atuais.keys()) {
      await db.paginas.where("apostilaId").equals(id).delete();
      await db.apostilas.delete(id);
    }
    return { novas, removidas: atuais.size };
  });
}

/** Extrai o texto de um PDF já baixado e grava as páginas no índice. */
export async function indexarApostila(
  apostila: Apostila,
  dados: ArrayBuffer,
  pdfjs: PdfJs,
  fontes?: string,
): Promise<Apostila> {
  let paginas: string[];
  try {
    paginas = await extrairPaginas(pdfjs, dados, fontes);
  } catch (e) {
    const comErro: Apostila = { ...apostila, status: "erro", erro: e instanceof Error ? e.message : String(e) };
    await db.apostilas.put(comErro);
    return comErro;
  }

  const comTexto = paginas.filter((t) => t.replace(/\s/g, "").length >= MINIMO_LETRAS_POR_PAGINA).length;
  const registros: PaginaIndexada[] = paginas.map((texto, i) => ({
    chave: `${apostila.id}#${i + 1}`,
    apostilaId: apostila.id,
    pagina: i + 1,
    texto,
    termos: termosUnicos(texto),
  }));

  const pronta: Apostila = {
    ...apostila,
    paginas: paginas.length,
    status: comTexto === 0 ? "sem-texto" : "indexada",
    erro: undefined,
  };
  await db.transaction("rw", db.apostilas, db.paginas, async () => {
    await db.paginas.where("apostilaId").equals(apostila.id).delete();
    await db.paginas.bulkPut(registros);
    await db.apostilas.put(pronta);
  });
  return pronta;
}

const MAX_CANDIDATAS = 3000;
const PAGINAS_POR_APOSTILA = 3;

/**
 * Busca nas páginas indexadas. Todos os termos precisam aparecer; o último pode estar incompleto
 * ("nefrot" acha "nefrotica"). Resultado agrupado por apostila, melhores primeiro.
 */
export async function buscar(consulta: string, limite = 30): Promise<Resultado[]> {
  const busca = termos(consulta);
  if (busca.length === 0) return [];

  // O termo mais longo costuma ser o mais raro: é ele que filtra as candidatas no índice.
  const ultimo = busca.length - 1;
  const chave = busca.reduce((m, t, i) => (t.length > busca[m].length ? i : m), 0);
  const consultaIndice =
    chave === ultimo ? db.paginas.where("termos").startsWith(busca[chave]) : db.paginas.where("termos").equals(busca[chave]);
  const candidatas = await consultaIndice.limit(MAX_CANDIDATAS).toArray();

  const vistas = new Set<string>();
  const porApostila = new Map<string, { pagina: number; pontos: number; texto: string }[]>();
  for (const p of candidatas) {
    if (vistas.has(p.chave)) continue; // startsWith num índice multiEntry pode repetir a página
    vistas.add(p.chave);
    const pontos = pontuar(normalizar(p.texto), busca);
    if (pontos === 0) continue;
    const lista = porApostila.get(p.apostilaId) ?? [];
    lista.push({ pagina: p.pagina, pontos, texto: p.texto });
    porApostila.set(p.apostilaId, lista);
  }

  const apostilas = await db.apostilas.bulkGet([...porApostila.keys()]);
  const resultados: Resultado[] = [];
  for (const apostila of apostilas) {
    if (!apostila) continue;
    const paginas = porApostila
      .get(apostila.id)!
      .sort((a, b) => b.pontos - a.pontos || a.pagina - b.pagina)
      .slice(0, PAGINAS_POR_APOSTILA)
      .map((p) => ({ pagina: p.pagina, pontos: p.pontos, trecho: trecho(p.texto, busca) }));
    resultados.push({ apostila, paginas, melhor: paginas[0].pontos });
  }
  return resultados.sort((a, b) => b.melhor - a.melhor).slice(0, limite);
}
