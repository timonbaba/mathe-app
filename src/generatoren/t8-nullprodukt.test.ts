import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { gleicheMenge, leseLoesungsmenge, type Loesungsmenge } from '../mathe/loesungsmenge';
import { differenz, variableVon } from './gleichung-tests';
import { gleichungAusklammernNull, nullprodukt } from './t8-nullprodukt';
import type { AFB, Aufgabe, Aufgabentyp, Generator } from './typen';

const werteVon = (m: Loesungsmenge | null): Bruch[] => (m && m.art === 'endlich' ? [...m.werte] : []);

/** Unabhängig: f = L − R ist quadratisch mit genau den angegebenen zwei Nullstellen. */
function pruefeQuadratisch(a: Aufgabe) {
  const v = variableVon(a);
  const f = differenz(a.aufgabe.text, v);
  const m = leseLoesungsmenge(a.loesung.text, v)!;
  expect(m.art).toBe('endlich');
  const [r1, r2] = werteVon(m);
  expect(r2, a.aufgabe.text).toBeDefined();
  expect(f(r1!).istNull() && f(r2!).istNull(), a.aufgabe.text).toBe(true);
  // f(x) = c·(x − r1)(x − r2): c aus einer dritten Stelle, dann an weiteren Stellen prüfen
  const p = (x: Bruch) => x.minus(r1!).mal(x.minus(r2!));
  const t = [Bruch.von(17), Bruch.von(-23, 3), Bruch.von(41, 7)].filter((x) => !p(x).istNull());
  const c = f(t[0]!).durch(p(t[0]!));
  expect(c.istNull()).toBe(false);
  for (const x of t) expect(f(x).gleich(c.mal(p(x))), a.aufgabe.text).toBe(true);
}

function suite(gen: Generator, komb: [AFB, Aufgabentyp][]) {
  const aufgaben = komb.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));
  it('Determinismus', () => {
    for (const [afb, typ] of komb) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });
  it('Korrektheit: genau die zwei angegebenen Lösungen (unabhängig geprüft)', () => {
    for (const a of aufgaben) pruefeQuadratisch(a);
  });
  it('Vielfalt', () => {
    for (const [afb, typ] of komb) expect(new Set(aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text)).size).toBeGreaterThan(400);
  });
  it('Eingabe: Schreibweisen; nur eine Lösung ist falsch', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const v = variableVon(a);
      const [r1, r2] = werteVon(leseLoesungsmenge(a.loesung.text, v));
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      expect(a.pruefe(`${v} = ${r2!.alsText()} oder ${v} = ${r1!.alsText()}`).ergebnis).toBe('richtig');
      expect(a.pruefe(`${v}₁ = ${r1!.alsText()}; ${v}₂ = ${r2!.alsText()}`).ergebnis).toBe('richtig');
      const nurEine = a.pruefe(`${v} = ${r2!.alsText()}`);
      expect(nurEine.ergebnis).toBe('falsch');
      expect(nurEine.fehlertyp).toBe('UM');
    }
  });
  it('Auswahl: genau eine richtig, alle verschieden', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const v = variableVon(a);
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      const mengen = o.map((x) => leseLoesungsmenge(x.formel.text, v)!);
      mengen.forEach((m, i) => {
        expect(gleicheMenge(m, leseLoesungsmenge(a.loesung.text, v)!)).toBe(o[i]!.richtig);
        for (let j = i + 1; j < mengen.length; j++) expect(gleicheMenge(m, mengen[j]!)).toBe(false);
        if (!o[i]!.richtig) expect(['VZ', 'UM']).toContain(o[i]!.fehlertyp);
      });
    }
  });
  it('Hilfen: Lösungsweg endet mit der Lösung, nennt beide Faktoren', () => {
    for (const a of aufgaben) {
      const w = a.hilfen.loesungsweg.map((z) => z.text);
      expect(w[w.length - 1]).toBe(a.loesung.text);
      expect(w.some((z) => z.includes(' oder '))).toBe(true);
    }
  });
  return aufgaben;
}

describe('t8-nullprodukt', () => {
  suite(nullprodukt, [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']]);
});

describe('t8-gleichung-ausklammern-null', () => {
  const aufgaben = suite(gleichungAusklammernNull, [['III', 'eingabe'], ['III', 'auswahl']]);
  it('Lösung 0 ist immer dabei; „durch x geteilt“ wird als UM erkannt', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const v = variableVon(a);
      const werte = werteVon(leseLoesungsmenge(a.loesung.text, v));
      expect(werte.some((w) => w.istNull())).toBe(true);
      const andere = werte.find((w) => !w.istNull())!;
      expect(a.pruefe(`${v} = ${andere.alsText()}`).fehlertyp).toBe('UM');
    }
  });
});
