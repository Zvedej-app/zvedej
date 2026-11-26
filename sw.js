/* Zvedej – service worker: aplikace se otevře i bez signálu (posilovna).
 * Stránka: nejdřív síť, bez signálu uložená verze. Soubory aplikace (s otiskem v názvu): z mezipaměti.
 * Požadavky na server (Supabase, feedy) jdou vždy do sítě – tréninky se bez signálu ukládají v aplikaci. */
const CACHE = 'zvedej-22c1856035';
const SHELL = ['./', './manifest.json', './logo192.png', './logo512.png', './apple-touch-icon.png'];

// při instalaci uložíme celou aplikaci (seznam vytváří scripts/sw-manifest.mjs při sestavení)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(async (c) => {
        let files = SHELL;
        try {
          const r = await fetch('./sw-assets.json', { cache: 'no-store' });
          if (r.ok) files = (await r.json()).files || SHELL;
        } catch (err) {}
        // po jednom – jeden chybějící soubor nesmí zastavit celé uložení
        await Promise.all(files.map((f) => c.add(new Request(f, { cache: 'reload' })).catch(() => null)));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// stránka po spuštění pošle seznam souborů, které už načetla (balík aplikace, písma, ikony)
// – uložíme je, aby se aplikace příště otevřela i bez signálu
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type !== 'cache-urls' || !Array.isArray(d.urls)) return;
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        d.urls
          .filter((u) => typeof u === 'string' && new URL(u).origin === self.location.origin && !new URL(u).searchParams.has('v'))
          .map((u) =>
            c.match(u).then((hit) => hit || fetch(u).then((res) => (res.ok ? c.put(u, res) : null)).catch(() => null)),
          ),
      ),
    ),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // otevření stránky (i hluboký odkaz): síť, bez signálu poslední uložená verze aplikace
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./', copy));
          }
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  // kontrola nové verze (index.html ?v=…) jde vždy do sítě
  if (url.searchParams.has('v')) return;

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(async (c) => {
              // starý balík aplikace po nové verzi smažeme, ať mezipaměť neroste
              if (/\/entry-[^/]+\.js$/.test(url.pathname)) {
                for (const k of await c.keys()) if (/\/entry-[^/]+\.js$/.test(k.url) && k.url !== req.url) c.delete(k);
              }
              c.put(req, copy);
            });
          }
          return res;
        }),
    ),
  );
});
