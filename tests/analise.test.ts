import { describe, expect, it } from "vitest";
import {
  acertoAjustado,
  cardsDaSemana,
  cardsParaAnki,
  desempenhoPorTema,
  diasSeguidos,
  erradasDoTema,
  erroPrincipal,
  motivoDaFaixa,
  fatorEsquecimento,
  inicioDaSemana,
  INTERVALOS_DIAS,
  proximaRevisao,
} from "@/lib/analise";
import type { Questao, Tentativa } from "@/lib/tipos";

const DIA = 86_400_000;
const AGORA = new Date(2026, 9, 27, 10, 0).getTime(); // terça, 27/10/2026

// Questões de teste com conteúdo fictício; não são questões de prova.
function questao(id: string, temas: string[], origem: Questao["origem"] = "oficial"): Questao {
  return {
    id, banca: "TESTE", ano: 2025, numero: 1, enunciado: `Enunciado ${id}`, origem, temas, gabarito: "A",
    alternativas: [{ letra: "A", texto: "certa" }, { letra: "B", texto: "errada" }],
  };
}

function tentativa(questaoId: string, acertou: boolean, extra: Partial<Tentativa> = {}): Tentativa {
  return {
    questaoId, acertou, data: AGORA, marcada: acertou ? "A" : "B", tempoMs: 60_000,
    confianca: "certeza", modo: "caderno", ...extra,
  };
}

describe("acertoAjustado", () => {
  it("desconta acertos no chute e pesa dúvida pela metade", () => {
    const r = acertoAjustado([
      tentativa("q", true),
      tentativa("q", true, { confianca: "duvida" }),
      tentativa("q", true, { confianca: "chute" }),
      tentativa("q", false),
    ]);
    expect(r).toEqual({ valor: 1.5 / 4, n: 4 });
  });

  it("usa só as 20 tentativas mais recentes", () => {
    const antigas = Array.from({ length: 20 }, (_, i) => tentativa("q", false, { data: AGORA - (100 + i) * DIA }));
    const recentes = Array.from({ length: 20 }, (_, i) => tentativa("q", true, { data: AGORA - i * DIA }));
    expect(acertoAjustado([...antigas, ...recentes]).valor).toBe(1);
  });
});

describe("fatorEsquecimento", () => {
  it("vai de 1 (hoje) a 2 (60 dias ou nunca)", () => {
    expect(fatorEsquecimento(AGORA, AGORA)).toBe(1);
    expect(fatorEsquecimento(AGORA - 30 * DIA, AGORA)).toBe(1.5);
    expect(fatorEsquecimento(AGORA - 200 * DIA, AGORA)).toBe(2);
    expect(fatorEsquecimento(undefined, AGORA)).toBe(2);
  });
});

describe("desempenhoPorTema", () => {
  const questoes = [
    ...Array.from({ length: 6 }, (_, i) => questao(`a${i}`, ["clinica.cardio.ic"])),
    ...Array.from({ length: 2 }, (_, i) => questao(`b${i}`, ["go.ginecologia.contracepcao"])),
  ];

  it("põe primeiro o tema que mais erra e mais cai", () => {
    const tentativas = [
      ...questoes.filter((q) => q.id.startsWith("a")).map((q) => tentativa(q.id, false)),
      ...questoes.filter((q) => q.id.startsWith("b")).map((q) => tentativa(q.id, false)),
    ];
    const [primeiro, segundo] = desempenhoPorTema(tentativas, questoes, AGORA);
    expect(primeiro.tema).toBe("clinica.cardio.ic");
    expect(primeiro.incidencia).toBe(0.75);
    expect(segundo.tema).toBe("go.ginecologia.contracepcao");
  });

  it("marca pouca amostra com menos de 10 tentativas", () => {
    const r = desempenhoPorTema([tentativa("a0", false)], questoes, AGORA);
    expect(r[0].faixa).toBe("pouca-amostra");
  });

  it("separa fraqueza de leitura de fraqueza de conteúdo", () => {
    const tentativas = Array.from({ length: 10 }, () => tentativa("a0", false, { tipoErro: "leitura" }));
    expect(desempenhoPorTema(tentativas, questoes, AGORA)[0].faixa).toBe("fraco-leitura");
    const conteudo = Array.from({ length: 10 }, () => tentativa("a0", false, { tipoErro: "lacuna" }));
    expect(desempenhoPorTema(conteudo, questoes, AGORA)[0].faixa).toBe("fraco-alta");
  });

  it("forte vira forte-antigo depois de 30 dias sem ver", () => {
    const tentativas = Array.from({ length: 10 }, () => tentativa("a0", true, { data: AGORA - 40 * DIA }));
    expect(desempenhoPorTema(tentativas, questoes, AGORA)[0].faixa).toBe("forte-antigo");
  });
});

describe("proximaRevisao", () => {
  it("erro agenda para amanhã; acerto com certeza avança; no fim sai da revisão", () => {
    let r = proximaRevisao(undefined, tentativa("q", false));
    expect(r?.passo).toBe(0);
    expect(r!.proxima - inicioDia(AGORA)).toBe(1 * DIA);

    r = proximaRevisao(r!, tentativa("q", true));
    expect(r?.passo).toBe(1);
    expect(r!.proxima - inicioDia(AGORA)).toBe(INTERVALOS_DIAS[1] * DIA);

    r = proximaRevisao(r!, tentativa("q", true, { confianca: "duvida" }));
    expect(r?.passo).toBe(1);

    expect(proximaRevisao({ ...r!, passo: INTERVALOS_DIAS.length - 1 }, tentativa("q", true))).toBeNull();
  });

  it("acerto com certeza fora da revisão não cria revisão; acerto no chute cria", () => {
    expect(proximaRevisao(undefined, tentativa("q", true))).toBeNull();
    expect(proximaRevisao(undefined, tentativa("q", true, { confianca: "chute" }))?.passo).toBe(0);
  });
});

describe("cards da semana", () => {
  it("gera um card por questão errada na semana, com o que aprendi", () => {
    const q = questao("a0", ["clinica.cardio.ic"]);
    const semana = inicioDaSemana(AGORA);
    const tentativas = [
      tentativa("a0", false, { aprendi: "lembrar disso" }),
      tentativa("a0", false, { data: AGORA - DIA }),
      tentativa("a0", false, { data: semana - DIA }), // semana anterior
    ];
    const cards = cardsDaSemana(tentativas, [q], semana);
    expect(cards).toHaveLength(1);
    expect(cards[0].verso).toContain("A) certa");
    expect(cards[0].verso).toContain("O que aprendi: lembrar disso");
    expect(cardsParaAnki(cards)).toBe("Enunciado a0\tA) certa<br>O que aprendi: lembrar disso\tclinica.cardio.ic");
  });

  it("a semana começa na segunda", () => {
    expect(new Date(inicioDaSemana(AGORA)).getDay()).toBe(1);
  });
});

function inicioDia(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

describe("orientação por tema", () => {
  const qs = [questao("a", ["clinica.cardio.ic"]), questao("b", ["clinica.cardio.ic"]), questao("c", ["clinica.cardio.has"])];

  it("lista só as questões do tema cuja última tentativa foi errada, com o que aprendeu antes", () => {
    const ts = [
      tentativa("a", false, { data: AGORA - 3 * DIA, aprendi: "4 pilares" }),
      tentativa("a", false, { data: AGORA - DIA }),
      tentativa("b", false, { data: AGORA - 2 * DIA }),
      tentativa("b", true, { data: AGORA - DIA }),
      tentativa("c", false),
    ];
    const r = erradasDoTema(ts, qs, "clinica.cardio.ic");
    expect(r.map((x) => x.questao.id)).toEqual(["a"]);
    expect(r[0].tentativa.aprendi).toBe("4 pilares");
  });

  it("aponta o erro mais comum e explica a faixa", () => {
    const ts = [
      tentativa("a", false, { tipoErro: "lacuna" }),
      tentativa("b", false, { tipoErro: "leitura" }),
      tentativa("a", false, { tipoErro: "lacuna", data: AGORA - 2 * DIA }),
    ];
    const [d] = desempenhoPorTema(ts, qs, AGORA);
    expect(erroPrincipal(d)).toEqual({ tipo: "lacuna", n: 2 });
    expect(erroPrincipal({ errosPorTipo: {} })).toBeNull();
    const motivo = motivoDaFaixa(d, AGORA);
    expect(motivo).toContain("Acerto de 0%");
    expect(motivo).toContain("67% das questões oficiais");
    expect(motivo).toContain("Você viu o tema hoje");
  });

  it("conta dias seguidos de estudo, aceitando que hoje ainda não teve questão", () => {
    expect(diasSeguidos([], AGORA)).toBe(0);
    expect(diasSeguidos([{ data: AGORA }, { data: AGORA - DIA }, { data: AGORA - 3 * DIA }], AGORA)).toBe(2);
    expect(diasSeguidos([{ data: AGORA - DIA }, { data: AGORA - 2 * DIA }], AGORA)).toBe(2);
  });
});
