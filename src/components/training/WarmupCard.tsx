import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { copyRoutine, routineExercises } from '../../lib/training';
import { FONTS } from '../../lib/theme';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, IconButton, Row, T } from '../ui';
import { RoutinePickSheet, routineItemLabel } from './RoutineSheet';

/** V tréninku: rozcvička k odškrtání a tlačítka pro přidání rozcvičky / doplňků. */
export function WarmupCard() {
  const { t, settings, colors, tap } = useSettings();
  const training = useTraining();
  const w = training.active?.warmup ?? null;
  const [pick, setPick] = useState<'warmup' | 'accessory' | null>(null);
  const [open, setOpen] = useState(true);
  if (!training.active) return null;
  const done = new Set(w?.done ?? []);
  const all = w ? w.items.length > 0 && w.items.every((i) => done.has(i.id)) : false;

  return (
    <View style={{ gap: 10 }}>
      {w ? (
        <View
          style={{
            backgroundColor: all ? colors.primarySoft : colors.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            gap: 8,
          }}
        >
          <Row gap={8}>
            <Ionicons name={all ? 'checkmark-circle' : 'body-outline'} size={20} color={all ? colors.success : colors.primary} />
            <Pressable style={{ flex: 1 }} onPress={() => setOpen((o) => !o)}>
              <T style={{ fontFamily: FONTS.bold, fontSize: 16 }}>{t('rt.warmup')}</T>
              <T v="caption" muted>
                {w.name} · {done.size}/{w.items.length}
              </T>
            </Pressable>
            <IconButton name={open ? 'chevron-up' : 'chevron-down'} size={20} onPress={() => setOpen((o) => !o)} />
            <IconButton
              name="close"
              size={20}
              color={colors.textMuted}
              label={t('rt.removeWarmup')}
              onPress={() => training.updateActive((a) => ({ ...a, warmup: null }))}
            />
          </Row>
          {open &&
            w.items.map((it) => {
              const on = done.has(it.id);
              return (
                <Pressable
                  key={it.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    tap(on ? 'light' : 'success');
                    training.updateActive((a) =>
                      a.warmup
                        ? {
                            ...a,
                            warmup: {
                              ...a.warmup,
                              done: on ? a.warmup.done.filter((x) => x !== it.id) : [...a.warmup.done, it.id],
                            },
                          }
                        : a,
                    );
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
                >
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.success : colors.textMuted} />
                  <T style={{ flex: 1, textDecorationLine: on ? 'line-through' : 'none', opacity: on ? 0.6 : 1 }}>
                    {routineItemLabel(it, settings.lang, training.data.customExercises)}
                  </T>
                </Pressable>
              );
            })}
        </View>
      ) : null}
      <Row gap={8}>
        {!w && (
          <Button
            small
            kind="secondary"
            icon="body-outline"
            title={t('rt.addWarmup')}
            onPress={() => setPick('warmup')}
            style={{ flex: 1 }}
          />
        )}
        <Button
          small
          kind="secondary"
          icon="add-circle-outline"
          title={t('rt.addAccessory')}
          onPress={() => setPick('accessory')}
          style={{ flex: 1 }}
        />
      </Row>
      <RoutinePickSheet
        kind={pick ?? 'warmup'}
        visible={pick !== null}
        onClose={() => setPick(null)}
        onPick={(r) => {
          const c = copyRoutine(r);
          if (pick === 'warmup') {
            training.updateActive((a) => ({ ...a, warmup: { name: c.name, items: c.items, done: [] } }));
          } else {
            training.updateActive((a) => ({ ...a, exercises: [...a.exercises, ...routineExercises(c)] }));
          }
          setPick(null);
        }}
      />
    </View>
  );
}
