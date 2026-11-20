import { Bruch } from '../mathe/bruch';
import { describe, expect, it } from 'vitest';
import { Polynom } from '../mathe/polynom';
import { leseAlsPolynom, leseTerm, type Knoten } from '../mathe/term-parser';
import { summeMalSumme as gen } from './t8-summe-mal-summe';
import { pflichttestsTermVereinfachen } from './test-hilfen';
import type { Aufgabe } from './typen';

/** Liest die beiden Klammern (und ein führendes Minus) unabhängig aus dem Aufgabentext. */
function klammern(a: Aufgabe): { minus: boolean; a: Polynom[]; b: Polynom[] } {
  let k: Knoten = leseTerm(a.aufgabe.text);
  let minus = false;
  if (k.art === 'summe' && k.glieder.length === 1 && k.glieder[0]!.minus) {
    minus = true;
    k = k.glieder[0]!.knoten;
  }
  if (k.art !== 'produkt' || k.faktoren.length !== 2) throw new Error(a.aufgabe.text);
  const glieder = (x: Knoten) => {
    if (x.art !== 'klammer' || x.knoten.art !== 'summe') throw new Error('Klammer erwartet');
    return x.knoten.glieder;
  };
  const alsPoly = (x: Knoten): Polynom[] =>
    glieder(x).map((g) => {
      const text = termText(g.knoten);
      const p = leseAlsPolynom(text)!;
      return g.minus ? p.negiert() : p;
    });
  return { minus, a: alsPoly(k.faktoren[0]!), b: alsPoly(k.faktoren[1]!) };
}

/** Rekonstruiert einen einfachen Gliedtext aus dem Syntaxbaum (Zahl, Variable, Produkt, Potenz). */
function termText(k: Knoten): string {
  switch (k.art) {
    case 'zahl': return k.wert.toString();
    case 'variable': return k.name;
    case 'produkt': return k.faktoren.map(termText).join('*');
    case 'potenz': return `${termText(k.basis)}^${k.exponent}`;
    default: throw new Error(`unerwartet: ${k.art}`);
  }
}

describe('t8-summe-mal-summe', () => {
  const aufgaben = pflichttestsTermVereinfachen(gen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['KL', 'VZ', 'PO'],
    maxKoeffizient: 81,
    maxHochzahl: 2,
  });

  it('keine binomischen Formeln: Klammern verschieden, gemischte Glieder heben sich nicht auf', () => {
    for (const a of aufgaben) {
      const { a: x, b: y } = klammern(a);
      const px = Polynom.summe(x);
      const py = Polynom.summe(y);
      expect(px.gleich(py)).toBe(false);
      // Anzahl verschiedener Monome der Einzelprodukte = Anzahl Glieder im Ergebnis
      const einzeln = x.flatMap((u) => y.map((v) => u.mal(v)));
      const monome = new Set(einzeln.map((e) => JSON.stringify(e.gliederSortiert()[0]!.monom)));
      expect(leseAlsPolynom(a.loesung.text)!.anzahlGlieder()).toBe(monome.size);
    }
  });

  it('AFB II enthält alle drei Formen', () => {
    const ii = aufgaben.filter((a) => a.afb === 'II');
    expect(ii.filter((a) => a.aufgabe.text.startsWith('−')).length).toBeGreaterThan(200);
    expect(ii.filter((a) => klammern(a).a.length === 3).length).toBeGreaterThan(200);
  });

  it('Fehloptionen entstehen tatsächlich durch ihren Fehler (unabhängig nachgebildet)', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const { minus, a: x, b: y } = klammern(a);
      const s = minus ? -1 : 1;
      const richtig = Polynom.summe(x.flatMap((u) => y.map((v) => u.mal(v)))).mal(Polynom.zahl(s));
      for (const o of a.optionen!.filter((q) => !q.richtig)) {
        const p = leseAlsPolynom(o.formel.text)!;
        if (o.fehlertyp === 'KL') {
          const nurAussen = Polynom.summe([x[0]!.mal(y[0]!), x[x.length - 1]!.mal(y[y.length - 1]!)]).mal(Polynom.zahl(s));
          if (!p.gleich(nurAussen)) {
            // sonst nur bei „−(…)·(…)“: Minus nur auf das erste Glied angewendet,
            // d. h. alle Glieder außer einem haben das falsche Vorzeichen
            expect(minus, `${a.aufgabe.text} | ${o.formel.text}`).toBe(true);
            const diff = p.minus(richtig).gliederSortiert();
            expect(diff).toHaveLength(richtig.anzahlGlieder() - 1);
            expect(p.plus(richtig).anzahlGlieder()).toBe(1);
          }
        } else if (o.fehlertyp === 'VZ') {
          // Unterschied = 2 · (Summe der Produkte zweier negativer Glieder), mit Vorzeichen
          const negNeg = Polynom.summe(
            x.flatMap((u) => y.filter((v) => isNeg(u) && isNeg(v)).map((v) => u.mal(v))),
          ).mal(Polynom.zahl(-2 * s));
          expect(p.minus(richtig).gleich(negNeg), `${a.aufgabe.text} | ${o.formel.text}`).toBe(true);
        } else {
          expect(o.fehlertyp).toBe('PO');
          // gleiche Koeffizientensumme (Einsetzen von 1 für alle Variablen ergibt gleiches Ergebnis)
          const eins = (q: Polynom) => q.auswerten(Object.fromEntries(q.variablen().map((v) => [v, ONE])));
          expect(eins(p).gleich(eins(richtig))).toBe(true);
          expect(p.gleich(richtig)).toBe(false);
        }
      }
    }
  });
});

const ONE = Bruch.EINS;
const isNeg = (p: Polynom) => p.gliederSortiert()[0]!.koeffizient.istNegativ();
