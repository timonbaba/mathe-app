import { describe, expect, it } from 'vitest';
import { leseTerm, type Knoten } from '../mathe/term-parser';
import { termStruktur as gen } from './t8-term-struktur';

const KOMB = [['I', 'auswahl'], ['II', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

/** Unabhängig: Art des Terms aus dem gelesenen Syntaxbaum. */
function artAusText(text: string): string {
  let k: Knoten = leseTerm(text);
  while (k.art === 'klammer') k = k.knoten;
  switch (k.art) {
    case 'summe': return k.glieder[k.glieder.length - 1]!.minus ? 'Differenz' : 'Summe';
    case 'produkt': return 'Produkt';
    case 'quotient': return 'Quotient';
    case 'potenz': return 'Potenz';
    default: return '?';
  }
}

describe('t8-term-struktur', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit: die Lösung stimmt mit der unabhängig gelesenen Struktur überein', () => {
    for (const a of aufgaben) expect(a.loesung.text, a.aufgabe.text).toBe(artAusText(a.aufgabe.text));
  });

  it('Auswahl: 4 verschiedene Optionen, genau eine richtig, Fehlertypen VR/UK', () => {
    for (const a of aufgaben) {
      const o = a.optionen!;
      expect(o).toHaveLength(4);
      expect(new Set(o.map((x) => x.formel.text)).size).toBe(4);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      expect(o.find((x) => x.richtig)!.formel.text).toBe(a.loesung.text);
      o.forEach((x, i) => {
        if (!x.richtig) expect(['VR', 'UK']).toContain(x.fehlertyp);
        expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
      });
      // mindestens eine Falle: eine andere Rechenart kommt im Term vor
      expect(o.some((x) => x.fehlertyp === 'VR')).toBe(true);
    }
  });

  it('alle Arten kommen als Lösung vor; Vielfalt', () => {
    const arten = new Set(aufgaben.map((a) => a.loesung.text));
    for (const t of ['Summe', 'Differenz', 'Produkt', 'Quotient', 'Potenz']) expect(arten).toContain(t);
    for (const [afb] of KOMB) expect(new Set(aufgaben.filter((a) => a.afb === afb).map((a) => a.aufgabe.text)).size).toBeGreaterThan(1000 * 0.9);
  });

  it('Hilfen: Lösungsweg endet mit der Art des Terms', () => {
    for (const a of aufgaben) {
      expect(a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text).toContain(`Zuletzt wird die ${a.loesung.text}`);
      expect(a.hilfen.denkanstoss.length).toBeGreaterThan(20);
    }
  });
});
