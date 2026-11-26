import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ExercisePicker } from '../components/training/ExercisePicker';
import { routineItemLabel } from '../components/training/RoutineSheet';
import { Button, Empty, Field, Header, IconButton, PressScale, Row, Screen, SectionTitle, Sheet, T } from '../components/ui';
import { exerciseName } from '../data/exercises';
import { ROUTINE_PRESETS, routineFromPreset } from '../data/routines';
import { confirm } from '../lib/dialog';
import { uid } from '../lib/id';
import { FONTS } from '../lib/theme';
import type { Routine, RoutineItem } from '../lib/types';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

/** Nástroje → Rozcvičky a doplňky: vlastní seznamy, které jde vložit do tréninku nebo do dne plánu. */
export default function RoutinesScreen() {
  const { t, settings, colors } = useSettings();
  const training = useTraining();
  const [edit, setEdit] = useState<Routine | null>(null);
  const mine = training.data.routines ?? [];

  const section = (kind: Routine['kind']) => {
    const list = mine.filter((r) => r.kind === kind).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
    const presets = ROUTINE_PRESETS.filter((p) => p.kind === kind && !mine.some((r) => r.name === p.build(settings.lang).name));
    return (
      <View style={{ gap: 10 }}>
        <SectionTitle>{kind === 'warmup' ? t('rt.warmups') : t('rt.accessories')}</SectionTitle>
        {list.map((r) => (
          <PressScale
            key={r.id}
            onPress={() => setEdit(r)}
            scaleTo={0.98}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              gap: 4,
            }}
          >
            <Row gap={8}>
              <T style={{ flex: 1, fontFamily: FONTS.bold }}>{r.name}</T>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Row>
            <T v="small" muted numberOfLines={2}>
              {r.items.map((it) => routineItemLabel(it, settings.lang, training.data.customExercises)).join(', ')}
            </T>
          </PressScale>
        ))}
        {!list.length && (
          <T v="small" muted>
            {kind === 'warmup' ? t('rt.emptyWarmup') : t('rt.emptyAccessory')}
          </T>
        )}
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Button
            small
            icon="add"
            title={kind === 'warmup' ? t('rt.newWarmup') : t('rt.newAccessory')}
            onPress={() => setEdit({ id: uid('rt'), kind, name: '', items: [], updatedAt: new Date().toISOString() })}
          />
          {presets.map((p) => (
            <Button
              key={p.id}
              small
              kind="secondary"
              icon="copy-outline"
              title={p.build(settings.lang).name}
              onPress={() => training.saveRoutine(routineFromPreset(p, settings.lang))}
            />
          ))}
        </Row>
      </View>
    );
  };

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('rt.title')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 48 }}>
        <T muted>{t('rt.intro')}</T>
        {section('warmup')}
        {section('accessory')}
      </ScrollView>
      {edit && <Editor key={edit.id} initial={edit} onClose={() => setEdit(null)} />}
    </Screen>
  );
}

function Editor({ initial, onClose }: { initial: Routine; onClose: () => void }) {
  const { t, settings, colors } = useSettings();
  const training = useTraining();
  const [r, setR] = useState<Routine>(initial);
  const [picker, setPicker] = useState(false);
  const [text, setText] = useState('');
  const exists = (training.data.routines ?? []).some((x) => x.id === r.id);
  const patch = (id: string, p: Partial<RoutineItem>) =>
    setR({ ...r, items: r.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const addText = () => {
    if (!text.trim()) return;
    setR({ ...r, items: [...r.items, { id: uid('ri'), text: text.trim(), sets: 1, reps: 1 }] });
    setText('');
  };

  return (
    <Sheet visible onClose={onClose} title={r.kind === 'warmup' ? t('rt.warmup') : t('rt.accessory')} full>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label={t('rt.name')}
          value={r.name}
          onChangeText={(name) => setR({ ...r, name })}
          placeholder={r.kind === 'warmup' ? t('rt.namePhWarmup') : t('rt.namePhAccessory')}
        />
        {r.items.length === 0 && <Empty icon="list-outline" text={t('rt.noItems')} />}
        {r.items.map((it, idx) => (
          <View key={it.id} style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 8 }}>
            <Row gap={8}>
              <T style={{ flex: 1, fontFamily: FONTS.semi }}>
                {it.exerciseId ? exerciseName(it.exerciseId, settings.lang, training.data.customExercises) : it.text}
              </T>
              {idx > 0 && (
                <IconButton
                  name="arrow-up"
                  size={18}
                  color={colors.textMuted}
                  onPress={() => {
                    const items = [...r.items];
                    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                    setR({ ...r, items });
                  }}
                />
              )}
              <IconButton
                name="trash-outline"
                size={18}
                color={colors.textMuted}
                onPress={() => setR({ ...r, items: r.items.filter((x) => x.id !== it.id) })}
              />
            </Row>
            <Row gap={10}>
              <Stepper label={t('rt.sets')} value={it.sets} onChange={(sets) => patch(it.id, { sets })} max={10} />
              <Stepper label={t('rt.reps')} value={it.reps} onChange={(reps) => patch(it.id, { reps })} max={50} />
              {it.exerciseId ? (
                <Field
                  style={{ width: 76 }}
                  inputStyle={{ textAlign: 'center', paddingHorizontal: 6 }}
                  keyboardType="decimal-pad"
                  placeholder="kg"
                  value={it.kg ? String(it.kg).replace('.', ',') : ''}
                  onChangeText={(v) => {
                    const n = Number(v.replace(',', '.'));
                    patch(it.id, { kg: v.trim() && Number.isFinite(n) ? n : null });
                  }}
                />
              ) : null}
            </Row>
          </View>
        ))}
        <Button kind="secondary" icon="barbell-outline" title={t('tr.addExercise')} onPress={() => setPicker(true)} />
        <Row gap={8}>
          <Field
            style={{ flex: 1 }}
            value={text}
            onChangeText={setText}
            placeholder={t('rt.textPh')}
            onSubmitEditing={addText}
            returnKeyType="done"
          />
          <Button small icon="add" title={t('common.add')} onPress={addText} disabled={!text.trim()} />
        </Row>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, gap: 8, paddingTop: 8 }}>
        <Button
          icon="checkmark"
          title={t('common.save')}
          disabled={!r.name.trim() || r.items.length === 0}
          onPress={() => {
            training.saveRoutine({ ...r, name: r.name.trim() });
            onClose();
          }}
        />
        {exists && (
          <Button
            kind="ghost"
            icon="trash-outline"
            title={t('common.delete')}
            onPress={async () => {
              if (
                !(await confirm(t('common.confirmDelete'), {
                  ok: t('common.delete'),
                  cancel: t('common.cancel'),
                  destructive: true,
                }))
              )
                return;
              training.deleteRoutine(r.id);
              onClose();
            }}
          />
        )}
      </View>
      <ExercisePicker
        visible={picker}
        onClose={() => setPicker(false)}
        onPick={(exerciseId) => {
          setR({
            ...r,
            items: [...r.items, { id: uid('ri'), exerciseId, sets: 3, reps: r.kind === 'warmup' ? 5 : 10, kg: null }],
          });
          setPicker(false);
        }}
      />
    </Sheet>
  );
}

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max: number }) {
  const { colors } = useSettings();
  const btn = (icon: 'remove' | 'add', next: number) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => onChange(Math.min(max, Math.max(1, next)))}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
    </Pressable>
  );
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <T v="caption" muted>
        {label}
      </T>
      <Row gap={6}>
        {btn('remove', value - 1)}
        <T style={{ minWidth: 22, textAlign: 'center', fontFamily: FONTS.bold }}>{value}</T>
        {btn('add', value + 1)}
      </Row>
    </View>
  );
}
