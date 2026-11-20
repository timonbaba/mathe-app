import { describe, expect, it } from 'vitest';
import { Zufall } from './zufall';

describe('Zufall', () => {
  it('ist deterministisch: gleicher Seed → gleiche Folge', () => {
    const a = new Zufall(123);
    const b = new Zufall(123);
    for (let i = 0; i < 100; i++) expect(a.ganzzahl(-1000, 1000)).toBe(b.ganzzahl(-1000, 1000));
  });

  it('verschiedene Seeds → verschiedene Folgen', () => {
    const a = Array.from({ length: 10 }, ((z) => () => z.ganzzahl(0, 1e6))(new Zufall(1)));
    const b = Array.from({ length: 10 }, ((z) => () => z.ganzzahl(0, 1e6))(new Zufall(2)));
    expect(a).not.toEqual(b);
  });

  it('bleibt im Bereich und trifft alle Werte', () => {
    const z = new Zufall(5);
    const gesehen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const x = z.ganzzahl(-3, 3);
      expect(x).toBeGreaterThanOrEqual(-3);
      expect(x).toBeLessThanOrEqual(3);
      gesehen.add(x);
    }
    expect(gesehen.size).toBe(7);
  });

  it('ganzzahlOhne liefert nie ausgeschlossene Werte', () => {
    const z = new Zufall(9);
    for (let i = 0; i < 2000; i++) expect([0, 1]).not.toContain(z.ganzzahlOhne(-2, 2, [0, 1]));
    expect(() => z.ganzzahlOhne(0, 0, [0])).toThrow();
  });

  it('gemischt ist eine Permutation und verändert das Original nicht', () => {
    const z = new Zufall(11);
    const original = [1, 2, 3, 4, 5, 6];
    const m = z.gemischt(original);
    expect([...m].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('lehnt ungültige Seeds und Bereiche ab', () => {
    expect(() => new Zufall(-1)).toThrow();
    expect(() => new Zufall(1.5)).toThrow();
    expect(() => new Zufall(1).ganzzahl(3, 2)).toThrow();
  });

  it('referenzwerte bleiben stabil (schützt alte Versuche vor Änderungen am Algorithmus)', () => {
    const z = new Zufall(2026);
    const werte = Array.from({ length: 5 }, () => z.ganzzahl(1, 100));
    expect(werte).toMatchInlineSnapshot(`
      [
        46,
        31,
        67,
        62,
        16,
      ]
    `);
  });
});
