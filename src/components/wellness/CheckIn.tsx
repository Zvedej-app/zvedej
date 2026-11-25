import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { TKey } from '../../lib/i18n';
import { FONTS, radius } from '../../lib/theme';
import type { WellnessEntry } from '../../lib/types';
import { formatNumber } from '../../lib/units';
import { PAIN_AREAS } from '../../lib/wellness';
import { useSettings } from '../../providers/SettingsProvider';
import { Button, Chip, Field, Row, T } from '../ui';

const FACES = ['😫', '😕', '😐', '🙂', '😄'];
const SCALES = ['sleep', 'energy', 'soreness', 'mood'] as const;
type Scale = (typeof SCALES)[number];

/** Denní záznam regenerace: čtyři řádky po pěti emoji, hodiny spánku, volitelně bolest a poznámka. */
export function CheckIn({
  initial,
  date,
  onSave,
  compact,
}: {
  initial: WellnessEntry | null;
  date: string;
  onSave: (e: WellnessEntry) => void;
  /** na obrazovce Dnes: bez poznámky, bolest až po rozbalení */
  compact?: boolean;
}) {
  const { t, colors } = useSettings();
  const [vals, setVals] = useState<Record<Scale, number>>({
    sleep: initial?.sleep ?? 0,
    energy: initial?.energy ?? 0,
    soreness: initial?.soreness ?? 0,
    mood: initial?.mood ?? 0,
  });
  const [hours, setHours] = useState<number>(initial?.sleepHours ?? 7.5);
  const [painOn, setPainOn] = useState(!!initial?.pain);
  const [area, setArea] = useState<string>(initial?.pain?.area ?? 'back');
  const [level, setLevel] = useState<number>(initial?.pain?.level ?? 3);
  const [note, setNote] = useState(initial?.note ?? '');
  const complete = SCALES.every((s) => vals[s] > 0);

  return (
    <View style={{ gap: 12 }}>
      {SCALES.map((s) => (
        <View key={s} style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontFamily: FONTS.bold }}>{t(`well.${s}` as TKey)}</T>
            <T v="caption" muted>
              {vals[s] ? t(`well.${s}.${vals[s]}` as TKey) : t(`well.${s}.hint` as TKey)}
            </T>
          </Row>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FACES.map((f, i) => {
              const v = i + 1;
              const on = vals[s] === v;
              return (
                <Pressable
                  key={v}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t(`well.${s}.${v}` as TKey)}
                  onPress={() => setVals((x) => ({ ...x, [s]: v }))}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: on ? colors.primary : colors.border,
                    backgroundColor: on ? colors.primarySoft : colors.surface,
                  }}
                >
                  <T style={{ fontSize: 22, opacity: on || !vals[s] ? 1 : 0.45 }}>{f}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Row style={{ justifyContent: 'space-between' }}>
        <T style={{ fontFamily: FONTS.bold }}>{t('well.hours')}</T>
        <Row gap={6}>
          <Step icon="remove" onPress={() => setHours((h) => Math.max(0, h - 0.5))} />
          <T style={{ fontFamily: FONTS.black, fontSize: 18, minWidth: 64, textAlign: 'center' }}>{formatNumber(hours, 1)} h</T>
          <Step icon="add" onPress={() => setHours((h) => Math.min(14, h + 0.5))} />
        </Row>
      </Row>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: painOn }}
        onPress={() => setPainOn(!painOn)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <Ionicons name={painOn ? 'checkbox' : 'square-outline'} size={22} color={painOn ? colors.accent : colors.textMuted} />
        <T style={{ fontWeight: '600' }}>{t('well.painToggle')}</T>
      </Pressable>
      {painOn && (
        <View style={{ gap: 8, paddingLeft: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PAIN_AREAS.map((a) => (
              <Chip key={a} label={t(`well.area.${a}` as TKey)} on={area === a} onPress={() => setArea(a)} />
            ))}
          </View>
          <T v="caption" muted>
            {t('well.painLevel')}: {level}/10
          </T>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                onPress={() => setLevel(n)}
                accessibilityLabel={`${n}`}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: n <= level ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: n <= level ? colors.accent : colors.border,
                }}
              >
                <T v="caption" color={n <= level ? '#FFF' : colors.textMuted}>
                  {n}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {!compact && <Field label={t('well.note')} value={note} onChangeText={setNote} multiline maxLength={500} />}

      <Button
        icon="checkmark"
        title={complete ? t('well.save') : t('well.fillAll')}
        disabled={!complete}
        onPress={() =>
          onSave({
            date,
            sleepHours: hours,
            sleep: vals.sleep,
            energy: vals.energy,
            soreness: vals.soreness,
            mood: vals.mood,
            pain: painOn ? { area, level } : null,
            note: note.trim() || undefined,
            updatedAt: new Date().toISOString(),
          })
        }
      />
    </View>
  );
}

function Step({ icon, onPress }: { icon: 'add' | 'remove'; onPress: () => void }) {
  const { colors } = useSettings();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
    </Pressable>
  );
}
