import { describe, expect, it } from 'vitest';
import { gleichwertigeTerme } from './auswertung';
import { leseTerm } from './term-parser';

const gw = (a: string, b: string) => gleichwertigeTerme(leseTerm(a), leseTerm(b));

describe('Gleichwertigkeit (auch Bruchterme und Formeln)', () => {
  it.each([
    ['3/(8x) · x²/9', 'x/24'],
    ['(x³ + x²)/x²', 'x + 1'],
    ['(a² − b²)/(a − b)', 'a + b'],
    ['x²/(x³ + x²)', '1/(x + 1)'],
    ['2A/h − a', '(2A − a·h)/h'],
    ['ρ·l/A', 'ρl/A'],
    ['U/(2π)', 'U/2/π'],
  ])('%s = %s', (a, b) => expect(gw(a, b)).toBe(true));

  it.each([
    ['(x³ + x²)/x²', 'x³ + 1'],
    ['(a² − b²)/(a − b)', 'a − b'],
    ['2A/h − a', '2A − a/h'],
    ['x/24', 'x/23'],
  ])('%s ≠ %s', (a, b) => expect(gw(a, b)).toBe(false));
});
