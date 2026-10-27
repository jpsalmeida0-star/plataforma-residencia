// Provas importadas. Cada prova é um JSON neste diretório, no formato de `Prova` (lib/tipos.ts).
// Para adicionar: salve o arquivo aqui, importe-o abaixo, coloque na lista e rode `npm run validar-provas`.

import type { Prova, Questao } from "@/lib/tipos";
// Caderno 1 com o gabarito definitivo:
// https://med.estrategia.com/portal/wp-content/uploads/2025/12/GABARITO_DEFINITIVO_CADERNO_1-1.pdf
import enamed2025c1 from "./enamed-2025-c1.json";

export const PROVAS: Prova[] = [enamed2025c1 as Prova];

export const QUESTOES: Questao[] = PROVAS.flatMap((p) => p.questoes);
