import { describe, expect, it } from 'vitest';
import { leseAlsPolynom, istNormalform, leseTerm } from '../mathe/term-parser';
import { ergebnis, format, g, glied, kl, loese, wert, type Summe } from './termbaum';
import { formel } from './gemeinsam';

// a·(a − (3c + 2a))
const verschachtelt: Summe = [kl(glied(1, { a: 1 }), [g(1, { a: 1 }), kl(glied(-1), [g(3, { c: 1 }), g(2, { a: 1 })])])];
// 15xy·(3x + 4xy) − 3x²y
const zweiTeile: Summe = [kl(glied(15, { x: 1, y: 1 }), [g(3, { x: 1 }), g(4, { x: 1, y: 1 })]), g(-3, { x: 2, y: 1 })];
// 5x − (2x − 3)
const minusKlammer: Summe = [g(5, { x: 1 }), kl(glied(-1), [g(2, { x: 1 }), g(-3)])];

describe('Termbaum', () => {
  it('Anzeige', () => {
    expect(format(verschachtelt, 'text')).toBe('a·(a − (3c + 2a))');
    expect(format(zweiTeile, 'text')).toBe('15xy·(3x + 4xy) − 3x²y');
    expect(format(minusKlammer, 'text')).toBe('5x − (2x − 3)');
    expect(format(minusKlammer, 'latex')).toBe('5x - \\left(2x - 3\\right)');
  });

  it('Anzeige und Wert passen zusammen (Text wird unabhängig gelesen)', () => {
    for (const t of [verschachtelt, zweiTeile, minusKlammer]) expect(leseAlsPolynom(format(t, 'text'))!.gleich(wert(t))).toBe(true);
  });

  it('Lösungsweg wie im Unterricht', () => {
    expect(loese(verschachtelt).map((s) => format(s, 'text'))).toEqual(['a·(a − 3c − 2a)', 'a·(−a − 3c)', '−a² − 3ac']);
    expect(loese(zweiTeile).map((s) => format(s, 'text'))).toEqual(['45x²y + 60x²y² − 3x²y', '60x²y² + 42x²y']);
    expect(loese(minusKlammer).map((s) => format(s, 'text'))).toEqual(['5x − 2x + 3', '3x + 3']);
  });

  it('jeder Schritt ist gleichwertig, Ergebnis in Normalform', () => {
    for (const t of [verschachtelt, zweiTeile, minusKlammer]) {
      for (const s of loese(t)) expect(wert(s).gleich(wert(t))).toBe(true);
      expect(istNormalform(leseTerm(formel(ergebnis(t)).text))).toBe(true);
    }
  });

  it('typische Fehler', () => {
    expect(formel(ergebnis(minusKlammer, 'KL')).text).toBe('3x − 3');
    // PO: xy·x = xy statt x²y
    expect(formel(ergebnis(zweiTeile, 'PO')).text).toBe('−3x²y + 105xy');
    // KL innen: −(3c + 2a) → −3c + 2a; außen a·(3a − 3c) → 3a² − 3c
    expect(formel(ergebnis(verschachtelt, 'KL')).text).toBe('3a² − 3c');
  });
});
