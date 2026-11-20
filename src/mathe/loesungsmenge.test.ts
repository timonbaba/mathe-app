import { describe, expect, it } from 'vitest';
import { Bruch } from './bruch';
import { endlich, gleicheMenge, gleicheUngleichungsLoesung, leseLoesungsmenge, leseUngleichungsLoesung, mengeFormel, ungleichungFormel } from './loesungsmenge';

const b = (z: number, n = 1) => Bruch.von(z, n);

describe('Lösungsmengen', () => {
  it.each([
    ['x = 3', 'L = {3}'],
    ['3', 'L = {3}'],
    ['L = {3}', 'L = {3}'],
    ['L={-3/4}', 'L = {−3/4}'],
    ['x = −0,75', 'L = {−3/4}'],
    ['{0; 3}', 'L = {0; 3}'],
    ['L = {3; 0}', 'L = {0; 3}'],
    ['x = 0 oder x = 3', 'L = {0; 3}'],
    ['x₁ = 0; x₂ = 3', 'L = {0; 3}'],
    ['x1 = 0, x2 = 1,5', 'L = {0; 3/2}'],
    ['L = { }', 'L = { }'],
    ['L = {}', 'L = { }'],
    ['∅', 'L = { }'],
    ['keine Lösung', 'L = { }'],
    ['L = ℚ', 'L = ℚ'],
    ['L = Q', 'L = ℚ'],
    ['unendlich viele Lösungen', 'L = ℚ'],
  ])('%s → %s', (e, erwartet) => {
    const m = leseLoesungsmenge(e, 'x');
    expect(m && mengeFormel(m).text).toBe(erwartet);
  });

  it.each(['', 'x =', 'L = {a}', 'y = 3', 'drei'])('unverständlich: "%s"', (e) => {
    expect(leseLoesungsmenge(e, 'x')).toBeNull();
  });

  it('Vergleich unabhängig von Reihenfolge und Schreibweise', () => {
    expect(gleicheMenge(endlich(b(3), b(0)), endlich(b(0), b(3)))).toBe(true);
    expect(gleicheMenge(endlich(b(1, 2)), leseLoesungsmenge('0,5', 'x')!)).toBe(true);
    expect(gleicheMenge({ art: 'leer' }, endlich())).toBe(false);
  });

  it('LaTeX', () => {
    expect(mengeFormel(endlich(b(-1, 6), b(2))).latex).toBe('L = \\{-\\frac{1}{6};\\ 2\\}');
  });
});

describe('Ungleichungen', () => {
  it.each([
    ['x < 3', 'x < 3'],
    ['x<=3', 'x ≤ 3'],
    ['x >= -1/2', 'x ≥ −1/2'],
    ['3 > x', 'x < 3'],
    ['−2 ≤ x', 'x ≥ −2'],
    ['L = {x | x > 1,5}', 'x > 3/2'],
    ['L = { }', 'L = { }'],
    ['L = ℚ', 'L = ℚ'],
  ])('%s → %s', (e, erwartet) => {
    const l = leseUngleichungsLoesung(e, 'x');
    expect(l && ungleichungFormel(l, 'x').text).toBe(erwartet);
  });

  it.each(['x = 3', '', 'x < a', '3'])('unverständlich: "%s"', (e) => {
    expect(leseUngleichungsLoesung(e, 'x')).toBeNull();
  });

  it('Vergleich', () => {
    expect(gleicheUngleichungsLoesung(leseUngleichungsLoesung('x<3', 'x')!, leseUngleichungsLoesung('3>x', 'x')!)).toBe(true);
    expect(gleicheUngleichungsLoesung(leseUngleichungsLoesung('x<3', 'x')!, leseUngleichungsLoesung('x≤3', 'x')!)).toBe(false);
  });
});
