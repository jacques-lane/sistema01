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
  var chave = mesmoSite ? url.pathname : req;
  var daRede = fetch(req).then(function (resp) {
    if (resp && (resp.ok || resp.type === 'opaque')) {
      var copia = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(chave, copia); });
    }
    return resp;
  });
  var doCache = function () {
    return caches.match(chave).then(function (r) { return r || caches.match('./pdv.html'); });
  };
  // 24/11/2026: com sinal fraco a rede não falha, só demora -> a página ficava
  // presa abrindo. Agora espera a rede no máximo 4 s; passou disso, abre a cópia
  // guardada (a versão nova continua baixando e fica pra próxima abertura).
  var limite = new Promise(function (ok) { setTimeout(ok, 4000); }).then(function () {
    return doCache().then(function (r) { return r || daRede; });
  });
  e.respondWith(
    Promise.race([daRede.catch(function () { return doCache(); }), limite])
      .then(function (r) { return r || daRede; })
  );
});
