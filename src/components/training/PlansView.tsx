import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { TEMPLATES } from '../../data/templates';
import { formatDate, todayISO, weeksBetween } from '../../lib/date';
import type { TrainingPlan } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, Card, Row, SectionTitle, T } from '../ui';
import { createPlanFromTemplate } from './planActions';

export function PlansView() {
  const { t, colors, locale, settings } = useSettings();
  const training = useTraining();
  const today = todayISO();
  const plans = [...training.data.plans].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const running = plans.filter((p) => p.status === 'active' && (!p.endDate || p.endDate >= today));
  const drafts = plans.filter((p) => p.status === 'draft');
  const archived = plans.filter((p) => p.status === 'archived' || (p.status === 'active' && p.endDate && p.endDate < today));

  const PlanCard = ({ p }: { p: TrainingPlan }) => {
    const isRunning = p.status === 'active' && p.startDate <= today && (!p.endDate || p.endDate >= today);
    const exCount = p.days.reduce((a, d) => a + d.exercises.length, 0);
    return (
      <Card onPress={() => router.push(`/plan/${p.id}`)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3" style={{ flex: 1 }} numberOfLines={1}>
            {p.name || t('tr.newPlan')}
          </T>
          {isRunning && (
            <Row gap={5}>
              <Ionicons name="radio-button-on" size={16} color={colors.success} />
              <T v="small" color={colors.success} style={{ fontWeight: '800' }}>
                {t('tr.activeLabel')}
              </T>
            </Row>
          )}
        </Row>
        <T v="small" muted>
          {formatDate(p.startDate, locale)}
          {p.endDate ? ` – ${formatDate(p.endDate, locale)}` : ''}
          {p.endDate ? ` · ${t('tr.ranWeeks', { n: weeksBetween(p.startDate, p.endDate) })}` : ''}
        </T>
        <T v="small" muted>
          {p.days.length} × {t('tr.days').toLowerCase()} · {exCount} {t('tr.exercises')}
        </T>
      </Card>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Button icon="add" title={t('tr.createPlan')} onPress={() => router.push('/plan/new')} />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {TEMPLATES.map((tp) => (
          <Button
            key={tp.id}
            small
            kind="secondary"
            icon="copy-outline"
            title={t(tp.label)}
            onPress={() => router.push(`/plan/${createPlanFromTemplate(training, tp.id, settings.lang, false)}`)}
          />
        ))}
      </Row>
      {running.length > 0 && <SectionTitle>{t('tr.active')}</SectionTitle>}
      {running.map((p) => (
        <PlanCard key={p.id} p={p} />
      ))}
      {drafts.length > 0 && <SectionTitle>{t('tr.drafts')}</SectionTitle>}
      {drafts.map((p) => (
        <PlanCard key={p.id} p={p} />
      ))}
      {archived.length > 0 && <SectionTitle>{t('tr.archived')}</SectionTitle>}
      {archived.map((p) => (
        <View key={p.id} style={{ opacity: 0.8 }}>
          <PlanCard p={p} />
        </View>
      ))}
    </ScrollView>
  );
}
