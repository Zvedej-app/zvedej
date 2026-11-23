import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useBottomInset } from '../lib/insets';
import { WeightSheet } from '../components/training/ToolsView';
import { WorkoutEditor } from '../components/training/WorkoutEditor';
import { Button, Chip, Empty, Field, Header, IconButton, ListItem, Row, Screen, Sheet, T } from '../components/ui';
import { range, Wheel } from '../components/WheelPicker';
import { exerciseName } from '../data/exercises';
import { confirm, toast } from '../lib/dialog';
import type { TKey } from '../lib/i18n';
import { cancelRestNotification, ensureNotificationPermission, scheduleRestEnd, setupRestNotifications } from '../lib/restNotifications';
import { playRestSound } from '../lib/restSound';
import { radius } from '../lib/theme';
import type { LoggedExercise, WorkoutLog } from '../lib/types';
import { formatWeight } from '../lib/units';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

const RPE = range(1, 10, 0.5);
const FEELINGS = ['easy', 'ok', 'hard', 'bad'] as const;

function useNow(ms: number, enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
  return now;
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;

interface NextSet {
  loggedExId: string;
  exerciseId: string;
  name: string;
  setIndex: number;
  kg: number;
  reps: number;
}

interface Rest {
  until: number;
  total: number;
  next: NextSet | null;
  notifId: string | null;
  over: boolean;
}

function findNext(exs: LoggedExercise[], fromEx: string, fromSet: number, nameOf: (e: LoggedExercise) => string): NextSet | null {
  const exIdx = exs.findIndex((e) => e.id === fromEx);
  const pick = (e: LoggedExercise, i: number): NextSet => ({
    loggedExId: e.id,
    exerciseId: e.exerciseId,
    name: nameOf(e),
    setIndex: i,
    kg: e.sets[i].kg,
    reps: e.sets[i].reps,
  });
  // nejdřív další série stejného cviku, potom první nedokončená série dalších cviků
  const cur = exs[exIdx];
  if (cur) for (let i = fromSet + 1; i < cur.sets.length; i++) if (!cur.sets[i].done) return pick(cur, i);
  for (let k = exIdx + 1; k < exs.length; k++) for (let i = 0; i < exs[k].sets.length; i++) if (!exs[k].sets[i].done) return pick(exs[k], i);
  for (let k = 0; k <= exIdx; k++) for (let i = 0; i < exs[k].sets.length; i++) if (!exs[k].sets[i].done) return pick(exs[k], i);
  return null;
}

export default function WorkoutScreen() {
  const { t, colors, settings, tap } = useSettings();
  const { profile } = useAuth();
  const training = useTraining();
  const { active } = training;
  const bottom = useBottomInset();
  const [rest, setRest] = useState<Rest | null>(null);
  const restRef = useRef<Rest | null>(null);
  useEffect(() => {
    restRef.current = rest;
  }, [rest]);
  const now = useNow(250, !!rest && !rest.over);
  const clock = useNow(1000, true);
  const [finishing, setFinishing] = useState(false);
  const [notes, setNotes] = useState('');
  const [feeling, setFeeling] = useState<WorkoutLog['feeling']>(null);
  const [rpe, setRpe] = useState(7);
  const [bw, setBw] = useState<number | null>(profile?.bodyweight ?? null);
  const [bwSheet, setBwSheet] = useState(false);

  const nameOf = useCallback(
    (e: LoggedExercise) => exerciseName(e.exerciseId, settings.lang, training.data.customExercises, e.customName),
    [settings.lang, training.data.customExercises],
  );

  const stopRest = useCallback(() => {
    const r = restRef.current;
    if (r) cancelRestNotification(r.notifId);
    setRest(null);
  }, []);

  const startRest = useCallback(
    async (ms: number, next: NextSet | null) => {
      const prev = restRef.current;
      if (prev) cancelRestNotification(prev.notifId);
      const until = Date.now() + ms;
      let notifId: string | null = null;
      if (settings.restNotify && next) {
        await setupRestNotifications(t('tr.markDone'));
        if (await ensureNotificationPermission()) {
          notifId = await scheduleRestEnd({
            seconds: ms / 1000,
            title: `${next.name} · ${formatWeight(next.kg, settings.unit)}`,
            body: `${t('tr.restOver')} – ${next.reps}× ${formatWeight(next.kg, settings.unit)}`,
            sound: settings.restSound,
            data: { exerciseId: next.exerciseId, loggedExId: next.loggedExId, setIndex: next.setIndex },
          });
        }
      }
      setRest({ until, total: ms, next, notifId, over: false });
    },
    [settings.restNotify, settings.restSound, settings.unit, t],
  );

  // konec pauzy: zvuk + banner se přepne na „další nástup“
  const restUntil = rest?.until;
  const restOver = rest?.over;
  useEffect(() => {
    if (!restUntil || restOver) return;
    const id = setTimeout(() => {
      tap('success');
      playRestSound(settings.restSound);
      setRest((r) => (r ? { ...r, over: true, notifId: null } : r));
    }, Math.max(0, restUntil - Date.now()));
    return () => clearTimeout(id);
  }, [restUntil, restOver, settings.restSound, tap]);

  // oznámení se nesmí zatoulat po opuštění obrazovky
  useEffect(
    () => () => {
      const r = restRef.current;
      if (r && r.over) cancelRestNotification(r.notifId);
    },
    [],
  );

  const onSetDone = (loggedExId: string, setIndex: number) => {
    if (settings.restSec <= 0 || !active) return;
    const next = findNext(active.exercises, loggedExId, setIndex, nameOf);
    // série zrovna odškrtnutá není ještě v „active“ jako done, ale findNext hledá až další
    if (!next) return stopRest();
    startRest(settings.restSec * 1000, next);
  };

  const checkNext = () => {
    const r = rest;
    if (!r?.next || !active) return setRest(null);
    const n = r.next;
    const exs = active.exercises.map((e) =>
      e.id === n.loggedExId ? { ...e, sets: e.sets.map((s, i) => (i === n.setIndex ? { ...s, done: true } : s)) } : e,
    );
    training.updateActive((w) => ({ ...w, exercises: exs }));
    tap('success');
    const after = findNext(exs, n.loggedExId, n.setIndex, nameOf);
    if (after && settings.restSec > 0) startRest(settings.restSec * 1000, after);
    else setRest(null);
  };

  const shift = (ms: number) => {
    const r = rest;
    if (!r || r.over) return;
    const left = Math.max(1000, r.until - Date.now() + ms);
    startRest(left, r.next).then(() => setRest((x) => (x ? { ...x, total: Math.max(x.total + ms, left) } : x)));
  };

  if (!active) {
    return (
      <Screen>
        <Header left={<IconButton name="chevron-back" onPress={() => router.back()} />} title={t('tab.training')} />
        <Empty icon="barbell-outline" text={t('tr.noLogs')} />
      </Screen>
    );
  }

  const elapsed = Math.floor((clock - new Date(active.startedAt).getTime()) / 1000);
  const left = rest && !rest.over ? Math.max(0, rest.until - now) : 0;
  const frac = rest && !rest.over ? Math.min(1, left / rest.total) : 0;

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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 170, gap: 12 }}>
        <WorkoutEditor
          exercises={active.exercises}
          onChange={(exercises) => training.updateActive((w) => ({ ...w, exercises }))}
          onSetDone={onSetDone}
        />
        <Button
          kind="ghost"
          icon="trash-outline"
          title={t('tr.discard')}
          onPress={async () => {
            if (!(await confirm(t('common.confirmDelete'), { ok: t('common.delete'), cancel: t('common.cancel'), destructive: true }))) return;
            stopRest();
            training.discardWorkout();
            router.back();
          }}
        />
      </ScrollView>

      {rest && (
        <View style={[styles.restWrap, { bottom: bottom + 12 }]}>
          <View style={[styles.rest, { backgroundColor: colors.primary }]}>
            {/* červený pruh: ubíhá zprava doleva, modrá je podklad */}
            {!rest.over && <View style={[styles.restFill, { width: `${frac * 100}%`, backgroundColor: colors.accent }]} />}
            {rest.over ? (
              <Row style={{ padding: 14 }} gap={12}>
                <View style={{ flex: 1 }}>
                  <T v="caption" color="rgba(255,255,255,0.85)">
                    {t('tr.upNext')}
                  </T>
                  <T color="#FFF" style={{ fontSize: 26, fontWeight: '900', lineHeight: 32 }} numberOfLines={2}>
                    {rest.next ? rest.next.name : t('tr.restOver')}
                  </T>
                  {rest.next && (
                    <T color="#FFF" style={{ fontSize: 17, fontWeight: '700' }}>
                      {rest.next.reps} × {formatWeight(rest.next.kg, settings.unit)}
                    </T>
                  )}
                </View>
                {rest.next && (
                  <Pressable accessibilityRole="checkbox" accessibilityLabel={t('tr.markDone')} onPress={checkNext} style={styles.bigCheck}>
                    <Ionicons name="checkmark" size={34} color="#FFF" />
                  </Pressable>
                )}
                <IconButton name="close" color="#FFF" onPress={stopRest} />
              </Row>
            ) : (
              <Row style={{ padding: 14, justifyContent: 'space-between' }} gap={10}>
                <View style={{ flex: 1 }}>
                  <T v="caption" color="rgba(255,255,255,0.9)">
                    {t('tr.rest')}
                  </T>
                  <T color="#FFF" style={{ fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                    {mmss(Math.ceil(left / 1000))}
                  </T>
                  {rest.next && (
                    <T v="small" color="#FFF" numberOfLines={1} style={{ fontWeight: '700' }}>
                      {rest.next.name} · {formatWeight(rest.next.kg, settings.unit)}
                    </T>
                  )}
                </View>
                <View style={{ gap: 6, alignItems: 'flex-end' }}>
                  <Row gap={6}>
                    <Button small kind="secondary" title="−30 s" onPress={() => shift(-30000)} />
                    <Button small kind="secondary" title="+30 s" onPress={() => shift(30000)} />
                  </Row>
                  <IconButton name="close" color="#FFF" onPress={stopRest} />
                </View>
              </Row>
            )}
          </View>
        </View>
      )}

      <Sheet visible={finishing} onClose={() => setFinishing(false)} title={t('tr.finish')}>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          <Field
            label={t('tr.workoutNotes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            inputStyle={{ minHeight: 48, paddingTop: 10, paddingBottom: 10, fontSize: 15 }}
          />
          <T v="label" muted>
            {t('tr.feelingTitle')}
          </T>
          <Row style={{ flexWrap: 'wrap' }} gap={8}>
            {FEELINGS.map((f) => (
              <Chip key={f} label={t(`tr.feeling.${f}` as TKey)} on={feeling === f} onPress={() => setFeeling(feeling === f ? null : f)} />
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-around' }}>
            <Wheel label={t('tr.rpe')} values={RPE} value={rpe} onChange={setRpe} width={140} format={(v) => String(v).replace('.', ',')} />
          </Row>
          <ListItem icon="scale-outline" title={t('tr.bodyweight')} value={bw ? formatWeight(bw, settings.unit) : '—'} onPress={() => setBwSheet(true)} />
          <Button
            icon="checkmark-circle-outline"
            title={t('tr.finish')}
            onPress={() => {
              stopRest();
              training.finishWorkout({ notes: notes.trim() || undefined, rpe, bodyweight: bw, feeling });
              setFinishing(false);
              toast(t('tr.finished'));
              router.back();
            }}
          />
        </ScrollView>
        <WeightSheet visible={bwSheet} title={t('tr.bodyweight')} kg={bw ?? 80} min={30} onClose={() => setBwSheet(false)} onSave={setBw} onClear={() => setBw(null)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  restWrap: { position: 'absolute', left: 12, right: 12 },
  rest: { borderRadius: 20, overflow: 'hidden' },
  restFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  bigCheck: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
