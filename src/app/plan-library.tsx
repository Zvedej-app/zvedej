import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { schemeLabel } from '../components/training/format';
import { createPlanFromTemplate } from '../components/training/planActions';
import { Banner, Button, Chip, Header, IconButton, PressScale, Row, Screen, Sheet, T } from '../components/ui';
import { exerciseName } from '../data/exercises';
import { TEMPLATES, type PlanTemplate, type TemplateGoal, type TemplateLevel } from '../data/templates';
import { confirm, toast } from '../lib/dialog';
import type { TKey } from '../lib/i18n';
import { FONTS } from '../lib/theme';
import { activePlan, dayLabel } from '../lib/training';
import { formatNumber } from '../lib/units';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

type Filter = 'all' | TemplateLevel | TemplateGoal;

const LEVEL_COLOR: Record<TemplateLevel, string> = { beginner: '#4CBB17', intermediate: '#E07A00', advanced: '#D4060D' };
const GOAL_ICON: Record<TemplateGoal, React.ComponentProps<typeof Ionicons>['name']> = {
  technique: 'school',
  general: 'barbell',
  strength: 'flash',
  competition: 'trophy',
};

/** Knihovna hotových plánů: výběr podle úrovně a cíle, náhled a převzetí jedním klepnutím. */
export default function PlanLibrary() {
  const { t, settings, colors } = useSettings();
  const training = useTraining();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<PlanTemplate | null>(null);
  const list = TEMPLATES.filter((tp) => filter === 'all' || tp.level === filter || tp.goal === filter);
  const hasMaxes = Object.values(training.data.maxes).some((v) => v > 0);

  const perWeek = (tp: PlanTemplate) => tp.build(settings.lang).days.length;

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('lib.title')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <T muted>{t('lib.subtitle')}</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', 'beginner', 'intermediate', 'advanced', 'technique', 'strength', 'competition'] as Filter[]).map((f) => (
            <Chip
              key={f}
              label={f === 'all' ? t('lib.all') : t((['beginner', 'intermediate', 'advanced'].includes(f) ? `lib.level.${f}` : `lib.goal.${f}`) as TKey)}
              on={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
        {!hasMaxes && <Banner text={t('lib.noMaxHint')} />}
        {list.map((tp) => {
          const built = tp.build(settings.lang);
          return (
            <PressScale
              key={tp.id}
              onPress={() => setOpen(tp)}
              scaleTo={0.98}
              style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 }}
            >
              <Row gap={12}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={GOAL_ICON[tp.goal]} size={22} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">{built.name}</T>
                  <Row gap={6} style={{ marginTop: 3, flexWrap: 'wrap' }}>
                    <Tag color={LEVEL_COLOR[tp.level]} text={t(`lib.level.${tp.level}` as TKey)} />
                    <Tag color={colors.primary} text={t('lib.perWeek', { n: perWeek(tp) })} />
                    {built.weeks ? <Tag color={colors.textMuted} text={t('lib.weeks', { n: built.weeks })} /> : null}
                  </Row>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Row>
              <T v="small" muted numberOfLines={3}>
                {tp.desc(settings.lang)}
              </T>
            </PressScale>
          );
        })}
      </ScrollView>
      <Preview tp={open} onClose={() => setOpen(null)} training={training} />
    </Screen>
  );
}

function Tag({ color, text }: { color: string; text: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: color }}>
      <T v="caption" color="#FFF" style={{ fontFamily: FONTS.bold }}>
        {text}
      </T>
    </View>
  );
}

function Preview({
  tp,
  onClose,
  training,
}: {
  tp: PlanTemplate | null;
  onClose: () => void;
  training: ReturnType<typeof useTraining>;
}) {
  const { t, settings, colors } = useSettings();
  // náhled se sestaví jednou pro otevřenou šablonu (ve stavu, aby se id nesestavovala při každém překreslení)
  const built = useMemo(() => (tp ? tp.build(settings.lang) : null), [tp, settings.lang]);
  if (!tp || !built) return null;
  const wdName = (w: number) => t(`tr.weekdayFull.${w}` as TKey);
  const current = activePlan(training.data);

  const use = async (activate: boolean) => {
    if (activate && current) {
      if (!(await confirm(t('lib.replaceQ', { name: current.name }), { ok: t('common.yes'), cancel: t('common.cancel') }))) return;
    }
    const id = createPlanFromTemplate(training, tp.id, settings.lang, activate);
    onClose();
    if (activate) {
      toast(t('lib.started'));
      router.dismissTo('/training');
    } else {
      router.replace(`/plan/${id}`);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={built.name} full>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 12 }}>
        <T muted>{tp.desc(settings.lang)}</T>
        {built.weeklyIncrementPct ? (
          <T v="small" muted>
            {t('tr.progression')}: +{formatNumber(built.weeklyIncrementPct)} % / {t('common.week').toLowerCase()}
          </T>
        ) : null}
        {built.note ? (
          <Row gap={8} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <T v="small" style={{ flex: 1 }}>
              {built.note}
            </T>
          </Row>
        ) : null}
        {built.days.map((d) => (
          <View key={d.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h3">{dayLabel(d, wdName)}</T>
              <T v="caption" muted>
                {d.weekdays.map((w) => t(`tr.weekday.${w}` as TKey)).join(', ')}
              </T>
            </Row>
            {d.exercises.map((e) => (
              <Row key={e.id} style={{ justifyContent: 'space-between', gap: 10 }}>
                <T v="small" style={{ flex: 1, fontFamily: FONTS.semi }}>
                  {exerciseName(e.exerciseId, settings.lang)}
                </T>
                <T v="small" muted style={{ textAlign: 'right' }}>
                  {e.schemes.map((s) => schemeLabel(s, training.data, null, 1, settings.unit, 2.5)).join('\n')}
                </T>
              </Row>
            ))}
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, gap: 8, paddingTop: 8 }}>
        <Button icon="play" title={t('lib.startNow')} onPress={() => use(true)} />
        <Button kind="secondary" icon="create-outline" title={t('lib.customize')} onPress={() => use(false)} />
      </View>
    </Sheet>
  );
}
