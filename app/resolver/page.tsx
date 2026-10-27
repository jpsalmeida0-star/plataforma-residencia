"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CONSELHO_POR_ERRO, inicioDoDia } from "@/lib/analise";
import { anotarErro, db, registrarTentativa } from "@/lib/db";
import { lerFila } from "@/lib/fila";
import { nomeDoTema } from "@/lib/taxonomia";
import { TIPOS_ERRO, type Confianca, type Modo, type TipoErro } from "@/lib/tipos";
import { QUESTOES } from "@/data/provas";
import { Anel, Barra, Icone, Vazio } from "../ui";

const CONFIANCAS: { id: Confianca; rotulo: string }[] = [
  { id: "certeza", rotulo: "Certeza" },
  { id: "duvida", rotulo: "Dúvida" },
  { id: "chute", rotulo: "Chute" },
];

const relogio = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const linkTema = (tema: string) => `/tema?id=${encodeURIComponent(tema)}`;

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
  const [agora, setAgora] = useState(() => Date.now());
  const [tempoGasto, setTempoGasto] = useState(0);
  const [tentativaId, setTentativaId] = useState<number | null>(null);
  const [tipoErro, setTipoErro] = useState<TipoErro | null>(null);
  const [aprendi, setAprendi] = useState("");
  const [erroSalvo, setErroSalvo] = useState(false);
  const [placar, setPlacar] = useState({ certas: 0, feitas: 0, tempo: 0 });
  const [temasErrados, setTemasErrados] = useState<string[]>([]);

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

  const respondida = tentativaId !== null;
  useEffect(() => {
    if (respondida) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [respondida]);

  if (fila === null) return <p className="suave">Carregando…</p>;

  if (fila.length === 0) {
    return (
      <Vazio icone={modo === "revisao" ? "revisar" : "questoes"}
        titulo={modo === "revisao" ? "Nenhuma revisão para hoje" : "Nenhuma questão no caderno"}>
        <p className="suave">Monte um caderno com os filtros que quiser.</p>
        <Link className="botao primario" href="/questoes">Montar caderno</Link>
      </Vazio>
    );
  }

  if (indice >= fila.length) {
    const acerto = placar.feitas ? placar.certas / placar.feitas : null;
    const unicos = [...new Set(temasErrados)];
    return (
      <>
        <div className="cartao" style={{ textAlign: "center", padding: 28 }}>
          <Anel valor={acerto} tamanho={96} />
          <h1 style={{ marginTop: 12 }}>{modo === "revisao" ? "Revisão concluída" : "Caderno concluído"}</h1>
          <p className="suave">
            {placar.certas} de {placar.feitas} certas
            {placar.feitas ? ` · média de ${relogio(placar.tempo / placar.feitas)} por questão` : ""}
          </p>
          <div className="acoes" style={{ justifyContent: "center" }}>
            <Link className="botao primario" href="/questoes">Novo caderno</Link>
            <Link className="botao" href="/painel">Ver desempenho</Link>
          </div>
        </div>
        {unicos.length > 0 && (
          <>
            <h2>Temas para revisar</h2>
            <div className="cartao">
              <div className="lista">
                {unicos.map((tema) => (
                  <Link className="item" key={tema} href={linkTema(tema)}>
                    <div className="corpo">
                      <strong>{nomeDoTema(tema)}</strong>
                      <span className="suave pequeno">Ver o que revisar e onde estudar</span>
                    </div>
                    <span className="seta"><Icone nome="seta" /></span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  const q = porId.get(fila[indice])!;
  const acertou = marcada === q.gabarito;

  async function responder() {
    if (!marcada || !confianca) return;
    const tempoMs = Date.now() - inicio;
    setTempoGasto(tempoMs);
    if (q.gabarito === null) {
      setTentativaId(-1); // anulada: não conta
      return;
    }
    const id = await registrarTentativa({
      questaoId: q.id,
      data: Date.now(),
      marcada,
      acertou: marcada === q.gabarito,
      tempoMs,
      confianca,
      modo,
    });
    setTentativaId(id);
    setPlacar((p) => ({ certas: p.certas + (marcada === q.gabarito ? 1 : 0), feitas: p.feitas + 1, tempo: p.tempo + tempoMs }));
    if (marcada !== q.gabarito) setTemasErrados((l) => [...l, ...q.temas]);
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
    setAgora(Date.now());
    window.scrollTo(0, 0);
  }

  function classeAlternativa(letra: string) {
    if (!respondida) return marcada === letra ? "marcada" : "";
    if (letra === q.gabarito) return "correta";
    if (letra === marcada) return "errada";
    return "apagada";
  }

  return (
    <>
      <div className="topo-questao">
        <Link href="/questoes" className="suave" aria-label="Sair do caderno" style={{ display: "inline-flex" }}>
          <Icone nome="errado" tamanho={20} />
        </Link>
        <Barra valor={(indice + (respondida ? 1 : 0)) / fila.length} />
        <span className="suave pequeno" style={{ fontWeight: 600 }}>{indice + 1}/{fila.length}</span>
        <span className="cronometro"><Icone nome="relogio" />{relogio((respondida ? inicio + tempoGasto : agora) - inicio)}</span>
      </div>

      <div className="cartao">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="selo azul">{modo === "revisao" ? "Revisão" : "Caderno"}</span>
          <span className="selo">{q.banca} {q.ano}</span>
          <span className="selo">Questão {q.numero}</span>
        </div>
        <p className="enunciado">{q.enunciado}</p>
        {q.imagem && <img className="enunciado-img" src={q.imagem} alt="Imagem da questão" />}
        {q.alternativas.map((a) => (
          <button
            key={a.letra}
            className={`alternativa ${classeAlternativa(a.letra)}`}
            disabled={respondida}
            onClick={() => setMarcada(a.letra)}
          >
            <span className="letra">{a.letra}</span>
            <span>{a.texto}</span>
          </button>
        ))}
      </div>

      {!respondida ? (
        <div className="cartao">
          <label style={{ marginTop: 0 }}>Quão seguro você está?</label>
          <div className="segmentado">
            {CONFIANCAS.map((c) => (
              <button key={c.id} className={confianca === c.id ? "ativo" : ""} onClick={() => setConfianca(c.id)}>
                {c.rotulo}
              </button>
            ))}
          </div>
          <p className="suave pequeno" style={{ margin: "8px 0 0" }}>
            Acerto no chute não conta como domínio, e acerto com dúvida volta na revisão.
          </p>
          <button className="primario largo" style={{ marginTop: 14 }} disabled={!marcada || !confianca} onClick={responder}>
            Responder
          </button>
        </div>
      ) : (
        <div className="cartao">
          {q.gabarito === null ? (
            <div className="resultado">Questão anulada</div>
          ) : acertou ? (
            <div className="resultado certo"><Icone nome="certo" /> Certa!</div>
          ) : (
            <div className="resultado errado"><Icone nome="errado" /> Errada. Gabarito: {q.gabarito}</div>
          )}
          <p className="suave pequeno">
            Tempo: {relogio(tempoGasto)}
            {q.gabarito === null ? " · não entra nas estatísticas" : ""}
            {acertou && confianca !== "certeza" ? " · como não foi com certeza, ela volta na revisão" : ""}
          </p>

          {q.comentario && <div className="dica"><p className="enunciado" style={{ margin: 0 }}>{q.comentario}</p></div>}

          {q.temas.length > 0 && (
            <>
              <div className="sobretitulo" style={{ marginTop: 14 }}>Temas da questão</div>
              <div className="chips">
                {q.temas.map((tema) => (
                  <Link key={tema} className="botao chip" href={linkTema(tema)}>{nomeDoTema(tema)}</Link>
                ))}
              </div>
              <Link className="pequeno" href={`/biblioteca?q=${encodeURIComponent(nomeDoTema(q.temas[0]))}`}>
                <Icone nome="busca" tamanho={14} /> Procurar &quot;{nomeDoTema(q.temas[0])}&quot; nas apostilas
              </Link>
            </>
          )}

          {q.gabarito !== null && !acertou && !erroSalvo && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--borda)" }}>
              <h3>Por que você errou?</h3>
              <p className="suave pequeno">Anotar o motivo é o que permite ao app dizer se você precisa reler teoria ou treinar questões.</p>
              <div className="chips">
                {TIPOS_ERRO.map((t) => (
                  <button key={t.id} title={t.dica} className={`chip ${tipoErro === t.id ? "ativo" : ""}`} onClick={() => setTipoErro(t.id)}>
                    {t.rotulo}
                  </button>
                ))}
              </div>
              {tipoErro && (
                <div className="dica laranja">
                  <strong>{TIPOS_ERRO.find((t) => t.id === tipoErro)?.dica}.</strong> {CONSELHO_POR_ERRO[tipoErro]}
                </div>
              )}
              <label>O que aprendi (uma linha, vira card na aba Erros)</label>
              <input type="text" value={aprendi} onChange={(e) => setAprendi(e.target.value)} placeholder="Ex.: na ICFEr, iniciar os 4 pilares" />
              <button className="primario largo" style={{ marginTop: 12 }} disabled={!tipoErro} onClick={salvarErro}>
                Salvar erro
              </button>
            </div>
          )}
          {erroSalvo && <div className="dica verde">Erro anotado. Ele vira card na aba Erros e volta na revisão amanhã.</div>}

          <button className={`largo ${erroSalvo || acertou || q.gabarito === null ? "primario" : ""}`} style={{ marginTop: 12 }} onClick={proxima}>
            {indice + 1 < fila.length ? "Próxima questão" : "Ver resultado"} <Icone nome="seta" />
          </button>
        </div>
      )}
    </>
  );
}
