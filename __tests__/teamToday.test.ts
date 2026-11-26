import { describe, expect, test } from '@jest/globals';
import { teamToday } from '../src/lib/coach';
import type { Profile, TeamMember, WorkoutLog } from '../src/lib/types';

const NOW = new Date(2026, 10, 25, 12, 0, 0); // středa
const prof = (id: string): Profile =>
  ({ id, firstName: id, lastName: '', avatarUrl: null, createdAt: '2026-01-01' }) as unknown as Profile;
const log = (date: string, over: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: date,
  date,
  planId: null,
  dayId: null,
  title: 'T',
  exercises: [],
  createdAt: `${date}T10:00:00Z`,
  ...over,
});
const member = (id: string, over: Partial<TeamMember>): TeamMember => ({
  profile: prof(id),
  status: 'accepted',
  shareBodyweight: false,
  createdAt: '2026-01-01T00:00:00Z',
  maxes: {},
  recentLogs: [],
  recentWellness: [],
  planWeekdays: [],
  ...over,
});

describe('přehled týmu', () => {
  test('rozdělí svěřence do skupin', () => {
    const team = [
      // trénuje Po/St; dnes (St) trénoval, v pondělí ne
      member('a', { planWeekdays: [0, 2], recentLogs: [log('2026-11-25'), log('2026-11-20')] }),
      // dnes má trénink, ještě nezapsal; v úterý vynechal
      member('b', { planWeekdays: [1, 2], recentLogs: [log('2026-11-21')] }),
      // bolest kolene v regeneraci, nízká připravenost
      member('c', {
        recentLogs: [log('2026-11-24')],
        recentWellness: [{ date: '2026-11-25', sleepHours: 5, sleep: 1, energy: 1, soreness: 1, mood: 2, pain: { area: 'knee', level: 4 }, updatedAt: '' }],
      }),
      // dlouho netrénoval, špatný pocit před 10 dny se už nepočítá
      member('d', { recentLogs: [log('2026-11-15', { feeling: 'bad' })] }),
      member('e', { status: 'pending' }),
    ];
    const o = teamToday(team, NOW);
    expect(o.total).toBe(4);
    expect(o.trainedToday.map((r) => r.member.profile.id)).toEqual(['a']);
    expect(o.plannedToday.map((r) => r.member.profile.id)).toEqual(['b']);
    expect(o.missed.map((r) => [r.member.profile.id, r.missed])).toEqual([
      ['a', ['2026-11-23']],
      ['b', ['2026-11-24']],
    ]);
    expect(o.pain.map((r) => r.member.profile.id)).toEqual(['c']);
    expect(o.pain[0].pain).toEqual({ area: 'knee', level: 4, note: null });
    expect(o.lowReadiness.map((r) => r.member.profile.id)).toEqual(['c']);
    expect(o.inactive.map((r) => r.member.profile.id)).toEqual(['d']);
  });
});
