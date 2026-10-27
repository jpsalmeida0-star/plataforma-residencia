// Acesso ao Google Drive da conta das apostilas, direto do navegador e só com permissão de leitura.
// O login usa o Google Identity Services; o token fica só nesta aba e expira em cerca de 1 hora.

const ESCOPO = "https://www.googleapis.com/auth/drive.readonly";
const API = "https://www.googleapis.com/drive/v3";
const CHAVE_TOKEN = "drive-token";

const PASTA = "application/vnd.google-apps.folder";
const ATALHO = "application/vnd.google-apps.shortcut";
const PDF = "application/pdf";

export const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type TokenGuardado = { token: string; expira: number };

type ClienteToken = { requestAccessToken: (opcoes?: { prompt?: string }) => void };
type RespostaToken = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (r: RespostaToken) => void;
            error_callback?: (e: { type: string; message?: string }) => void;
          }) => ClienteToken;
        };
      };
    };
  }
}

let scriptGIS: Promise<void> | null = null;

function carregarGIS(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  scriptGIS ??= new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      scriptGIS = null;
      falha(new Error("Não foi possível carregar o login do Google. Verifique a internet."));
    };
    document.head.appendChild(s);
  });
  return scriptGIS;
}

/** Token salvo nesta aba, se ainda valer por mais de 1 minuto. */
export function tokenSalvo(): string | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_TOKEN);
    if (!bruto) return null;
    const t = JSON.parse(bruto) as TokenGuardado;
    return t.expira - Date.now() > 60_000 ? t.token : null;
  } catch {
    return null;
  }
}

export function esquecerToken(): void {
  try {
    sessionStorage.removeItem(CHAVE_TOKEN);
  } catch {}
}

/** Abre o login do Google (precisa ser chamado a partir de um toque/clique). */
export async function conectar(): Promise<string> {
  if (!CLIENT_ID) throw new Error("Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
  await carregarGIS();
  return new Promise((ok, falha) => {
    const cliente = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: ESCOPO,
      callback: (r) => {
        if (!r.access_token) return falha(new Error(r.error_description || r.error || "Login cancelado."));
        try {
          const guardado: TokenGuardado = { token: r.access_token, expira: Date.now() + (r.expires_in ?? 3600) * 1000 };
          sessionStorage.setItem(CHAVE_TOKEN, JSON.stringify(guardado));
        } catch {}
        ok(r.access_token);
      },
      error_callback: (e) => falha(new Error(e.message || "Login cancelado.")),
    });
    cliente.requestAccessToken({ prompt: "" });
  });
}

export class TokenExpirado extends Error {
  constructor() {
    super("A conexão com o Drive expirou. Conecte de novo.");
  }
}

async function chamar(token: string, caminho: string, params: Record<string, string> = {}): Promise<Response> {
  const url = new URL(API + caminho);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) {
    esquecerToken();
    throw new TokenExpirado();
  }
  if (!r.ok) throw new Error(`Drive respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}

type ArquivoDrive = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  shortcutDetails?: { targetId: string; targetMimeType: string };
};

async function listarFilhos(token: string, pastaId: string): Promise<ArquivoDrive[]> {
  const todos: ArquivoDrive[] = [];
  let pageToken: string | undefined;
  do {
    const params: Record<string, string> = {
      q: `'${pastaId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, shortcutDetails)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    };
    if (pageToken) params.pageToken = pageToken;
    const r = (await (await chamar(token, "/files", params)).json()) as { files: ArquivoDrive[]; nextPageToken?: string };
    todos.push(...r.files);
    pageToken = r.nextPageToken;
  } while (pageToken);
  return todos;
}

export type PdfEncontrado = { id: string; nome: string; caminho: string; modificado: string; tamanho: number };

/**
 * Percorre a pasta raiz e todas as subpastas (seguindo atalhos) e devolve os PDFs com o caminho de pastas.
 * `aoAvancar` recebe o caminho da pasta sendo lida, para mostrar progresso.
 */
export async function listarPdfs(
  token: string,
  raizId: string,
  aoAvancar?: (pasta: string, encontrados: number) => void,
): Promise<PdfEncontrado[]> {
  const pdfs: PdfEncontrado[] = [];
  const visitadas = new Set<string>();
  const fila: { id: string; caminho: string }[] = [{ id: raizId, caminho: "" }];

  while (fila.length) {
    const pasta = fila.shift()!;
    if (visitadas.has(pasta.id)) continue;
    visitadas.add(pasta.id);
    aoAvancar?.(pasta.caminho || "pasta principal", pdfs.length);

    for (const f of await listarFilhos(token, pasta.id)) {
      const id = f.shortcutDetails?.targetId ?? f.id;
      const tipo = f.shortcutDetails?.targetMimeType ?? f.mimeType;
      if (tipo === PASTA) fila.push({ id, caminho: pasta.caminho ? `${pasta.caminho} / ${f.name}` : f.name });
      else if (tipo === PDF && f.mimeType !== ATALHO)
        pdfs.push({ id, nome: f.name, caminho: pasta.caminho, modificado: f.modifiedTime, tamanho: Number(f.size ?? 0) });
      else if (tipo === PDF) {
        // Atalho para PDF: os metadados vêm do alvo.
        const alvo = (await (await chamar(token, `/files/${id}`, {
          fields: "id, name, modifiedTime, size",
          supportsAllDrives: "true",
        })).json()) as ArquivoDrive;
        pdfs.push({ id, nome: alvo.name, caminho: pasta.caminho, modificado: alvo.modifiedTime, tamanho: Number(alvo.size ?? 0) });
      }
    }
  }
  return pdfs;
}

/** Baixa o conteúdo de um PDF. */
export async function baixarPdf(token: string, id: string): Promise<ArrayBuffer> {
  const r = await chamar(token, `/files/${id}`, { alt: "media", supportsAllDrives: "true" });
  return r.arrayBuffer();
}

/** Aceita o link de uma pasta do Drive (ou só o id) e devolve o id. */
export function idDaPasta(linkOuId: string): string | null {
  const texto = linkOuId.trim();
  const m = texto.match(/folders\/([A-Za-z0-9_-]{10,})/) ?? texto.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(texto) ? texto : null;
}
