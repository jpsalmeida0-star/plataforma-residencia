// Confere cada prova importada: ids únicos, gabarito entre as alternativas, temas existentes.
import { describe, expect, it } from "vitest";
import { PROVAS } from "@/data/provas";
import { temaExiste } from "@/lib/taxonomia";

describe("provas importadas", () => {
  it("têm ids de questão únicos", () => {
    const ids = PROVAS.flatMap((p) => p.questoes.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const prova of PROVAS) {
    describe(prova.id, () => {
      for (const q of prova.questoes) {
        it(`questão ${q.numero} é válida`, () => {
          expect(q.enunciado.trim()).not.toBe("");
          expect(q.alternativas.length).toBeGreaterThanOrEqual(2);
          if (q.gabarito !== null) expect(q.alternativas.map((a) => a.letra)).toContain(q.gabarito);
          for (const tema of q.temas) expect(temaExiste(tema), `tema ${tema}`).toBe(true);
        });
      }
    });
  }
});
