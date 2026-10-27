// Provas importadas. Cada prova é um JSON neste diretório, no formato de `Prova` (lib/tipos.ts).
// Para adicionar: salve o arquivo aqui, importe-o abaixo, coloque na lista e rode `npm run validar-provas`.

import type { Prova, Questao } from "@/lib/tipos";
// Caderno 1 com o gabarito definitivo:
// https://med.estrategia.com/portal/wp-content/uploads/2025/12/GABARITO_DEFINITIVO_CADERNO_1-1.pdf
import enamed2025c1 from "./enamed-2025-c1.json";
// ENARE 2024/2025, caderno Tipo 1 (FGV), com o gabarito definitivo retificado em 04/12/2024 (questão 16 anulada):
// https://mapa-vagas-enare-ebserh.conhecimento.fgv.br/provas-gabaritos/medica/ENARE%202024%20Gabarito%20Definitivo%20-%20Medica.pdf
import enare2024 from "./enare-2024.json";

export const PROVAS: Prova[] = [enamed2025c1 as Prova, enare2024 as Prova];

export const QUESTOES: Questao[] = PROVAS.flatMap((p) => p.questoes);
