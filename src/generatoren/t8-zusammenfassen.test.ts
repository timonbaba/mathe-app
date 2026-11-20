import { describe, expect, it } from 'vitest';
import { monomSchluessel } from '../mathe/polynom';
import { leseAlsPolynom, leseTerm } from '../mathe/term-parser';
import { zusammenfassenGenerator as gen } from './t8-zusammenfassen';
import { pflichttestsTermVereinfachen } from './test-hilfen';

describe('t8-zusammenfassen', () => {
  const aufgaben = pflichttestsTermVereinfachen(gen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl']],
    fehlertypen: ['ZF', 'PO', 'VZ'],
    maxKoeffizient: 60,
    maxHochzahl: 2,
  });

  it('Aufgabe ist eine reine Summe (keine Klammern), 3–6 Glieder, erstes Glied positiv', () => {
    for (const a of aufgaben) {
      expect(a.aufgabe.text).not.toContain('(');
      const k = leseTerm(a.aufgabe.text);
      const anzahl = k.art === 'summe' ? k.glieder.length : 1;
      expect(anzahl).toBeGreaterThanOrEqual(3);
      expect(anzahl).toBeLessThanOrEqual(6);
      expect(a.aufgabe.text.startsWith('−')).toBe(false);
    }
  });

  it('Fehloptionen entstehen tatsächlich durch ihren Fehler', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const loesung = leseAlsPolynom(a.loesung.text)!;
      for (const o of a.optionen!.filter((x) => !x.richtig)) {
        const p = leseAlsPolynom(o.formel.text)!;
        if (o.fehlertyp === 'PO') {
          // gleiche Koeffizienten, aber höhere Hochzahlen
          const koeff = (q: typeof p) => q.gliederSortiert().map((g) => g.koeffizient.toString()).sort().join();
          expect(koeff(p)).toBe(koeff(loesung));
        } else if (o.fehlertyp === 'VZ') {
          // Fehlantwort − Lösung = −2 · (ein negatives Glied der Aufgabe), d. h. genau ein Minus übersehen
          const diff = p.minus(loesung).gliederSortiert();
          expect(diff).toHaveLength(1);
          const d = diff[0]!;
          // Glieder der Aufgabe einzeln lesen („19ab“, „− 17ac“, …)
          const aufgabenGlieder = ('+ ' + a.aufgabe.text).split(/ (?=[+−] )/).map((t) => leseAlsPolynom(t.replace('+ ', '').replace('− ', '-'))!);
          const passend = aufgabenGlieder.some((q) => {
            const x = q.gliederSortiert()[0]!;
            return x.koeffizient.istNegativ() && monomSchluessel(x.monom) === monomSchluessel(d.monom) && d.koeffizient.gleich(x.koeffizient.mal(-2));
          });
          expect(passend, `${a.aufgabe.text} | ${o.formel.text}`).toBe(true);
        } else {
          expect(o.fehlertyp).toBe('ZF');
          // weniger oder gleich viele Glieder als die Lösung bzw. andere Werte bei gleichen Monomen
          expect(p.gleich(loesung)).toBe(false);
        }
      }
    }
  });

  it('Eingabe: typische Fehler werden erkannt', () => {
    const a = aufgaben.find((x) => x.typ === 'eingabe' && x.aufgabe.text.includes('²'))!;
    expect(a).toBeDefined();
    // Hochzahlen verdoppeln, wenn ein Monom mehrfach vorkommt, ist PO – über die Auswahl-Variante bereits geprüft;
    // hier: Vorzeichen aller Glieder umgedreht → VZ (allgemeine Regel)
    const umgedreht = leseAlsPolynom(a.loesung.text)!.negiert();
    if (umgedreht.anzahlGlieder() > 0) expect(a.pruefe(umgedreht.alsText()).fehlertyp).toBe('VZ');
  });
});
