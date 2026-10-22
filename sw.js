/* Service worker do PDV (21/10/2026, backlog 89).
   Faz o pdv.html ABRIR mesmo sem internet (ex.: Ceagesp): guarda a última
   versão da página no aparelho. Regra: sempre tenta a internet primeiro
   (pega a versão nova do GitHub); se não tiver sinal, usa a cópia guardada.
   Não mexe nas chamadas da planilha (script.google.com) -- essas continuam
   com a fila/cache do próprio PDV. */
var CACHE = 'mayse-pdv-v1';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./pdv.html']); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  var mesmoSite = url.origin === self.location.origin;
  var fonte = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!mesmoSite && !fonte) return; // planilha e o resto: não intercepta
  e.respondWith(
    fetch(req).then(function (resp) {
      if (resp && (resp.ok || resp.type === 'opaque')) {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(mesmoSite ? url.pathname : req, copia); });
      }
      return resp;
    }).catch(function () {
      return caches.match(mesmoSite ? url.pathname : req).then(function (r) { return r || caches.match('./pdv.html'); });
    })
  );
});
