"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { baixarPdf, conectar, TokenExpirado, tokenSalvo } from "@/lib/biblioteca/drive";
import { carregarPdfJs, FONTES_PADRAO } from "@/lib/biblioteca/pdf";

type Documento = Awaited<ReturnType<Awaited<ReturnType<typeof carregarPdfJs>>["getDocument"]>["promise"]>;

export default function Pagina() {
  return (
    <Suspense>
      <Leitor />
    </Suspense>
  );
}

function Leitor() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const consulta = params.get("q") ?? "";
  const [pagina, setPagina] = useState(() => Math.max(1, Number(params.get("p")) || 1));

  const apostila = useLiveQuery(() => db.apostilas.get(id), [id]);
  const [token, setToken] = useState<string | null>(null);
  const [doc, setDoc] = useState<Documento | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => setToken(tokenSalvo()), []);

  // Baixa o PDF uma vez por abertura do leitor.
  useEffect(() => {
    if (!token || !id) return;
    let ativo = true;
    let aberto: Documento | null = null;
    setCarregando(true);
    (async () => {
      try {
        const [pdfjs, dados] = await Promise.all([carregarPdfJs(), baixarPdf(token, id)]);
        aberto = await pdfjs.getDocument({ data: new Uint8Array(dados), standardFontDataUrl: FONTES_PADRAO }).promise;
        if (ativo) setDoc(aberto);
        else aberto.destroy();
      } catch (e) {
        if (!ativo) return;
        if (e instanceof TokenExpirado) setToken(null);
        setAviso(e instanceof Error ? e.message : String(e));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
      aberto?.destroy();
    };
  }, [token, id]);

  // Desenha a página atual na largura da tela.
  useEffect(() => {
    if (!doc || !canvas.current || !caixa.current) return;
    let tarefa: { cancel: () => void } | null = null;
    (async () => {
      const p = await doc.getPage(Math.min(pagina, doc.numPages));
      const largura = caixa.current!.clientWidth;
      const base = p.getViewport({ scale: 1 });
      const escala = largura / base.width;
      const dpr = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale: escala * dpr });
      const c = canvas.current!;
      c.width = viewport.width;
      c.height = viewport.height;
      c.style.width = `${largura}px`;
      c.style.height = `${viewport.height / dpr}px`;
      const render = p.render({ canvas: c, viewport });
      tarefa = render;
      await render.promise.catch(() => {});
    })();
    return () => tarefa?.cancel();
  }, [doc, pagina]);

  const total = doc?.numPages ?? apostila?.paginas;
  const ir = (n: number) => setPagina(Math.max(1, Math.min(total ?? n, n)));

  return (
    <>
      <p className="suave">
        <Link href={consulta ? `/biblioteca?q=${encodeURIComponent(consulta)}` : "/biblioteca"}>← Voltar à busca</Link>
      </p>
      <h1 style={{ fontSize: "1.1rem" }}>{apostila?.nome.replace(/\.pdf$/i, "") ?? "Apostila"}</h1>

      {!token && (
        <div className="cartao">
          <p className="suave">Para abrir a apostila, conecte a conta do Drive.</p>
          <button className="primario" onClick={() => conectar().then(setToken).catch((e) => setAviso(String(e.message ?? e)))}>
            Conectar ao Drive
          </button>
        </div>
      )}
      {aviso && <p className="errado">{aviso}</p>}
      {carregando && <p className="suave">Baixando a apostila…</p>}

      <div className="chips" style={{ alignItems: "center" }}>
        <button disabled={pagina <= 1} onClick={() => ir(pagina - 1)}>← Anterior</button>
        <span className="suave">Página {pagina}{total ? ` de ${total}` : ""}</span>
        <button disabled={!!total && pagina >= total} onClick={() => ir(pagina + 1)}>Próxima →</button>
      </div>

      <div ref={caixa} className="cartao" style={{ padding: 0, overflow: "hidden" }}>
        <canvas ref={canvas} aria-label={`Página ${pagina}`} />
      </div>
    </>
  );
}
