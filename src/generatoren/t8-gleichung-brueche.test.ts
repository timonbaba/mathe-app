import { describe, expect, it } from 'vitest';
import { pflichttestsGleichung, variableVon } from './gleichung-tests';
import { gleichungBrueche as gen } from './t8-gleichung-brueche';

describe('t8-gleichung-brueche', () => {
  const aufgaben = pflichttestsGleichung(gen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl'], ['III', 'eingabe'], ['III', 'auswahl']],
    fehlertypen: ['BR', 'UM', 'VZ'],
    variable: variableVon,
    mindestVerschieden: 500,
  });

  it('jede Aufgabe enthält Brüche; der Lösungsweg multipliziert mit dem Hauptnenner', () => {
    for (const a of aufgaben) {
      expect(a.aufgabe.text).toContain('/');
      expect(a.hilfen.loesungsweg.some((z) => /\| · \d+/.test(z.text)), a.hilfen.loesungsweg.map((z) => z.text).join('\n')).toBe(true);
    }
  });

  it('BR-Fehler (nur Variablenglieder multipliziert) kommt als Option vor', () => {
    expect(aufgaben.filter((a) => a.optionen?.some((o) => o.fehlertyp === 'BR')).length).toBeGreaterThan(500);
  });
});
