// Copia as fontes padrão do pdf.js para public/, para o leitor desenhar PDFs que não embutem as fontes.
import { cpSync } from "node:fs";

cpSync("node_modules/pdfjs-dist/standard_fonts", "public/pdfjs/standard_fonts", { recursive: true });
