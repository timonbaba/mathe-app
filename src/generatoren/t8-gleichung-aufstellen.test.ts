import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseTerm } from '../mathe/term-parser';
import { unabhaengigeLoesung } from './gleichung-tests';
import { gleichungAufstellen as gen } from './t8-gleichung-aufstellen';
import { werteAus } from './test-hilfen';

const KOMB = [['II', 'eingabe'], ['II', 'auswahl'], ['III', 'eingabe'], ['III', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

describe('t8-gleichung-aufstellen', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Lösung positiv und ganzzahlig; Antwortsatz passt zur unabhängig gelösten Gleichung', () => {
    for (const a of aufgaben) {
      const gl = /Gleichung: (.*)$/.exec(a.hilfen.ansatz.text)![1]!;
      const m = unabhaengigeLoesung(gl, 'x');
      expect(m.art).toBe('endlich');
      if (m.art !== 'endlich') continue;
      const x = m.werte[0]!;
      expect(x.istGanz() && !x.istNegativ() && !x.istNull(), gl).toBe(true);
      const antwort = /→ (−?\d+)/.exec(a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text)![1]!;
      if (a.typ === 'eingabe') expect(a.loesung.text.split(' ')[0]).toBe(antwort);
    }
  });

  it('Probe am Text (Stichproben je Vorlage): die Zahlen im Text passen zur Lösung', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const t = a.aufgabe.text;
      const x = Bruch.parse(a.loesung.text.split(' ')[0]!)!;
      const zahlen = [...t.matchAll(/\d+/g)].map((m) => Number(m[0]));
      if (t.includes('Rechteck')) {
        const [diff, u] = zahlen;
        const breite = x;
        expect(breite.plus(diff!).plus(breite).mal(2).gleich(u!)).toBe(true);
      }
      if (t.includes('Dreieck')) {
        const plus = zahlen[0]!;
        const k = t.includes('doppelt') ? 2 : 3;
        expect(x.plus(x.mal(k)).plus(x.plus(plus)).gleich(180)).toBe(true);
      }
      if (t.includes('Jahre älter')) {
        const [diff, summe] = zahlen;
        expect(x.plus(x.plus(diff!)).gleich(summe!)).toBe(true);
      }
    }
  });

  it('Auswahl: genau eine passende Gleichung; Fehloptionen haben eine andere Lösung (TV)', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      expect(new Set(o.map((x) => x.formel.text)).size).toBe(o.length);
      const richtig = unabhaengigeLoesung(a.loesung.text, 'x');
      for (const x of o.filter((y) => !y.richtig)) {
        expect(x.fehlertyp).toBe('TV');
        const [l, r] = x.formel.text.split(' = ');
        const w = richtig.art === 'endlich' ? richtig.werte[0]! : Bruch.NULL;
        expect(werteAus(leseTerm(l!), { x: w }).gleich(werteAus(leseTerm(r!), { x: w })), x.formel.text).toBe(false);
      }
      o.forEach((x, i) => expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch'));
    }
  });

  it('Eingabe: mit und ohne Einheit richtig; Unsinn unlesbar', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const zahl = a.loesung.text.split(' ')[0]!;
      expect(a.pruefe(zahl).ergebnis).toBe('richtig');
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      expect(a.pruefe(`x = ${zahl}`).ergebnis).toBe('richtig');
      expect(a.pruefe('keine Ahnung').ergebnis).toBe('unlesbar');
    }
  });

  it('alle Vorlagen kommen vor; Vielfalt', () => {
    for (const w of ['vermindert', 'vermehrt', 'nimmt das Ergebnis', 'aufeinanderfolgenden', 'Jahre älter', 'Rechteck', 'Hefte', 'Dreieck']) {
      expect(aufgaben.filter((a) => a.aufgabe.text.includes(w)).length, w).toBeGreaterThan(50);
    }
    for (const [afb, typ] of KOMB) expect(new Set(aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text)).size).toBeGreaterThan(400);
  });
});
