import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LogView } from '../../components/training/LogView';
import { TodayView } from '../../components/training/TodayView';
import { ToolsView } from '../../components/training/ToolsView';
import { Header, IconButton, Screen, Segmented, T } from '../../components/ui';
import { activePlan } from '../../lib/training';
import { radius } from '../../lib/theme';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';

type Tab = 'today' | 'log' | 'tools';

export default function TrainingScreen() {
  const { t, colors } = useSettings();
  const { data } = useTraining();
  const plan = activePlan(data);
  const [tab, setTab] = useState<Tab>('today');
  return (
    <Screen>
      <Header
        title={t('tab.training')}
        right={
          <IconButton name="add-circle-outline" size={26} label={t('tr.createPlan')} onPress={() => router.push('/plan/new')} />
        }
      />
      {/* Plány jako samostatné tlačítko mezi nadpisem a přepínačem Dnes / Deník / Nástroje */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/plans')}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginHorizontal: 16,
            marginTop: 10,
            padding: 12,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="calendar" size={20} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <T v="h3" color="#FFF">
            {t('tr.sheetPlans')}
          </T>
          <T v="caption" color="rgba(255,255,255,0.8)" numberOfLines={1}>
            {plan ? plan.name : t('tr.noActivePlan')}
          </T>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#FFF" />
      </Pressable>
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'today', label: t('tr.today') },
            { key: 'log', label: t('tr.log') },
            { key: 'tools', label: t('tr.tools') },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'today' && <TodayView />}
        {tab === 'log' && <LogView />}
        {tab === 'tools' && <ToolsView />}
      </View>
    </Screen>
  );
}
