import { describe, expect, it } from 'vitest';
import { pflichttestsGleichung, variableVon } from './gleichung-tests';
import { gleichungKlammern as gen } from './t8-gleichung-klammern';

describe('t8-gleichung-klammern', () => {
  const aufgaben = pflichttestsGleichung(gen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['KL', 'VZ', 'UM'],
    variable: variableVon,
    mindestVerschieden: 900,
  });

  it('jede Aufgabe enthält eine Klammer; AFB I hat ganzzahlige Lösungen; Bruchlösungen in AFB II', () => {
    for (const a of aufgaben) {
      expect(a.aufgabe.text).toContain('(');
      if (a.afb === 'I') expect(a.loesung.text).not.toContain('/');
    }
    expect(aufgaben.filter((a) => a.afb === 'II' && a.loesung.text.includes('/')).length).toBeGreaterThan(100);
  });

  it('Minus vor der Klammer kommt vor', () => {
    expect(aufgaben.filter((a) => /− \(/.test(a.aufgabe.text)).length).toBeGreaterThan(200);
  });
});
