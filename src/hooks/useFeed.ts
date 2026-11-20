import { useCallback, useEffect, useState } from 'react';
import { fetchFeedCached } from '../lib/api/feeds';
import type { FeedItem } from '../lib/types';

export function useFeed(kind: 'calendar' | 'news') {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);

  const load = useCallback(
    async (force = false) => {
      try {
        const r = await fetchFeedCached(kind, force);
        setItems(r.items);
        setStale(r.stale);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [kind],
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
