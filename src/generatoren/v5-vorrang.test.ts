import { describe, expect, it } from 'vitest';
import { leseTerm } from '../mathe/term-parser';
import { werteAus } from './test-hilfen';
import { vorrang as gen } from './v5-vorrang';
import { pflichttestsZahl } from './zahl-tests';

describe('v5-vorrang', () => {
  const aufgaben = pflichttestsZahl(gen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['VR', 'RE'],
    wertDerAufgabe: (a) => werteAus(leseTerm(a.aufgabe.text), {}),
    mindestVerschieden: 500,
  });

  it('Ergebnisse sind natürliche Zahlen ≤ 500; jede Aufgabe hat eine Falle (Punkt vor Strich oder Klammer)', () => {
    for (const a of aufgaben) {
      const w = werteAus(leseTerm(a.aufgabe.text), {});
      expect(w.istGanz() && !w.istNegativ() && w.vergleiche(500) <= 0).toBe(true);
      const mischt = /[+−]/.test(a.aufgabe.text) && /[·:]/.test(a.aufgabe.text);
      expect(mischt || a.aufgabe.text.includes('(')).toBe(true);
    }
  });

  it('Lösungsweg: jede Zeile hat denselben Wert', () => {
    for (const a of aufgaben) {
      const w = werteAus(leseTerm(a.aufgabe.text), {});
      for (const z of a.hilfen.loesungsweg.slice(1)) expect(werteAus(leseTerm(z.text.slice(2)), {}).gleich(w), z.text).toBe(true);
    }
  });
});
