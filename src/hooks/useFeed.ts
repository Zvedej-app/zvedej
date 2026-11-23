import { useCallback, useEffect, useState } from 'react';
import { fetchFeedCached, fetchResultsCached } from '../lib/api/feeds';

function useLoader<T>(fetcher: (force: boolean) => Promise<{ items: T[]; stale: boolean }>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);

  const load = useCallback(
    async (force = false) => {
      try {
        const r = await fetcher(force);
        setItems(r.items);
        setStale(r.stale);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetcher],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    items,
    loading,
    stale,
    refreshing,
    refresh: () => {
      setRefreshing(true);
      load(true);
    },
  };
}

const calendar = (force: boolean) => fetchFeedCached('calendar', force);
const news = (force: boolean) => fetchFeedCached('news', force);

export function useFeed(kind: 'calendar' | 'news') {
  return useLoader(kind === 'calendar' ? calendar : news);
}

export function useResults() {
  return useLoader(fetchResultsCached);
}
