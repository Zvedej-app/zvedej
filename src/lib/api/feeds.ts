import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CSV_FEEDS, HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL, type FeedKind } from '../config';
import { parseArchiveHtml, parseCalendar, parseNews, parseResults } from '../rss';
import type { FeedItem, ResultItem } from '../types';
import { CALENDAR_SNAPSHOT, NEWS_SNAPSHOT, RESULTS_SNAPSHOT } from '../../data/feedSnapshot';

const CACHE_KEY = (k: string) => `zvedej:feed2:${k}`;
const MAX_AGE = 15 * 60 * 1000;

async function fetchText(kind: FeedKind): Promise<string> {
  const urls: { url: string; headers?: Record<string, string> }[] = [];
  if (HAS_BACKEND) {
    urls.push({
      url: `${SUPABASE_URL}/functions/v1/csv-feed?feed=${kind}`,
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
  }
  // Nativní aplikace nemá omezení CORS, může číst web ČSV napřímo.
  if (Platform.OS !== 'web') urls.push({ url: CSV_FEEDS[kind] });

  let lastErr: unknown = null;
  for (const u of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000);
        const r = await fetch(u.url, { headers: u.headers, signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (text.length < 200) throw new Error('Invalid feed');
        return text;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr ?? new Error('feed unavailable');
}

export interface FeedResult<T = FeedItem> {
  items: T[];
  /** true = zobrazuje se uložený snímek, živá data se nepodařilo načíst */
  stale: boolean;
}

async function cached<T>(key: string, force: boolean, load: () => Promise<T[]>, snapshot: T[]): Promise<FeedResult<T>> {
  let hit: { at: number; items: T[] } | null = null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(key));
    if (raw) hit = JSON.parse(raw);
  } catch {}
  if (!force && hit && Date.now() - hit.at < MAX_AGE) return { items: hit.items, stale: false };
  try {
    const items = await load();
    AsyncStorage.setItem(CACHE_KEY(key), JSON.stringify({ at: Date.now(), items })).catch(() => {});
    return { items, stale: false };
  } catch {
    if (hit) return { items: hit.items, stale: true };
    return { items: snapshot, stale: true };
  }
}

function mergeEvents(...lists: FeedItem[][]) {
  const byId = new Map<string, FeedItem>();
  for (const l of lists) for (const e of l) byId.set(e.id, e); // pozdější seznam (živý) přepíše starší
  return [...byId.values()];
}

const FROM = `${new Date().getFullYear()}-01-01`;

export function fetchFeedCached(kind: 'calendar' | 'news', force = false): Promise<FeedResult> {
  if (kind === 'news') {
    return cached('news', force, async () => parseNews(await fetchText('news')), NEWS_SNAPSHOT);
  }
  return cached(
    'calendar',
    force,
    async () => {
      const upcoming = parseCalendar(await fetchText('calendar'));
      // proběhlé závody: uložený snímek doplněný o nejnovější archiv (pokud jde stáhnout)
      let archive: FeedItem[] = [];
      try {
        archive = parseArchiveHtml(await fetchText('archive'));
      } catch {}
      return mergeEvents(CALENDAR_SNAPSHOT, archive, upcoming)
        .filter((e) => (e.endDate ?? e.date ?? '') >= FROM)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    },
    CALENDAR_SNAPSHOT,
  );
}

export function fetchResultsCached(force = false): Promise<FeedResult<ResultItem>> {
  return cached('results', force, async () => parseResults(await fetchText('results')), RESULTS_SNAPSHOT);
}

export async function clearFeedCache() {
  await AsyncStorage.multiRemove(['calendar', 'news', 'results'].map(CACHE_KEY));
}
