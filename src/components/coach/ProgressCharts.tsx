import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { exerciseName, MAX_LIFTS } from '../../data/exercises';
import { bestLiftSeries, maxSeries, monthlyTonnage, topExercises, weeklyTonnage } from '../../lib/coach';
import { formatDate, parseISODate, todayISO } from '../../lib/date';
import { FONTS } from '../../lib/theme';
import type { TKey } from '../../lib/i18n';
import type { TrainingData, WellnessEntry } from '../../lib/types';
import { weekReadiness, wellnessSeries } from '../../lib/wellness';
import { formatNumber, toDisplay } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { formatTonnage } from '../training/format';
import { Card, Chip, Row, Segmented, T } from '../ui';
import { BarChart } from './Charts';

const H = 170;
type Pt = { date: string; kg: number };

/**
 * Grafy pokroku: vývoj maxim (zapsané maximum + nejtěžší váha v tréninku)
 * a tonáž po týdnech nebo měsících. Používá je svěřenec i trenér.
 */
export function ProgressCharts({ data }: { data: TrainingData }) {
  const { t, settings, locale } = useSettings();
  const unit = settings.unit;
  // cviky: hlavní maxima, vlastní maxima a nejčastější cviky z deníku
  const lifts = Array.from(
    new Set([
      ...MAX_LIFTS.filter((l) => data.maxes[l] || data.logs.some((g) => g.exercises.some((e) => e.exerciseId === l))),
      ...(data.maxLifts ?? []).filter((l) => data.maxes[l]),
      ...topExercises(data.logs, 6),
    ]),
  );
  const [lift, setLift] = useState<string>(lifts.includes('snatch') ? 'snatch' : (lifts[0] ?? 'snatch'));
  const [period, setPeriod] = useState<'weeks' | 'months'>('weeks');

  const maxes = maxSeries(data, lift);
  const best = bestLiftSeries(data.logs, lift);
  const curMax = data.maxes[lift] ?? null;
  const firstMax = maxes[0]?.kg ?? null;
  const gain = curMax && firstMax && maxes.length > 1 ? curMax - firstMax : null;
  const topLift = best.length ? Math.max(...best.map((b) => b.kg)) : null;

  const bars =
    period === 'weeks'
      ? weeklyTonnage(data.logs, 12).map((w) => ({
          label: formatDate(w.week, locale, { day: 'numeric', month: 'numeric' }),
          value: w.tonnage,
        }))
      : monthlyTonnage(data.logs, 6).map((m) => ({
          label: monthShort(m.month, settings.lang, locale),
          value: m.tonnage,
        }));
  const total = bars.reduce((a, b) => a + b.value, 0);
  const active = bars.filter((b) => b.value > 0);
  const avg = active.length ? total / active.length : 0;
  const w = (kg: number) => `${formatNumber(toDisplay(kg, unit), unit === 'kg' ? 1 : 0)} ${unit}`;

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <T v="h3">{t('prog.maxTitle')}</T>
        {lifts.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {lifts.map((l) => (
              <Chip
                key={l}
                label={exerciseName(l, settings.lang, data.customExercises)}
                on={lift === l}
                onPress={() => setLift(l)}
              />
            ))}
          </ScrollView>
        )}
        <Row gap={0} style={{ justifyContent: 'space-between' }}>
          <Big label={t('prog.currentMax')} value={curMax ? w(curMax) : '—'} />
          <Big
            label={t('prog.gain')}
            value={gain === null ? '—' : `${gain >= 0 ? '+' : ''}${w(gain)}`}
            accent={!!gain && gain > 0}
          />
          <Big label={t('prog.topLift')} value={topLift ? w(topLift) : '—'} />
        </Row>
        {maxes.length || best.length ? (
          <TimeChart maxes={maxes} best={best} />
        ) : (
          <T v="small" muted>
            {t('prog.noMaxData')}
          </T>
        )}
        <Row gap={16} style={{ flexWrap: 'wrap' }}>
          <Legend color="accent" dashed text={t('prog.legendMax')} />
          <Legend color="primary" text={t('prog.legendBest')} />
        </Row>
        <T v="caption" muted>
          {t('prog.maxHint')}
        </T>
      </Card>

      <Card style={{ gap: 12 }}>
        <T v="h3">{t('prog.tonnageTitle')}</T>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { key: 'weeks', label: t('prog.weeks') },
            { key: 'months', label: t('prog.months') },
          ]}
        />
        <Row gap={0} style={{ justifyContent: 'space-between' }}>
          <Big label={period === 'weeks' ? t('prog.total12w') : t('prog.total6m')} value={formatTonnage(total, unit)} />
          <Big label={period === 'weeks' ? t('prog.avgWeek') : t('prog.avgMonth')} value={formatTonnage(avg, unit)} />
        </Row>
        <BarChart bars={bars} format={(v) => formatTonnage(v, unit)} />
        <T v="caption" muted>
          {t('prog.tonnageHint')}
        </T>
      </Card>
      {(data.wellness ?? []).length > 0 && <WellnessChart entries={data.wellness ?? []} />}
    </View>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useSettings();
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <T style={{ fontFamily: FONTS.black, fontSize: 18 }} color={accent ? colors.success : undefined} numberOfLines={1}>
        {value}
      </T>
      <T v="caption" muted numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

function Legend({ color, text, dashed }: { color: 'accent' | 'primary'; text: string; dashed?: boolean }) {
  const { colors } = useSettings();
  return (
    <Row gap={6}>
      <Svg width={22} height={8}>
        <Line
          x1={1}
          x2={21}
          y1={4}
          y2={4}
          stroke={colors[color]}
          strokeWidth={3}
          strokeDasharray={dashed ? '5 3' : undefined}
          strokeLinecap="round"
        />
      </Svg>
      <T v="caption" muted>
        {text}
      </T>
    </Row>
  );
}

/** Graf s časovou osou: schodovitá čára maxima + body nejtěžších vah z tréninků. */
function TimeChart({ maxes, best }: { maxes: Pt[]; best: Pt[] }) {
  const { colors, locale, settings } = useSettings();
  const [w, setW] = useState(0);
  const unit = settings.unit;
  const all = [...maxes, ...best];
  const today = todayISO();
  const dates = all.map((p) => p.date).sort();
  const start = dates[0];
  const end = dates[dates.length - 1] < today ? today : dates[dates.length - 1];
  const t0 = parseISODate(start).getTime();
  const t1 = parseISODate(end).getTime();
  const vals = all.map((p) => toDisplay(p.kg, unit));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(2, (max - min) * 0.15);
  const lo = Math.floor(min - pad);
  const hi = Math.ceil(max + pad);
  const padX = 10;
  const x = (iso: string) => (t1 === t0 ? w / 2 : padX + ((parseISODate(iso).getTime() - t0) / (t1 - t0)) * (w - padX * 2));
  const y = (kg: number) => 10 + (1 - (toDisplay(kg, unit) - lo) / (hi - lo || 1)) * (H - 20);

  // maximum platí, dokud ho nepřepíše další zápis → schodovitá čára až do dneška
  let step = '';
  maxes.forEach((p, i) => {
    const nx = i + 1 < maxes.length ? x(maxes[i + 1].date) : x(end);
    step += `${i ? 'L' : 'M'}${x(p.date)} ${y(p.kg)} L${nx} ${y(p.kg)} `;
  });

  return (
    <View style={{ gap: 4 }}>
      <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <T v="caption" muted style={{ position: 'absolute', left: 0, top: -2, fontSize: 10 }}>
          {hi} {unit}
        </T>
        <T v="caption" muted style={{ position: 'absolute', left: 0, bottom: -2, fontSize: 10 }}>
          {lo} {unit}
        </T>
        {w > 0 && (
          <Svg width={w} height={H}>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1={0} x2={w} y1={H * f} y2={H * f} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" />
            ))}
            {best.length > 1 && (
              <Polyline
                points={best.map((p) => `${x(p.date)},${y(p.kg)}`).join(' ')}
                fill="none"
                stroke={colors.primary}
                strokeOpacity={0.45}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            )}
            {best.map((p, i) => (
              <Circle key={i} cx={x(p.date)} cy={y(p.kg)} r={3} fill={colors.primary} />
            ))}
            {step ? (
              <Path d={step} fill="none" stroke={colors.accent} strokeWidth={3} strokeDasharray="7 4" strokeLinecap="round" />
            ) : null}
            {maxes.map((p, i) => (
              <Circle
                key={`m${i}`}
                cx={x(p.date)}
                cy={y(p.kg)}
                r={4.5}
                fill={colors.accent}
                stroke={colors.surface}
                strokeWidth={1.5}
              />
            ))}
          </Svg>
        )}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="caption" muted>
          {formatDate(start, locale, { day: 'numeric', month: 'numeric', year: '2-digit' })}
        </T>
        <T v="caption" muted>
          {formatDate(end, locale, { day: 'numeric', month: 'numeric', year: '2-digit' })}
        </T>
      </Row>
    </View>
  );
}

const CS_MONTHS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čer', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

/** Krátký název měsíce (v češtině běžné zkratky místo „čvn“) */
function monthShort(iso: string, lang: string, locale: string) {
  if (lang === 'cs') return CS_MONTHS[parseISODate(iso).getMonth()];
  return formatDate(iso, locale, { month: 'short' }).replace('.', '');
}

/** Připravenost z deníku regenerace za posledních 28 dní a poslední bolesti */
function WellnessChart({ entries }: { entries: WellnessEntry[] }) {
  const { t, locale } = useSettings();
  const series = wellnessSeries(entries, 28);
  const week = weekReadiness(entries);
  const pains = [...entries]
    .filter((e) => e.pain)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  if (!series.length) return null;
  return (
    <Card style={{ gap: 12 }}>
      <T v="h3">{t('well.chart')}</T>
      <Row gap={0} style={{ justifyContent: 'space-between' }}>
        <Big label={t('well.weekAvg')} value={week === null ? '—' : String(week)} />
        <Big label={t('well.entries')} value={String(series.length)} />
      </Row>
      <BarChart
        bars={series.map((x) => ({ label: formatDate(x.date, locale, { day: 'numeric', month: 'numeric' }), value: x.score }))}
        format={(v) => String(Math.round(v))}
      />
      {pains.map((p) => (
        <T key={p.date} v="small" muted>
          {formatDate(p.date, locale, { day: 'numeric', month: 'numeric' })}:{' '}
          {t('well.painOf', { area: t(`well.area.${p.pain!.area}` as TKey), level: p.pain!.level })}
        </T>
      ))}
      <T v="caption" muted>
        {t('well.chartHint')}
      </T>
    </Card>
  );
}
