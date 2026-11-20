import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { LogView } from '../../components/training/LogView';
import { PlansView } from '../../components/training/PlansView';
import { TodayView } from '../../components/training/TodayView';
import { ToolsView } from '../../components/training/ToolsView';
import { Header, IconButton, Screen, Segmented } from '../../components/ui';
import { useSettings } from '../../providers/SettingsProvider';

type Tab = 'today' | 'plans' | 'log' | 'tools';

export default function TrainingScreen() {
  const { t } = useSettings();
  const [tab, setTab] = useState<Tab>('today');
  return (
    <Screen>
      <Header
        title={t('tab.training')}
        right={
          <IconButton name="add-circle-outline" size={26} label={t('tr.createPlan')} onPress={() => router.push('/plan/new')} />
        }
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'today', label: t('tr.today') },
            { key: 'plans', label: t('tr.plans') },
            { key: 'log', label: t('tr.log') },
            { key: 'tools', label: t('tr.tools') },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'today' && <TodayView />}
        {tab === 'plans' && <PlansView />}
        {tab === 'log' && <LogView />}
        {tab === 'tools' && <ToolsView />}
      </View>
    </Screen>
  );
}
