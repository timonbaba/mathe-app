import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseUngleichungsLoesung, type Relation } from '../mathe/loesungsmenge';
import { leseTerm } from '../mathe/term-parser';
import { variableVon } from './gleichung-tests';
import { ungleichung as gen } from './t8-ungleichung';
import { werteAus } from './test-hilfen';

const KOMB = [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

const vergleiche = (a: Bruch, rel: Relation, b: Bruch) => {
  const c = a.vergleiche(b);
  return rel === '<' ? c < 0 : rel === '>' ? c > 0 : rel === '≤' ? c <= 0 : c >= 0;
};

describe('t8-ungleichung', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit (unabhängig): Ungleichung und Lösung stimmen an vielen Stellen überein, auch an der Grenze', () => {
    for (const a of aufgaben) {
      const v = variableVon(a);
      const m = /^(.*) ([<>≤≥]) (.*)$/.exec(a.aufgabe.text)!;
      const [l, rel, r] = [leseTerm(m[1]!), m[2] as Relation, leseTerm(m[3]!)];
      const lsg = leseUngleichungsLoesung(a.loesung.text, v)!;
      expect(lsg.art).toBe('intervall');
      if (lsg.art !== 'intervall') continue;
      const stellen = [lsg.grenze, lsg.grenze.plus(Bruch.von(1, 1000)), lsg.grenze.minus(Bruch.von(1, 1000))];
      for (let i = -30; i <= 30; i += 3) stellen.push(Bruch.von(i, 2));
      for (const x of stellen) {
        const original = vergleiche(werteAus(l, { [v]: x }), rel, werteAus(r, { [v]: x }));
        expect(original, `${a.aufgabe.text} bei ${x}`).toBe(vergleiche(x, lsg.relation, lsg.grenze));
      }
    }
  });

  it('in vielen Aufgaben muss das Zeichen umgedreht werden; der Lösungsweg weist darauf hin', () => {
    const mitUmdrehen = aufgaben.filter((a) => a.hilfen.loesungsweg.some((z) => z.text.includes('Zeichen umdrehen')));
    expect(mitUmdrehen.length).toBeGreaterThan(aufgaben.length * 0.4);
  });

  it('Eingabe: Schreibweisen; „nicht umgedreht“ wird als UM erkannt', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const v = variableVon(a);
      const l = leseUngleichungsLoesung(a.loesung.text, v)!;
      if (l.art !== 'intervall') continue;
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      const umgekehrt = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' }[l.relation];
      expect(a.pruefe(`${l.grenze.alsText()} ${umgekehrt} ${v}`).ergebnis).toBe('richtig'); // Zahl links
      expect(a.pruefe(`L = {${v} | ${a.loesung.text}}`).ergebnis).toBe('richtig');
      const nichtUmgedreht = a.pruefe(`${v} ${umgekehrt} ${l.grenze.alsText()}`);
      expect(nichtUmgedreht.ergebnis).toBe('falsch');
      // typischer Fehler nur, wenn im Lösungsweg wirklich umgedreht werden muss
      if (a.hilfen.loesungsweg.some((z) => z.text.includes('Zeichen umdrehen'))) expect(nichtUmgedreht.fehlertyp).toBe('UM');
      expect(a.pruefe(`${v} = 3`).ergebnis).toBe('unlesbar');
    }
  });

  it('Auswahl: genau eine richtig, Optionen verschieden', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      expect(new Set(o.map((x) => x.formel.text)).size).toBe(o.length);
      o.forEach((x, i) => expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch'));
    }
  });

  it('Vielfalt', () => {
    for (const [afb, typ] of KOMB) expect(new Set(aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text)).size).toBeGreaterThan(800);
  });
});
