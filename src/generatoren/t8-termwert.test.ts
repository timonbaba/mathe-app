import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseTerm } from '../mathe/term-parser';
import { termwert as gen } from './t8-termwert';
import { werteAus } from './test-hilfen';
import type { Aufgabe } from './typen';

const KOMB = [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

/** Belegung aus der Anweisung („für x = −2 und y = 3“) bzw. der Tabelle lesen. */
function belegung(a: Aufgabe): Record<string, Bruch> {
  if (a.tabelle) {
    const i = a.tabelle.zeilen[0]!.indexOf('?');
    return { [a.tabelle.kopf[0]!]: Bruch.parse(a.tabelle.kopf[i]!)! };
  }
  const b: Record<string, Bruch> = {};
  for (const m of a.anweisung.matchAll(/(\w) = (−?\d+(?:\/\d+)?)/g)) b[m[1]!] = Bruch.parse(m[2]!)!;
  return b;
}

describe('t8-termwert', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit: Lösung = unabhängig berechneter Termwert; Tabellenwerte stimmen', () => {
    for (const a of aufgaben) {
      const k = leseTerm(a.aufgabe.text);
      expect(werteAus(k, belegung(a)).alsText(), `${a.aufgabe.text} ${a.anweisung}`).toBe(a.loesung.text);
      if (a.tabelle) {
        const v = a.tabelle.kopf[0]!;
        a.tabelle.kopf.slice(1).forEach((x, i) => {
          const zelle = a.tabelle!.zeilen[0]![i + 1]!;
          if (zelle !== '?') expect(zelle).toBe(werteAus(k, { [v]: Bruch.parse(x)! }).alsText());
        });
        expect(a.tabelle.zeilen[0]!.filter((z) => z === '?')).toHaveLength(1);
      }
    }
  });

  it('negative Zahlen, Brüche, zwei Variablen und Tabellen kommen vor', () => {
    expect(aufgaben.filter((a) => a.tabelle).length).toBeGreaterThan(300);
    expect(aufgaben.filter((a) => /= −/.test(a.anweisung)).length).toBeGreaterThan(500);
    expect(aufgaben.filter((a) => /= −?\d+\/\d+/.test(a.anweisung)).length).toBeGreaterThan(300);
    expect(aufgaben.filter((a) => / und /.test(a.anweisung)).length).toBeGreaterThan(300);
  });

  it('Eingabe: Schreibweisen; Fehler werden erkannt', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      expect(a.pruefe(`T = ${a.loesung.text}`).ergebnis).toBe('richtig');
      const d = Bruch.parse(a.loesung.text)!.alsDezimal();
      if (d) expect(a.pruefe(d).ergebnis).toBe('richtig');
      expect(a.pruefe('abc').ergebnis).toBe('unlesbar');
    }
  });

  it('Auswahl: genau eine richtig, Werte verschieden, Fehlertypen VZ/PO', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      const werte = o.map((x) => Bruch.parse(x.formel.text)!);
      werte.forEach((w, i) => {
        expect(w.gleich(Bruch.parse(a.loesung.text)!)).toBe(o[i]!.richtig);
        for (let j = i + 1; j < werte.length; j++) expect(w.gleich(werte[j]!)).toBe(false);
        if (!o[i]!.richtig) expect(['VZ', 'PO']).toContain(o[i]!.fehlertyp);
        expect(a.pruefe(String(i)).ergebnis).toBe(o[i]!.richtig ? 'richtig' : 'falsch');
      });
    }
  });

  it('Hilfen: Einsetzzeile hat den gleichen Wert; letzte Zeile ist die Lösung', () => {
    for (const a of aufgaben) {
      const weg = a.hilfen.loesungsweg;
      const eingesetzt = weg[0]!.text.split(' = ')[1]!;
      expect(werteAus(leseTerm(eingesetzt), {}).alsText()).toBe(a.loesung.text);
      for (const z of weg.slice(1)) expect(werteAus(leseTerm(z.text.slice(2)), {}).alsText()).toBe(a.loesung.text);
      expect(weg[weg.length - 1]!.text).toBe(`= ${a.loesung.text}`);
    }
  });
});
