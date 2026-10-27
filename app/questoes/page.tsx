"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { caminhoDoTema, TAXONOMIA } from "@/lib/taxonomia";
import { salvarFila } from "@/lib/fila";
import { QUESTOES } from "@/data/provas";

type Situacao = "todas" | "nao-feitas" | "erradas";

export default function Questoes() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [banca, setBanca] = useState("");
  const [ano, setAno] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("todas");
  const [limite, setLimite] = useState(20);

  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);

  const bancas = useMemo(() => [...new Set(QUESTOES.map((q) => q.banca))].sort(), []);
  const anos = useMemo(() => [...new Set(QUESTOES.map((q) => q.ano))].sort((a, b) => b - a), []);
  const especialidades = TAXONOMIA.find((a) => a.id === area)?.especialidades ?? [];

  const selecionadas = useMemo(() => {
    const feitas = new Set(tentativas?.map((t) => t.questaoId));
    const ultimaPorQuestao = new Map<string, boolean>();
    for (const t of [...(tentativas ?? [])].sort((a, b) => a.data - b.data)) ultimaPorQuestao.set(t.questaoId, t.acertou);

    return QUESTOES.filter((q) => {
      if (banca && q.banca !== banca) return false;
      if (ano && q.ano !== Number(ano)) return false;
      if (area || especialidade) {
        const ok = q.temas.some((tema) => {
          const c = caminhoDoTema(tema);
          if (!c) return false;
          if (especialidade) return c.especialidade.id === especialidade;
          return c.area.id === area;
        });
        if (!ok) return false;
      }
      if (situacao === "nao-feitas" && feitas.has(q.id)) return false;
      if (situacao === "erradas" && ultimaPorQuestao.get(q.id) !== false) return false;
      return true;
    });
  }, [tentativas, banca, ano, area, especialidade, situacao]);

  function comecar() {
    const ids = [...selecionadas].sort(() => Math.random() - 0.5).slice(0, limite).map((q) => q.id);
    salvarFila(ids);
    router.push("/resolver");
  }

  return (
    <>
      <h1>Montar caderno</h1>

      <label>Grande área</label>
      <select value={area} onChange={(e) => { setArea(e.target.value); setEspecialidade(""); }}>
        <option value="">Todas</option>
        {TAXONOMIA.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>

      {especialidades.length > 0 && (
        <>
          <label>Especialidade</label>
          <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            <option value="">Todas</option>
            {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </>
      )}

      <label>Banca</label>
      <select value={banca} onChange={(e) => setBanca(e.target.value)}>
        <option value="">Todas</option>
        {bancas.map((b) => <option key={b}>{b}</option>)}
      </select>

      <label>Ano</label>
      <select value={ano} onChange={(e) => setAno(e.target.value)}>
        <option value="">Todos</option>
        {anos.map((a) => <option key={a}>{a}</option>)}
      </select>

      <label>Quais questões</label>
      <div className="chips">
        {([["todas", "Todas"], ["nao-feitas", "Não feitas"], ["erradas", "Só as que errei"]] as const).map(([id, rotulo]) => (
          <button key={id} className={`chip ${situacao === id ? "ativo" : ""}`} onClick={() => setSituacao(id)}>
            {rotulo}
          </button>
        ))}
      </div>

      <label>Quantas por vez</label>
      <div className="chips">
        {[10, 20, 50, 100].map((n) => (
          <button key={n} className={`chip ${limite === n ? "ativo" : ""}`} onClick={() => setLimite(n)}>{n}</button>
        ))}
      </div>

      <p className="suave" style={{ marginTop: 16 }}>{selecionadas.length} questões encontradas.</p>
      <button className="primario largo" disabled={selecionadas.length === 0} onClick={comecar}>
        Começar ({Math.min(limite, selecionadas.length)} questões)
      </button>
    </>
  );
}
