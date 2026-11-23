// Supabase Edge Function: proxy + cache RSS feedů webu vzpirani.cz
// GET /functions/v1/csv-feed?feed=calendar|news|archive|results
//
// Proč: web ČSV neposílá CORS hlavičky a při 20 000 uživatelích by
// přímé dotazy zbytečně zatěžovaly jejich server. Funkce drží odpověď
// v paměti a CDN ji cachuje 15 minut.

const FEEDS: Record<string, string> = {
  calendar: 'https://www.vzpirani.cz/kalendar?action=atom',
  news: 'https://www.vzpirani.cz/aktuality?action=atom',
  archive: 'https://www.vzpirani.cz/kalendar?action=archives',
  results: `https://www.vzpirani.cz/rok-${new Date().getFullYear()}?action=atom`,
};

const TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; body: string }>();

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
};

async function fetchWithRetry(url: string, tries = 3): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Zvedej-App/1.0 (+feed reader)' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const feed = new URL(req.url).searchParams.get('feed') ?? 'news';
  const url = FEEDS[feed];
  if (!url) return new Response('Unknown feed', { status: 400, headers: cors });

  const hit = cache.get(feed);
  const fresh = hit && Date.now() - hit.at < TTL_MS;
  let body = hit?.body;

  if (!fresh) {
    try {
      body = await fetchWithRetry(url);
      cache.set(feed, { at: Date.now(), body });
    } catch (e) {
      // když web ČSV neodpovídá, vrátíme poslední známou verzi
      if (!body) return new Response(`Upstream error: ${e}`, { status: 502, headers: cors });
    }
  }

  return new Response(body, {
    headers: {
      ...cors,
      'content-type': feed === 'archive' ? 'text/html; charset=utf-8' : 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  });
});
