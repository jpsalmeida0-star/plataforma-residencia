"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { cardsDaSemana, cardsParaAnki, inicioDaSemana } from "@/lib/analise";
import { db, exportarDados } from "@/lib/db";
import { nomeDoTema } from "@/lib/taxonomia";
import { TIPOS_ERRO } from "@/lib/tipos";
import { QUESTOES } from "@/data/provas";
import { Icone, Vazio } from "../ui";

const SEMANA = 7 * 24 * 60 * 60 * 1000;

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Erros() {
  const [semana, setSemana] = useState(() => inicioDaSemana(Date.now()));
  const [cardAtual, setCardAtual] = useState(0);
  const [virado, setVirado] = useState(false);
  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);
  if (!tentativas) return <p className="suave">Carregando…</p>;

  const cards = cardsDaSemana(tentativas, QUESTOES, semana);
  const card = cards[cardAtual];
  const rotuloSemana = new Date(semana).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const porId = new Map(QUESTOES.map((q) => [q.id, q]));
  const aprendizados = new Map<string, { texto: string; tipo?: string; data: number }[]>();
  for (const t of tentativas) {
    if (t.acertou || !t.aprendi) continue;
    for (const tema of porId.get(t.questaoId)?.temas ?? ["sem-tema"]) {
      const lista = aprendizados.get(tema) ?? [];
      lista.push({ texto: t.aprendi, tipo: TIPOS_ERRO.find((x) => x.id === t.tipoErro)?.rotulo, data: t.data });
      aprendizados.set(tema, lista);
    }
  }

  function mudarSemana(delta: number) {
    setSemana((s) => s + delta * SEMANA);
    setCardAtual(0);
    setVirado(false);
  }

  return (
    <>
      <div className="cabecalho">
        <h1>Erros</h1>
        <p>Cada erro vira um card. Revise os da semana e leia o caderno de erros na véspera da prova.</p>
      </div>

      <div className="linha-titulo">
        <h2>Cards da semana</h2>
      </div>
      <div className="cartao compacto" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button onClick={() => mudarSemana(-1)} aria-label="Semana anterior"><Icone nome="voltar" /></button>
        <div style={{ textAlign: "center" }}>
          <strong>Semana de {rotuloSemana}</strong>
          <div className="suave pequeno">{cards.length} card(s)</div>
        </div>
        <button onClick={() => mudarSemana(1)} disabled={semana >= inicioDaSemana(Date.now())} aria-label="Próxima semana">
          <Icone nome="seta" />
        </button>
      </div>

      {cards.length === 0 ? (
        <Vazio icone="certo" titulo="Nenhum erro nesta semana">
          <p className="suave" style={{ margin: 0 }}>Os erros que você anotar aparecem aqui como cards.</p>
        </Vazio>
      ) : (
        <>
          <div className={`cartao card-flash ${virado ? "verso" : ""}`} onClick={() => setVirado((v) => !v)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className={`selo ${virado ? "verde" : "azul"}`}>{virado ? "Resposta" : "Pergunta"}</span>
              <span className="suave pequeno">{cardAtual + 1} de {cards.length} · toque para virar</span>
            </div>
            {virado ? card.verso : card.frente}
          </div>
          <div className="acoes" style={{ marginTop: 0 }}>
            <button disabled={cardAtual === 0} onClick={() => { setCardAtual((i) => i - 1); setVirado(false); }}>
              <Icone nome="voltar" /> Anterior
            </button>
            <button className="primario" disabled={cardAtual >= cards.length - 1} onClick={() => { setCardAtual((i) => i + 1); setVirado(false); }}>
              Próximo <Icone nome="seta" />
            </button>
            <button onClick={() => baixar(`erros-semana-${rotuloSemana.replace("/", "-")}.txt`, cardsParaAnki(cards), "text/plain")}>
              Baixar para o Anki
            </button>
          </div>
        </>
      )}

      <h2>Caderno de erros</h2>
      <p className="suave">Suas linhas &quot;o que aprendi&quot;, por tema.</p>
      {aprendizados.size === 0 ? (
        <Vazio icone="lampada" titulo="Ainda vazio">
          <p className="suave" style={{ margin: 0 }}>Ao errar uma questão, escreva uma linha do que aprendeu.</p>
        </Vazio>
      ) : (
        [...aprendizados.entries()].map(([tema, lista]) => (
          <div className="cartao" key={tema}>
            <div className="linha-titulo">
              <h3>{nomeDoTema(tema)}</h3>
              {tema !== "sem-tema" && <Link className="pequeno" href={`/tema?id=${encodeURIComponent(tema)}`}>Ver tema</Link>}
            </div>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {lista.sort((a, b) => b.data - a.data).map((x, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{x.texto}{x.tipo && <span className="suave"> · {x.tipo}</span>}</li>
              ))}
            </ul>
          </div>
        ))
      )}

      <h2>Cópia de segurança</h2>
      <div className="cartao">
        <p className="suave">Por enquanto suas respostas ficam só neste aparelho. Baixe uma cópia de vez em quando.</p>
        <button onClick={async () => baixar("residencia-backup.json", await exportarDados(), "application/json")}>
          Baixar cópia
        </button>
      </div>
    </>
  );
}
