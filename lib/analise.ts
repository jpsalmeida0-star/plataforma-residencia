// Análise de erros: acerto por tema, prioridade, estratégia e agenda de revisão.
// Funções puras, sem acesso ao banco, para poderem ser testadas.

import type { Confianca, Questao, Revisao, Tentativa, TipoErro } from "./tipos";

const DIA = 24 * 60 * 60 * 1000;

/** Quantas tentativas recentes de cada tema entram no cálculo. */
export const JANELA_TENTATIVAS = 20;
/** Abaixo disso o tema aparece como "pouca amostra". */
export const AMOSTRA_MINIMA = 10;
/** Intervalos de revisão de uma questão, em dias. */
export const INTERVALOS_DIAS = [1, 3, 7, 15, 30, 60];

/** Quanto um acerto vale conforme a confiança: chute não conta como domínio. */
const PESO_ACERTO: Record<Confianca, number> = { certeza: 1, duvida: 0.5, chute: 0 };

export function valorDaTentativa(t: Pick<Tentativa, "acertou" | "confianca">): number {
  return t.acertou ? PESO_ACERTO[t.confianca] : 0;
}

/** Acerto ajustado das últimas tentativas (mais recentes primeiro). */
export function acertoAjustado(tentativas: Tentativa[]): { valor: number; n: number } {
  const recentes = [...tentativas].sort((a, b) => b.data - a.data).slice(0, JANELA_TENTATIVAS);
  if (recentes.length === 0) return { valor: 0, n: 0 };
  const soma = recentes.reduce((s, t) => s + valorDaTentativa(t), 0);
  return { valor: soma / recentes.length, n: recentes.length };
}

/** Fração das questões oficiais que caem em cada tema. Sem provas, todos pesam igual. */
export function incidenciaPorTema(questoes: Questao[]): Map<string, number> {
  const oficiais = questoes.filter((q) => q.origem === "oficial");
  const contagem = new Map<string, number>();
  for (const q of oficiais) for (const tema of q.temas) contagem.set(tema, (contagem.get(tema) ?? 0) + 1);
  const total = oficiais.length;
  const incidencia = new Map<string, number>();
  for (const [tema, n] of contagem) incidencia.set(tema, n / total);
  return incidencia;
}

/** 1 para um tema visto hoje, subindo até 2 para 60 dias ou mais sem ver (ou nunca visto). */
export function fatorEsquecimento(ultima: number | undefined, agora: number): number {
  if (ultima === undefined) return 2;
  const dias = Math.max(0, (agora - ultima) / DIA);
  return 1 + Math.min(dias, 60) / 60;
}

export type Faixa =
  | "pouca-amostra"
  | "fraco-alta"
  | "fraco-leitura"
  | "fraco-baixa"
  | "evolucao"
  | "forte"
  | "forte-antigo";

export const ESTRATEGIA: Record<Faixa, { rotulo: string; acao: string }> = {
  "fraco-alta": {
    rotulo: "Fraco e cai muito",
    acao: "Ler a apostila do tema e fazer 15 a 20 questões na semana; rever as erradas em 1, 3 e 7 dias.",
  },
  "fraco-leitura": {
    rotulo: "Fraco por leitura ou pegadinha",
    acao: "Treino de questões mais rápido, sublinhando o comando e os \"exceto\". Não precisa reler a teoria.",
  },
  "fraco-baixa": {
    rotulo: "Fraco e cai pouco",
    acao: "Revisão curta com resumo ou flashcards; não vale gastar a semana nele.",
  },
  evolucao: {
    rotulo: "Em evolução",
    acao: "Continuar com questões do tema e rever as erradas na data marcada.",
  },
  forte: {
    rotulo: "Forte",
    acao: "Manutenção: poucas questões com intervalos cada vez maiores (15, 30, 60 dias).",
  },
  "forte-antigo": {
    rotulo: "Forte, mas antigo",
    acao: "Um bloco de questões mistas para confirmar antes de espaçar mais.",
  },
  "pouca-amostra": {
    rotulo: "Pouca amostra",
    acao: "Fazer mais questões do tema antes de tirar conclusões.",
  },
};

export type DesempenhoTema = {
  tema: string;
  n: number;
  acerto: number; // 0..1, ajustado
  incidencia: number; // 0..1
  ultima?: number;
  prioridade: number;
  faixa: Faixa;
  errosPorTipo: Partial<Record<TipoErro, number>>;
};

/**
 * Desempenho por tema a partir das tentativas.
 * prioridade = (1 - acerto ajustado) x incidência x fator de esquecimento
 */
export function desempenhoPorTema(
  tentativas: Tentativa[],
  questoes: Questao[],
  agora: number,
): DesempenhoTema[] {
  const porId = new Map(questoes.map((q) => [q.id, q]));
  const incidencia = incidenciaPorTema(questoes);
  const temIncidencia = incidencia.size > 0;

  const porTema = new Map<string, Tentativa[]>();
  for (const t of tentativas) {
    const q = porId.get(t.questaoId);
    if (!q) continue;
    for (const tema of q.temas) {
      const lista = porTema.get(tema) ?? [];
      lista.push(t);
      porTema.set(tema, lista);
    }
  }

  const valores = [...incidencia.values()].sort((a, b) => a - b);
  const mediana = valores.length ? valores[Math.floor(valores.length / 2)] : 0;

  const resultado: DesempenhoTema[] = [];
  for (const [tema, lista] of porTema) {
    const { valor, n } = acertoAjustado(lista);
    const ultima = Math.max(...lista.map((t) => t.data));
    const inc = temIncidencia ? (incidencia.get(tema) ?? 0) : 1;
    const errosPorTipo: Partial<Record<TipoErro, number>> = {};
    for (const t of lista) if (!t.acertou && t.tipoErro) errosPorTipo[t.tipoErro] = (errosPorTipo[t.tipoErro] ?? 0) + 1;

    resultado.push({
      tema,
      n,
      acerto: valor,
      incidencia: temIncidencia ? inc : 0,
      ultima,
      prioridade: (1 - valor) * inc * fatorEsquecimento(ultima, agora),
      faixa: classificar(valor, n, inc, mediana, ultima, agora, errosPorTipo),
      errosPorTipo,
    });
  }
  return resultado.sort((a, b) => b.prioridade - a.prioridade);
}

function classificar(
  acerto: number,
  n: number,
  incidencia: number,
  mediana: number,
  ultima: number,
  agora: number,
  erros: Partial<Record<TipoErro, number>>,
): Faixa {
  if (n < AMOSTRA_MINIMA) return "pouca-amostra";
  if (acerto >= 0.8) return agora - ultima > 30 * DIA ? "forte-antigo" : "forte";
  if (acerto >= 0.6) return "evolucao";
  const totalErros = Object.values(erros).reduce((s, x) => s + (x ?? 0), 0);
  const deLeitura = (erros.leitura ?? 0) + (erros.pegadinha ?? 0);
  if (totalErros > 0 && deLeitura / totalErros > 0.5) return "fraco-leitura";
  return incidencia >= mediana ? "fraco-alta" : "fraco-baixa";
}

/** Início do dia (meia-noite local) de um instante. */
export function inicioDoDia(instante: number): number {
  const d = new Date(instante);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Atualiza a revisão de uma questão depois de uma tentativa.
 * Erro volta ao primeiro intervalo; acerto com certeza avança; acerto com dúvida ou chute repete o intervalo.
 * Retorna null quando a questão sai da revisão (acertou com certeza no último intervalo,
 * ou acertou com certeza uma questão que nem estava em revisão).
 */
export function proximaRevisao(atual: Revisao | undefined, t: Tentativa): Revisao | null {
  const hoje = inicioDoDia(t.data);
  let passo: number;
  if (!t.acertou) passo = 0;
  else if (t.confianca === "certeza") {
    if (!atual) return null;
    passo = atual.passo + 1;
    if (passo >= INTERVALOS_DIAS.length) return null;
  } else passo = atual ? atual.passo : 0;

  return { questaoId: t.questaoId, passo, ultima: t.data, proxima: hoje + INTERVALOS_DIAS[passo] * DIA };
}

/** Segunda-feira 00:00 da semana do instante. */
export function inicioDaSemana(instante: number): number {
  const d = new Date(inicioDoDia(instante));
  const diaSemana = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diaSemana);
  return d.getTime();
}

export type Card = { questaoId: string; frente: string; verso: string; temas: string[] };

/** Cards dos erros de uma semana: uma carta por questão errada, com a última linha "o que aprendi". */
export function cardsDaSemana(tentativas: Tentativa[], questoes: Questao[], inicioSemana: number): Card[] {
  const fim = inicioSemana + 7 * DIA;
  const porId = new Map(questoes.map((q) => [q.id, q]));
  const erradas = tentativas
    .filter((t) => !t.acertou && t.data >= inicioSemana && t.data < fim)
    .sort((a, b) => b.data - a.data);

  const vistos = new Set<string>();
  const cards: Card[] = [];
  for (const t of erradas) {
    if (vistos.has(t.questaoId)) continue;
    const q = porId.get(t.questaoId);
    if (!q) continue;
    vistos.add(t.questaoId);
    const correta = q.alternativas.find((a) => a.letra === q.gabarito);
    const aprendi = erradas.find((x) => x.questaoId === q.id && x.aprendi)?.aprendi;
    cards.push({
      questaoId: q.id,
      frente: q.enunciado,
      verso: [
        correta ? `${correta.letra}) ${correta.texto}` : "Questão anulada",
        aprendi ? `O que aprendi: ${aprendi}` : "",
      ].filter(Boolean).join("\n"),
      temas: q.temas,
    });
  }
  return cards;
}

/** Texto separado por tabulação, que o Anki importa direto (Arquivo > Importar). */
export function cardsParaAnki(cards: Card[]): string {
  const limpa = (s: string) => s.replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
  return cards.map((c) => `${limpa(c.frente)}\t${limpa(c.verso)}\t${c.temas.join(" ")}`).join("\n");
}
