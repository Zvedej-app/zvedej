import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { defaultPctOf, maxLiftIds } from '../../lib/training';
import type { LoadSpec, SetScheme } from '../../lib/types';
import { formatNumber, formatWeight, ROUND_KG, roundTo, toDisplay, toStoredKg } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, Chip, Row, Segmented, Sheet, T } from '../ui';
import { range, Wheel } from '../WheelPicker';

const SETS = range(1, 20);
const REPS = range(1, 30);
const PCT = range(20, 150, 1);
const RPE = range(5, 10, 0.5);
const KG_VALUES = range(0, 400, 1);
const LB_VALUES = range(0, 880, 1);

interface SchemeSheetProps {
  visible: boolean;
  scheme: SetScheme | null;
  exerciseId: string;
  onClose: () => void;
  onSave: (s: SetScheme) => void;
  onDelete?: () => void;
}

export function SchemeSheet(props: SchemeSheetProps) {
  const { settings } = useSettings();
  const { data } = useTraining();
  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      title={exerciseName(props.exerciseId, settings.lang, data.customExercises)}
    >
      {/* obsah se vytvoří při otevření, takže převezme aktuální hodnoty */}
      {props.visible && <SchemeBody {...props} />}
    </Sheet>
  );
}

function SchemeBody({ scheme, exerciseId, onClose, onSave, onDelete }: SchemeSheetProps) {
  const { t, settings } = useSettings();
  const { data } = useTraining();
  const unit = settings.unit;
  const l = scheme?.load;
  const [sets, setSets] = useState(scheme?.sets ?? 3);
  const [reps, setReps] = useState(scheme?.reps ?? 3);
  const [type, setType] = useState<LoadSpec['type']>(l?.type ?? 'percent');
  const [pct, setPct] = useState(l?.type === 'percent' ? l.value : 75);
  const [of, setOf] = useState(l?.type === 'percent' ? l.of : defaultPctOf(exerciseId));
  const [kgDisp, setKgDisp] = useState(
    l?.type === 'kg' ? Math.round(toDisplay(l.value, unit)) : unit === 'kg' ? 60 : 135,
  );
  const [rpe, setRpe] = useState(l?.type === 'rpe' ? l.value : 8);

  const lifts = useMemo(() => Array.from(new Set([defaultPctOf(exerciseId), ...maxLiftIds(data)])), [exerciseId, data]);
  const max = data.maxes[of];

  const save = () => {
    let load: LoadSpec;
    if (type === 'percent') load = { type, value: pct, of };
    else if (type === 'kg') load = { type, value: toStoredKg(kgDisp, unit) };
    else if (type === 'rpe') load = { type, value: rpe };
    else load = { type: 'none' };
    onSave({ id: scheme?.id ?? '', sets, reps, load });
    onClose();
  };

  return (
    <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 8 }}>
      <Segmented
        value={type}
        onChange={setType}
        options={[
          { key: 'percent', label: t('tr.loadPercent') },
          { key: 'kg', label: unit },
          { key: 'rpe', label: t('tr.loadRpe') },
          { key: 'none', label: t('tr.loadNone') },
        ]}
      />
      <Row style={{ justifyContent: 'space-around' }} gap={0}>
        <Wheel label={t('tr.sets')} values={SETS} value={sets} onChange={setSets} />
        <T v="h2" muted style={{ marginTop: 22 }}>
          ×
        </T>
        <Wheel label={t('tr.reps')} values={REPS} value={reps} onChange={setReps} />
        {type === 'percent' && (
          <Wheel label="%" values={PCT} value={pct} onChange={setPct} format={(v) => `${v} %`} width={100} />
        )}
        {type === 'kg' && (
          <Wheel
            label={unit}
            values={unit === 'kg' ? KG_VALUES : LB_VALUES}
            value={kgDisp}
            onChange={setKgDisp}
            format={(v) => formatNumber(v)}
            width={100}
          />
        )}
        {type === 'rpe' && <Wheel label="RPE" values={RPE} value={rpe} onChange={setRpe} format={(v) => formatNumber(v)} />}
      </Row>

      {type === 'percent' && (
        <View style={{ gap: 8 }}>
          <T v="label" muted>
            {t('tr.fromMyMax')}
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {lifts.map((l) => (
              <Chip key={l} label={exerciseName(l, settings.lang)} on={of === l} onPress={() => setOf(l)} />
            ))}
          </ScrollView>
          <T v="small" muted>
            {max
              ? `${exerciseName(of, settings.lang)}: ${formatWeight(max, unit)} → ${pct} % = ${formatWeight(
                  roundTo((max * pct) / 100, ROUND_KG),
                  unit,
                )}`
              : t('tr.maxesHint')}
          </T>
        </View>
      )}

      <Row>
        {onDelete && (
          <Button
            kind="ghost"
            icon="trash-outline"
            title={t('common.delete')}
            onPress={() => {
              onDelete();
              onClose();
            }}
          />
        )}
        <Button title={t('common.done')} onPress={save} style={{ flex: 1 }} />
      </Row>
    </ScrollView>
  );
}

/** Výběr opakování a váhy pro jednu sérii při zapisování tréninku. */
interface SetSheetProps {
  visible: boolean;
  reps: number;
  kg: number;
  title: string;
  onClose: () => void;
  onSave: (reps: number, kg: number) => void;
  onDelete?: () => void;
}

export function SetSheet(props: SetSheetProps) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title={props.title}>
      {props.visible && <SetBody {...props} />}
    </Sheet>
  );
}

function SetBody({ reps, kg, onClose, onSave, onDelete }: SetSheetProps) {
  const { t, settings } = useSettings();
  const unit = settings.unit;
  const [r, setR] = useState(reps);
  const [w, setW] = useState(() => Math.round(toDisplay(kg, unit)));

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <Row style={{ justifyContent: 'space-evenly' }}>
        <Wheel label={t('tr.reps')} values={REPS} value={r} onChange={setR} />
        <T v="h2" muted style={{ marginTop: 22 }}>
          ×
        </T>
        <Wheel
          label={unit}
          values={unit === 'kg' ? KG_VALUES : LB_VALUES}
          value={w}
          onChange={setW}
          format={(v) => formatNumber(v)}
          width={110}
        />
      </Row>
      <Row>
        {onDelete && (
          <Button
            kind="ghost"
            icon="trash-outline"
            title={t('common.delete')}
            onPress={() => {
              onDelete();
              onClose();
            }}
          />
        )}
        <Button
          title={t('common.done')}
          style={{ flex: 1 }}
          onPress={() => {
            onSave(r, toStoredKg(w, unit));
            onClose();
          }}
        />
      </Row>
    </View>
  );
}
