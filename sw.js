const scope = self.registration.scope;
const cachePrefix = 'astrovital:' + scope + ':';
const cacheName = cachePrefix + 'v1';
const assets = ['./','./index.html','./app.js','./radlab.csv'].map(path => new URL(path,scope).href);
self.addEventListener('install',event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});
self.addEventListener('activate',event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch',event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(assets[0])));
  } else if (assets.includes(event.request.url)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
