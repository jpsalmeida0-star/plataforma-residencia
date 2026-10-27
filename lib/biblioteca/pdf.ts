// Leitura de PDFs com o pdf.js: texto de cada página (para o índice) e desenho de uma página (no leitor).

export type PdfJs = typeof import("pdfjs-dist");

let carregado: Promise<PdfJs> | null = null;

/** Carrega o pdf.js só no navegador e só quando for usado. */
export function carregarPdfJs(): Promise<PdfJs> {
  carregado ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return carregado;
}

/** Fontes padrão do pdf.js, copiadas para public/ por scripts/copiar-pdfjs.mjs. */
export const FONTES_PADRAO = "/pdfjs/standard_fonts/";

/** Texto de cada página, na ordem (índice 0 = página 1). */
export async function extrairPaginas(pdfjs: PdfJs, dados: ArrayBuffer, fontes = FONTES_PADRAO): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(dados), standardFontDataUrl: fontes }).promise;
  try {
    const paginas: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const conteudo = await pagina.getTextContent();
      paginas.push(
        conteudo.items
          .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
          .join("")
          .replace(/[ \t]+/g, " ")
          .trim(),
      );
      pagina.cleanup();
    }
    return paginas;
  } finally {
    await doc.destroy();
  }
}
