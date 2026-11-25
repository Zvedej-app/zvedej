import { describe, expect, test } from '@jest/globals';
import { sinclairCoefficient, sinclairTotal } from '../src/lib/categories';
import { platesPerSide, PLATES_KG, formatNumber, formatBodyweight, parseNum } from '../src/lib/units';
import { ageOn, consentAge, parseBirthDate } from '../src/lib/age';
import { readiness, readinessLevel } from '../src/lib/wellness';

describe('Sinclair (koeficienty 2021–2024 podle powerlifter.cz)', () => {
  test('muži 81 kg, dvojboj 300 kg', () => {
    // A = 0,722762521, b = 193,609: 10^(A·log10(81/b)²)
    expect(sinclairCoefficient('M', 81)).toBeCloseTo(1.2691, 3);
    expect(sinclairTotal('M', 81, 300)).toBeCloseTo(380.74, 1);
  });
  test('nad hranicí b je koeficient 1', () => {
    expect(sinclairCoefficient('M', 200)).toBe(1);
    expect(sinclairCoefficient('F', 160)).toBe(1);
  });
  test('desetinná hmotnost se počítá přesně', () => {
    expect(sinclairCoefficient('M', 83.4)).toBeLessThan(sinclairCoefficient('M', 83));
  });
});

describe('Kalkulačka kotoučů', () => {
  test('100 kg na 20 kg ose se zámky 2×2,5 kg', () => {
    const r = platesPerSide(100, 20, 5, PLATES_KG);
    expect(r.plates).toEqual([25, 10, 2.5]);
    expect(r.remainder).toBe(0);
  });
  test('lehčí než osa', () => {
    expect(platesPerSide(15, 20, 0, PLATES_KG).plates).toEqual([]);
  });
});

describe('Čísla a jednotky', () => {
  test('čárka i tečka', () => {
    expect(parseNum('83,4')).toBe(83.4);
    expect(parseNum('83.4')).toBe(83.4);
    expect(parseNum('abc')).toBeNull();
  });
  test('tělesná hmotnost s desetinou', () => {
    expect(formatBodyweight(83.4, 'kg')).toMatch(/^83[.,]4 kg$/);
    expect(formatNumber(80, 1)).toBe('80');
  });
});

describe('Věk a souhlas rodičů', () => {
  test('datum narození', () => {
    expect(parseBirthDate('31', '2', '2010')).toBeNull();
    expect(parseBirthDate('5', '6', '2012')).toBe('2012-06-05');
  });
  test('věk k datu', () => {
    expect(ageOn('2010-11-26', new Date(2026, 10, 25))).toBe(15);
    expect(ageOn('2010-11-25', new Date(2026, 10, 25))).toBe(16);
  });
  test('hranice pro souhlas: Česko 15, Slovensko a jinde 16', () => {
    expect(consentAge('CZ')).toBe(15);
    expect(consentAge('SK')).toBe(16);
    expect(consentAge('OTHER')).toBe(16);
  });
});

describe('Deník regenerace', () => {
  const base = { date: '2026-11-25', sleepHours: 8, sleep: 5, energy: 5, soreness: 5, mood: 5, updatedAt: '' };
  test('vše výborně = 100', () => expect(readiness(base)).toBe(100));
  test('krátký spánek a bolest snižují připravenost', () => {
    const low = readiness({ ...base, sleepHours: 4, pain: { area: 'knee', level: 6 } });
    expect(low).toBeLessThan(70);
    expect(readinessLevel(low)).not.toBe('good');
  });
  test('vše nejhůř = 0', () => expect(readiness({ ...base, sleep: 1, energy: 1, soreness: 1, mood: 1 })).toBe(0));
});
