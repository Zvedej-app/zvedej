import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LogView } from '../../components/training/LogView';
import { TodayView } from '../../components/training/TodayView';
import { ToolsView } from '../../components/training/ToolsView';
import { OfflineBadge } from '../../components/OfflineBadge';
import { Header, IconButton, Screen, Segmented, T } from '../../components/ui';
import { TourTarget } from '../../components/tour/TourTarget';
import { activePlan } from '../../lib/training';
import { radius } from '../../lib/theme';
import { useTabEnter } from '../../lib/tabReset';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';

type Tab = 'today' | 'log' | 'tools';

export default function TrainingScreen() {
  const { t, colors } = useSettings();
  const { data } = useTraining();
  const plan = activePlan(data);
  const { profile } = useAuth();
  const coach = !!profile?.isCoach;
  const [tab, setTab] = useState<Tab>('today');
  useTabEnter('training', () => setTab('today'));
  return (
    <Screen>
      <Header
        title={t('tab.training')}
        right={
          <TourTarget id="tr-add">
            <IconButton name="add-circle-outline" size={26} label={t('tr.createPlan')} onPress={() => router.push('/plan/new')} />
          </TourTarget>
        }
      />
      {/* Plány (a u trenéra Tým) jako samostatná tlačítka mezi nadpisem a přepínačem */}
      <TourTarget id="tr-plans" style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 }}>
        <BigLink
          icon="calendar"
          title={t('tr.sheetPlans')}
          sub={plan ? plan.name : t('tr.noActivePlan')}
          color={colors.primary}
          onPress={() => router.push('/plans')}
          compact={coach}
        />
        {coach && (
          <BigLink
            icon="people"
            title={t('coach.team')}
            sub={t('coach.teamSub')}
            color={colors.accent}
            onPress={() => router.push('/team')}
            compact
          />
        )}
      </TourTarget>
      <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}>
        <OfflineBadge />
        <TourTarget id="tr-seg">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { key: 'today', label: t('tr.today') },
              { key: 'log', label: t('tr.log') },
              { key: 'tools', label: t('tr.tools') },
            ]}
          />
        </TourTarget>
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'today' && <TodayView />}
        {tab === 'log' && <LogView />}
        {tab === 'tools' && <ToolsView />}
      </View>
    </Screen>
  );
}

function BigLink({
  icon,
  title,
  sub,
  color,
  onPress,
  compact,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub: string;
  color: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 10 : 12,
          padding: 12,
          borderRadius: radius.lg,
          backgroundColor: color,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <T v="h3" color="#FFF" numberOfLines={1}>
          {title}
        </T>
        <T v="caption" color="rgba(255,255,255,0.8)" numberOfLines={1}>
          {sub}
        </T>
      </View>
      {!compact && <Ionicons name="chevron-forward" size={20} color="#FFF" />}
    </Pressable>
  );
}
