"use client";

import { useEffect } from "react";

export default function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    // Quando sai uma versão nova do app, o service worker novo assume e a página recarrega uma vez.
    const tinhaControle = !!navigator.serviceWorker.controller;
    let recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!tinhaControle || recarregou) return;
      recarregou = true;
      window.location.reload();
    });
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {});
  }, []);
  return null;
}
