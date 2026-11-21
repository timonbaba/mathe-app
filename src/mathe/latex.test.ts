import { describe, expect, it } from 'vitest';
import { textZuLatex } from './latex';

describe('textZuLatex', () => {
  it.each([
    ['2A/h − a', '\\frac{2A}{h} - a'],
    ['ρ·l/A', '\\frac{\\rho \\cdot l}{A}'],
    ['u = 2·(a + b)', 'u = 2 \\cdot \\left(a + b\\right)'],
    ['h = 3V/a²', 'h = \\frac{3V}{a^{2}}'],
    ['r = u/(2π)', 'r = \\frac{u}{2 \\cdot \\pi}'],
    ['A = (a + c)/2·h', 'A = \\frac{a + c}{2} \\cdot h'],
    ['c = u − a − b', 'c = u - a - b'],
  ])('%s', (t, l) => expect(textZuLatex(t)).toBe(l));
});
