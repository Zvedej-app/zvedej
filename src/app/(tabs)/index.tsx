import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { CalendarList, NewsList } from '../../components/csv/FeedLists';
import { ClubBadge } from '../../components/ClubBadge';
import { LionLogo } from '../../components/Logo';
import { Avatar, IconButton, ListItem, Loading, Row, Screen, SearchBar, Segmented, T } from '../../components/ui';
import { useDebounced } from '../../hooks/useDebounced';
import { api } from '../../lib/api';
import { clubName, searchClubs } from '../../lib/clubs';
import { formatCategory } from '../../lib/categories';
import type { Profile } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';

type Tab = 'calendar' | 'news';

export default function CsvScreen() {
  const { t } = useSettings();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('calendar');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const pager = useRef<ScrollViewInstance>(null);

  const goTo = (k: Tab) => {
    setTab(k);
    pager.current?.scrollTo({ x: k === 'calendar' ? 0 : width, animated: true });
  };

  const onPage = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setTab(i === 0 ? 'calendar' : 'news');
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 4 }}>
        <LionLogo height={64} />
      </View>
      <Row style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <SearchBar value={q} onChangeText={setQ} placeholder={t('csv.searchPlaceholder')} onFocus={() => setSearching(true)} />
        </View>
        {searching && (
          <IconButton
            name="close"
            label={t('common.close')}
            onPress={() => {
              setQ('');
              setSearching(false);
              Keyboard.dismiss();
            }}
          />
        )}
      </Row>

      {searching ? (
        <SearchResults q={q} />
      ) : (
        <>
          <View style={{ paddingHorizontal: 16 }}>
            <Segmented
              value={tab}
              onChange={goTo}
              options={[
                { key: 'calendar', label: t('csv.calendar'), icon: 'calendar-outline' },
                { key: 'news', label: t('csv.news'), icon: 'newspaper-outline' },
              ]}
            />
          </View>
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onPage}
            style={{ flex: 1 }}
          >
            <CalendarList width={width} />
            <NewsList width={width} />
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

function SearchResults({ q }: { q: string }) {
  const { t, colors } = useSettings();
  const dq = useDebounced(q, 300);
  const [result, setResult] = useState<{ q: string; list: Profile[] } | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [filter, setFilter] = useState<'lifters' | 'clubs'>('lifters');

  useEffect(() => {
    api
      .clubMemberCounts()
      .then(setCounts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .searchProfiles(dq)
      .then((list) => alive && setResult({ q: dq, list }))
      .catch(() => alive && setResult({ q: dq, list: [] }));
    return () => {
      alive = false;
    };
  }, [dq]);

  const clubs = searchClubs(dq);
  const people = result && result.q === dq ? result.list : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'lifters', label: `${t('csv.lifters')}${people ? ` (${people.length})` : ''}`, icon: 'person-outline' },
            { key: 'clubs', label: `${t('csv.clubs')} (${clubs.length})`, icon: 'people-outline' },
          ]}
        />
      </View>
      {filter === 'lifters' ? (
        people === null ? (
          <Loading />
        ) : (
          <FlatList
            data={people}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <T muted style={{ textAlign: 'center', padding: 24 }}>
                {t('csv.noResults')}
              </T>
            }
            renderItem={({ item }) => (
              <ListItem
                title={`${item.firstName} ${item.lastName}`}
                subtitle={[clubName(item.clubId), item.weightCategory ? formatCategory(item.weightCategory) : null]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => router.push(`/user/${item.id}`)}
                right={<Avatar uri={item.avatarUrl} name={`${item.firstName} ${item.lastName}`} size={40} />}
              />
            )}
          />
        )
      ) : (
        <FlatList
          data={clubs}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <ListItem
              left={<ClubBadge club={item} size={34} />}
              title={item.name}
              subtitle={`${item.city} · ${t(item.region === 'cechy' ? 'csv.region.cechy' : 'csv.region.morava')}`}
              value={counts[item.id] ? `${counts[item.id]}` : undefined}
              right={counts[item.id] ? <Ionicons name="person" size={14} color={colors.textMuted} /> : undefined}
              onPress={() => router.push(`/club/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
