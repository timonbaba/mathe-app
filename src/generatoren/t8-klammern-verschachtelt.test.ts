import { describe, expect, it } from 'vitest';
import { leseAlsPolynom } from '../mathe/term-parser';
import { klammernVerschachtelt as gen } from './t8-klammern-verschachtelt';
import { pflichttestsTermVereinfachen } from './test-hilfen';

describe('t8-klammern-verschachtelt', () => {
  const aufgaben = pflichttestsTermVereinfachen(gen, {
    kombinationen: [['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['KL', 'VZ', 'PO'],
    maxKoeffizient: 99,
    maxHochzahl: 3,
  });

  it('jede Aufgabe hat mindestens zwei Klammern oder eine Klammer plus gleichartiges Glied', () => {
    for (const a of aufgaben) {
      const klammern = (a.aufgabe.text.match(/\(/g) ?? []).length;
      expect(klammern).toBeGreaterThanOrEqual(1);
      if (klammern === 1) expect(a.aufgabe.text).toMatch(/\) [+−] /);
    }
  });

  it('beide Formen kommen vor (verschachtelt und zwei Teile)', () => {
    const verschachtelt = aufgaben.filter((a) => /\([^)]*\(/.test(a.aufgabe.text)).length;
    expect(verschachtelt / aufgaben.length).toBeGreaterThan(0.2);
    expect(verschachtelt / aufgaben.length).toBeLessThan(0.7);
  });

  it('Lösungsweg hat mindestens einen Zusammenfass-Schritt (Glieder werden weniger)', () => {
    for (const a of aufgaben) {
      const zeilen = a.hilfen.loesungsweg.map((z) => z.text.replace(/^.* = /, '').replace(/^= /, ''));
      const anzahl = zeilen.map((t) => leseAlsPolynom(t)!.anzahlGlieder());
      expect(anzahl.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('Eingabe: typische Fehlantworten werden dem richtigen Fehlertyp zugeordnet', () => {
    // Für jede Auswahlaufgabe: die KL-Option, als Eingabe beim gleichen Seed geprüft, ergibt KL
    let geprueft = 0;
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const e = gen.erzeuge(a.seed, { afb: 'II', typ: 'eingabe' });
      if (e.aufgabe.text !== a.aufgabe.text) continue;
      for (const o of a.optionen!.filter((x) => !x.richtig)) {
        expect(e.pruefe(o.formel.text).fehlertyp).toBe(o.fehlertyp);
        geprueft++;
      }
    }
    expect(geprueft).toBeGreaterThan(500);
  });
});
