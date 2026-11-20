import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFeed } from '../../hooks/useFeed';
import { formatDate, todayISO } from '../../lib/date';
import type { FeedItem } from '../../lib/types';
import { radius } from '../../lib/theme';
import { useSettings } from '../../providers/SettingsProvider';
import { Banner, Card, Chip, Empty, Loading, Row, T } from '../ui';

const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

export function CalendarList({ width }: { width: number }) {
  const { t, colors, locale } = useSettings();
  const feed = useFeed('calendar');
  const [past, setPast] = useState(false);
  const today = todayISO();

  const items = useMemo(() => {
    const list = feed.items.filter((i) => {
      const end = i.endDate ?? i.date ?? '';
      return past ? end < today : end >= today;
    });
    return list.sort((a, b) => (past ? (b.date ?? '').localeCompare(a.date ?? '') : (a.date ?? '').localeCompare(b.date ?? '')));
  }, [feed.items, past, today]);

  return (
    <View style={{ width, flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <Row>
              <Chip label={t('csv.upcoming')} on={!past} onPress={() => setPast(false)} />
              <Chip label={t('csv.past')} on={past} onPress={() => setPast(true)} />
            </Row>
            {feed.stale && !feed.loading && <Banner icon="cloud-offline-outline" text={t('common.offline')} />}
          </View>
        }
        ListEmptyComponent={feed.loading ? <Loading /> : <Empty icon="calendar-outline" text={t('csv.empty')} />}
        ListFooterComponent={
          items.length > 0 ? (
            <T v="caption" muted style={{ textAlign: 'center', marginTop: 8 }}>
              {t('csv.source')}
            </T>
          ) : undefined
        }
        renderItem={({ item }) => <EventCard item={item} locale={locale} />}
      />
    </View>
  );
}

function EventCard({ item, locale }: { item: FeedItem; locale: string }) {
  const { colors, t } = useSettings();
  const d = item.date ? new Date(`${item.date}T12:00:00`) : null;
  const month = d ? new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', '') : '';
  return (
    <Card onPress={() => open(item.link)} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <View style={[styles.dateBox, { backgroundColor: colors.primary }]}>
        <T v="h2" color="#FFF" style={{ lineHeight: 26 }}>
          {d ? d.getDate() : '?'}
        </T>
        <T v="caption" color="rgba(255,255,255,0.9)" style={{ fontWeight: '700', textTransform: 'uppercase' }}>
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
          {item.kind && (
            <View style={[styles.tag, { backgroundColor: colors.primarySoft }]}>
              <T v="caption" color={colors.primaryStrong} style={{ fontWeight: '700' }}>
                {item.kind}
              </T>
            </View>
          )}
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
        ListHeaderComponent={
          feed.stale && !feed.loading ? <Banner icon="cloud-offline-outline" text={t('common.offline')} /> : undefined
        }
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
