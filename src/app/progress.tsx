import { router } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';
import { ProgressCharts } from '../components/coach/ProgressCharts';
import { Header, IconButton, Screen } from '../components/ui';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

/** Můj pokrok: grafy vývoje maxim a tonáže. */
export default function ProgressScreen() {
  const { t } = useSettings();
  const { data } = useTraining();
  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('prog.title')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <ProgressCharts data={data} />
      </ScrollView>
    </Screen>
  );
}
