"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { baixarPdf, CLIENT_ID, conectar, idDaPasta, listarPdfs, TokenExpirado, tokenSalvo } from "@/lib/biblioteca/drive";
import { buscar, indexarApostila, sincronizarLista } from "@/lib/biblioteca/indice";
import { carregarPdfJs } from "@/lib/biblioteca/pdf";
import type { Resultado } from "@/lib/biblioteca/tipos";

const CHAVE_PASTA = "pasta-apostilas";

function lerPasta(): string {
  try {
    return localStorage.getItem(CHAVE_PASTA) ?? "";
  } catch {
    return "";
  }
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

export default function Pagina() {
  return (
    <Suspense>
      <Biblioteca />
    </Suspense>
  );
}

function Biblioteca() {
  const router = useRouter();
  const consultaUrl = useSearchParams().get("q") ?? "";

  const [token, setToken] = useState<string | null>(null);
  const [pasta, setPasta] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const cancelar = useRef(false);

  const [consulta, setConsulta] = useState(consultaUrl);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);

  const apostilas = useLiveQuery(() => db.apostilas.toArray(), []);
  const pendentes = apostilas?.filter((a) => a.status === "pendente") ?? [];
  const indexadas = apostilas?.filter((a) => a.status === "indexada").length ?? 0;
  const semTexto = apostilas?.filter((a) => a.status === "sem-texto") ?? [];
  const comErro = apostilas?.filter((a) => a.status === "erro") ?? [];

  useEffect(() => {
    setToken(tokenSalvo());
    setPasta(lerPasta());
  }, []);

  useEffect(() => {
    setConsulta(consultaUrl);
    if (consultaUrl) buscar(consultaUrl).then(setResultados);
    else setResultados(null);
  }, [consultaUrl, indexadas]);

  async function aoConectar() {
    setAviso(null);
    try {
      setToken(await conectar());
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
    }
  }

  function tratarErro(e: unknown) {
    if (e instanceof TokenExpirado) setToken(null);
    setAviso(e instanceof Error ? e.message : String(e));
  }

  async function atualizarLista() {
    const raiz = idDaPasta(pasta);
    if (!token || !raiz) {
      setAviso("Cole o link da pasta das apostilas no Drive.");
      return;
    }
    try {
      localStorage.setItem(CHAVE_PASTA, pasta);
    } catch {}
    setAviso(null);
    setOcupado(true);
    try {
      const pdfs = await listarPdfs(token, raiz, (p, n) => setProgresso(`Lendo ${p} (${n} PDFs até agora)`));
      const { novas, removidas } = await sincronizarLista(pdfs);
      setProgresso(`${pdfs.length} PDFs na pasta: ${novas} novos, ${removidas} removidos.`);
    } catch (e) {
      tratarErro(e);
      setProgresso(null);
    } finally {
      setOcupado(false);
    }
  }

  async function indexar() {
    if (!token) return;
    setAviso(null);
    setOcupado(true);
    cancelar.current = false;
    const fila = await db.apostilas.where("status").equals("pendente").toArray();
    try {
      const pdfjs = await carregarPdfJs();
      for (let i = 0; i < fila.length && !cancelar.current; i++) {
        const a = fila[i];
        setProgresso(`Indexando ${i + 1} de ${fila.length}: ${a.nome} (${mb(a.tamanho)})`);
        const dados = await baixarPdf(token, a.id);
        await indexarApostila(a, dados, pdfjs);
      }
      setProgresso(cancelar.current ? "Indexação pausada. Continue quando quiser." : "Indexação concluída.");
    } catch (e) {
      tratarErro(e);
      setProgresso("Indexação interrompida. O que já foi feito ficou salvo.");
    } finally {
      setOcupado(false);
    }
  }

  async function tentarDeNovo() {
    await db.apostilas.where("status").equals("erro").modify({ status: "pendente", erro: undefined });
  }

  function aoBuscar(e: React.FormEvent) {
    e.preventDefault();
    router.replace(`/biblioteca?q=${encodeURIComponent(consulta.trim())}`);
  }

  return (
    <>
      <h1>Apostilas</h1>

      <form onSubmit={aoBuscar} className="chips" style={{ flexWrap: "nowrap" }}>
        <input
          type="text"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar assunto, ex.: síndrome nefrótica"
          aria-label="Buscar nas apostilas"
        />
        <button className="primario" type="submit">Buscar</button>
      </form>

      {resultados !== null && (
        resultados.length === 0 ? (
          <p className="suave">
            Nada encontrado{indexadas === 0 ? ", e nenhuma apostila foi indexada ainda" : ""}.
          </p>
        ) : (
          resultados.map((r) => (
            <div className="cartao" key={r.apostila.id}>
              <strong>{r.apostila.nome.replace(/\.pdf$/i, "")}</strong>
              {r.apostila.caminho && <div className="suave">{r.apostila.caminho}</div>}
              {r.paginas.map((p) => (
                <Link
                  key={p.pagina}
                  href={`/biblioteca/ver?id=${r.apostila.id}&p=${p.pagina}&q=${encodeURIComponent(consultaUrl)}`}
                  style={{ display: "block", marginTop: 10, textDecoration: "none", color: "inherit" }}
                >
                  <span style={{ color: "var(--destaque)", fontWeight: 600 }}>Página {p.pagina}</span>
                  <span className="suave"> · {p.trecho}</span>
                </Link>
              ))}
            </div>
          ))
        )
      )}

      <h2>Conexão com o Drive</h2>
      {!CLIENT_ID ? (
        <div className="cartao">
          <strong>Falta a chave do Google.</strong>
          <p className="suave">
            Crie um ID de cliente OAuth no Google Cloud e coloque em NEXT_PUBLIC_GOOGLE_CLIENT_ID. O passo a passo está
            em docs/biblioteca.md no repositório.
          </p>
        </div>
      ) : (
        <div className="cartao">
          {token ? (
            <p className="certo">Conectado ao Drive (só leitura).</p>
          ) : (
            <>
              <p className="suave">Entre com a conta Google que tem as apostilas. O app só lê os arquivos.</p>
              <button className="primario" onClick={aoConectar}>Conectar ao Drive</button>
            </>
          )}

          <label>Link da pasta das apostilas</label>
          <input
            type="text"
            value={pasta}
            onChange={(e) => setPasta(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
          />
          <div className="chips" style={{ marginTop: 12 }}>
            <button disabled={!token || ocupado} onClick={atualizarLista}>Atualizar lista</button>
            <button className="primario" disabled={!token || ocupado || pendentes.length === 0} onClick={indexar}>
              Indexar {pendentes.length} pendente(s)
            </button>
            {ocupado && <button onClick={() => (cancelar.current = true)}>Pausar</button>}
          </div>
          {progresso && <p className="suave">{progresso}</p>}
          {aviso && <p className="errado">{aviso}</p>}
        </div>
      )}

      {apostilas && apostilas.length > 0 && (
        <div className="cartao">
          <p>
            <strong>{indexadas}</strong> de {apostilas.length} apostilas indexadas.
            {pendentes.length > 0 && ` Faltam ${pendentes.length} (${mb(pendentes.reduce((s, a) => s + a.tamanho, 0))} para baixar).`}
          </p>
          <p className="suave">
            O índice fica só neste aparelho. Indexar baixa cada PDF uma vez: prefira o computador e o Wi-Fi.
          </p>
          {semTexto.length > 0 && (
            <p className="suave">
              {semTexto.length} apostila(s) parecem escaneadas (só imagem) e não entram na busca por enquanto.
            </p>
          )}
          {comErro.length > 0 && (
            <p className="suave">
              {comErro.length} apostila(s) deram erro. <button onClick={tentarDeNovo}>Tentar de novo</button>
            </p>
          )}
        </div>
      )}
    </>
  );
}
