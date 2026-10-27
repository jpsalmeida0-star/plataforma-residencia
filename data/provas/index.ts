// Provas importadas. Cada prova é um JSON neste diretório, no formato de `Prova` (lib/tipos.ts).
// Para adicionar: salve o arquivo aqui, importe-o abaixo, coloque na lista e rode `npm run validar-provas`.

import type { Prova, Questao } from "@/lib/tipos";

export const PROVAS: Prova[] = [];

export const QUESTOES: Questao[] = PROVAS.flatMap((p) => p.questoes);
