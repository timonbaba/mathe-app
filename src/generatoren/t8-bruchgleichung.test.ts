import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { gleicheMenge, leseLoesungsmenge, mengeFormel } from '../mathe/loesungsmenge';
import { leseTerm } from '../mathe/term-parser';
import { variableVon } from './gleichung-tests';
import { bruchgleichung as gen, leseBruchgleichungsAntwort } from './t8-bruchgleichung';
import { werteAus } from './test-hilfen';

const KOMB = [['II', 'eingabe'], ['II', 'auswahl'], ['III', 'eingabe'], ['III', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

function seiten(text: string) {
  const [l, r] = text.split(' = ');
  return [leseTerm(l!), leseTerm(r!)] as const;
}
/** L − R an der Stelle x; null, wenn dort ein Nenner 0 ist. */
function f(text: string, v: string, x: Bruch): Bruch | null {
  const [l, r] = seiten(text);
  try {
    return werteAus(l, { [v]: x }).minus(werteAus(r, { [v]: x }));
  } catch (e) {
    if (e instanceof RangeError) return null;
    throw e;
  }
}

describe('t8-bruchgleichung', () => {
  it('Antworten lesen', () => {
    const a = leseBruchgleichungsAntwort('x ≠ 0, x ≠ 1; L = {−3/2}', 'x');
    expect(a.ausgeschlossen!.map((b) => b.toString()).sort()).toEqual(['0', '1']);
    expect(mengeFormel(a.menge!).text).toBe('L = {−3/2}');
    const b = leseBruchgleichungsAntwort('D = ℚ \\ {0; 1}, L = {}', 'x');
    expect(b.ausgeschlossen).toHaveLength(2);
    expect(b.menge!.art).toBe('leer');
    const c = leseBruchgleichungsAntwort('x = 4', 'x');
    expect(c.ausgeschlossen).toBeNull();
    expect(mengeFormel(c.menge!).text).toBe('L = {4}');
  });

  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit (unabhängig): ausgeschlossene Werte genau die Nennernullstellen; Lösung erfüllt die Gleichung; Vollständigkeit', () => {
    for (const a of aufgaben) {
      const v = variableVon(a);
      const { ausgeschlossen, menge } = leseBruchgleichungsAntwort(a.loesung.text, v);
      // genau die ausgeschlossenen Werte machen einen Nenner 0 (geprüft für ganze Zahlen −15..15 und die angegebenen Werte)
      for (const e of ausgeschlossen!) expect(f(a.aufgabe.text, v, e), `${a.aufgabe.text} bei ${e}`).toBeNull();
      for (let i = -15; i <= 15; i++) {
        const x = Bruch.von(i);
        if (!ausgeschlossen!.some((e) => e.gleich(x))) expect(f(a.aufgabe.text, v, x), `${a.aufgabe.text} bei ${i}`).not.toBeNull();
      }
      // g(x) = f(x)·Π(x − e) ist linear; seine Nullstelle ist die rechnerische Lösung
      const g = (x: Bruch) => f(a.aufgabe.text, v, x)!.mal(ausgeschlossen!.reduce((p, e) => p.mal(x.minus(e)), Bruch.EINS));
      const pts = [Bruch.von(101, 7), Bruch.von(-53, 3), Bruch.von(29, 11)];
      const m = g(pts[1]!).minus(g(pts[0]!)).durch(pts[1]!.minus(pts[0]!));
      expect(g(pts[2]!).minus(g(pts[0]!)).gleich(m.mal(pts[2]!.minus(pts[0]!))), a.aufgabe.text).toBe(true);
      expect(m.istNull()).toBe(false);
      const kandidat = pts[0]!.minus(g(pts[0]!).durch(m));
      const erwartet = ausgeschlossen!.some((e) => e.gleich(kandidat)) ? { art: 'leer' as const } : { art: 'endlich' as const, werte: [kandidat] };
      expect(gleicheMenge(menge!, erwartet), `${a.aufgabe.text} | ${a.loesung.text}`).toBe(true);
    }
  });

  it('der Fall „Lösung ausgeschlossen ⇒ L = { }“ kommt in AFB III vor', () => {
    expect(aufgaben.filter((a) => a.afb === 'III' && a.loesung.text.endsWith('L = { }')).length).toBeGreaterThan(300);
  });

  it('Eingabe: vollständig richtig, ohne Ausschluss unvollständig, falscher Ausschluss BR', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const v = variableVon(a);
      const { ausgeschlossen, menge } = leseBruchgleichungsAntwort(a.loesung.text, v);
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      const dSchreibweise = `D = ℚ \\ {${ausgeschlossen!.map((e) => e.alsText()).join('; ')}}, ${mengeFormel(menge!).text}`;
      expect(a.pruefe(dSchreibweise).ergebnis, dSchreibweise).toBe('richtig');
      expect(a.pruefe(mengeFormel(menge!).text).ergebnis).toBe('unvollstaendig');
      const b = a.pruefe(`${v} ≠ 99; ${mengeFormel(menge!).text}`);
      expect(b.ergebnis).toBe('falsch');
      expect(b.fehlertyp).toBe('BR');
      expect(a.pruefe('???').ergebnis).toBe('unlesbar');
    }
  });

  it('Auswahl: genau eine vollständig richtige Option, alle verschieden', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      expect(o.find((x) => x.richtig)!.formel.text).toBe(a.loesung.text);
      expect(new Set(o.map((x) => x.formel.text)).size).toBe(o.length);
      o.forEach((x, i) => expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch'));
    }
  });

  it('Hilfen: Ausschluss zuerst, Probe am Ende, letzte Zeile = Lösung', () => {
    for (const a of aufgaben) {
      const w = a.hilfen.loesungsweg.map((z) => z.text);
      expect(w[0]).toMatch(/^Ausgeschlossen: /);
      expect(w[w.length - 2]).toMatch(/Probe|ausgeschlossen/);
      expect(w[w.length - 1]).toBe(a.loesung.text);
      void leseLoesungsmenge;
    }
  });
});
