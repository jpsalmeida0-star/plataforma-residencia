import type { Metadata, Viewport } from "next";
import Navegacao, { Lateral } from "./Navegacao";
import RegistrarSW from "./RegistrarSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "Residência",
  description: "Banco de questões, análise de erros e revisão para residência médica",
  appleWebApp: { capable: true, title: "Residência", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3557e6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="casca">
          <Lateral />
          <main>{children}</main>
        </div>
        <Navegacao />
        <RegistrarSW />
      </body>
    </html>
  );
}
