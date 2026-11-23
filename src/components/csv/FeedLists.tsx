import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SNAPSHOT_AT } from '../../data/feedSnapshot';
import { useFeed, useResults } from '../../hooks/useFeed';
import { formatDate, todayISO } from '../../lib/date';
import type { EventCategory, FeedItem, ResultItem } from '../../lib/types';
import { radius } from '../../lib/theme';
import { useTabEnter } from '../../lib/tabReset';
import { useSettings } from '../../providers/SettingsProvider';
import { Banner, Card, Chip, Empty, Loading, Row, T } from '../ui';

const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

function useCategoryStyle() {
  const { colors, t } = useSettings();
  return (c: EventCategory | undefined) => {
    const cat = c ?? 'other';
    return { color: colors[cat], label: t(`csv.cat.${cat}` as const) };
  };
}

function SnapshotBanner() {
  const { t, locale } = useSettings();
  return <Banner icon="information-circle-outline" text={t('csv.snapshot', { date: formatDate(SNAPSHOT_AT, locale) })} />;
}

type View_ = 'upcoming' | 'past' | 'results';

export function CalendarList({ width }: { width: number }) {
  const { t, colors, locale } = useSettings();
  const feed = useFeed('calendar');
  const results = useResults();
  const [view, setView] = useState<View_>('upcoming');
  useTabEnter('index', () => setView('upcoming'));
  const today = todayISO();

  const events = useMemo(() => {
    const past = view === 'past';
    return feed.items
      .filter((i) => {
        const end = i.endDate ?? i.date ?? '';
        return past ? end < today : end >= today;
      })
      .sort((a, b) => (past ? (b.date ?? '').localeCompare(a.date ?? '') : (a.date ?? '').localeCompare(b.date ?? '')));
  }, [feed.items, view, today]);

  const header = (
    <View style={{ gap: 10, marginBottom: 4 }}>
      <Row style={{ flexWrap: 'wrap' }}>
        <Chip label={t('csv.upcoming')} on={view === 'upcoming'} onPress={() => setView('upcoming')} />
        <Chip label={t('csv.past')} on={view === 'past'} onPress={() => setView('past')} />
        <Chip icon="trophy-outline" label={t('csv.results')} on={view === 'results'} onPress={() => setView('results')} />
      </Row>
      {view !== 'results' && <Legend />}
      {view === 'results' && <T v="small" muted>{t('csv.resultsHint')}</T>}
      {(view === 'results' ? results.stale : feed.stale) && !(view === 'results' ? results.loading : feed.loading) && <SnapshotBanner />}
    </View>
  );

  const footer = (
    <T v="caption" muted style={{ textAlign: 'center', marginTop: 8 }}>
      {t('csv.source')}
    </T>
  );

  if (view === 'results') {
    return (
      <View style={{ width, flex: 1 }}>
        <FlatList
          data={results.items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={results.refreshing} onRefresh={results.refresh} tintColor={colors.primary} />}
          ListHeaderComponent={header}
          ListEmptyComponent={results.loading ? <Loading /> : <Empty icon="trophy-outline" text={t('csv.empty')} />}
          ListFooterComponent={results.items.length ? footer : undefined}
          renderItem={({ item }) => <ResultCard item={item} locale={locale} />}
        />
      </View>
    );
  }

  return (
    <View style={{ width, flex: 1 }}>
      <FlatList
        data={events}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} />}
        ListHeaderComponent={header}
        ListEmptyComponent={feed.loading ? <Loading /> : <Empty icon="calendar-outline" text={t('csv.empty')} />}
        ListFooterComponent={events.length ? footer : undefined}
        renderItem={({ item }) => <EventCard item={item} locale={locale} past={view === 'past'} />}
      />
    </View>
  );
}

function Legend() {
  const style = useCategoryStyle();
  return (
    <Row gap={14} style={{ flexWrap: 'wrap' }}>
      {(['mcr', 'liga', 'other'] as EventCategory[]).map((c) => {
        const s = style(c);
        return (
          <Row key={c} gap={6}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
            <T v="caption" muted>
              {s.label}
            </T>
          </Row>
        );
      })}
    </Row>
  );
}

function EventCard({ item, locale, past }: { item: FeedItem; locale: string; past: boolean }) {
  const { colors, t } = useSettings();
  const catStyle = useCategoryStyle()(item.category);
  const d = item.date ? new Date(`${item.date}T12:00:00`) : null;
  const month = d ? new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', '') : '';
  return (
    <Card
      onPress={() => open(item.link)}
      style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: catStyle.color, opacity: past ? 0.92 : 1 }}
    >
      <View style={[styles.dateBox, { backgroundColor: catStyle.color }]}>
        <T v="h2" color="#FFF" style={{ lineHeight: 26 }}>
          {d ? d.getDate() : '?'}
        </T>
        <T v="caption" color="rgba(255,255,255,0.92)" style={{ fontWeight: '700', textTransform: 'uppercase' }}>
          {month}
        </T>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T v="h3" numberOfLines={2}>
          {item.title}
        </T>
        {item.endDate && item.endDate !== item.date && (
          <T v="small" muted>
            {formatDate(item.date, locale)} – {formatDate(item.endDate, locale)}
          </T>
        )}
        {item.place && (
          <Row gap={4}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <T v="small" muted numberOfLines={1} style={{ flex: 1 }}>
              {item.place}
            </T>
          </Row>
        )}
        <Row gap={6}>
          <View style={[styles.tag, { backgroundColor: catStyle.color }]}>
            <T v="caption" color="#FFF" style={{ fontWeight: '700' }}>
              {catStyle.label}
            </T>
          </View>
          {!!item.attachments?.length && (
            <Row gap={3}>
              <Ionicons name="document-attach-outline" size={14} color={colors.primary} />
              <T v="caption" color={colors.primary}>
                {t('csv.attachments')}: {item.attachments.length}
              </T>
            </Row>
          )}
        </Row>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Card>
  );
}

function ResultCard({ item, locale }: { item: ResultItem; locale: string }) {
  const { colors, t } = useSettings();
  const lower = item.title.toLowerCase();
  const cat: EventCategory = lower.includes('mčr') ? 'mcr' : 'liga';
  const color = colors[cat];
  return (
    <Card onPress={() => open(item.link)} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: color }}>
      <View style={[styles.dateBox, { backgroundColor: color }]}>
        <Ionicons name="trophy" size={26} color="#FFF" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="h3" numberOfLines={2}>
          {item.title}
        </T>
        {item.updated ? (
          <T v="small" muted>
            {t('csv.updated', { date: formatDate(item.updated, locale) })}
          </T>
        ) : null}
      </View>
      <Ionicons name="open-outline" size={18} color={colors.textMuted} />
    </Card>
  );
}

export function NewsList({ width }: { width: number }) {
  const { t, colors, locale } = useSettings();
  const feed = useFeed('news');
  return (
    <View style={{ width, flex: 1 }}>
      <FlatList
        data={feed.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} />}
        ListHeaderComponent={feed.stale && !feed.loading ? <SnapshotBanner /> : undefined}
        ListEmptyComponent={feed.loading ? <Loading /> : <Empty icon="newspaper-outline" text={t('csv.empty')} />}
        ListFooterComponent={
          feed.items.length > 0 ? (
            <T v="caption" muted style={{ textAlign: 'center', marginTop: 8 }}>
              {t('csv.source')}
            </T>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Card onPress={() => open(item.link)} style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            {item.image && <Image source={{ uri: item.image }} style={{ width: '100%', height: 170 }} contentFit="cover" />}
            <View style={{ padding: 14, gap: 6 }}>
              <T v="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                {formatDate(item.date, locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              </T>
              <T v="h3">{item.title}</T>
              {item.excerpt && (
                <T v="small" muted numberOfLines={4}>
                  {item.excerpt}
                </T>
              )}
              <Row gap={4}>
                <T v="small" color={colors.primary} style={{ fontWeight: '700' }}>
                  {t('csv.readMore')}
                </T>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </Row>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dateBox: { width: 56, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
});
