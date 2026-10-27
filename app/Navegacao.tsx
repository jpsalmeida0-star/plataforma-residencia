"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/questoes", rotulo: "Questões" },
  { href: "/painel", rotulo: "Painel" },
  { href: "/erros", rotulo: "Erros" },
];

export default function Navegacao() {
  const caminho = usePathname();
  return (
    <nav className="inferior">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={caminho === l.href ? "ativo" : ""}>
          {l.rotulo}
        </Link>
      ))}
    </nav>
  );
}
