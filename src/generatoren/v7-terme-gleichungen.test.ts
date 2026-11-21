import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseLoesungsmenge, type Loesungsmenge } from '../mathe/loesungsmenge';
import { leseTerm } from '../mathe/term-parser';
import { differenz, pflichttestsGleichung, variableVon } from './gleichung-tests';
import { pflichttestsTermVereinfachen, werteAus } from './test-hilfen';
import type { Aufgabe, Generator } from './typen';
import { formelUmstellenKl7, gleichungInhaltlich, gleichungLinearKl7, gleichungVariableImNenner, termZusammenfassenKl7, zahlMalSumme } from './v7-terme-gleichungen';

const werte = (m: Loesungsmenge | null): Bruch[] => (m && m.art === 'endlich' ? [...m.werte] : []);

describe('v7-term-zusammenfassen', () => {
  pflichttestsTermVereinfachen(termZusammenfassenKl7, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['ZF', 'VZ'],
    maxKoeffizient: 60,
    maxHochzahl: 2,
    mindestAnzahlVerschieden: { I: 500, II: 700 },
  });
});

describe('v7-zahl-mal-summe', () => {
  pflichttestsTermVereinfachen(zahlMalSumme, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['KL', 'VZ'],
    maxKoeffizient: 120,
    maxHochzahl: 1,
    bruchKoeffizienten: true,
    mindestAnzahlVerschieden: { I: 500, II: 700 },
  });
});

/** Unabhängige Prüfung für „im Kopf“-Gleichungen (auch Betrag). */
function pruefeInhaltlich(a: Aufgabe) {
  const v = variableVon(a);
  const m = werte(leseLoesungsmenge(a.loesung.text, v));
  expect(m.length).toBeGreaterThan(0);
  const betrag = /^\|(.*)\| = (\d+)$/.exec(a.aufgabe.text);
  if (betrag) {
    const innen = leseTerm(betrag[1]!);
    expect(m).toHaveLength(2);
    for (const x of m) expect(werteAus(innen, { [v]: x }).betrag().gleich(Bruch.von(Number(betrag[2])))).toBe(true);
    return;
  }
  const f = differenz(a.aufgabe.text, v);
  for (const x of m) expect(f(x).istNull(), `${a.aufgabe.text} bei ${x}`).toBe(true);
  expect(f(Bruch.von(1001, 7)).istNull()).toBe(false);
  if (!a.aufgabe.text.includes('·(')) expect(m).toHaveLength(1);
  else expect(m).toHaveLength(2);
}

function suite(gen: Generator, komb: readonly (readonly ['I' | 'II', 'eingabe' | 'auswahl'])[], pruefe: (a: Aufgabe) => void) {
  const aufgaben = komb.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));
  it('Determinismus', () => {
    for (const [afb, typ] of komb) for (let s = 0; s < 50; s++) expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
  });
  it('Korrektheit (unabhängig)', () => {
    for (const a of aufgaben) pruefe(a);
  });
  it('Eingabe/Auswahl', () => {
    for (const a of aufgaben) {
      if (a.typ === 'eingabe') {
        expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
        expect(a.pruefe('abc').ergebnis).toBe('unlesbar');
      } else {
        const o = a.optionen!;
        expect(o.length).toBeGreaterThanOrEqual(3);
        expect(o.filter((x) => x.richtig)).toHaveLength(1);
        expect(new Set(o.map((x) => x.formel.text)).size).toBe(o.length);
        o.forEach((x, i) => expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch'));
      }
      expect(a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text).toBe(a.loesung.text);
    }
  });
  it('Vielfalt', () => {
    for (const [afb, typ] of komb) expect(new Set(aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text)).size).toBeGreaterThan(300);
  });
  return aufgaben;
}

describe('v7-gleichung-inhaltlich', () => {
  const aufgaben = suite(gleichungInhaltlich, [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']], pruefeInhaltlich);
  it('Betrag und Produkt = 0 kommen vor', () => {
    expect(aufgaben.filter((a) => a.aufgabe.text.startsWith('|')).length).toBeGreaterThan(500);
    expect(aufgaben.filter((a) => a.aufgabe.text.includes(')·(')).length).toBeGreaterThan(500);
  });
});

describe('v7-gleichung-linear', () => {
  pflichttestsGleichung(gleichungLinearKl7, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['KL', 'VZ', 'UM'],
    variable: variableVon,
    mindestVerschieden: 700,
  });
});

describe('v7-gleichung-variable-im-nenner', () => {
  suite(gleichungVariableImNenner, [['II', 'eingabe'], ['II', 'auswahl']], (a) => {
    const v = variableVon(a);
    const m = werte(leseLoesungsmenge(a.loesung.text, v));
    expect(m).toHaveLength(1);
    const f = differenz(a.aufgabe.text, v);
    expect(f(m[0]!).istNull(), a.aufgabe.text).toBe(true);
    // f(x)·x ist linear und hat genau diese Nullstelle
    const g = (x: Bruch) => f(x).mal(x);
    const s1 = g(Bruch.von(3)).minus(g(Bruch.von(1))).durch(Bruch.von(2));
    expect(g(Bruch.von(10)).minus(g(Bruch.von(1))).gleich(s1.mal(9))).toBe(true);
    expect(s1.istNull()).toBe(false);
  });
});

describe('v7-formel-umstellen', () => {
  it('nutzt die geprüften Formel-Vorlagen und liefert Aufgaben für alle AFB', () => {
    for (const afb of ['I', 'II', 'III'] as const) {
      const a = formelUmstellenKl7.erzeuge(1, { afb, typ: 'eingabe' });
      expect(a.baustein).toBe('v7-formel-umstellen');
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
    }
  });
});
