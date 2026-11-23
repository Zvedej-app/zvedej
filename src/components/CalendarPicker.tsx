import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { parseISODate, toISODate, todayISO, weekdayMon0 } from '../lib/date';
import type { TKey } from '../lib/i18n';
import { radius } from '../lib/theme';
import { useSettings } from '../providers/SettingsProvider';
import { IconButton, Row, T } from './ui';

/** Celý měsíční kalendář pro výběr data (týden začíná pondělím). */
export function CalendarPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { colors, locale, t } = useSettings();
  const sel = parseISODate(value);
  const [month, setMonth] = useState(() => new Date(sel.getFullYear(), sel.getMonth(), 1));
  const today = todayISO();

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = weekdayMon0(first);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(toISODate(new Date(month.getFullYear(), month.getMonth(), d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton name="chevron-back" onPress={() => shift(-1)} />
        <T v="h3" style={{ textTransform: 'capitalize' }}>
          {title}
        </T>
        <IconButton name="chevron-forward" onPress={() => shift(1)} />
      </Row>
      <Row gap={0}>
        {[0, 1, 2, 3, 4, 5, 6].map((w) => (
          <View key={w} style={{ flex: 1, alignItems: 'center' }}>
            <T v="caption" muted style={{ fontWeight: '700' }}>
              {t(`tr.weekday.${w}` as TKey)}
            </T>
          </View>
        ))}
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((iso, i) => {
          const on = iso === value;
          const isToday = iso === today;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              {iso ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onChange(iso)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.pill,
                    backgroundColor: on ? colors.accent : 'transparent',
                    borderWidth: isToday && !on ? 1.5 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <T style={{ fontWeight: on || isToday ? '800' : '500' }} color={on ? '#FFF' : undefined}>
                    {Number(iso.slice(8))}
                  </T>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
