/**
 * Generator für Baustein t8-gleichung-brueche
 * „Lineare Gleichungen mit Brüchen lösen“ (Gym Kl. 8, LB 1), Lösungsweg über den Hauptnenner.
 *
 *  - AFB I:   1/4·x + 2 = 5            (ein Bruch, ganzzahlige Lösung)
 *  - AFB II:  2/3·x − 1/4 = 5/6        (mehrere Brüche, Lösung evtl. Bruch)
 *  - AFB III: 7/3·x + 3/4 = −1/10 − 1/6·x  (Brüche auf beiden Seiten)
 *
 * Fehlantworten: BR (nur Variablenglieder mit dem Hauptnenner multipliziert), UM, VZ.
 */
import { Bruch } from '../mathe/bruch';
import { mengeFormel } from '../mathe/loesungsmenge';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { gleichungFormel, loesungsmenge, loesungsweg, zeilenAlsFormeln, type Gleichung } from './gleichung';
import { gleichungsFehler, mengenOptionen, pruefeLoesungsmenge } from './gleichung-hilfen';
import { g } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type Generator, type Wunsch } from './typen';

const NENNER = [2, 3, 4, 5, 6, 10];

function bruch(z: Zufall, maxZaehler = 9, ganzErlaubt = false): Bruch {
  for (;;) {
    const b = Bruch.von(z.ganzzahlOhne(-maxZaehler, maxZaehler, [0]), z.auswahl(NENNER));
    if (ganzErlaubt || !b.istGanz()) return b;
  }
}

function ziehe(z: Zufall, afb: AFB, v: string): Gleichung {
  const x = { [v]: 1 };
  if (afb === 'I') return { links: [g(Bruch.von(1, z.auswahl(NENNER)).mal(z.auswahl([1, 1, 1, -1])), x), g(z.ganzzahlOhne(-9, 9, [0]))], rechts: [g(z.ganzzahlOhne(-12, 12, [0]))], v };
  if (afb === 'II') return { links: [g(bruch(z, 5), x), g(bruch(z))], rechts: [g(bruch(z))], v };
  return z.mitWahrscheinlichkeit(0.5)
    ? { links: [g(bruch(z, 9), x), g(bruch(z))], rechts: [g(bruch(z)), g(bruch(z, 5), x)], v }
    : { links: [g(bruch(z, 9), x), g(bruch(z))], rechts: [g(bruch(z, 5), x), g(z.ganzzahlOhne(-6, 6, [0]))], v };
}

export const gleichungBrueche: Generator = {
  id: 't8-gleichung-brueche',
  version: 1,
  baustein: 't8-gleichung-brueche',
  afb: ['I', 'II', 'III'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II', 'III'] as const);
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 3000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      const gl = ziehe(z, afb, v);
      const m = loesungsmenge(gl);
      if (m.art !== 'endlich') continue;
      const w = m.werte[0]!;
      if (afb === 'I' && !w.istGanz()) continue;
      if (w.nenner > (afb === 'III' ? 60n : 12n) || w.zaehler > 120n || w.zaehler < -120n) continue;
      const fehler = gleichungsFehler(gl, m, ['BR', 'UM', 'VZ']);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const weg = zeilenAlsFormeln(loesungsweg(gl).zeilen);
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
        loesung: mengeFormel(m),
        hilfen: {
          denkanstoss: 'Multipliziere beide Seiten mit dem Hauptnenner aller Brüche – jedes Glied! Dann hast du eine Gleichung ohne Brüche.',
          ansatz: weg[0]!,
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
