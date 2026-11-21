import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseAlsPolynom } from '../mathe/term-parser';
import { casErgebnisse as gen, casText } from './t8-cas-ergebnisse';

const KOMB = [['I', 'auswahl'], ['II', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));
const casPoly = (t: string) => leseAlsPolynom(t.replace(/\*/g, '·'))!;

describe('t8-cas-ergebnisse', () => {
  it('CAS-Schreibweise', () => {
    expect(casText([{ koeffizient: Bruch.von(2), monom: { x: 2 } }, { koeffizient: Bruch.von(-1), monom: { x: 1 } }, { koeffizient: Bruch.von(-6), monom: {} }])).toBe('2*x^2-x-6');
  });

  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('AFB I: die richtige Option ist gleichwertig zur CAS-Ausgabe, die anderen nicht; CAS-Ein- und Ausgabe passen zusammen', () => {
    for (const a of aufgaben.filter((x) => x.afb === 'I')) {
      const [ein, aus] = a.aufgabe.text.split(' ▸ ');
      const inner = /^\w+\((.*)\)$/.exec(ein!)![1]!;
      expect(casPoly(inner).gleich(casPoly(aus!)), a.aufgabe.text).toBe(true);
      for (const o of a.optionen!) expect(leseAlsPolynom(o.formel.text)!.gleich(casPoly(aus!)), o.formel.text).toBe(o.richtig);
    }
  });

  it('AFB II: Aussage stimmt mit dem unabhängigen Vergleich überein; beide Fälle kommen vor', () => {
    let gleich = 0;
    for (const a of aufgaben.filter((x) => x.afb === 'II')) {
      const hand = /und (.*) erhalten\./.exec(a.anweisung)![1]!;
      const aus = a.aufgabe.text.split(' ▸ ')[1]!;
      const g = leseAlsPolynom(hand)!.gleich(casPoly(aus));
      if (g) gleich++;
      expect(a.loesung.text.startsWith('Beide Ergebnisse sind gleichwertig'), a.anweisung).toBe(g);
      // Term in der Anweisung und CAS-Eingabe sind derselbe Term
      const term = /hat (.*) von Hand/.exec(a.anweisung)![1]!;
      expect(leseAlsPolynom(term)!.gleich(casPoly(aus))).toBe(true);
    }
    expect(gleich).toBeGreaterThan(300);
    expect(gleich).toBeLessThan(700);
  });

  it('Auswahl: genau eine richtig, Optionen verschieden, Fehlertyp DA', () => {
    for (const a of aufgaben) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      expect(new Set(o.map((x) => x.formel.text)).size).toBe(o.length);
      o.forEach((x, i) => {
        if (!x.richtig) expect(x.fehlertyp).toBe('DA');
        expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
      });
      expect(a.ohneHilfsmittel).toBe(false);
    }
  });
});
