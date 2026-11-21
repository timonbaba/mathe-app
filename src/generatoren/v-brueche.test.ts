import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseTerm } from '../mathe/term-parser';
import { werteAus } from './test-hilfen';
import { bruchAddieren, bruchKuerzen, bruchMultiplizieren } from './v-brueche';
import { pflichttestsZahl } from './zahl-tests';
import { leseZahlantwort } from './zahlaufgabe';

const wert = (text: string) => werteAus(leseTerm(text), {});

describe('v5-bruch-kuerzen', () => {
  const aufgaben = pflichttestsZahl(bruchKuerzen, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl']],
    fehlertypen: ['BR'],
    wertDerAufgabe: (a) => wert(a.aufgabe.text),
    mindestVerschieden: 150,
    gekuerztVerlangt: true,
    dezimalAkzeptiert: (a) => !a.anweisung.startsWith('Erweitere'),
  });
  it('Erweitern: Lösung hat genau den verlangten Nenner; Kürzen: Lösung ist gekürzt, Aufgabe nicht', () => {
    for (const a of aufgaben) {
      const n = /Nenner (\d+)/.exec(a.anweisung);
      const l = leseZahlantwort(a.loesung.text)!;
      if (n) expect(l.roh!.nenner).toBe(BigInt(n[1]!));
      else {
        expect(l.ungekuerzt).toBe(false);
        expect(leseZahlantwort(a.aufgabe.text)!.ungekuerzt).toBe(true);
      }
    }
    expect(aufgaben.filter((a) => a.anweisung.startsWith('Erweitere')).length).toBeGreaterThan(400);
  });
});

describe('v6-bruch-addieren', () => {
  const aufgaben = pflichttestsZahl(bruchAddieren, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['BR', 'VZ'],
    wertDerAufgabe: (a) => wert(a.aufgabe.text),
    mindestVerschieden: 400,
    gekuerztVerlangt: true,
  });
  it('Ergebnis positiv; AFB II mit verschiedenen Nennern', () => {
    for (const a of aufgaben) {
      expect(wert(a.aufgabe.text).istNegativ()).toBe(false);
      if (a.afb === 'II') {
        const m = /\d+\/(\d+) [+−] \d+\/(\d+)/.exec(a.aufgabe.text)!;
        expect(m[1]).not.toBe(m[2]);
      }
    }
  });
});

describe('v6-bruch-multiplizieren', () => {
  pflichttestsZahl(bruchMultiplizieren, {
    kombinationen: [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']],
    fehlertypen: ['BR'],
    wertDerAufgabe: (a) => wert(a.aufgabe.text.replace(' : ', ' / ').replace(/(\d+)\/(\d+) \/ (\d+)\/(\d+)/, '($1/$2)/($3/$4)')),
    mindestVerschieden: 400,
    gekuerztVerlangt: true,
  });
  it('Lösungsweg-Zeilen haben denselben Wert', () => {
    for (let s = 0; s < 300; s++) {
      const a = bruchMultiplizieren.erzeuge(s);
      const w = leseZahlantwort(a.loesung.text)!.wert;
      for (const z of a.hilfen.loesungsweg) {
        const rechts = z.text.replace(/^= /, '').split(' = ').pop()!;
        expect(wert(rechts.replace(/ · /g, '·')).gleich(w), z.text).toBe(true);
      }
      void Bruch;
    }
  });
});
