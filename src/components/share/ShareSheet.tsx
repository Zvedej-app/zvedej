import React, { useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { toast } from '../../lib/dialog';
import { plural } from '../../lib/i18n';
import { shareViewAsImage } from '../../lib/shareImage';
import type { WorkoutLog } from '../../lib/types';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { Button, Chip, Row, Sheet, T } from '../ui';
import { CARD_RATIO, ShareCard, type CardRef, type ShareRecord } from './ShareCard';

/** Panel se sdílecí kartou: náhled, volba Trénink / Rekord a tlačítko Sdílet. */
export function ShareSheet({
  visible,
  onClose,
  log,
  records,
  streak,
  customExercises,
}: {
  visible: boolean;
  onClose: () => void;
  log: WorkoutLog | null;
  records: ShareRecord[];
  streak: number;
  customExercises?: { id: string; name: string }[];
}) {
  const { t, settings, locale } = useSettings();
  const { profile, session } = useAuth();
  const { width: winW, height: winH } = useWindowDimensions();
  const [pick, setPick] = useState<number>(records.length ? 0 : -1);
  const [busy, setBusy] = useState(false);
  const card = useRef<CardRef>(null);
  if (!log) return null;

  // náhled se vejde na výšku panelu i na šířku displeje
  const width = Math.min(winW - 64, (winH * 0.6) / CARD_RATIO, 340);
  const record = pick >= 0 ? (records[pick] ?? null) : null;
  const name = session?.isAnonymous ? null : profile ? `${profile.firstName} ${profile.lastName}`.trim() : null;

  const share = async () => {
    setBusy(true);
    try {
      await shareViewAsImage(card.current, {
        width: 1080,
        height: 1920,
        title: t('share.title'),
        fileName: `zvedej-${record ? 'rekord' : 'trenink'}-${log.date}.png`,
      });
    } catch {
      toast(t('share.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('share.title')}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
        {records.length > 0 && (
          <Row gap={8} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip label={t('share.workout')} icon="barbell-outline" on={pick < 0} onPress={() => setPick(-1)} />
            {records.map((r, i) => (
              <Chip
                key={r.exerciseId}
                icon="trophy-outline"
                label={exerciseName(r.exerciseId, settings.lang, customExercises, r.customName)}
                on={pick === i}
                onPress={() => setPick(i)}
              />
            ))}
          </Row>
        )}
        <View style={{ borderRadius: 18, overflow: 'hidden' }}>
          <ShareCard
            ref={card}
            width={width}
            lang={settings.lang}
            locale={locale}
            name={name}
            log={log}
            streak={streak}
            record={record}
            customExercises={customExercises}
            labels={{
              workoutDone: t('share.workoutDone'),
              record: t('share.record'),
              sets: t('tr.set'),
              tonnage: t('tr.tonnage'),
              minutes: t('cel.minutes'),
              weeksInRow: `${plural(settings.lang, 'week', streak)} ${t('cel.inRow')}`,
              previous: t('share.previous'),
              more: t('share.more'),
              tagline: t('share.tagline'),
            }}
          />
        </View>
        <T v="small" muted style={{ textAlign: 'center' }}>
          {t('share.hint')}
        </T>
        <Button icon="share-outline" title={t('share.button')} onPress={share} loading={busy} style={{ alignSelf: 'stretch' }} />
      </ScrollView>
    </Sheet>
  );
}
