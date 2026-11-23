// Stáhne kalendář (včetně archivu proběhlých závodů od 1. 1. letošního roku), novinky a výsledky
// z webu vzpirani.cz a uloží je jako záložní snímek do src/data/feedSnapshot.ts.
// Použití: npm run update:feeds
import { writeFileSync } from 'node:fs';
import { parseArchiveHtml, parseCalendar, parseNews, parseResults } from '../src/lib/rss.ts';

const BASE = 'https://www.vzpirani.cz';
const YEAR = new Date().getFullYear();

async function get(path: string) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(BASE + path, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!r.ok) throw new Error(String(r.status));
      return await r.text();
    } catch (e) {
      if (i === 5) throw new Error(`${path}: ${e}`);
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  return '';
}

const upcoming = parseCalendar(await get('/kalendar?action=atom'));
const past = [];
for (let page = 1; page <= 12; page++) {
  const html = await get(`/kalendar?${page > 1 ? `paginator-page=${page}&` : ''}action=archives`);
  const list = parseArchiveHtml(html);
  if (!list.length) break;
  past.push(...list);
  if (list.every((e) => (e.date ?? '9999') < `${YEAR}-01-01`)) break;
}

const byId = new Map<string, (typeof past)[number]>();
for (const e of [...past, ...upcoming]) if (!byId.has(e.id)) byId.set(e.id, e);
const calendar = [...byId.values()]
  .filter((e) => (e.endDate ?? e.date ?? '') >= `${YEAR}-01-01`)
  .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

const news = parseNews(await get('/aktuality?action=atom')).slice(0, 12);
const results = parseResults(await get(`/rok-${YEAR}?action=atom`));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  'src/data/feedSnapshot.ts',
  `// Záložní snímek dat z vzpirani.cz (${today}) – použije se bez připojení nebo když web svazu neodpoví.\n` +
    `// Aktualizace: npm run update:feeds\nimport type { FeedItem, ResultItem } from '../lib/types';\n\n` +
    `export const SNAPSHOT_AT = '${today}';\n\n` +
    `export const CALENDAR_SNAPSHOT: FeedItem[] = ${JSON.stringify(calendar, null, 1)};\n\n` +
    `export const NEWS_SNAPSHOT: FeedItem[] = ${JSON.stringify(news, null, 1)};\n\n` +
    `export const RESULTS_SNAPSHOT: ResultItem[] = ${JSON.stringify(results, null, 1)};\n`,
);
console.log(`kalendář ${calendar.length} (proběhlé ${calendar.filter((e) => (e.endDate ?? e.date ?? '') < today).length}), novinky ${news.length}, výsledky ${results.length}`);
