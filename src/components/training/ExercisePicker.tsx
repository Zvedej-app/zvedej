import React, { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { EXERCISES, GROUP_LABEL, type ExerciseGroup } from '../../data/exercises';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, Field, ListItem, Row, SearchBar, Sheet, T } from '../ui';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function ExercisePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
}) {
  const { t, settings, colors } = useSettings();
  const { data, addCustomExercise } = useTraining();
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState('');

  const sections = useMemo(() => {
    const nq = norm(q);
    const groups = new Map<string, { id: string; name: string }[]>();
    if (data.customExercises.length) {
      groups.set(
        t('tr.customExercise'),
        data.customExercises.filter((c) => !nq || norm(c.name).includes(nq)),
      );
    }
    for (const e of EXERCISES) {
      const name = e.name[settings.lang];
      if (nq && !norm(name).includes(nq) && !norm(e.name.en).includes(nq)) continue;
      const g = GROUP_LABEL[e.group as ExerciseGroup][settings.lang];
      groups.set(g, [...(groups.get(g) ?? []), { id: e.id, name }]);
    }
    return [...groups.entries()].filter(([, v]) => v.length).map(([title, data]) => ({ title, data }));
  }, [q, data.customExercises, settings.lang, t]);

  const pick = (id: string) => {
    onPick(id);
    setQ('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('tr.addExercise')} full>
      <View style={{ paddingHorizontal: 16, gap: 10, flex: 1 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('tr.searchExercise')} />
        <Row>
          <Field
            value={custom}
            onChangeText={setCustom}
            placeholder={t('tr.customExercisePh')}
            style={{ flex: 1 }}
            returnKeyType="done"
          />
          <Button
            small
            icon="add"
            title={t('common.add')}
            disabled={!custom.trim()}
            onPress={() => {
              const id = addCustomExercise(custom);
              setCustom('');
              pick(id);
            }}
          />
        </Row>
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <T v="label" muted style={{ marginTop: 14, marginBottom: 4 }}>
              {section.title}
            </T>
          )}
          renderItem={({ item }) => (
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <ListItem title={item.name} onPress={() => pick(item.id)} />
            </View>
          )}
        />
      </View>
    </Sheet>
  );
}
