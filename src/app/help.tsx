import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Header, IconButton, Row, Screen, SearchBar, T } from '../components/ui';
import { HELP } from '../data/help';
import { FONTS } from '../lib/theme';
import { startTour } from '../lib/tour';
import { useSettings } from '../providers/SettingsProvider';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Nastavení → Návod: kompletní návod k ovládání aplikace + spuštění prohlídky. */
export default function HelpScreen() {
  const { t, colors } = useSettings();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>('start');
  const nq = norm(q.trim());
  const sections = HELP.map((s) => ({
    ...s,
    items: nq ? s.items.filter((i) => norm(`${s.title} ${i.q} ${i.a}`).includes(nq)) : s.items,
  })).filter((s) => s.items.length > 0);

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('help.title')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 16, gap: 10 }}>
          <Row gap={10}>
            <Ionicons name="compass" size={26} color="#FFF" />
            <T v="h3" color="#FFF" style={{ flex: 1 }}>
              {t('help.tourTitle')}
            </T>
          </Row>
          <T v="small" color="rgba(255,255,255,0.85)">
            {t('help.tourText')}
          </T>
          <Button
            icon="play"
            title={t('help.tourStart')}
            kind="secondary"
            onPress={() => {
              router.back();
              setTimeout(() => startTour(1), 400);
            }}
            style={{ backgroundColor: '#FFF' }}
          />
        </View>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('help.search')} />
        {sections.map((s) => {
          const isOpen = !!nq || open === s.id;
          return (
            <View
              key={s.id}
              style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => setOpen(isOpen ? null : s.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={s.icon as React.ComponentProps<typeof Ionicons>['name']} size={19} color={colors.primary} />
                </View>
                <T v="h3" style={{ flex: 1 }}>
                  {s.title}
                </T>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </Pressable>
              {isOpen && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
                  {s.items.map((i) => (
                    <View key={i.q} style={{ gap: 3 }}>
                      <T style={{ fontFamily: FONTS.bold }}>{i.q}</T>
                      <T v="small" muted style={{ lineHeight: 20 }}>
                        {i.a}
                      </T>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {sections.length === 0 && (
          <T muted style={{ textAlign: 'center', padding: 16 }}>
            {t('help.noResults')}
          </T>
        )}
      </ScrollView>
    </Screen>
  );
}
