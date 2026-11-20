import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutEditor } from '../components/training/WorkoutEditor';
import { WeightSheet } from '../components/training/ToolsView';
import { Button, Empty, Field, Header, IconButton, ListItem, Row, Screen, Sheet, T } from '../components/ui';
import { range, Wheel } from '../components/WheelPicker';
import { confirm, notify } from '../lib/dialog';
import { formatWeight } from '../lib/units';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

const RPE = range(1, 10, 0.5);

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;

export default function WorkoutScreen() {
  const { t, colors, settings, tap } = useSettings();
  const { profile } = useAuth();
  const training = useTraining();
  const { active } = training;
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [notes, setNotes] = useState('');
  const [rpe, setRpe] = useState(7);
  const [bw, setBw] = useState<number | null>(profile?.bodyweight ?? null);
  const [bwSheet, setBwSheet] = useState(false);

  const restLeft = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0;
  useEffect(() => {
    if (!restUntil) return;
    const id = setTimeout(
      () => {
        setRestUntil(null);
        tap('success');
      },
      Math.max(0, restUntil - Date.now()),
    );
    return () => clearTimeout(id);
  }, [restUntil, tap]);

  if (!active) {
    return (
      <Screen>
        <Header left={<IconButton name="chevron-back" onPress={() => router.back()} />} title={t('tab.training')} />
        <Empty icon="barbell-outline" text={t('tr.noLogs')} />
      </Screen>
    );
  }

  const elapsed = Math.floor((now - new Date(active.startedAt).getTime()) / 1000);

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-down" onPress={() => router.back()} label={t('common.back')} />}
        center={
          <View style={{ alignItems: 'center' }}>
            <T v="h3" numberOfLines={1}>
              {active.title}
            </T>
            <T v="caption" muted style={{ fontVariant: ['tabular-nums'] }}>
              {mmss(elapsed)}
            </T>
          </View>
        }
        right={<Button small title={t('common.done')} onPress={() => setFinishing(true)} />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }}>
        <WorkoutEditor
          exercises={active.exercises}
          onChange={(exercises) => training.updateActive((w) => ({ ...w, exercises }))}
          onSetDone={() => settings.restSec > 0 && setRestUntil(Date.now() + settings.restSec * 1000)}
        />
        <Button
          kind="ghost"
          icon="trash-outline"
          title={t('tr.discard')}
          onPress={async () => {
            if (
              !(await confirm(t('common.confirmDelete'), {
                ok: t('common.delete'),
                cancel: t('common.cancel'),
                destructive: true,
              }))
            )
              return;
            training.discardWorkout();
            router.back();
          }}
        />
      </ScrollView>

      {restUntil && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12 }}>
          <Row style={{ backgroundColor: colors.primary, borderRadius: 18, padding: 12, justifyContent: 'space-between' }}>
            <View>
              <T v="caption" color="rgba(255,255,255,0.8)">
                {t('tr.rest')}
              </T>
              <T v="h2" color="#FFF" style={{ fontVariant: ['tabular-nums'] }}>
                {mmss(restLeft)}
              </T>
            </View>
            <Row>
              <Button small kind="secondary" title="−30 s" onPress={() => setRestUntil((r) => (r ? r - 30000 : r))} />
              <Button small kind="secondary" title="+30 s" onPress={() => setRestUntil((r) => (r ? r + 30000 : r))} />
              <IconButton name="close" color="#FFF" onPress={() => setRestUntil(null)} />
            </Row>
          </Row>
        </View>
      )}

      <Sheet visible={finishing} onClose={() => setFinishing(false)} title={t('tr.finish')}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Field label={t('tr.workoutNotes')} value={notes} onChangeText={setNotes} multiline />
          <Row style={{ justifyContent: 'space-around' }}>
            <Wheel
              label={t('tr.rpe')}
              values={RPE}
              value={rpe}
              onChange={setRpe}
              width={140}
              format={(v) => String(v).replace('.', ',')}
            />
          </Row>
          <ListItem
            icon="scale-outline"
            title={t('tr.bodyweight')}
            value={bw ? formatWeight(bw, settings.unit) : '—'}
            onPress={() => setBwSheet(true)}
          />
          <Button
            icon="checkmark-circle-outline"
            title={t('tr.finish')}
            onPress={() => {
              training.finishWorkout({ notes: notes.trim() || undefined, rpe, bodyweight: bw });
              setFinishing(false);
              notify(t('tr.finished'));
              router.back();
            }}
          />
        </ScrollView>
        <WeightSheet
          visible={bwSheet}
          title={t('tr.bodyweight')}
          kg={bw ?? 80}
          min={30}
          onClose={() => setBwSheet(false)}
          onSave={setBw}
          onClear={() => setBw(null)}
        />
      </Sheet>
    </Screen>
  );
}
