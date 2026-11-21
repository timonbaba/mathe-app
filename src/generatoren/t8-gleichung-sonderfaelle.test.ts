import { describe, expect, it } from 'vitest';
import { pflichttestsGleichung, variableVon } from './gleichung-tests';
import { gleichungSonderfaelle as gen } from './t8-gleichung-sonderfaelle';

describe('t8-gleichung-sonderfaelle', () => {
  const aufgaben = pflichttestsGleichung(gen, {
    kombinationen: [['II', 'eingabe'], ['II', 'auswahl'], ['III', 'eingabe'], ['III', 'auswahl']],
    fehlertypen: ['UM', 'KL', 'VZ'],
    variable: variableVon,
    mindestVerschieden: 500,
  });

  it('Verteilung: meist Sonderfälle, aber auch Kontrollaufgaben mit genau einer Lösung', () => {
    const leer = aufgaben.filter((a) => a.loesung.text === 'L = { }').length;
    const alle = aufgaben.filter((a) => a.loesung.text === 'L = ℚ').length;
    const eine = aufgaben.length - leer - alle;
    expect(leer).toBeGreaterThan(600);
    expect(alle).toBeGreaterThan(1000);
    expect(eine).toBeGreaterThan(400);
  });

  it('Lösungsweg nennt bei Sonderfällen wahre bzw. falsche Aussage; Eingaben wie „keine Lösung“ werden verstanden', () => {
    for (const a of aufgaben) {
      const text = a.hilfen.loesungsweg.map((z) => z.text).join('\n');
      if (a.loesung.text === 'L = ℚ') expect(text).toContain('Wahre Aussage');
      if (a.loesung.text === 'L = { }') expect(text).toContain('Falsche Aussage');
      if (a.typ === 'eingabe' && a.loesung.text === 'L = { }') expect(a.pruefe('keine Lösung').ergebnis).toBe('richtig');
      if (a.typ === 'eingabe' && a.loesung.text === 'L = ℚ') {
        expect(a.pruefe('L = Q').ergebnis).toBe('richtig');
        expect(a.pruefe('x = 0').ergebnis === 'falsch' || a.pruefe('a = 0').ergebnis === 'falsch' || a.pruefe('y = 0').ergebnis === 'falsch').toBe(true);
      }
    }
  });
});
