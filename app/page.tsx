"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { desempenhoPorTema, ESTRATEGIA, inicioDoDia } from "@/lib/analise";
import { db } from "@/lib/db";
import { nomeDoTema } from "@/lib/taxonomia";
import { PROVAS, QUESTOES } from "@/data/provas";

export default function Inicio() {
  const fimDeHoje = inicioDoDia(Date.now()) + 24 * 60 * 60 * 1000;
  const vencidas = useLiveQuery(() => db.revisoes.where("proxima").below(fimDeHoje).count(), [fimDeHoje]);
  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);

  const hoje = inicioDoDia(Date.now());
  const feitasHoje = tentativas?.filter((t) => t.data >= hoje) ?? [];
  const acertosHoje = feitasHoje.filter((t) => t.acertou).length;
  const plano = tentativas
    ? desempenhoPorTema(tentativas, QUESTOES, Date.now())
        .filter((d) => d.faixa !== "forte")
        .slice(0, 3)
    : [];

  return (
    <>
      <h1>Seu estudo hoje</h1>

      {PROVAS.length === 0 && (
        <div className="cartao">
          <strong>Nenhuma prova importada ainda.</strong>
          <p className="suave">
            As provas oficiais entram no banco pelo repositório (pasta data/provas). Assim que a primeira for
            importada, as questões aparecem na aba Questões.
          </p>
        </div>
      )}

      <div className="grade">
        <div className="cartao">
          <div className="suave">Revisões para hoje</div>
          <div className="numero">{vencidas ?? "–"}</div>
          <Link className="botao primario largo" href="/resolver?modo=revisao">
            Revisar agora
          </Link>
        </div>
        <div className="cartao">
          <div className="suave">Questões feitas hoje</div>
          <div className="numero">{feitasHoje.length}</div>
          <div className="suave">
            {feitasHoje.length ? `${Math.round((acertosHoje / feitasHoje.length) * 100)}% de acerto` : "nenhuma ainda"}
          </div>
        </div>
        <div className="cartao">
          <div className="suave">Banco</div>
          <div className="numero">{QUESTOES.length}</div>
          <div className="suave">questões de {PROVAS.length} prova(s)</div>
        </div>
      </div>

      <h2>Plano da semana</h2>
      {plano.length === 0 ? (
        <p className="suave">Faça algumas questões para o app montar o plano com seus temas prioritários.</p>
      ) : (
        plano.map((d) => (
          <div className="cartao" key={d.tema}>
            <strong>{nomeDoTema(d.tema)}</strong>
            <div className="suave">{ESTRATEGIA[d.faixa].rotulo}</div>
            <p>{ESTRATEGIA[d.faixa].acao}</p>
          </div>
        ))
      )}
    </>
  );
}
