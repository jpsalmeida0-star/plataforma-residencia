// Tipos centrais do banco de questões e da análise de erros.

export type GrandeArea =
  | "clinica"
  | "cirurgia"
  | "go"
  | "pediatria"
  | "preventiva";

export type Alternativa = {
  letra: string; // "A", "B", ...
  texto: string;
};

export type Origem = "oficial" | "gerada" | "manual";

export type Questao = {
  id: string; // ex.: "enamed-2025-c1-q017"
  banca: string; // ex.: "ENAMED/ENARE"
  ano: number;
  numero: number;
  enunciado: string;
  imagem?: string; // caminho em /public
  alternativas: Alternativa[];
  gabarito: string | null; // null = anulada
  comentario?: string;
  origem: Origem;
  temas: string[]; // ids de lib/taxonomia.ts (subtema ou tema)
};

export type Prova = {
  id: string; // ex.: "enamed-2025-c1"
  banca: string;
  ano: number;
  titulo: string;
  fonte: string; // URL do caderno oficial
  questoes: Questao[];
};

export type Confianca = "certeza" | "duvida" | "chute";

export type TipoErro =
  | "lacuna" // não sabia o assunto
  | "esquecido" // já estudou, não lembrou
  | "raciocinio" // sabia, aplicou errado
  | "leitura" // não viu um dado, um "exceto"
  | "pegadinha"; // pegadinha ou conduta divergente entre bancas

export const TIPOS_ERRO: { id: TipoErro; rotulo: string; dica: string }[] = [
  { id: "lacuna", rotulo: "Lacuna de conteúdo", dica: "Não sabia o assunto" },
  { id: "esquecido", rotulo: "Conteúdo esquecido", dica: "Já estudou, não lembrou" },
  { id: "raciocinio", rotulo: "Raciocínio", dica: "Sabia, mas aplicou errado ao caso" },
  { id: "leitura", rotulo: "Leitura", dica: "Não viu um dado, um \"exceto\"" },
  { id: "pegadinha", rotulo: "Pegadinha", dica: "Ou conduta diferente entre bancas" },
];

export type Modo = "caderno" | "revisao" | "simulado";

export type Tentativa = {
  id?: number; // chave do IndexedDB
  questaoId: string;
  data: number; // Date.now()
  marcada: string;
  acertou: boolean;
  tempoMs: number;
  confianca: Confianca;
  modo: Modo;
  tipoErro?: TipoErro;
  aprendi?: string; // "o que aprendi", uma linha
};

export type Revisao = {
  questaoId: string; // chave
  proxima: number; // timestamp do dia da próxima revisão
  passo: number; // índice em INTERVALOS_DIAS
  ultima: number;
};
