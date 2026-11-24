import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { exerciseName, MAX_LIFTS } from '../../data/exercises';
import { sinclairCoefficient, sinclairTotal } from '../../lib/categories';
import { maxLiftIds } from '../../lib/training';
import type { Gender } from '../../lib/types';
import {
  formatBodyweight,
  formatNumber,
  formatWeight,
  kgToLb,
  lbToKg,
  parseNum,
  PLATE_COLORS,
  PLATES_KG,
  PLATES_LB,
  platesPerSide,
  toDisplay,
  toStoredKg,
} from '../../lib/units';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, Card, Chip, Field, ListGroup, ListItem, Row, SectionTitle, Sheet, T } from '../ui';
import { range, Wheel } from '../WheelPicker';
import { ExercisePicker } from './ExercisePicker';

// váhy se zadávají po celých kilech (žádné půlkilo)
const KG = range(0, 400, 1);
const LB = range(0, 880, 1);

interface WeightSheetProps {
  visible: boolean;
  title: string;
  kg: number;
  onClose: () => void;
  onSave: (kg: number) => void;
  onClear?: () => void;
  clearLabel?: string;
  min?: number;
  /** tělesná hmotnost: desetiny kila a políčko pro napsání čísla */
  decimals?: boolean;
}

/** Výběr jedné váhy rolovacím kolečkem. */
export function WeightSheet(props: WeightSheetProps) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title={props.title}>
      {props.visible && <WeightBody {...props} />}
    </Sheet>
  );
}

const TENTHS = range(0, 9, 1);

function WeightBody(props: WeightSheetProps) {
  return props.decimals ? <DecimalWeightBody {...props} /> : <WholeWeightBody {...props} />;
}

/** Tělesná hmotnost: políčko pro napsání (např. 83,4) a dvě kolečka – celá kila a desetiny. */
function DecimalWeightBody({ kg, onClose, onSave, onClear, clearLabel, min = 0, title }: WeightSheetProps) {
  const { t, settings, colors } = useSettings();
  const unit = settings.unit;
  const max = unit === 'kg' ? 300 : 660;
  const wholes = useMemo(() => range(Math.ceil(min), max, 1), [min, max]);
  const start = Math.round(toDisplay(kg, unit) * 10) / 10;
  const [whole, setWhole] = useState(Math.min(max, Math.max(Math.ceil(min), Math.floor(start))));
  const [tenth, setTenth] = useState(Math.round((start - Math.floor(start)) * 10) % 10);
  const [text, setText] = useState(formatNumber(start, 1));
  const [invalid, setInvalid] = useState(false);
  const value = whole + tenth / 10;

  const fromWheels = (w: number, d: number) => {
    setWhole(w);
    setTenth(d);
    setText(formatNumber(w + d / 10, 1));
    setInvalid(false);
  };
  const onType = (s: string) => {
    const clean = s.replace(/[^0-9.,]/g, '').slice(0, 6);
    setText(clean);
    const n = parseNum(clean);
    if (n === null || n < min || n > max) {
      setInvalid(clean.length > 0);
      return;
    }
    const r = Math.round(n * 10) / 10;
    setInvalid(false);
    setWhole(Math.floor(r));
    setTenth(Math.round((r - Math.floor(r)) * 10) % 10);
  };

  return (
    <View style={{ paddingHorizontal: 16, gap: 14, alignItems: 'center' }}>
      <Field
        value={text}
        onChangeText={onType}
        keyboardType="decimal-pad"
        placeholder={`83,4`}
        accessibilityLabel={title}
        selectTextOnFocus
        style={{ alignSelf: 'stretch' }}
        inputStyle={{
          textAlign: 'center',
          fontSize: 26,
          fontWeight: '800',
          height: 58,
          borderColor: invalid ? colors.danger : colors.border,
        }}
        hint={invalid ? t('pr.bwRange', { min, max, unit }) : t('pr.bwTypeHint')}
      />
      <Row style={{ justifyContent: 'center', alignItems: 'center' }} gap={4}>
        <Wheel label={unit} values={wholes} value={whole} onChange={(w) => fromWheels(w, tenth)} width={110} />
        <T style={{ fontSize: 28, fontWeight: '800', marginTop: 22 }}>,</T>
        <Wheel label={t('pr.tenths')} values={TENTHS} value={tenth} onChange={(d) => fromWheels(whole, d)} width={80} />
      </Row>
      <Row style={{ alignSelf: 'stretch' }}>
        {onClear && (
          <Button
            kind="ghost"
            title={clearLabel ?? t('common.delete')}
            onPress={() => {
              onClear();
              onClose();
            }}
          />
        )}
        <Button
          title={t('common.done')}
          style={{ flex: 1 }}
          disabled={invalid}
          onPress={() => {
            const stored = unit === 'kg' ? Math.round(value * 10) / 10 : Math.round(lbToKg(value) * 100) / 100;
            onSave(stored);
            onClose();
          }}
        />
      </Row>
    </View>
  );
}

function WholeWeightBody({ kg, onClose, onSave, onClear, clearLabel, min = 0 }: WeightSheetProps) {
  const { t, settings } = useSettings();
  const unit = settings.unit;
  const values = useMemo(() => (unit === 'kg' ? KG : LB).filter((v) => v >= min), [unit, min]);
  const [v, setV] = useState(() => Math.round(toDisplay(kg, unit)));
  return (
    <View style={{ paddingHorizontal: 16, gap: 14, alignItems: 'center' }}>
      <Wheel label={unit} values={values} value={v} onChange={setV} format={(x) => formatNumber(x, 0)} width={140} />
      <Row style={{ alignSelf: 'stretch' }}>
        {onClear && (
          <Button
            kind="ghost"
            title={clearLabel ?? t('common.delete')}
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
            onSave(toStoredKg(v, unit));
            onClose();
          }}
        />
      </Row>
    </View>
  );
}

export function ToolsView() {
  const { t, settings } = useSettings();
  const { data, setMax, addMaxLift, removeMaxLift } = useTraining();
  const [editMax, setEditMax] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const lifts = maxLiftIds(data);
  const isDefault = (id: string) => MAX_LIFTS.includes(id);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      <View style={{ gap: 6 }}>
        <SectionTitle>{t('tr.maxes')}</SectionTitle>
        <T v="small" muted>
          {t('tr.maxesHint')}
        </T>
      </View>
      <ListGroup>
        {lifts.map((id) => (
          <ListItem
            key={id}
            title={exerciseName(id, settings.lang, data.customExercises)}
            value={data.maxes[id] ? formatWeight(data.maxes[id], settings.unit) : '—'}
            onPress={() => setEditMax(id)}
          />
        ))}
      </ListGroup>
      <Row gap={8} style={{ marginTop: -6, flexWrap: 'wrap' }}>
        <Button small kind="secondary" icon="add" title={t('tr.addMaxExercise')} onPress={() => setPicker(true)} />
        <Button
          small
          kind="secondary"
          icon="trending-up"
          title={t('prog.maxChartBtn')}
          onPress={() => router.push('/progress')}
        />
      </Row>

      <PlateCalculator />
      <SinclairCalc />
      <Converter />

      <ExercisePicker
        visible={picker}
        onClose={() => setPicker(false)}
        onPick={(id) => {
          addMaxLift(id);
          setEditMax(id);
        }}
      />
      <WeightSheet
        visible={!!editMax}
        title={editMax ? exerciseName(editMax, settings.lang, data.customExercises) : ''}
        kg={editMax ? (data.maxes[editMax] ?? 60) : 60}
        onClose={() => setEditMax(null)}
        onSave={(kg) => editMax && setMax(editMax, kg)}
        onClear={() => editMax && (isDefault(editMax) ? setMax(editMax, null) : removeMaxLift(editMax))}
        clearLabel={editMax && !isDefault(editMax) ? t('tr.removeMax') : t('common.delete')}
      />
    </ScrollView>
  );
}

/* --------------------------- kalkulačka kotoučů --------------------------- */

/** šířka a výška kotouče (px) – největší kotouč je nejtlustší, malé kotouče jsou menší */
function plateSize(p: number, unit: 'kg' | 'lb') {
  if (unit === 'kg') {
    const w: Record<string, number> = {
      '25': 22,
      '20': 20,
      '15': 18,
      '10': 15,
      '5': 12,
      '2.5': 10,
      '2': 9,
      '1.5': 8,
      '1': 7,
      '0.5': 6,
    };
    const h: Record<string, number> = {
      '25': 112,
      '20': 112,
      '15': 112,
      '10': 112,
      '5': 112,
      '2.5': 64,
      '2': 56,
      '1.5': 50,
      '1': 44,
      '0.5': 38,
    };
    return { w: w[String(p)] ?? 8, h: h[String(p)] ?? 50 };
  }
  const w: Record<string, number> = { '55': 22, '45': 20, '35': 18, '25': 15, '10': 12, '5': 10, '2.5': 8 };
  const h: Record<string, number> = { '55': 112, '45': 112, '35': 112, '25': 112, '10': 80, '5': 62, '2.5': 48 };
  return { w: w[String(p)] ?? 8, h: h[String(p)] ?? 50 };
}

/** malé kotouče (změnové) – zobrazují se samostatně vpravo od uzávěru */
function isSmallPlate(p: number, unit: 'kg' | 'lb') {
  return unit === 'kg' ? p < 2.5 : p < 5;
}

function Plate({ p, unit }: { p: number; unit: 'kg' | 'lb' }) {
  const { colors } = useSettings();
  const s = plateSize(p, unit);
  const darkText = p === 5 || p === 0.5 || (p === 10 && unit === 'lb');
  return (
    <View
      style={{
        width: s.w,
        height: s.h,
        borderRadius: 3,
        backgroundColor: PLATE_COLORS[String(p)] ?? colors.primary,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {s.w >= 12 && (
        <Text
          numberOfLines={1}
          style={{
            width: s.h - 10,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: '800',
            color: darkText ? '#222' : '#FFF',
            transform: [{ rotate: '-90deg' }],
          }}
        >
          {formatNumber(p)}
        </Text>
      )}
    </View>
  );
}

/** délka kusu osy vlevo od kotoučů */
const SHAFT_W = 44;

function BarbellSide({ plates, collars, unit }: { plates: number[]; collars: boolean; unit: 'kg' | 'lb' }) {
  const big = plates.filter((p) => !isSmallPlate(p, unit));
  const small = plates.filter((p) => isSmallPlate(p, unit));
  return (
    <View style={styles.barWrap}>
      {/* krátký kus osy zleva až k místu, kde začínají kotouče */}
      <View style={[styles.shaft, { width: SHAFT_W }]} />
      <View style={{ position: 'absolute', left: SHAFT_W, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' }}>
        {/* objímka osy pod kotouči, uzávěrem, malými kotouči a kouskem za nimi */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 12 }}>
          <View style={styles.sleeve} />
          {big.map((p, i) => (
            <Plate key={i} p={p} unit={unit} />
          ))}
          {collars && (
            <View style={styles.collar}>
              <View style={styles.collarKnob} />
              <View style={styles.collarLine} />
            </View>
          )}
          {/* malé kotouče samostatně na ose vpravo od uzávěru */}
          {small.length > 0 && (
            <View style={{ marginLeft: 3, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {small.map((p, i) => (
                <Plate key={i} p={p} unit={unit} />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
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
        <Button small kind="secondary" title={`${formatNumber(target, 0)} ${unit}`} onPress={() => setPick(true)} />
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
      <BarbellSide plates={r.plates} collars={collars} unit={unit} />
      <T style={{ fontWeight: '700' }}>
        {t('tr.perSide')}: {r.plates.length ? r.plates.map((p) => formatNumber(p)).join(' + ') : '—'}
      </T>
      {Math.abs(r.remainder) > 0.01 && (
        <T v="small" color={colors.danger}>
          {t('tr.cantLoad')} ({formatNumber(r.remainder)} {unit})
        </T>
      )}
      <Sheet visible={pick} onClose={() => setPick(false)} title={t('tr.targetWeight')}>
        {pick && (
          <View style={{ alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
            <Wheel
              label={unit}
              values={unit === 'kg' ? range(5, 300, 1) : range(15, 660, 1)}
              value={target}
              onChange={setTarget}
              format={(x) => formatNumber(x, 0)}
              width={140}
            />
            <Button title={t('common.done')} onPress={() => setPick(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        )}
      </Sheet>
    </Card>
  );
}

/* -------------------------------- Sinclair -------------------------------- */

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
        <Button small kind="secondary" title={formatBodyweight(bw, unit)} onPress={() => setEdit('bw')} />
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
          {formatNumber(sinclairTotal(gender, bw, total), 2)} {t('tr.points')}
        </T>
      </Row>
      <WeightSheet
        visible={edit !== null}
        title={edit === 'bw' ? t('pr.bodyweight') : t('tr.total')}
        kg={edit === 'bw' ? bw : total}
        min={edit === 'bw' ? 30 : 0}
        decimals={edit === 'bw'}
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
  barWrap: { height: 124, justifyContent: 'center', overflow: 'hidden' },
  shaft: { position: 'absolute', left: 0, height: 12, borderRadius: 3, top: 56, backgroundColor: '#B8BEC8' },
  sleeve: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    top: '50%',
    marginTop: -10,
    borderRadius: 4,
    backgroundColor: '#9AA1AD',
  },
  collar: {
    width: 20,
    height: 50,
    marginLeft: 2,
    borderRadius: 5,
    backgroundColor: '#20242B',
    borderWidth: 2,
    borderColor: '#EDEFF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collarKnob: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#EDEFF3' },
  collarLine: { position: 'absolute', bottom: 6, width: 10, height: 2, borderRadius: 1, backgroundColor: '#EDEFF3' },
});
