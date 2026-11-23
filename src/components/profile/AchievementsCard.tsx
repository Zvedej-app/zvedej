import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ACHIEVEMENTS, achievementStats } from '../../lib/achievements';
import { notify } from '../../lib/dialog';
import { FONTS } from '../../lib/theme';
import { formatNumber } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Card, PressScale, Row, T } from '../ui';

/** Odznaky za tréninkové milníky – získané barevně, ostatní šedě s postupem. */
export function AchievementsCard() {
  const { t, colors } = useSettings();
  const { data } = useTraining();
  const stats = achievementStats(data);
  const items = ACHIEVEMENTS.map((a) => {
    const [v, goal] = a.progress(stats);
    return { a, v: Math.min(v, goal), goal, done: v >= goal };
  });
  const got = items.filter((i) => i.done).length;

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="label" muted>
          {t('ach.title')}
        </T>
        <T v="small" muted style={{ fontFamily: FONTS.semi }}>
          {t('ach.count', { n: got, total: items.length })}
        </T>
      </Row>
      <View style={styles.grid}>
        {items.map(({ a, v, goal, done }) => (
          <PressScale
            key={a.id}
            accessibilityLabel={t(a.title)}
            onPress={() =>
              notify(`${t(a.desc)}${done ? '' : `\n\n${formatNumber(v, 0)} / ${formatNumber(goal, 0)}`}`, t(a.title))
            }
            style={styles.item}
          >
            <View
              style={[
                styles.icon,
                done
                  ? { backgroundColor: a.color }
                  : { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Ionicons name={done ? a.icon : 'lock-closed'} size={done ? 24 : 18} color={done ? '#FFF' : colors.textMuted} />
            </View>
            {!done && (
              <View style={[styles.bar, { backgroundColor: colors.border }]}>
                <View style={{ width: `${(v / goal) * 100}%`, height: 4, borderRadius: 2, backgroundColor: a.color }} />
              </View>
            )}
            <Text numberOfLines={2} style={[styles.name, { color: done ? colors.text : colors.textMuted }]}>
              {t(a.title)}
            </Text>
          </PressScale>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  item: { width: '20%', alignItems: 'center', gap: 5 },
  icon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  bar: { width: 40, height: 4, borderRadius: 2, overflow: 'hidden' },
  name: { fontSize: 11, fontFamily: FONTS.semi, textAlign: 'center', lineHeight: 13 },
});
