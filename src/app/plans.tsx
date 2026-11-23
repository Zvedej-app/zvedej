import { router } from 'expo-router';
import React from 'react';
import { PlansView } from '../components/training/PlansView';
import { Header, IconButton, Screen } from '../components/ui';
import { useSettings } from '../providers/SettingsProvider';

export default function PlansScreen() {
  const { t } = useSettings();
  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('tr.sheetPlans')}
      />
      <PlansView />
    </Screen>
  );
}
