"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeIcone } from "./ui";

const LINKS: { href: string; rotulo: string; icone: NomeIcone; tambem?: string[] }[] = [
  { href: "/", rotulo: "Início", icone: "inicio" },
  { href: "/questoes", rotulo: "Questões", icone: "questoes", tambem: ["/resolver"] },
  { href: "/painel", rotulo: "Desempenho", icone: "painel", tambem: ["/tema"] },
  { href: "/erros", rotulo: "Erros", icone: "erros" },
  { href: "/biblioteca", rotulo: "Apostilas", icone: "apostilas" },
];

function ativo(caminho: string, l: (typeof LINKS)[number]) {
  if (l.href === "/") return caminho === "/";
  return [l.href, ...(l.tambem ?? [])].some((h) => caminho === h || caminho.startsWith(h + "/"));
}

/** Barra lateral no computador. */
export function Lateral() {
  const caminho = usePathname();
  return (
    <aside className="lateral">
      <div className="marca">
        <span className="logo"><Icone nome="logo" /></span>
        Residência
      </div>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={ativo(caminho, l) ? "ativo" : ""}>
          <Icone nome={l.icone} />
          {l.rotulo}
        </Link>
      ))}
      <div className="rodape">Seus dados ficam neste aparelho.</div>
    </aside>
  );
}

/** Barra inferior no celular. */
export default function Navegacao() {
  const caminho = usePathname();
  return (
    <nav className="inferior">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={ativo(caminho, l) ? "ativo" : ""}>
          <Icone nome={l.icone} />
          {l.rotulo}
        </Link>
      ))}
    </nav>
  );
}
