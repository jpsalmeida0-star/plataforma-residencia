"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { caminhoDoTema, TAXONOMIA } from "@/lib/taxonomia";
import { salvarFila, sortear } from "@/lib/fila";
import type { Questao } from "@/lib/tipos";
import { PROVAS, QUESTOES } from "@/data/provas";
import { Anel, Barra, Icone } from "../ui";

type Situacao = "todas" | "nao-feitas" | "erradas";

const daArea = (q: Questao, area: string) => q.temas.some((t) => caminhoDoTema(t)?.area.id === area);
const provaDa = new Map(PROVAS.flatMap((p) => p.questoes.map((q) => [q.id, p.id])));

export default function Questoes() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [prova, setProva] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("nao-feitas");
  const [limite, setLimite] = useState(20);

  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);
  const especialidades = TAXONOMIA.find((a) => a.id === area)?.especialidades ?? [];

  // Última tentativa de cada questão: decide "feita" e "errada".
  const ultima = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const t of [...(tentativas ?? [])].sort((a, b) => a.data - b.data)) m.set(t.questaoId, t.acertou);
    return m;
  }, [tentativas]);

  const porArea = useMemo(
    () =>
      TAXONOMIA.map((a) => {
        const qs = QUESTOES.filter((q) => daArea(q, a.id));
        const feitas = qs.filter((q) => ultima.has(q.id));
        const certas = feitas.filter((q) => ultima.get(q.id)).length;
        return { id: a.id, nome: a.nome, total: qs.length, feitas: feitas.length, acerto: feitas.length ? certas / feitas.length : null };
      }),
    [ultima],
  );

  const selecionadas = useMemo(
    () =>
      QUESTOES.filter((q) => {
        if (q.gabarito === null) return false; // anuladas ficam de fora dos cadernos
        if (prova && provaDa.get(q.id) !== prova) return false;
        if (especialidade && !q.temas.some((t) => caminhoDoTema(t)?.especialidade.id === especialidade)) return false;
        if (area && !especialidade && !daArea(q, area)) return false;
        if (situacao === "nao-feitas" && ultima.has(q.id)) return false;
        if (situacao === "erradas" && ultima.get(q.id) !== false) return false;
        return true;
      }),
    [ultima, prova, area, especialidade, situacao],
  );

  function comecar() {
    salvarFila(sortear(selecionadas.map((q) => q.id), limite));
    router.push("/resolver");
  }

  function escolherArea(id: string) {
    setArea((atual) => (atual === id ? "" : id));
    setEspecialidade("");
  }

  return (
    <>
      <div className="cabecalho">
        <h1>Banco de questões</h1>
        <p>{QUESTOES.length} questões oficiais de {PROVAS.length} prova(s). Toque numa área para filtrar.</p>
      </div>

      <div className="grade">
        {porArea.map((a) => (
          <button
            key={a.id}
            className="cartao compacto"
            style={{ display: "block", textAlign: "left", borderColor: area === a.id ? "var(--destaque)" : undefined,
              background: area === a.id ? "var(--destaque-fundo)" : undefined }}
            onClick={() => escolherArea(a.id)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: "0.92rem", lineHeight: 1.3 }}>{a.nome}</strong>
              <Anel valor={a.acerto} tamanho={40} />
            </div>
            <div className="suave pequeno" style={{ margin: "8px 0 6px" }}>{a.feitas} de {a.total} feitas</div>
            <Barra valor={a.total ? a.feitas / a.total : 0} fina />
          </button>
        ))}
      </div>

      <h2>Montar caderno</h2>
      <div className="cartao">
        {especialidades.length > 0 && (
          <>
            <label style={{ marginTop: 0 }}>Especialidade ({TAXONOMIA.find((a) => a.id === area)?.nome})</label>
            <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
              <option value="">Todas</option>
              {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </>
        )}

        <label style={especialidades.length ? undefined : { marginTop: 0 }}>Prova</label>
        <select value={prova} onChange={(e) => setProva(e.target.value)}>
          <option value="">Todas as provas</option>
          {PROVAS.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </select>

        <label>Quais questões</label>
        <div className="segmentado">
          {([["nao-feitas", "Não feitas"], ["erradas", "Que errei"], ["todas", "Todas"]] as const).map(([id, rotulo]) => (
            <button key={id} className={situacao === id ? "ativo" : ""} onClick={() => setSituacao(id)}>{rotulo}</button>
          ))}
        </div>

        <label>Quantas por vez</label>
        <div className="segmentado">
          {[10, 20, 50, 100].map((n) => (
            <button key={n} className={limite === n ? "ativo" : ""} onClick={() => setLimite(n)}>{n}</button>
          ))}
        </div>

        <button className="primario largo" style={{ marginTop: 18 }} disabled={selecionadas.length === 0} onClick={comecar}>
          <Icone nome="jogar" /> Começar {Math.min(limite, selecionadas.length)} questões
        </button>
        <p className="suave pequeno" style={{ textAlign: "center", margin: "8px 0 0" }}>
          {selecionadas.length} questões com esses filtros · anuladas ficam de fora
        </p>
      </div>

      <h2>Provas no banco</h2>
      <div className="cartao">
        <div className="lista">
          {PROVAS.map((p) => {
            const feitas = p.questoes.filter((q) => ultima.has(q.id)).length;
            return (
              <div className="item" key={p.id}>
                <div className="corpo">
                  <strong>{p.titulo}</strong>
                  <div className="suave pequeno">{p.banca} · {p.questoes.length} questões · {feitas} feitas</div>
                  <div style={{ marginTop: 6 }}><Barra valor={feitas / p.questoes.length} fina /></div>
                </div>
                <a className="suave pequeno" href={p.fonte} target="_blank" rel="noreferrer">Caderno oficial</a>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
