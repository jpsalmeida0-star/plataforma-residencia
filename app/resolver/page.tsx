"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { inicioDoDia } from "@/lib/analise";
import { anotarErro, db, registrarTentativa } from "@/lib/db";
import { lerFila } from "@/lib/fila";
import { nomeDoTema } from "@/lib/taxonomia";
import { TIPOS_ERRO, type Confianca, type Modo, type TipoErro } from "@/lib/tipos";
import { QUESTOES } from "@/data/provas";

const CONFIANCAS: { id: Confianca; rotulo: string }[] = [
  { id: "certeza", rotulo: "Certeza" },
  { id: "duvida", rotulo: "Dúvida" },
  { id: "chute", rotulo: "Chute" },
];

export default function Pagina() {
  return (
    <Suspense>
      <Resolver />
    </Suspense>
  );
}

function Resolver() {
  const modo: Modo = useSearchParams().get("modo") === "revisao" ? "revisao" : "caderno";
  const porId = useMemo(() => new Map(QUESTOES.map((q) => [q.id, q])), []);

  const [fila, setFila] = useState<string[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [marcada, setMarcada] = useState<string | null>(null);
  const [confianca, setConfianca] = useState<Confianca | null>(null);
  const [inicio, setInicio] = useState(() => Date.now());
  const [tentativaId, setTentativaId] = useState<number | null>(null);
  const [tipoErro, setTipoErro] = useState<TipoErro | null>(null);
  const [aprendi, setAprendi] = useState("");
  const [erroSalvo, setErroSalvo] = useState(false);
  const [placar, setPlacar] = useState({ certas: 0, feitas: 0 });

  useEffect(() => {
    if (modo === "revisao") {
      const fim = inicioDoDia(Date.now()) + 24 * 60 * 60 * 1000;
      db.revisoes.where("proxima").below(fim).toArray().then((r) =>
        setFila(r.map((x) => x.questaoId).filter((id) => porId.has(id))),
      );
    } else {
      setFila(lerFila().filter((id) => porId.has(id)));
    }
  }, [modo, porId]);

  if (fila === null) return <p className="suave">Carregando…</p>;

  if (fila.length === 0) {
    return (
      <div className="cartao">
        <strong>{modo === "revisao" ? "Nenhuma revisão para hoje." : "Nenhuma questão no caderno."}</strong>
        <p className="suave">Monte um caderno na aba Questões.</p>
        <Link className="botao primario" href="/questoes">Montar caderno</Link>
      </div>
    );
  }

  if (indice >= fila.length) {
    return (
      <div className="cartao">
        <h1>Caderno concluído</h1>
        <p>
          {placar.certas} de {placar.feitas} certas
          {placar.feitas ? ` (${Math.round((placar.certas / placar.feitas) * 100)}%)` : ""}.
        </p>
        <Link className="botao primario" href="/painel">Ver painel</Link>
      </div>
    );
  }

  const q = porId.get(fila[indice])!;
  const acertou = marcada === q.gabarito;

  async function responder() {
    if (!marcada || !confianca) return;
    if (q.gabarito === null) {
      setTentativaId(-1); // anulada: não conta
      return;
    }
    const id = await registrarTentativa({
      questaoId: q.id,
      data: Date.now(),
      marcada,
      acertou: marcada === q.gabarito,
      tempoMs: Date.now() - inicio,
      confianca,
      modo,
    });
    setTentativaId(id);
    setPlacar((p) => ({ certas: p.certas + (marcada === q.gabarito ? 1 : 0), feitas: p.feitas + 1 }));
  }

  async function salvarErro() {
    if (tentativaId === null || tentativaId < 0 || !tipoErro) return;
    await anotarErro(tentativaId, tipoErro, aprendi);
    setErroSalvo(true);
  }

  function proxima() {
    setIndice((i) => i + 1);
    setMarcada(null);
    setConfianca(null);
    setTentativaId(null);
    setTipoErro(null);
    setAprendi("");
    setErroSalvo(false);
    setInicio(Date.now());
    window.scrollTo(0, 0);
  }

  function classeAlternativa(letra: string) {
    if (tentativaId === null) return marcada === letra ? "marcada" : "";
    if (letra === q.gabarito) return "correta";
    if (letra === marcada) return "errada";
    return "";
  }

  return (
    <>
      <p className="suave">
        {modo === "revisao" ? "Revisão" : "Caderno"} · {indice + 1} de {fila.length} · {q.banca} {q.ano}, questão {q.numero}
      </p>
      <div className="cartao">
        <p className="enunciado">{q.enunciado}</p>
        {q.imagem && <img src={q.imagem} alt="Imagem da questão" style={{ maxWidth: "100%" }} />}
        {q.alternativas.map((a) => (
          <button
            key={a.letra}
            className={`alternativa ${classeAlternativa(a.letra)}`}
            disabled={tentativaId !== null}
            onClick={() => setMarcada(a.letra)}
          >
            <strong>{a.letra})</strong> {a.texto}
          </button>
        ))}
      </div>

      {tentativaId === null ? (
        <>
          <label>Quão seguro você está?</label>
          <div className="chips">
            {CONFIANCAS.map((c) => (
              <button key={c.id} className={`chip ${confianca === c.id ? "ativo" : ""}`} onClick={() => setConfianca(c.id)}>
                {c.rotulo}
              </button>
            ))}
          </div>
          <button className="primario largo" disabled={!marcada || !confianca} onClick={responder}>
            Responder
          </button>
        </>
      ) : (
        <div className="cartao">
          {q.gabarito === null ? (
            <p><strong>Questão anulada.</strong> Não entra nas estatísticas.</p>
          ) : acertou ? (
            <p className="certo">Certa!{confianca !== "certeza" && " Como não foi com certeza, ela volta na revisão."}</p>
          ) : (
            <p className="errado">Errada. Gabarito: {q.gabarito}.</p>
          )}
          <p className="suave">Temas: {q.temas.map(nomeDoTema).join(", ") || "sem tema"}</p>
          {q.comentario && <p className="enunciado">{q.comentario}</p>}

          {q.gabarito !== null && !acertou && !erroSalvo && (
            <>
              <label>Por que errou?</label>
              <div className="chips">
                {TIPOS_ERRO.map((t) => (
                  <button
                    key={t.id}
                    title={t.dica}
                    className={`chip ${tipoErro === t.id ? "ativo" : ""}`}
                    onClick={() => setTipoErro(t.id)}
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
              {tipoErro && <p className="suave">{TIPOS_ERRO.find((t) => t.id === tipoErro)?.dica}</p>}
              <label>O que aprendi (uma linha)</label>
              <input type="text" value={aprendi} onChange={(e) => setAprendi(e.target.value)} placeholder="Ex.: na ICFEr, iniciar os 4 pilares" />
              <button className="primario largo" style={{ marginTop: 12 }} disabled={!tipoErro} onClick={salvarErro}>
                Salvar erro
              </button>
            </>
          )}
          {erroSalvo && <p className="suave">Erro anotado. Ele aparece na aba Erros e volta na revisão amanhã.</p>}

          <button className="largo" style={{ marginTop: 12 }} onClick={proxima}>
            Próxima
          </button>
        </div>
      )}
    </>
  );
}
