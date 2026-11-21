/**
 * Generator für Baustein t8-gleichung-klammern
 * „Lineare Gleichungen mit Klammern lösen“ (Gym Kl. 8, LB 1).
 *
 *  - AFB I:  a·(x + b) = c;  e − (x + b) = c·x;  a·(x + b) = c·x + d   (ganzzahlige Lösung)
 *  - AFB II: a·(x + b) − c·(x − d) = e·x + f;  zwei Klammern auf beiden Seiten
 *            (Lösung ganzzahlig oder einfacher Bruch)
 *
 * Fehlantworten aus typischen Fehlern: KL, VZ (Klammern), UM (Umformen), VZ (Division).
 */
import { Zufall } from '../mathe/zufall';
import { gleichungFormel, loesungsmenge, loesungsweg, zeilenAlsFormeln, type Gleichung } from './gleichung';
import { gleichungsFehler, mengenOptionen, pruefeLoesungsmenge } from './gleichung-hilfen';
import { mengeFormel } from '../mathe/loesungsmenge';
import { pruefeAuswahl } from './gemeinsam';
import { g, glied, kl, type Summe } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type Generator, type Wunsch } from './typen';

function ziehe(z: Zufall, afb: AFB, v: string): Gleichung {
  const k = (min = 2, max = 9) => z.ganzzahl(min, max) * z.auswahl([1, -1]);
  const x = { [v]: 1 };
  const klammer = (f: number, innen: Summe) => kl(glied(f), innen);
  if (afb === 'I') {
    switch (z.auswahl(['einfach', 'minus', 'beidseitig'] as const)) {
      case 'einfach':
        return { links: [klammer(k(), [g(1, x), g(k(1, 9))])], rechts: [g(k(1, 40))], v };
      case 'minus':
        return { links: [g(z.ganzzahl(1, 12)), klammer(-1, [g(1, x), g(k(1, 9))])], rechts: [g(k(2, 6), x)], v };
      case 'beidseitig':
        return { links: [klammer(k(), [g(1, x), g(k(1, 9))])], rechts: [g(k(1, 6), x), g(k(1, 20))], v };
    }
  }
  if (z.mitWahrscheinlichkeit(0.5)) {
    return {
      links: [klammer(k(), [g(z.ganzzahl(1, 3), x), g(k(1, 9))]), klammer(k(), [g(1, x), g(k(1, 9))])],
      rechts: [g(k(1, 8), x), g(k(1, 20))],
      v,
    };
  }
  return {
    links: [klammer(k(), [g(1, x), g(k(1, 9))])],
    rechts: [klammer(k(), [g(z.ganzzahl(1, 3), x), g(k(1, 9))]), g(k(1, 12))],
    v,
  };
}

export const gleichungKlammern: Generator = {
  id: 't8-gleichung-klammern',
  version: 1,
  baustein: 't8-gleichung-klammern',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II'] as const);
    if (afb === 'III') throw new GeneratorFehler('AFB III wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 3000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      const gl = ziehe(z, afb, v);
      const m = loesungsmenge(gl);
      if (m.art !== 'endlich') continue;
      const w = m.werte[0]!;
      if (afb === 'I' && !w.istGanz()) continue;
      if (afb === 'II' && (w.nenner > 6n || w.istGanz() === false && z.mitWahrscheinlichkeit(0.5))) continue;
      if (w.betrag().vergleiche(20) > 0) continue;
      const fehler = gleichungsFehler(gl, m, ['KL', 'VZ', 'UM']);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const { zeilen } = loesungsweg(gl);
      const weg = zeilenAlsFormeln(zeilen);
      const loesung = mengeFormel(m);
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fehler) : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? `Welche Lösungsmenge hat die Gleichung (Variable ${v})?` : `Löse die Gleichung nach ${v} auf und gib die Lösungsmenge an.`,
        aufgabe: gleichungFormel(gl),
        loesung,
        hilfen: {
          denkanstoss: 'Löse zuerst die Klammern auf – jedes Glied mit dem Faktor davor multiplizieren, bei Minus vor der Klammer alle Vorzeichen ändern. Bringe dann alle Glieder mit Variable auf eine Seite, alle Zahlen auf die andere.',
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

