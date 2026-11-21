import { describe, expect, it } from 'vitest';
import { leseTerm } from '../mathe/term-parser';
import { werteAus } from './test-hilfen';
import { potenzWurzel, rationalAddieren, rationalMultiplizieren } from './v7-rationale-zahlen';
import { pflichttestsZahl } from './zahl-tests';

const KOMB = [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']] as const;
const wert = (t: string) => werteAus(leseTerm(t), {});

/** Wurzeln perfekter Quadrate unabhängig ersetzen: √144 → (12) */
function ohneWurzel(t: string): string {
  return t.replace(/√(\d+)/g, (_, n: string) => {
    const r = Math.round(Math.sqrt(Number(n)));
    if (r * r !== Number(n)) throw new Error(`keine Quadratzahl: ${n}`);
    return `(${r})`;
  });
}

describe('v7-rational-addieren', () => {
  const aufgaben = pflichttestsZahl(rationalAddieren, { kombinationen: KOMB, fehlertypen: ['VZ'], wertDerAufgabe: (a) => wert(a.aufgabe.text), mindestVerschieden: 500 });
  it('negative Zahlen kommen in fast jeder Aufgabe vor; AFB II mit Dezimalzahlen und Brüchen', () => {
    expect(aufgaben.filter((a) => a.aufgabe.text.includes('−')).length).toBeGreaterThan(aufgaben.length * 0.8);
    expect(aufgaben.filter((a) => a.afb === 'II' && a.aufgabe.text.includes(',')).length).toBeGreaterThan(300);
    expect(aufgaben.filter((a) => a.afb === 'II' && a.aufgabe.text.includes('/')).length).toBeGreaterThan(300);
  });
});

describe('v7-rational-multiplizieren', () => {
  pflichttestsZahl(rationalMultiplizieren, { kombinationen: KOMB, fehlertypen: ['VZ', 'BR', 'RE'], wertDerAufgabe: (a) => wert(a.aufgabe.text.replace(/(\d+\/\d+) : \((−\d+\/\d+)\)/, '($1)/($2)').replace(/(\d+\/\d+) : (\d+\/\d+)/, '($1)/($2)')), mindestVerschieden: 500 });
});

describe('v7-potenz-wurzel', () => {
  const aufgaben = pflichttestsZahl(potenzWurzel, { kombinationen: KOMB, fehlertypen: ['VZ', 'PO'], wertDerAufgabe: (a) => wert(ohneWurzel(a.aufgabe.text)), mindestVerschieden: 40 });
  it('Fallen „−2⁴ vs. (−2)⁴“ kommen vor', () => {
    expect(aufgaben.filter((a) => /^\(−\d\)/.test(a.aufgabe.text)).length).toBeGreaterThan(100);
    expect(aufgaben.filter((a) => /^−\d[²³⁴⁵]$/.test(a.aufgabe.text)).length).toBeGreaterThan(100);
  });
});
