"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CONSELHO_POR_ERRO, desempenhoPorTema, ESTRATEGIA, type DesempenhoTema } from "@/lib/analise";
import { db } from "@/lib/db";
import { caminhoDoTema, nomeDoTema, TAXONOMIA } from "@/lib/taxonomia";
import { TIPOS_ERRO } from "@/lib/tipos";
import { QUESTOES } from "@/data/provas";
import { Anel, Barra, Icone, pct, TOM_DA_FAIXA, tomDoAcerto, Vazio } from "../ui";

const COR = { verde: "var(--certo)", azul: "var(--destaque)", laranja: "var(--aviso)", vermelho: "var(--errado)", "": undefined };

type Filtro = "prioridade" | "fracos" | "fortes";

export default function Painel() {
  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);
  const [filtro, setFiltro] = useState<Filtro>("prioridade");
  if (!tentativas) return <p className="suave">Carregando…</p>;

  if (tentativas.length === 0) {
    return (
      <>
        <div className="cabecalho"><h1>Desempenho</h1></div>
        <Vazio icone="painel" titulo="Ainda não há respostas">
          <p className="suave">O desempenho por área e por tema aparece depois das primeiras questões.</p>
          <Link className="botao primario" href="/questoes">Fazer questões</Link>
        </Vazio>
      </>
    );
  }

  const temas = desempenhoPorTema(tentativas, QUESTOES, Date.now());
  const porId = new Map(QUESTOES.map((q) => [q.id, q]));
  const certas = tentativas.filter((t) => t.acertou).length;
  const tempoMedio = tentativas.reduce((s, t) => s + t.tempoMs, 0) / tentativas.length;

  const porArea = TAXONOMIA.map((a) => {
    const lista = tentativas.filter((t) => porId.get(t.questaoId)?.temas.some((tema) => caminhoDoTema(tema)?.area.id === a.id));
    const c = lista.filter((t) => t.acertou).length;
    return { id: a.id, nome: a.nome, n: lista.length, acerto: lista.length ? c / lista.length : null };
  });

  const erros = tentativas.filter((t) => !t.acertou);
  const tipos = TIPOS_ERRO.map((t) => ({ ...t, n: erros.filter((e) => e.tipoErro === t.id).length })).sort((a, b) => b.n - a.n);
  const anotados = tipos.reduce((s, t) => s + t.n, 0);

  const visiveis: DesempenhoTema[] =
    filtro === "fracos" ? temas.filter((d) => d.faixa.startsWith("fraco"))
    : filtro === "fortes" ? temas.filter((d) => d.faixa.startsWith("forte")).sort((a, b) => b.acerto - a.acerto)
    : temas;

  return (
    <>
      <div className="cabecalho">
        <h1>Desempenho</h1>
        <p>Onde você está forte, onde está fraco e o que fazer com cada tema.</p>
      </div>

      <div className="grade tres">
        <div className="cartao estatistica">
          <span className="rotulo">Respondidas</span>
          <span className="numero">{tentativas.length}</span>
        </div>
        <div className="cartao estatistica">
          <span className="rotulo">Acerto geral</span>
          <span className="numero" style={{ color: COR[tomDoAcerto(certas / tentativas.length)] }}>
            {pct(certas / tentativas.length)}
          </span>
        </div>
        <div className="cartao estatistica">
          <span className="rotulo">Tempo médio</span>
          <span className="numero">{Math.floor(tempoMedio / 60000)}:{String(Math.round((tempoMedio % 60000) / 1000)).padStart(2, "0")}</span>
          <span className="suave pequeno">por questão</span>
        </div>
      </div>

      <h2>Por grande área</h2>
      <div className="grade">
        {porArea.map((a) => (
          <div className="cartao compacto" key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Anel valor={a.acerto} tamanho={48} />
            <div>
              <strong style={{ fontSize: "0.92rem", lineHeight: 1.3, display: "block" }}>{a.nome}</strong>
              <span className="suave pequeno">{a.n ? `${a.n} respostas` : "sem respostas"}</span>
            </div>
          </div>
        ))}
      </div>

      <h2>Temas</h2>
      <p className="suave">
        Prioridade = quanto você erra × quanto o tema cai × há quanto tempo não vê. Toque num tema para ver o que revisar e onde.
      </p>
      <div className="segmentado" style={{ marginBottom: 12 }}>
        {([["prioridade", "Por prioridade"], ["fracos", "Fracos"], ["fortes", "Fortes"]] as const).map(([id, rotulo]) => (
          <button key={id} className={filtro === id ? "ativo" : ""} onClick={() => setFiltro(id)}>{rotulo}</button>
        ))}
      </div>
      <div className="cartao" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {visiveis.length === 0 ? (
          <p className="suave" style={{ margin: "12px 0" }}>
            Nenhum tema nesta faixa ainda. Cada tema precisa de pelo menos 10 questões para ser classificado.
          </p>
        ) : (
          <div className="lista">
            {visiveis.map((d) => (
              <Link className="item" key={d.tema} href={`/tema?id=${encodeURIComponent(d.tema)}`}>
                <Anel valor={d.acerto} tamanho={44} />
                <div className="corpo">
                  <strong>{nomeDoTema(d.tema)}</strong>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                    <span className={`selo ${TOM_DA_FAIXA[d.faixa]}`}>{ESTRATEGIA[d.faixa].rotulo}</span>
                    <span className="suave pequeno">
                      {d.n} questões{d.incidencia ? ` · cai em ${pct(d.incidencia)} da prova` : ""}
                    </span>
                  </div>
                </div>
                <span className="seta"><Icone nome="seta" /></span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <h2>Por que você erra</h2>
      <div className="cartao">
        {anotados === 0 ? (
          <p className="suave" style={{ margin: 0 }}>
            Quando errar, marque o motivo (lacuna, esquecimento, raciocínio, leitura ou pegadinha). É isso que diz se você
            precisa reler teoria ou treinar questões.
          </p>
        ) : (
          <>
            {tipos.map((t) => (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.92rem" }}>
                  <span>{t.rotulo}</span>
                  <span className="suave">{t.n} · {pct(t.n / anotados)}</span>
                </div>
                <Barra valor={t.n / anotados} tom={t.id === "leitura" || t.id === "pegadinha" ? "laranja" : "vermelho"} />
              </div>
            ))}
            <div className="dica laranja" style={{ marginBottom: 0 }}>
              <strong>Seu erro mais comum é {tipos[0].rotulo.toLowerCase()}.</strong> {CONSELHO_POR_ERRO[tipos[0].id]}
            </div>
          </>
        )}
        {erros.length > anotados && (
          <p className="suave pequeno" style={{ margin: "10px 0 0" }}>{erros.length - anotados} erro(s) sem motivo anotado.</p>
        )}
      </div>
    </>
  );
}
