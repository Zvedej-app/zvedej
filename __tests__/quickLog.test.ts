import { describe, expect, test } from '@jest/globals';
import { matchExercise, parseQuickLog } from '../src/lib/quickLog';

const sets = (s: { reps: number; kg: number }[]) => s.map((x) => `${x.reps}x${x.kg}`).join(' ');

describe('Rychlý zápis tréninku', () => {
  test('váha x opakování x nástupy a další skupina za čárkou', () => {
    const [p] = parseQuickLog('Trh 70x2x3, 75x2');
    expect(p.exerciseId).toBe('snatch');
    expect(sets(p.sets)).toBe('2x70 2x70 2x70 2x75');
  });
  test('nástupy x opakování a váha zvlášť', () => {
    const [p] = parseQuickLog('Dřep 5x5 100');
    expect(p.exerciseId).toBe('back_squat');
    expect(p.sets).toHaveLength(5);
    expect(p.sets[0]).toEqual({ reps: 5, kg: 100, done: true });
  });
  test('procenta z maxima', () => {
    const [p] = parseQuickLog('Nadhoz 3x1@85%', [], { clean_jerk: 120 });
    expect(sets(p.sets)).toBe('1x102 1x102 1x102');
  });
  test('procenta bez maxima = srozumitelná chyba', () => {
    expect(parseQuickLog('Nadhoz 3x1@85%')[0].error).toBe('noMax');
  });
  test('bez zátěže', () => {
    expect(sets(parseQuickLog('Shyby 3x10')[0].sets)).toBe('10x0 10x0 10x0');
  });
  test('kg kdekoli a desetinná čárka', () => {
    expect(sets(parseQuickLog('přední dřep 82,5 kg 2x3')[0].sets)).toBe('3x82.5 3x82.5');
  });
  test('skupiny oddělené mezerou', () => {
    expect(sets(parseQuickLog('Trhový tah 90x3 95x3 100x2')[0].sets)).toBe('3x90 3x95 2x100');
  });
  test('neznámý cvik = vlastní, řádek bez čísel = chyba', () => {
    const r = parseQuickLog('Kettlebell swing 3x15 24\nnějaký text');
    expect(r[0].exerciseId).toBeNull();
    expect(r[0].sets).toHaveLength(3);
    expect(r[1].error).toBe('noSets');
  });
  test('zkratky a hovorové názvy', () => {
    expect(matchExercise('benč')).toBe('bench_press');
    expect(matchExercise('mrtvák')).toBe('deadlift');
    expect(matchExercise('Trh z visu')).toBe('hang_snatch');
  });
});
