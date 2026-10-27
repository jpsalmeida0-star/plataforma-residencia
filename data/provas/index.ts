// Provas importadas. Cada prova é um JSON neste diretório, no formato de `Prova` (lib/tipos.ts).
// Para adicionar: salve o arquivo aqui, importe-o abaixo, coloque na lista e rode `npm run validar-provas`.

import type { Prova, Questao } from "@/lib/tipos";
// Caderno 1 com o gabarito definitivo:
// https://med.estrategia.com/portal/wp-content/uploads/2025/12/GABARITO_DEFINITIVO_CADERNO_1-1.pdf
import enamed2025c1 from "./enamed-2025-c1.json";
// ENARE 2024/2025, caderno Tipo 1 (FGV), com o gabarito definitivo retificado em 04/12/2024 (questão 16 anulada):
// https://mapa-vagas-enare-ebserh.conhecimento.fgv.br/provas-gabaritos/medica/ENARE%202024%20Gabarito%20Definitivo%20-%20Medica.pdf
import enare2024 from "./enare-2024.json";
// ENARE 2023/2024, caderno Tipo 1 (Instituto AOCP). O gabarito definitivo não está mais no site da Ebserh: partimos do
// preliminar oficial (gabarito-pre-requisito-ano-adicional-area-de-atuacao-e-acesso-direto.pdf, prova 1) e aplicamos o
// resultado dos recursos como publicado na compilação pós-recursos da Medway: questões 9, 13, 50, 53 e 87 anuladas e
// 99 de D para C. A Medway também marca C na 31, mas a afirmativa III ("circundados por neutrófilos") é falsa, então
// mantivemos o A do preliminar até achar o gabarito definitivo oficial.
import enare2023 from "./enare-2023.json";
// ENARE 2022/2023, caderno Tipo 1 (Instituto AOCP). Mesmo caso da 2023: preliminar oficial (prova 1) com o resultado dos
// recursos da compilação pós-recursos da Medway: questões 31, 46, 49, 85, 86 e 100 anuladas; 19 de A para B e 51 de B para C.
import enare2022 from "./enare-2022.json";
// PSU-MG/AREMG 2025 (prova geral, aplicada em 01/12/2024). A AREMG não deixa o caderno em acesso aberto; o texto vem da
// transcrição publicada pela Medway, na numeração do Tipo 1. Gabarito: preliminar oficial da prova geral Tipo 1
// (GABARITOPRELIMINARPROVAGERALTIPO1-PSUMG2025, em aremg.org.br) com as questões 12 e 67 anuladas após os recursos,
// conforme o gabarito oficial republicado pela OsceLabs e pela Medway.
import psuMg2025 from "./psu-mg-2025.json";

export const PROVAS: Prova[] = [enamed2025c1 as Prova, enare2024 as Prova, enare2023 as Prova, enare2022 as Prova, psuMg2025 as Prova];

export const QUESTOES: Questao[] = PROVAS.flatMap((p) => p.questoes);
