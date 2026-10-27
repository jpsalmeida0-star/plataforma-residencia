import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { idDaPasta } from "@/lib/biblioteca/drive";
import { buscar, indexarApostila, sincronizarLista } from "@/lib/biblioteca/indice";
import { extrairPaginas, type PdfJs } from "@/lib/biblioteca/pdf";
import { normalizar, pontuar, termos, trecho } from "@/lib/biblioteca/texto";

// PDF gerado só para os testes, com conteúdo fictício (tests/fixtures/apostila-teste.pdf).
const PDF = readFileSync(path.join(__dirname, "fixtures/apostila-teste.pdf"));
const dadosPdf = () => PDF.buffer.slice(PDF.byteOffset, PDF.byteOffset + PDF.byteLength) as ArrayBuffer;
const FONTES = path.join(__dirname, "../node_modules/pdfjs-dist/standard_fonts/");
const pdfjs = () => import("pdfjs-dist/legacy/build/pdf.mjs") as unknown as Promise<PdfJs>;

describe("texto", () => {
  it("normaliza acentos e pontuação", () => {
    expect(normalizar("Síndrome Nefrótica: proteinúria!")).toBe("sindrome nefrotica proteinuria");
  });

  it("tira palavras vazias da busca", () => {
    expect(termos("tratamento da insuficiência cardíaca na gestação")).toEqual([
      "tratamento", "insuficiencia", "cardiaca", "gestacao",
    ]);
  });

  it("exige todos os termos e premia a frase exata", () => {
    const texto = normalizar("A síndrome nefrótica tem proteinúria. Síndrome nefrítica tem hematúria.");
    expect(pontuar(texto, ["sindrome", "nefrotica"])).toBeGreaterThan(20);
    expect(pontuar(texto, ["sindrome", "lupus"])).toBe(0);
    expect(pontuar(texto, ["nefrot"])).toBe(1); // prefixo
  });

  it("monta o trecho em volta do termo, mantendo os acentos", () => {
    const original = "x ".repeat(200) + "Na síndrome nefrótica há proteinúria maciça." + " y".repeat(200);
    const t = trecho(original, ["nefrotica"], 30);
    expect(t).toContain("síndrome nefrótica há proteinúria");
    expect(t.startsWith("…")).toBe(true);
    expect(t.endsWith("…")).toBe(true);
  });
});

describe("idDaPasta", () => {
  it("aceita link de pasta, link com id e o id puro", () => {
    expect(idDaPasta("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMn?usp=sharing")).toBe("1AbCdEfGhIjKlMn");
    expect(idDaPasta("https://drive.google.com/open?id=1AbCdEfGhIjKlMn")).toBe("1AbCdEfGhIjKlMn");
    expect(idDaPasta("1AbCdEfGhIjKlMn")).toBe("1AbCdEfGhIjKlMn");
    expect(idDaPasta("não é um link")).toBeNull();
  });
});

describe("extração do PDF", () => {
  it("devolve o texto de cada página", async () => {
    const paginas = await extrairPaginas(await pdfjs(), dadosPdf(), FONTES);
    expect(paginas).toHaveLength(3);
    expect(paginas[1]).toContain("Síndrome nefrótica");
    expect(paginas[2]).toContain("quatro pilares");
  });
});

describe("índice e busca", () => {
  const pdf = { id: "arq1", nome: "Nefro e cardio.pdf", caminho: "Curso X / Clínica", modificado: "2024-01-01T00:00:00Z", tamanho: PDF.byteLength };

  beforeEach(async () => {
    await db.apostilas.clear();
    await db.paginas.clear();
  });

  it("indexa e acha a página certa, com trecho", async () => {
    await sincronizarLista([pdf]);
    const apostila = (await db.apostilas.get("arq1"))!;
    expect(apostila.status).toBe("pendente");

    const pronta = await indexarApostila(apostila, dadosPdf(), await pdfjs(), FONTES);
    expect(pronta).toMatchObject({ status: "indexada", paginas: 3 });

    const [r] = await buscar("síndrome nefrótica");
    expect(r.apostila.nome).toBe("Nefro e cardio.pdf");
    expect(r.paginas[0].pagina).toBe(2);
    expect(r.paginas[0].trecho).toContain("nefrótica");

    expect((await buscar("insuficiencia cardiaca"))[0].paginas[0].pagina).toBe(3);
    expect(await buscar("lúpus")).toEqual([]);
    expect((await buscar("nefrot")).length).toBe(1); // última palavra incompleta
  });

  it("reindexa quando o arquivo muda no Drive e remove o que sumiu", async () => {
    await sincronizarLista([pdf]);
    await indexarApostila((await db.apostilas.get("arq1"))!, dadosPdf(), await pdfjs(), FONTES);

    expect(await sincronizarLista([pdf])).toEqual({ novas: 0, removidas: 0 });
    expect((await db.apostilas.get("arq1"))!.status).toBe("indexada");

    await sincronizarLista([{ ...pdf, modificado: "2025-01-01T00:00:00Z" }]);
    expect((await db.apostilas.get("arq1"))!.status).toBe("pendente");
    expect(await db.paginas.count()).toBe(0);

    expect(await sincronizarLista([])).toEqual({ novas: 0, removidas: 1 });
    expect(await db.apostilas.count()).toBe(0);
  });

  it("marca PDF inválido como erro", async () => {
    await sincronizarLista([pdf]);
    const r = await indexarApostila((await db.apostilas.get("arq1"))!, new ArrayBuffer(10), await pdfjs(), FONTES);
    expect(r.status).toBe("erro");
  });
});
