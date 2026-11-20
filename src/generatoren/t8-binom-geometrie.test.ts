import { describe, expect, it } from 'vitest';
import { leseAlsPolynom } from '../mathe/term-parser';
import { binomGeometrie as gen } from './t8-binom-geometrie';
import { pflichttestsTermVereinfachen } from './test-hilfen';

describe('t8-binom-geometrie', () => {
  const aufgaben = pflichttestsTermVereinfachen(gen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['PO', 'KL'],
    maxKoeffizient: 144,
    maxHochzahl: 2,
    mindestAnzahlVerschieden: { I: 40, II: 70 },
  });

  it('jede Aufgabe hat eine Grafik mit Titel, vier Teilflächen und den Seitenbeschriftungen', () => {
    for (const a of aufgaben) {
      const svg = a.grafik!;
      expect(svg.startsWith('<svg')).toBe(true);
      expect((svg.match(/<rect /g) ?? []).length).toBe(4);
      expect(svg).toContain('<title>');
      // jede Beschriftung im Aufgabenterm kommt in der Grafik vor
      const teile = a.aufgabe.text.replace(/[()²·]/g, ' ').split(/[+ ]+/).filter((t) => t !== '');
      for (const t of teile) expect(svg, t).toContain(`>${t}<`);
      expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/); // keine externen Ressourcen
    }
  });

  it('Ansatz: genau vier Teilflächen', () => {
    for (const a of aufgaben) {
      const rechts = a.hilfen.ansatz.text.split(' = ')[1]!;
      expect(rechts.split(/ [+−] /)).toHaveLength(4);
      expect(leseAlsPolynom(rechts)!.gleich(leseAlsPolynom(a.loesung.text)!)).toBe(true);
    }
  });
});
