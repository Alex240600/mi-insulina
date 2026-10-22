/* Mi insulina: guarda la app en el móvil para que funcione también sin internet. */
var CACHE = 'mi-insulina-v1';
var ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icono-192.png',
  'icono-512.png',
  'icono-maskable-512.png',
  'lexend-400.woff2',
  'lexend-700.woff2'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ARCHIVOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.filter(function (k) {
        return k.indexOf('mi-insulina-') === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Responde con lo guardado en el móvil (rápido y sin internet) y, por detrás,
// descarga la versión más nueva para la próxima vez que se abra.
self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (guardada) {
      var deRed = fetch(req).then(function (resp) {
        if (resp && resp.ok && resp.type === 'basic' && !resp.redirected) {
          return cache.put(req, resp.clone()).then(function () { return resp; }, function () { return resp; });
        }
        return resp;
      }).catch(function () { return null; });
      if (guardada) {
        ev.waitUntil(deRed);
        return guardada;
      }
      return deRed.then(function (resp) {
        if (resp) return resp;
        if (req.mode === 'navigate') {
          return cache.match('./').then(function (r) { return r || cache.match('index.html'); })
            .then(function (r) { return r || Response.error(); });
        }
        return Response.error();
      });
    });
  }));
});
