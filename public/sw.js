// Service worker: guarda as páginas e arquivos já visitados para o app abrir sem internet.
// Mudar a versão apaga o cache antigo dos aparelhos.
const CACHE = "residencia-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Só arquivos que nunca mudam de conteúdo (o nome tem um código da versão) vêm do cache primeiro.
  const url = new URL(req.url);
  const imutavel = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/provas/") || url.pathname.startsWith("/pdfjs/");
  if (imutavel) {
    event.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Todo o resto (páginas e os dados que o Next busca ao trocar de aba): rede primeiro, cache sem internet.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("/") : Response.error()))),
  );
});
