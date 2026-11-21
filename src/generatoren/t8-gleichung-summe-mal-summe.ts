/**
 * Generator für Baustein t8-gleichung-summe-mal-summe
 * „Gleichungen mit Summe mal Summe (x² fällt weg)“ (Gym Kl. 8, LB 1, AFB II).
 *
 *  - (x + a)·(x + b) = x² + c
 *  - (k·x + a)·(x + b) − k·x² = c
 *  - (x + a)·(x + b) = (x + c)·(x + d)
 *
 * Fehlantworten: KL (gemischte Produkte vergessen), VZ (Minus mal Minus), UM.
 */
import { Bruch } from '../mathe/bruch';
import { mengeFormel } from '../mathe/loesungsmenge';
import { type Glied } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { gleichungFormel, loesungsmenge, loesungsweg, zeilenAlsFormeln, type Gleichung } from './gleichung';
import { gleichungsFehler, mengenOptionen, pruefeLoesungsmenge } from './gleichung-hilfen';
import { g, produkt } from './termbaum';
import { GeneratorFehler, type Aufgabe, type Bewertung, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

function ziehe(z: Zufall, v: string): Gleichung {
  const x = { [v]: 1 };
  const x2 = { [v]: 2 };
  const n = () => z.ganzzahlOhne(-9, 9, [0]);
  switch (z.auswahl(['quadratRechts', 'quadratAbziehen', 'zweiProdukte'] as const)) {
    case 'quadratRechts':
      return { links: [produkt([gl(1, x), gl(n())], [gl(1, x), gl(n())])], rechts: [g(1, x2), g(n())], v };
    case 'quadratAbziehen': {
      const k = z.ganzzahl(2, 4);
      return { links: [produkt([gl(k, x), gl(n())], [gl(1, x), gl(n())]), g(-k, x2)], rechts: [g(z.ganzzahlOhne(-30, 30, [0]))], v };
    }
    case 'zweiProdukte':
      return { links: [produkt([gl(1, x), gl(n())], [gl(1, x), gl(n())])], rechts: [produkt([gl(1, x), gl(n())], [gl(1, x), gl(n())])], v };
  }
}

export const gleichungSummeMalSumme: Generator = {
  id: 't8-gleichung-summe-mal-summe',
  version: 1,
  baustein: 't8-gleichung-summe-mal-summe',
  afb: ['II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb = wunsch.afb ?? 'II';
    if (afb !== 'II') throw new GeneratorFehler('Dieser Generator bietet nur AFB II an');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 3000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      const glg = ziehe(z, v);
      const m = loesungsmenge(glg);
      if (m.art !== 'endlich') continue;
      const w = m.werte[0]!;
      if (w.nenner > 6n || w.betrag().vergleiche(20) > 0) continue;
      const fehler = gleichungsFehler(glg, m, ['KL', 'VZ', 'UM']);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const weg = zeilenAlsFormeln(loesungsweg(glg).zeilen);
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fehler) : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'II',
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? `Welche Lösungsmenge hat die Gleichung (Variable ${v})?` : `Löse die Gleichung nach ${v} auf und gib die Lösungsmenge an.`,
        aufgabe: gleichungFormel(glg),
        loesung: mengeFormel(m),
        hilfen: {
          denkanstoss: `Multipliziere die Klammern aus – jedes Glied mit jedem. Dann fallen die Glieder mit ${v}² weg, und es bleibt eine lineare Gleichung.`,
          ansatz: weg[1] ?? weg[0]!,
          loesungsweg: weg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          return pruefeLoesungsmenge(antwort, v, m, fehler);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
