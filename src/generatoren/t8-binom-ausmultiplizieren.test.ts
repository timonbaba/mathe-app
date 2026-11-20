import { describe, expect, it } from 'vitest';
import { leseAlsPolynom } from '../mathe/term-parser';
import { binomAusmultiplizieren as gen } from './t8-binom-ausmultiplizieren';
import { pflichttestsTermVereinfachen } from './test-hilfen';

describe('t8-binom-ausmultiplizieren', () => {
  const aufgaben = pflichttestsTermVereinfachen(gen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['PO', 'VZ', 'KL'],
    maxKoeffizient: 150,
    maxHochzahl: 2,
    mindestVielfalt: 0.85,
    mindestAnzahlVerschieden: { I: 200, II: 600 },
  });

  it('alle drei binomischen Formeln kommen vor', () => {
    const t = aufgaben.map((a) => a.aufgabe.text);
    expect(t.filter((x) => /\+ [^)]*\)²/.test(x)).length).toBeGreaterThan(300);
    expect(t.filter((x) => /− [^)]*\)²/.test(x)).length).toBeGreaterThan(300);
    expect(t.filter((x) => /\)·\(/.test(x)).length).toBeGreaterThan(300);
  });

  it('Ergebnis hat die Form einer binomischen Formel (3 Glieder bzw. 2 Glieder bei der dritten)', () => {
    for (const a of aufgaben) {
      const n = leseAlsPolynom(a.loesung.text)!.anzahlGlieder();
      expect(n).toBe(/\)·\(/.test(a.aufgabe.text) ? 2 : 3);
    }
  });

  it('Fehloption „Mittelglied vergessen“ ist bei Quadraten dabei, wenn PO vorkommt', () => {
    let gefunden = 0;
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl' && x.aufgabe.text.endsWith('²') && !x.aufgabe.text.includes('·('))) {
      const richtig = leseAlsPolynom(a.loesung.text)!;
      for (const o of a.optionen!.filter((q) => q.fehlertyp === 'PO')) {
        const p = leseAlsPolynom(o.formel.text)!;
        if (p.anzahlGlieder() === 2 && richtig.minus(p).anzahlGlieder() === 1) gefunden++;
      }
    }
    expect(gefunden).toBeGreaterThan(200);
  });
});
