// Peças visuais reaproveitadas pelas telas: ícones, anel e barra de progresso, selos de situação.

import type { Faixa } from "@/lib/analise";

const CAMINHOS = {
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  questoes: "M4 5h16M4 12h16M4 19h10",
  painel: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  erros: "M12 8v5M12 16.5v.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  apostilas: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  relogio: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  certo: "M20 6 9 17l-5-5",
  errado: "M18 6 6 18M6 6l12 12",
  seta: "m9 6 6 6-6 6",
  voltar: "m15 6-6 6 6 6",
  fogo: "M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4 3 7 7 7z",
  alvo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  revisar: "M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5",
  jogar: "M7 4v16l13-8z",
  busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  banco: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  logo: "M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2M20 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  lampada: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, tamanho }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}

export type Tom = "vermelho" | "laranja" | "azul" | "verde" | "";

/** Cor de um acerto de 0 a 1. */
export function tomDoAcerto(acerto: number): Tom {
  if (acerto >= 0.8) return "verde";
  if (acerto >= 0.6) return "azul";
  if (acerto >= 0.4) return "laranja";
  return "vermelho";
}

export const TOM_DA_FAIXA: Record<Faixa, Tom> = {
  "fraco-alta": "vermelho",
  "fraco-leitura": "laranja",
  "fraco-baixa": "laranja",
  evolucao: "azul",
  forte: "verde",
  "forte-antigo": "verde",
  "pouca-amostra": "",
};

const COR_DO_TOM: Record<Tom, string> = {
  vermelho: "var(--errado)",
  laranja: "var(--aviso)",
  azul: "var(--destaque)",
  verde: "var(--certo)",
  "": "var(--suave)",
};

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Anel de progresso com o valor no meio. Sem dados, mostra um traço. */
export function Anel({ valor, tamanho = 56, tom }: { valor: number | null; tamanho?: number; tom?: Tom }) {
  const espessura = Math.max(4, tamanho / 10);
  const raio = (tamanho - espessura) / 2;
  const volta = 2 * Math.PI * raio;
  const cor = COR_DO_TOM[tom ?? (valor === null ? "" : tomDoAcerto(valor))];
  return (
    <div className="anel" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho}>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" stroke="var(--neutro-fundo)" strokeWidth={espessura} />
        {valor !== null && (
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            stroke={cor}
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={`${volta * Math.min(1, Math.max(0, valor))} ${volta}`}
          />
        )}
      </svg>
      <span className="valor" style={{ fontSize: tamanho < 50 ? "0.7rem" : undefined }}>
        {valor === null ? "–" : pct(valor)}
      </span>
    </div>
  );
}

export function Barra({ valor, tom = "azul", fina }: { valor: number; tom?: Tom; fina?: boolean }) {
  return (
    <div className={`barra ${tom} ${fina ? "fina" : ""}`}>
      <span style={{ width: pct(Math.min(1, Math.max(0, valor))) }} />
    </div>
  );
}

export function Vazio({ icone, titulo, children }: { icone: NomeIcone; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="cartao vazio">
      <Icone nome={icone} />
      <strong>{titulo}</strong>
      {children}
    </div>
  );
}
