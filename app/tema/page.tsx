"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CONSELHO_POR_ERRO, desempenhoPorTema, erradasDoTema, erroPrincipal, ESTRATEGIA, incidenciaPorTema, motivoDaFaixa,
} from "@/lib/analise";
import { db } from "@/lib/db";
import { salvarFila, sortear } from "@/lib/fila";
import { caminhoDoTema, nomeDoTema } from "@/lib/taxonomia";
import { TIPOS_ERRO } from "@/lib/tipos";
import { QUESTOES } from "@/data/provas";
import { Anel, Icone, pct, TOM_DA_FAIXA, Vazio } from "../ui";

const DIA = 24 * 60 * 60 * 1000;

export default function Pagina() {
  return (
    <Suspense>
      <Tema />
    </Suspense>
  );
}

function Tema() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const tentativas = useLiveQuery(() => db.tentativas.toArray(), []);
  const caminho = caminhoDoTema(id);

  if (!caminho) {
    return (
      <Vazio icone="busca" titulo="Tema não encontrado">
        <Link className="botao" href="/painel">Voltar ao desempenho</Link>
      </Vazio>
    );
  }
  if (!tentativas) return <p className="suave">Carregando…</p>;

  const agora = Date.now();
  const nome = nomeDoTema(id);
  const d = desempenhoPorTema(tentativas, QUESTOES, agora).find((x) => x.tema === id);
  const erradas = erradasDoTema(tentativas, QUESTOES, id);
  const feitas = new Set(tentativas.map((t) => t.questaoId));
  // Questões do tema e dos subtemas, quando o id é de uma especialidade.
  const doTema = QUESTOES.filter((q) => q.gabarito !== null && q.temas.some((t) => t === id || t.startsWith(id + ".")));
  const novas = doTema.filter((q) => !feitas.has(q.id));
  const incidencia = d?.incidencia || incidenciaPorTema(QUESTOES).get(id) || 0;
  const principal = d ? erroPrincipal(d) : null;
  const buscaApostila = `/biblioteca?q=${encodeURIComponent(nome)}`;

  function comecar(ids: string[]) {
    salvarFila(sortear(ids, 20));
    router.push("/resolver");
  }

  return (
    <>
      <Link href="/painel" className="suave pequeno" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icone nome="voltar" tamanho={16} /> Desempenho
      </Link>
      <div className="cabecalho" style={{ marginTop: 8 }}>
        <div className="sobretitulo">{caminho.area.nome} · {caminho.especialidade.nome}</div>
        <h1>{nome}</h1>
      </div>

      <div className="cartao" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <Anel valor={d ? d.acerto : null} tamanho={84} />
        <div style={{ flex: 1, minWidth: 200 }}>
          {d ? (
            <span className={`selo ${TOM_DA_FAIXA[d.faixa]}`}>{ESTRATEGIA[d.faixa].rotulo}</span>
          ) : (
            <span className="selo">Ainda não praticado</span>
          )}
          <div className="grade" style={{ marginTop: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <Dado rotulo="Questões feitas" valor={d ? String(d.n) : "0"} />
            <Dado rotulo="Cai na prova" valor={incidencia ? pct(incidencia) : "–"} />
            <Dado rotulo="Última vez" valor={d?.ultima ? quando(agora - d.ultima) : "nunca"} />
          </div>
        </div>
      </div>

      <h2>O que fazer</h2>
      {d ? (
        <div className={`dica ${TOM_DA_FAIXA[d.faixa]}`} style={{ marginTop: 0 }}>
          <strong>{ESTRATEGIA[d.faixa].acao}</strong>
          <p className="suave" style={{ margin: "8px 0 0" }}>{motivoDaFaixa(d, agora)}</p>
        </div>
      ) : (
        <div className="dica" style={{ marginTop: 0 }}>
          <strong>Faça um bloco de questões do tema para o app medir seu nível.</strong>
          {incidencia > 0 && <p className="suave" style={{ margin: "8px 0 0" }}>O tema é {pct(incidencia)} das questões oficiais do banco.</p>}
        </div>
      )}
      {principal && (
        <div className="dica laranja">
          <strong>Seu erro mais comum aqui: {TIPOS_ERRO.find((t) => t.id === principal.tipo)?.rotulo.toLowerCase()}</strong>{" "}
          ({principal.n}x). {CONSELHO_POR_ERRO[principal.tipo]}
        </div>
      )}

      <div className="acoes">
        {erradas.length > 0 && (
          <button className="primario" onClick={() => comecar(erradas.map((e) => e.questao.id))}>
            <Icone nome="revisar" /> {erradas.length === 1 ? "Refazer a que errei" : `Refazer as ${erradas.length} que errei`}
          </button>
        )}
        <button className={erradas.length ? "" : "primario"} disabled={novas.length === 0} onClick={() => comecar(novas.map((q) => q.id))}>
          <Icone nome="jogar" /> {novas.length ? `${Math.min(20, novas.length)} questões novas do tema` : "Sem questões novas do tema"}
        </button>
      </div>

      <h2>Onde estudar</h2>
      <div className="cartao" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <div className="lista">
          <Link className="item" href={buscaApostila}>
            <span className="icone-estat" style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: "var(--destaque-fundo)", color: "var(--destaque)" }}>
              <Icone nome="apostilas" tamanho={18} />
            </span>
            <div className="corpo">
              <strong>Apostilas: &quot;{nome}&quot;</strong>
              <span className="suave pequeno">Abre as páginas das suas apostilas que falam do tema</span>
            </div>
            <span className="seta"><Icone nome="seta" /></span>
          </Link>
          {caminho.tema && (
            <Link className="item" href={`/biblioteca?q=${encodeURIComponent(caminho.especialidade.nome)}`}>
              <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: "var(--neutro-fundo)", color: "var(--suave)" }}>
                <Icone nome="busca" tamanho={18} />
              </span>
              <div className="corpo">
                <strong>Capítulo de {caminho.especialidade.nome}</strong>
                <span className="suave pequeno">Busca mais ampla, pela especialidade</span>
              </div>
              <span className="seta"><Icone nome="seta" /></span>
            </Link>
          )}
        </div>
      </div>

      <h2>Questões que você errou</h2>
      {erradas.length === 0 ? (
        <p className="suave">{d ? "Nenhuma questão errada pendente neste tema." : "Nenhuma ainda."}</p>
      ) : (
        erradas.map(({ questao: q, tentativa: t }) => {
          const tipo = TIPOS_ERRO.find((x) => x.id === t.tipoErro);
          return (
            <details className="cartao compacto" key={q.id}>
              <summary style={{ cursor: "pointer", listStyle: "none" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="selo">{q.banca} {q.ano} · Q{q.numero}</span>
                  <span className="selo vermelho">Marcou {t.marcada} · certa {q.gabarito}</span>
                  {tipo && <span className="selo laranja">{tipo.rotulo}</span>}
                </div>
                <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {q.enunciado}
                </div>
                {t.aprendi && <div className="certo pequeno" style={{ marginTop: 6 }}>Aprendi: {t.aprendi}</div>}
              </summary>
              <p className="enunciado" style={{ marginTop: 12 }}>{q.enunciado}</p>
              {q.imagem && <img className="enunciado-img" src={q.imagem} alt="Imagem da questão" />}
              {q.alternativas.map((a) => (
                <div key={a.letra} className={`alternativa botao ${a.letra === q.gabarito ? "correta" : a.letra === t.marcada ? "errada" : "apagada"}`}>
                  <span className="letra">{a.letra}</span>
                  <span>{a.texto}</span>
                </div>
              ))}
              <p className="suave pequeno" style={{ margin: "8px 0 0" }}>Errada em {new Date(t.data).toLocaleDateString("pt-BR")}</p>
            </details>
          );
        })
      )}
    </>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>{valor}</div>
      <div className="suave pequeno">{rotulo}</div>
    </div>
  );
}

function quando(ms: number) {
  const dias = Math.floor(ms / DIA);
  return dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
}
