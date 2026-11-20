import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CSV_FEEDS, HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { parseCalendar, parseNews } from '../rss';
import type { FeedItem } from '../types';
import { CALENDAR_SNAPSHOT, NEWS_SNAPSHOT } from '../../data/feedSnapshot';

const CACHE_KEY = (k: string) => `zvedej:feed:${k}`;
const MAX_AGE = 15 * 60 * 1000;

async function fetchXml(kind: 'calendar' | 'news') {
  const urls: { url: string; headers?: Record<string, string> }[] = [];
  if (HAS_BACKEND) {
    urls.push({
      url: `${SUPABASE_URL}/functions/v1/csv-feed?feed=${kind}`,
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
  }
  // Nativní aplikace nemá omezení CORS, může číst web ČSV napřímo.
  if (Platform.OS !== 'web' || !HAS_BACKEND) urls.push({ url: CSV_FEEDS[kind] });

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
        if (!text.includes('<item>')) throw new Error('Invalid feed');
        return text;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr ?? new Error('feed unavailable');
}

export interface FeedResult {
  items: FeedItem[];
  stale: boolean;
}

export async function fetchFeedCached(kind: 'calendar' | 'news', force = false): Promise<FeedResult> {
  let cached: { at: number; items: FeedItem[] } | null = null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(kind));
    if (raw) cached = JSON.parse(raw);
  } catch {}

  if (!force && cached && Date.now() - cached.at < MAX_AGE) return { items: cached.items, stale: false };

  try {
    const xml = await fetchXml(kind);
    const items = kind === 'calendar' ? parseCalendar(xml) : parseNews(xml);
    AsyncStorage.setItem(CACHE_KEY(kind), JSON.stringify({ at: Date.now(), items })).catch(() => {});
    return { items, stale: false };
  } catch {
    if (cached) return { items: cached.items, stale: true };
    return { items: kind === 'calendar' ? CALENDAR_SNAPSHOT : NEWS_SNAPSHOT, stale: true };
  }
}

export async function clearFeedCache() {
  await AsyncStorage.multiRemove([CACHE_KEY('calendar'), CACHE_KEY('news')]);
}
