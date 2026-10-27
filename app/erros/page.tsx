"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { cardsDaSemana, cardsParaAnki, inicioDaSemana } from "@/lib/analise";
import { db, exportarDados } from "@/lib/db";
import { nomeDoTema } from "@/lib/taxonomia";
import { TIPOS_ERRO } from "@/lib/tipos";
import { QUESTOES } from "@/data/provas";

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
      <h1>Erros</h1>

      <h2>Cards dos erros da semana</h2>
      <div className="chips">
        <button onClick={() => mudarSemana(-1)}>← Anterior</button>
        <span className="suave" style={{ alignSelf: "center" }}>Semana de {rotuloSemana}</span>
        <button onClick={() => mudarSemana(1)} disabled={semana >= inicioDaSemana(Date.now())}>Próxima →</button>
      </div>

      {cards.length === 0 ? (
        <p className="suave">Nenhum erro nesta semana.</p>
      ) : (
        <>
          <div className="cartao card-flash" onClick={() => setVirado((v) => !v)}>
            <p className="suave">Card {cardAtual + 1} de {cards.length} · toque para virar</p>
            {virado ? card.verso : card.frente}
          </div>
          <div className="chips">
            <button disabled={cardAtual === 0} onClick={() => { setCardAtual((i) => i - 1); setVirado(false); }}>Anterior</button>
            <button disabled={cardAtual >= cards.length - 1} onClick={() => { setCardAtual((i) => i + 1); setVirado(false); }}>Próximo</button>
            <button onClick={() => baixar(`erros-semana-${rotuloSemana.replace("/", "-")}.txt`, cardsParaAnki(cards), "text/plain")}>
              Baixar para o Anki
            </button>
          </div>
        </>
      )}

      <h2>Caderno de erros</h2>
      <p className="suave">Suas linhas &quot;o que aprendi&quot;, por tema. Bom para ler na véspera da prova.</p>
      {aprendizados.size === 0 ? (
        <p className="suave">Ainda vazio. Ao errar uma questão, escreva uma linha do que aprendeu.</p>
      ) : (
        [...aprendizados.entries()].map(([tema, lista]) => (
          <div className="cartao" key={tema}>
            <strong>{nomeDoTema(tema)}</strong>
            <ul>
              {lista.sort((a, b) => b.data - a.data).map((x, i) => (
                <li key={i}>{x.texto}{x.tipo && <span className="suave"> · {x.tipo}</span>}</li>
              ))}
            </ul>
          </div>
        ))
      )}

      <h2>Cópia de segurança</h2>
      <p className="suave">Por enquanto suas respostas ficam só neste aparelho. Baixe uma cópia de vez em quando.</p>
      <button onClick={async () => baixar("residencia-backup.json", await exportarDados(), "application/json")}>
        Baixar cópia
      </button>
    </>
  );
}
