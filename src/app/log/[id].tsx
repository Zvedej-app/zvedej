import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { formatTonnage } from '../../components/training/format';
import { WorkoutEditor } from '../../components/training/WorkoutEditor';
import { Button, Card, Empty, Field, Header, IconButton, Row, Screen, Stat, T } from '../../components/ui';
import { todayISO, formatDate } from '../../lib/date';
import { confirm } from '../../lib/dialog';
import { uid } from '../../lib/id';
import { logSetCount, logTonnage } from '../../lib/training';
import type { WorkoutLog } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';

export default function LogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, settings, locale } = useSettings();
  const training = useTraining();
  const orig = training.data.logs.find((l) => l.id === id);
  const [log, setLog] = useState<WorkoutLog | null>(orig ?? null);

  if (!log) {
    return (
      <Screen>
        <Header left={<IconButton name="chevron-back" onPress={() => router.back()} />} />
        <Empty text={t('tr.noLogs')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={formatDate(log.date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        right={
          <Button
            small
            title={t('common.save')}
            onPress={() => {
              training.saveLog(log);
              router.back();
            }}
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Field value={log.title} onChangeText={(title) => setLog({ ...log, title })} />
        <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Stat value={logSetCount(log)} label={t('tr.set')} />
          <Stat value={formatTonnage(logTonnage(log), settings.unit)} label={t('tr.tonnage')} />
          {log.durationMin ? <Stat value={`${log.durationMin}′`} label="min" /> : null}
          {log.rpe ? <Stat value={log.rpe} label="RPE" /> : null}
        </Card>
        <WorkoutEditor exercises={log.exercises} onChange={(exercises) => setLog({ ...log, exercises })} />
        <Field
          label={t('tr.workoutNotes')}
          value={log.notes ?? ''}
          onChangeText={(notes) => setLog({ ...log, notes })}
          multiline
        />
        <Row>
          <Button
            kind="secondary"
            icon="repeat-outline"
            title={t('tr.repeatLast')}
            style={{ flex: 1 }}
            onPress={() => {
              training.startWorkout({
                date: todayISO(),
                planId: log.planId,
                dayId: log.dayId,
                title: log.title,
                exercises: log.exercises.map((e) => ({ ...e, id: uid('le'), sets: e.sets.map((s) => ({ ...s, done: false })) })),
              });
              router.replace('/workout');
            }}
          />
        </Row>
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
            training.deleteLog(log.id);
            router.back();
          }}
        />
        <T v="caption" muted style={{ textAlign: 'center' }}>
          {formatDate(log.createdAt, locale)}
        </T>
      </ScrollView>
    </Screen>
  );
}
