// Service worker do Dudavon Yoga, gerado pelo build. Não editar à mão.
var VERSAO = "0.2.0+9e9488e";
var ESCOPO = "/duda-von-yoga-homolog/app/";
var INDEX = ESCOPO;
var CACHE = "dvy-app-" + VERSAO;
var PRECACHE = ["/duda-von-yoga-homolog/app/","/duda-von-yoga-homolog/app/_expo/static/js/web/entry-cb450a331cb8f5e89b2e9ebdfd144853.js","/duda-von-yoga-homolog/app/manifest.webmanifest","/duda-von-yoga-homolog/app/icones/icone-192.png"];

function estrategiaDoSw(url, metodo, modo, escopo, origem) {
  if (metodo !== 'GET') return 'ignorar';
  if (/(^|\.)supabase\.co$/.test(url.hostname)) return 'ignorar';
  if (url.origin !== origem) return 'ignorar';
  if (url.pathname.indexOf(escopo) !== 0) return 'ignorar';
  if (/\/(version\.json|sw\.js)$/.test(url.pathname)) return 'ignorar';
  if (modo === 'navigate') return 'navegacao';
  if (url.pathname.indexOf(escopo + '_expo/static/') === 0) return 'cache';
  if (/\.[0-9a-f]{16,}\.[a-z0-9]+$/i.test(url.pathname)) return 'cache';
  return 'ignorar';
}

self.addEventListener('install', function (e) {
  // Sem skipWaiting aqui: a versão nova espera a aluna tocar em "Atualizar".
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.filter(function (k) { return k.indexOf("dvy-app-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.tipo === 'ATUALIZAR') self.skipWaiting();
});

function guardar(chave, resposta) {
  return caches.open(CACHE).then(function (c) { return c.put(chave, resposta); });
}

function indexDoCache() {
  return caches.match(INDEX, { ignoreSearch: true }).then(function (r) { return r || Response.error(); });
}

function buscarIndex() {
  return fetch(INDEX, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
    if (res.ok) { guardar(INDEX, res.clone()); return res; }
    return indexDoCache();
  }, indexDoCache);
}

function navegar(req) {
  return fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
    if (res.redirected) return Response.redirect(res.url, 302);
    // Rota do app sem arquivo no servidor: entrega o app direto, sem passar pelo 404.html
    if (res.status === 404) return buscarIndex();
    var p = new URL(req.url).pathname;
    if (res.ok && (p === INDEX || p === INDEX + 'index.html')) guardar(INDEX, res.clone());
    return res;
  }, indexDoCache);
}

function primeiroDoCache(req) {
  return caches.match(req).then(function (r) {
    if (r) return r;
    return fetch(req).then(function (res) {
      if (res.ok && res.type === 'basic') guardar(req, res.clone());
      return res;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var tipo = estrategiaDoSw(new URL(req.url), req.method, req.mode, ESCOPO, self.location.origin);
  if (tipo === 'navegacao') e.respondWith(navegar(req));
  else if (tipo === 'cache') e.respondWith(primeiroDoCache(req));
});

// ---------- lembretes (Web Push) ----------
function urlDoClique(url, escopo, origem) {
  var padrao = origem + escopo;
  if (typeof url !== 'string' || !url) return padrao;
  var u;
  try {
    u = new URL(url, padrao);
  } catch (e) {
    return padrao;
  }
  if (u.origin !== origem || u.pathname.indexOf(escopo) !== 0) return padrao;
  return u.href;
}

var ICONE = ESCOPO + 'icones/icone-192.png';

self.addEventListener('push', function (e) {
  var dados = {};
  try { dados = e.data ? e.data.json() : {}; } catch (erro) { dados = { body: e.data ? e.data.text() : '' }; }
  var titulo = dados.title || "Dudavon Yoga";
  e.waitUntil(self.registration.showNotification(titulo, {
    body: dados.body || 'Seu tapetinho te espera.',
    icon: dados.icon || ICONE,
    badge: ICONE,
    tag: 'lembrete',
    lang: 'pt-BR',
    data: { url: urlDoClique(dados.url, ESCOPO, self.location.origin) }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var destino = urlDoClique(e.notification.data && e.notification.data.url, ESCOPO, self.location.origin);
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (janelas) {
      for (var i = 0; i < janelas.length; i++) {
        var j = janelas[i];
        if (new URL(j.url).pathname.indexOf(ESCOPO) === 0 && 'focus' in j) {
          return j.focus().then(function (focada) {
            // Abrir o início com o app já aberto: só foca (não interrompe uma prática em andamento)
            if (focada && destino !== focada.url && destino !== self.location.origin + ESCOPO && 'navigate' in focada) return focada.navigate(destino).catch(function () { return focada; });
            return focada;
          });
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
