import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { CalendarPicker } from '../components/CalendarPicker';
import { Banner, Button, Card, Chip, Field, Header, IconButton, Row, Screen, T } from '../components/ui';
import { exerciseName } from '../data/exercises';
import { addDays, formatDate, toISODate, todayISO } from '../lib/date';
import { notify, toast } from '../lib/dialog';
import type { TKey } from '../lib/i18n';
import { uid } from '../lib/id';
import { parseQuickLog } from '../lib/quickLog';
import { radius } from '../lib/theme';
import type { LoggedExercise, WorkoutLog } from '../lib/types';
import { formatNumber, formatWeight } from '../lib/units';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

/** Poslední trénink jako text (pro úpravu a uložení znovu) */
function logToText(log: WorkoutLog, name: (e: LoggedExercise) => string) {
  return log.exercises
    .map((e) => {
      const groups: string[] = [];
      let i = 0;
      while (i < e.sets.length) {
        const s = e.sets[i];
        let n = 1;
        while (i + n < e.sets.length && e.sets[i + n].reps === s.reps && e.sets[i + n].kg === s.kg) n++;
        groups.push(s.kg ? `${formatNumber(s.kg, 1)}x${s.reps}${n > 1 ? `x${n}` : ''}` : `${n}x${s.reps}`);
        i += n;
      }
      return `${name(e)} ${groups.join(', ')}`;
    })
    .join('\n');
}

/**
 * Rychlý zápis tréninku: napiš (nebo nadiktuj) cviky a váhy, aplikace je rozpozná.
 * Hodí se i pro zpětný zápis tréninku z papíru.
 */
export default function QuickLogScreen() {
  const { t, colors, settings, locale } = useSettings();
  const training = useTraining();
  const { data } = training;
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayISO());
  const [calendar, setCalendar] = useState(false);
  const [title, setTitle] = useState('');
  const parsed = parseQuickLog(text, data.customExercises, data.maxes);
  const valid = parsed.filter((p) => !p.error && p.sets.length);
  const last = [...data.logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
  const nameOf = (e: LoggedExercise) => exerciseName(e.exerciseId, settings.lang, data.customExercises, e.customName);

  const save = () => {
    if (!valid.length) return notify(t('ql.nothing'));
    const exercises: LoggedExercise[] = valid.map((p) => {
      // neznámý cvik se uloží jako vlastní (příště už se pozná)
      const exerciseId = p.exerciseId ?? training.addCustomExercise(p.name);
      return { id: uid('le'), exerciseId, sets: p.sets };
    });
    const log: WorkoutLog = {
      id: uid('wl'),
      date,
      planId: null,
      dayId: null,
      title: title.trim() || t('ql.defaultTitle'),
      exercises,
      createdAt: new Date().toISOString(),
    };
    training.saveLog(log);
    toast(t('ql.saved'));
    router.back();
  };

  const dates = [todayISO(), toISODate(addDays(new Date(), -1)), toISODate(addDays(new Date(), -2))];

  return (
    <Screen>
      <Header
        left={<IconButton name="close" onPress={() => router.back()} label={t('common.back')} />}
        title={t('ql.title')}
        right={<Button small title={t('common.save')} onPress={save} disabled={!valid.length} />}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {dates.map((d, i) => (
              <Chip key={d} label={t(`ql.day.${i}` as TKey)} on={date === d} onPress={() => setDate(d)} />
            ))}
            <Chip
              icon="calendar-outline"
              label={dates.includes(date) ? t('tr.pickDate') : formatDate(date, locale, { day: 'numeric', month: 'numeric' })}
              on={calendar || !dates.includes(date)}
              onPress={() => setCalendar((c) => !c)}
            />
          </Row>
          {calendar && (
            <CalendarPicker
              value={date}
              onChange={(d) => {
                setDate(d > todayISO() ? todayISO() : d);
                setCalendar(false);
              }}
            />
          )}
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            placeholder={t('ql.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={{
              minHeight: 150,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.text,
              padding: 14,
              fontSize: 17,
              lineHeight: 25,
              textAlignVertical: 'top',
            }}
          />
          <T v="caption" muted>
            {t('ql.help')}
          </T>
          {!text && last ? (
            <Button
              kind="secondary"
              icon="repeat-outline"
              title={t('ql.fromLast', { date: formatDate(last.date, locale, { day: 'numeric', month: 'numeric' }) })}
              onPress={() => {
                setText(logToText(last, nameOf));
                setTitle(last.title);
              }}
            />
          ) : null}

          {parsed.length > 0 && (
            <Card style={{ gap: 10 }}>
              <T v="label" muted>
                {t('ql.preview')}
              </T>
              {parsed.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Ionicons
                    name={p.error ? 'alert-circle' : 'checkmark-circle'}
                    size={20}
                    color={p.error ? colors.accent : colors.success}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '800' }}>
                      {p.exerciseId ? exerciseName(p.exerciseId, settings.lang, data.customExercises) : p.name}
                      {!p.exerciseId && !p.error ? (
                        <T v="caption" muted>
                          {'  '}
                          {t('ql.newExercise')}
                        </T>
                      ) : null}
                    </T>
                    {p.error ? (
                      <T v="small" color={colors.accent}>
                        {t(`ql.err.${p.error}` as TKey)}
                      </T>
                    ) : (
                      <T v="small" muted>
                        {summarize(p.sets, (kg) => formatWeight(kg, settings.unit), t('ql.noLoad'))}
                      </T>
                    )}
                  </View>
                </View>
              ))}
            </Card>
          )}
          <Field label={t('ql.titleLabel')} placeholder={t('ql.defaultTitle')} value={title} onChangeText={setTitle} />
          {valid.length > 0 && <Button icon="checkmark" title={t('ql.saveN', { n: valid.length })} onPress={save} />}
          <Banner icon="mic-outline" text={t('ql.voice')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** „3× 2 × 70 kg, 1× 2 × 75 kg“ */
function summarize(sets: { reps: number; kg: number }[], w: (kg: number) => string, noLoad: string) {
  const out: string[] = [];
  let i = 0;
  while (i < sets.length) {
    let n = 1;
    while (i + n < sets.length && sets[i + n].reps === sets[i].reps && sets[i + n].kg === sets[i].kg) n++;
    out.push(`${n}× ${sets[i].reps} × ${sets[i].kg ? w(sets[i].kg) : noLoad}`);
    i += n;
  }
  return out.join(', ');
}
