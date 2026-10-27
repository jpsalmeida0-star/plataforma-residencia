import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plataforma de estudos para residência",
    short_name: "Residência",
    description: "Banco de questões, análise de erros e revisão",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#3557e6",
    lang: "pt-BR",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
