"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { desempenhoPorTema, diasSeguidos, ESTRATEGIA, inicioDoDia } from "@/lib/analise";
import { db } from "@/lib/db";
import { salvarFila, sortear } from "@/lib/fila";
import { caminhoDoTema, nomeDoTema } from "@/lib/taxonomia";
import { PROVAS, QUESTOES } from "@/data/provas";
import { Anel, Icone, pct, TOM_DA_FAIXA, Vazio } from "./ui";

const DIA = 24 * 60 * 60 * 1000;

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function Inicio() {
  const router = useRouter();
  const agora = Date.now();
  const hoje = inicioDoDia(agora);
  const vencidas = useLiveQuery(() => db.revisoes.where("proxima").below(hoje + DIA).count(), [hoje]);
  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);

  const feitasHoje = tentativas?.filter((t) => t.data >= hoje) ?? [];
  const semana = tentativas?.filter((t) => t.data >= hoje - 6 * DIA) ?? [];
  const acerto = (l: { acertou: boolean }[]) => (l.length ? l.filter((t) => t.acertou).length / l.length : null);
  const feitas = new Set(tentativas?.map((t) => t.questaoId));
  const naoFeitas = QUESTOES.filter((q) => q.gabarito !== null && !feitas.has(q.id));
  const prioridades = tentativas
    ? desempenhoPorTema(tentativas, QUESTOES, agora).filter((d) => d.faixa !== "forte").slice(0, 4)
    : [];

  function questoesNovas() {
    salvarFila(sortear(naoFeitas.map((q) => q.id), 10));
    router.push("/resolver");
  }

  const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <div className="cabecalho">
        <div className="sobretitulo">{dataHoje}</div>
        <h1>{saudacao()}, bora estudar?</h1>
      </div>

      <div className="cartao destaque-hero">
        <div className="sobretitulo">Revisões para hoje</div>
        <div style={{ fontSize: "2.6rem", fontWeight: 800, lineHeight: 1.1, margin: "4px 0" }}>{vencidas ?? "–"}</div>
        <p className="suave" style={{ maxWidth: 440 }}>
          {vencidas
            ? "Questões que você errou ou acertou sem certeza e chegaram na data de rever."
            : "Nada vencido. Aproveite para fazer questões novas."}
        </p>
        <div className="acoes">
          <Link className="botao" href="/resolver?modo=revisao">
            <Icone nome="revisar" /> Revisar agora
          </Link>
          <button className="botao fantasma" onClick={questoesNovas} disabled={naoFeitas.length === 0}>
            <Icone nome="jogar" /> 10 questões novas
          </button>
        </div>
      </div>

      <div className="grade">
        <Estatistica icone="alvo" rotulo="Feitas hoje" valor={feitasHoje.length}
          detalhe={acerto(feitasHoje) === null ? "nenhuma ainda" : `${pct(acerto(feitasHoje)!)} de acerto`} />
        <Estatistica icone="painel" cor="verde" rotulo="Últimos 7 dias" valor={semana.length}
          detalhe={acerto(semana) === null ? "sem questões" : `${pct(acerto(semana)!)} de acerto`} />
        <Estatistica icone="fogo" cor="laranja" rotulo="Dias seguidos" valor={tentativas ? diasSeguidos(tentativas, agora) : 0}
          detalhe="com pelo menos 1 questão" />
        <Estatistica icone="banco" cor="vermelho" rotulo="Banco" valor={QUESTOES.length}
          detalhe={`${feitas.size} feitas · ${PROVAS.length} prova(s)`} />
      </div>

      <div className="linha-titulo">
        <h2>O que estudar agora</h2>
        <Link href="/painel">Ver todos os temas</Link>
      </div>
      {prioridades.length === 0 ? (
        <Vazio icone="lampada" titulo="Seu plano aparece aqui">
          <p className="suave" style={{ margin: 0 }}>
            Depois das primeiras questões, o app aponta os temas que mais valem seu tempo: os que você erra e que mais caem.
          </p>
        </Vazio>
      ) : (
        <div className="grade-2">
          {prioridades.map((d) => (
            <Link className="cartao" key={d.tema} href={`/tema?id=${encodeURIComponent(d.tema)}`}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Anel valor={d.acerto} tamanho={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="suave pequeno">{caminhoDoTema(d.tema)?.especialidade.nome}</div>
                  <h3>{nomeDoTema(d.tema)}</h3>
                  <span className={`selo ${TOM_DA_FAIXA[d.faixa]}`}>{ESTRATEGIA[d.faixa].rotulo}</span>
                  <p className="suave" style={{ margin: "8px 0 0" }}>{ESTRATEGIA[d.faixa].acao}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Estatistica({ icone, cor = "", rotulo, valor, detalhe }: {
  icone: Parameters<typeof Icone>[0]["nome"]; cor?: string; rotulo: string; valor: number; detalhe: string;
}) {
  return (
    <div className="cartao estatistica">
      <span className={`icone-estat ${cor}`}><Icone nome={icone} /></span>
      <span className="rotulo">{rotulo}</span>
      <span className="numero">{valor}</span>
      <span className="suave pequeno">{detalhe}</span>
    </div>
  );
}
