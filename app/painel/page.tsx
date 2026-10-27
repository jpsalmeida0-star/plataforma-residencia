"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { desempenhoPorTema, ESTRATEGIA } from "@/lib/analise";
import { db } from "@/lib/db";
import { caminhoDoTema, nomeDoTema, TAXONOMIA } from "@/lib/taxonomia";
import { TIPOS_ERRO } from "@/lib/tipos";
import { QUESTOES } from "@/data/provas";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function Painel() {
  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);
  if (!tentativas) return <p className="suave">Carregando…</p>;

  const temas = desempenhoPorTema(tentativas, QUESTOES, Date.now());
  const porId = new Map(QUESTOES.map((q) => [q.id, q]));

  const porArea = TAXONOMIA.map((a) => {
    const lista = tentativas.filter((t) =>
      porId.get(t.questaoId)?.temas.some((tema) => caminhoDoTema(tema)?.area.id === a.id),
    );
    const certas = lista.filter((t) => t.acertou).length;
    return { nome: a.nome, n: lista.length, acerto: lista.length ? certas / lista.length : 0 };
  });

  const erros = tentativas.filter((t) => !t.acertou);
  const tiposContados = TIPOS_ERRO.map((t) => ({ ...t, n: erros.filter((e) => e.tipoErro === t.id).length }));

  if (tentativas.length === 0) {
    return (
      <>
        <h1>Painel</h1>
        <p className="suave">Ainda não há respostas. O painel aparece depois das primeiras questões.</p>
      </>
    );
  }

  return (
    <>
      <h1>Painel</h1>

      <h2>Por grande área</h2>
      <div className="cartao">
        {porArea.map((a) => (
          <div key={a.nome} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{a.nome}</span>
              <span className="suave">{a.n ? `${pct(a.acerto)} · ${a.n} questões` : "sem questões"}</span>
            </div>
            <div className="barra"><span style={{ width: pct(a.acerto) }} /></div>
          </div>
        ))}
      </div>

      <h2>Temas por prioridade</h2>
      <p className="suave">
        Prioridade = quanto você erra × quanto o tema cai na prova × há quanto tempo não vê. Acertos no chute não contam
        como domínio.
      </p>
      <div className="cartao tabela-rolavel">
        <table>
          <thead>
            <tr><th>Tema</th><th>Acerto</th><th>Questões</th><th>Cai na prova</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {temas.map((d) => (
              <tr key={d.tema}>
                <td>{nomeDoTema(d.tema)}</td>
                <td>{pct(d.acerto)}</td>
                <td>{d.n}</td>
                <td>{d.incidencia ? pct(d.incidencia) : "–"}</td>
                <td title={ESTRATEGIA[d.faixa].acao}>{ESTRATEGIA[d.faixa].rotulo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Tipos de erro</h2>
      <div className="cartao">
        {tiposContados.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t.rotulo}</span>
            <span className="suave">{t.n}</span>
          </div>
        ))}
        <p className="suave" style={{ marginTop: 8 }}>
          {erros.length - tiposContados.reduce((s, t) => s + t.n, 0)} erro(s) sem tipo anotado.
        </p>
      </div>
    </>
  );
}
