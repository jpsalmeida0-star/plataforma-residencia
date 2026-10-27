export type StatusApostila = "pendente" | "indexada" | "sem-texto" | "erro";

/** Um PDF da pasta de apostilas no Drive. O arquivo continua no Drive; aqui fica só o índice. */
export type Apostila = {
  id: string; // id do arquivo no Drive
  nome: string;
  caminho: string; // pastas acima do arquivo, ex.: "Medcurso 2023 / Clínica"
  modificado: string; // modifiedTime do Drive, para reindexar se mudar
  tamanho: number; // bytes
  status: StatusApostila;
  paginas?: number;
  erro?: string;
};

/** Texto de uma página de apostila, com os termos para a busca. */
export type PaginaIndexada = {
  chave: string; // `${apostilaId}#${pagina}`
  apostilaId: string;
  pagina: number; // começa em 1
  texto: string;
  termos: string[];
};

export type Resultado = {
  apostila: Apostila;
  paginas: { pagina: number; pontos: number; trecho: string }[];
  melhor: number;
};
