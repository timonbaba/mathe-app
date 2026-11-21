import { describe, expect, it } from 'vitest';
import { pflichttestsGleichung, variableVon } from './gleichung-tests';
import { gleichungSummeMalSumme as gen } from './t8-gleichung-summe-mal-summe';

describe('t8-gleichung-summe-mal-summe', () => {
  const aufgaben = pflichttestsGleichung(gen, {
    kombinationen: [['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['KL', 'VZ', 'UM'],
    variable: variableVon,
    mindestVerschieden: 800,
  });

  it('jede Aufgabe enthält ein Produkt zweier Klammern; im Lösungsweg fällt das Quadrat weg', () => {
    for (const a of aufgaben) {
      expect(a.aufgabe.text).toMatch(/\)·\(/);
      const zeilen = a.hilfen.loesungsweg.map((z) => z.text.split('   ')[0]!);
      expect(zeilen.some((z) => !z.includes('²'))).toBe(true);
    }
  });
});
