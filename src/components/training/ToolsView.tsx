import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { exerciseName, MAX_LIFTS } from '../../data/exercises';
import { sinclairCoefficient } from '../../lib/categories';
import type { Gender } from '../../lib/types';
import {
  formatNumber,
  formatWeight,
  fromDisplay,
  kgToLb,
  lbToKg,
  parseNum,
  PLATE_COLORS,
  PLATES_KG,
  PLATES_LB,
  platesPerSide,
  roundTo,
  toDisplay,
} from '../../lib/units';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, Card, Chip, Field, ListGroup, ListItem, Row, Sheet, T } from '../ui';
import { range, Wheel } from '../WheelPicker';

const KG = range(0, 400, 0.5);
const LB = range(0, 880, 1);

/** Výběr jedné váhy rolovacím kolečkem. */
interface WeightSheetProps {
  visible: boolean;
  title: string;
  kg: number;
  onClose: () => void;
  onSave: (kg: number) => void;
  onClear?: () => void;
  min?: number;
}

export function WeightSheet(props: WeightSheetProps) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title={props.title}>
      {props.visible && <WeightBody {...props} />}
    </Sheet>
  );
}

function WeightBody({ kg, onClose, onSave, onClear, min = 0 }: WeightSheetProps) {
  const { t, settings } = useSettings();
  const unit = settings.unit;
  const values = useMemo(() => (unit === 'kg' ? KG : LB).filter((v) => v >= min), [unit, min]);
  const [v, setV] = useState(() => roundTo(toDisplay(kg, unit), unit === 'kg' ? 0.5 : 1));
  return (
    <View style={{ paddingHorizontal: 16, gap: 14, alignItems: 'center' }}>
      <Wheel label={unit} values={values} value={v} onChange={setV} format={(x) => formatNumber(x)} width={140} />
      <Row style={{ alignSelf: 'stretch' }}>
        {onClear && (
          <Button
            kind="ghost"
            title={t('common.delete')}
            onPress={() => {
              onClear();
              onClose();
            }}
          />
        )}
        <Button
          title={t('common.done')}
          style={{ flex: 1 }}
          onPress={() => {
            onSave(roundTo(fromDisplay(v, unit), 0.25));
            onClose();
          }}
        />
      </Row>
    </View>
  );
}

export function ToolsView() {
  const { t, settings } = useSettings();
  const { data, setMax } = useTraining();
  const [editMax, setEditMax] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      <ListGroup title={t('tr.maxes')}>
        {MAX_LIFTS.map((id) => (
          <ListItem
            key={id}
            title={exerciseName(id, settings.lang)}
            value={data.maxes[id] ? formatWeight(data.maxes[id], settings.unit) : '—'}
            onPress={() => setEditMax(id)}
          />
        ))}
      </ListGroup>
      <T v="caption" muted style={{ marginTop: -8, marginLeft: 4 }}>
        {t('tr.maxesHint')}
      </T>

      <PlateCalculator />
      <PercentTable />
      <SinclairCalc />
      <Converter />

      <WeightSheet
        visible={!!editMax}
        title={editMax ? exerciseName(editMax, settings.lang) : ''}
        kg={editMax ? (data.maxes[editMax] ?? 60) : 60}
        onClose={() => setEditMax(null)}
        onSave={(kg) => editMax && setMax(editMax, kg)}
        onClear={() => editMax && setMax(editMax, null)}
      />
    </ScrollView>
  );
}

function PlateCalculator() {
  const { t, settings, colors } = useSettings();
  const unit = settings.unit;
  const [target, setTarget] = useState(unit === 'kg' ? 80 : 185);
  const [bar, setBar] = useState(unit === 'kg' ? settings.barKg : settings.barKg === 15 ? 35 : 45);
  const [collars, setCollars] = useState(unit === 'kg');
  const [pick, setPick] = useState(false);
  const plates = unit === 'kg' ? PLATES_KG : PLATES_LB;
  const collarW = collars ? (unit === 'kg' ? 5 : 11) : 0;
  const r = platesPerSide(target, bar, collarW, plates);
  const bars = unit === 'kg' ? [20, 15, 10, 5] : [45, 35, 15];

  return (
    <Card>
      <T v="h3">{t('tr.plateCalc')}</T>
      <Row style={{ justifyContent: 'space-between' }}>
        <T muted>{t('tr.targetWeight')}</T>
        <Button small kind="secondary" title={`${formatNumber(target)} ${unit}`} onPress={() => setPick(true)} />
      </Row>
      <Row style={{ flexWrap: 'wrap' }} gap={6}>
        <T v="small" muted>
          {t('tr.bar')}:
        </T>
        {bars.map((b) => (
          <Chip key={b} label={`${b} ${unit}`} on={bar === b} onPress={() => setBar(b)} />
        ))}
      </Row>
      <ListItem title={t('tr.collars')} toggle={collars} onToggle={setCollars} />
      <View style={styles.barWrap}>
        <View style={[styles.sleeve, { backgroundColor: colors.textMuted }]} />
        <Row gap={2} style={{ alignItems: 'center' }}>
          {r.plates.map((p, i) => {
            const big = p >= (unit === 'kg' ? 10 : 25);
            return (
              <View
                key={i}
                style={{
                  width: big ? 16 : 10,
                  height: big ? 96 : p >= (unit === 'kg' ? 2.5 : 10) ? 64 : 44,
                  borderRadius: 3,
                  backgroundColor: PLATE_COLORS[String(p)] ?? colors.primary,
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.25)',
                }}
              />
            );
          })}
          {collars && <View style={{ width: 8, height: 28, backgroundColor: '#9AA3B5', borderRadius: 2 }} />}
        </Row>
      </View>
      <T style={{ fontWeight: '700' }}>
        {t('tr.perSide')}: {r.plates.length ? r.plates.map((p) => formatNumber(p)).join(' + ') : '—'}
      </T>
      {Math.abs(r.remainder) > 0.01 && (
        <T v="small" color={colors.danger}>
          {t('tr.cantLoad')} ({formatNumber(r.remainder)} {unit})
        </T>
      )}
      <Sheet visible={pick} onClose={() => setPick(false)} title={t('tr.targetWeight')}>
        <View style={{ alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
          <Wheel
            label={unit}
            values={unit === 'kg' ? range(5, 300, 0.5) : range(15, 660, 1)}
            value={target}
            onChange={setTarget}
            format={(x) => formatNumber(x)}
            width={140}
          />
          <Button title={t('common.done')} onPress={() => setPick(false)} style={{ alignSelf: 'stretch' }} />
        </View>
      </Sheet>
    </Card>
  );
}

function PercentTable() {
  const { t, settings, colors } = useSettings();
  const { data } = useTraining();
  const lifts = MAX_LIFTS.filter((l) => data.maxes[l]);
  const [lift, setLift] = useState<string | null>(null);
  const sel = lift ?? lifts[0] ?? null;
  const max = sel ? data.maxes[sel] : null;
  const pcts = range(50, 105, 5);
  return (
    <Card>
      <T v="h3">{t('tr.percentTable')}</T>
      {!lifts.length ? (
        <T v="small" muted>
          {t('tr.maxesHint')}
        </T>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {lifts.map((l) => (
              <Chip key={l} label={exerciseName(l, settings.lang)} on={sel === l} onPress={() => setLift(l)} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {max &&
              pcts.map((p) => (
                <View key={p} style={[styles.pctCell, { borderColor: colors.border }]}>
                  <T v="caption" muted>
                    {p} %
                  </T>
                  <T style={{ fontWeight: '700' }}>
                    {formatWeight(roundTo((max * p) / 100, settings.roundingKg), settings.unit)}
                  </T>
                </View>
              ))}
          </View>
        </>
      )}
    </Card>
  );
}

function SinclairCalc() {
  const { t, settings } = useSettings();
  const { profile } = useAuth();
  const unit = settings.unit;
  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'M');
  const [bw, setBw] = useState(profile?.bodyweight ?? 80);
  const [total, setTotal] = useState(profile?.prSnatch && profile?.prCleanJerk ? profile.prSnatch + profile.prCleanJerk : 200);
  const [edit, setEdit] = useState<'bw' | 'total' | null>(null);
  const coef = sinclairCoefficient(gender, bw);
  return (
    <Card>
      <T v="h3">{t('tr.sinclair')}</T>
      <Row>
        <Chip label={t('pr.male')} on={gender === 'M'} onPress={() => setGender('M')} />
        <Chip label={t('pr.female')} on={gender === 'F'} onPress={() => setGender('F')} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <T muted>{t('pr.bodyweight')}</T>
        <Button small kind="secondary" title={formatWeight(bw, unit)} onPress={() => setEdit('bw')} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <T muted>{t('tr.total')}</T>
        <Button small kind="secondary" title={formatWeight(total, unit)} onPress={() => setEdit('total')} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small" muted>
          koef. {coef.toFixed(4).replace('.', ',')}
        </T>
        <T v="h2">
          {formatNumber(total * coef, 2)} {t('tr.points')}
        </T>
      </Row>
      <WeightSheet
        visible={edit !== null}
        title={edit === 'bw' ? t('pr.bodyweight') : t('tr.total')}
        kg={edit === 'bw' ? bw : total}
        min={edit === 'bw' ? 30 : 0}
        onClose={() => setEdit(null)}
        onSave={(kg) => (edit === 'bw' ? setBw(kg) : setTotal(kg))}
      />
    </Card>
  );
}

function Converter() {
  const { t } = useSettings();
  const [kg, setKg] = useState('100');
  const [lb, setLb] = useState(formatNumber(kgToLb(100), 1));
  return (
    <Card>
      <T v="h3">{t('tr.converter')}</T>
      <Row gap={10}>
        <Field
          label="kg"
          value={kg}
          keyboardType="decimal-pad"
          style={{ flex: 1 }}
          onChangeText={(s) => {
            setKg(s);
            const n = parseNum(s);
            setLb(n === null ? '' : formatNumber(kgToLb(n), 1));
          }}
        />
        <Field
          label="lb"
          value={lb}
          keyboardType="decimal-pad"
          style={{ flex: 1 }}
          onChangeText={(s) => {
            setLb(s);
            const n = parseNum(s);
            setKg(n === null ? '' : formatNumber(lbToKg(n), 1));
          }}
        />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  barWrap: { height: 110, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 8, overflow: 'hidden' },
  sleeve: { position: 'absolute', left: 0, right: 0, height: 10, borderRadius: 5 },
  pctCell: { width: '25%', paddingVertical: 8, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
});
