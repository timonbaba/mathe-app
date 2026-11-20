/**
 * Generator für Baustein t8-binom-geometrie
 * „Binomische Formeln am Quadrat verstehen“ (Gym Kl. 8, LB 1, geometrische Interpretation).
 *
 * Eine Grafik zeigt ein Quadrat (bzw. Rechteck), dessen Seiten in zwei Abschnitte geteilt
 * sind. Gesucht ist der Flächeninhalt als Summe der Teilflächen.
 *  - AFB I:  Quadrat mit Seite x + b                  → x² + 2bx + b²
 *  - AFB II: Rechteck (x + b)·(x + c); Quadrat (a + b)² mit zwei Variablen
 *
 * Diagnostische Fehlantworten:
 *  - PO  nur die beiden Quadrate (bzw. Ecken) gezählt: x² + b²
 *  - KL  nur eines der beiden Rechtecke gezählt: x² + bx + b²
 */
import { Bruch } from '../mathe/bruch';
import { type Glied } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { auswahlOptionen, bereinigeFehlantworten, formel, gliedMal, pruefeAuswahl, pruefeTermEingabe, sortiereGlieder, summeAlsPolynom, type Fehlantwort } from './gemeinsam';
import { zerlegtesRechteck } from './svg';
import { zusammenfassen } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

const RM: Partial<Record<FehlertypCode, string>> = {
  PO: 'Zähle alle vier Teilflächen: Außer den beiden Quadraten gibt es noch zwei Rechtecke.',
  KL: 'Es gibt zwei Rechtecke – rechts oben und links unten. Beide gehören zur Fläche.',
};

interface Figur {
  /** Seitenabschnitte: breite = [p, q], hoehe = [r, s] → Fläche (p + q)·(r + s) */
  breite: [Glied, Glied];
  hoehe: [Glied, Glied];
  quadrat: boolean;
}

const sortiert = (g: Glied[]): Glied[] => {
  const r = zusammenfassen(g);
  sortiereGlieder(r);
  return r;
};

function ziehe(z: Zufall, afb: AFB): Figur {
  const v = z.auswahl(['x', 'a', 'y', 'm']);
  if (afb === 'I') {
    const b = gl(z.ganzzahl(1, 12));
    return { breite: [gl(1, { [v]: 1 }), b], hoehe: [gl(1, { [v]: 1 }), b], quadrat: true };
  }
  if (z.mitWahrscheinlichkeit(0.5)) {
    const b = gl(z.ganzzahl(1, 9));
    const c = gl(z.ganzzahl(1, 9));
    return { breite: [gl(1, { [v]: 1 }), b], hoehe: [gl(1, { [v]: 1 }), c], quadrat: false };
  }
  const [p, q] = z.auswahl([['a', 'b'], ['x', 'y'], ['m', 'n']] as const);
  return { breite: [gl(1, { [p]: 1 }), gl(1, { [q]: 1 })], hoehe: [gl(1, { [p]: 1 }), gl(1, { [q]: 1 })], quadrat: true };
}

function teilflaechen(f: Figur): Glied[] {
  // Reihenfolge: oben links, oben rechts, unten links, unten rechts
  return [gliedMal(f.hoehe[0], f.breite[0]), gliedMal(f.hoehe[0], f.breite[1]), gliedMal(f.hoehe[1], f.breite[0]), gliedMal(f.hoehe[1], f.breite[1])];
}

function seitenFormel(s: [Glied, Glied]): Formel {
  return formel(s);
}

function fehlantworten(f: Figur): Fehlantwort[] {
  const [ol, or, ul, ur] = teilflaechen(f);
  return bereinigeFehlantworten(summeAlsPolynom(teilflaechen(f)), [
    { fehlertyp: 'PO', glieder: sortiert([ol!, ur!]) },
    { fehlertyp: 'KL', glieder: sortiert([ol!, or!, ur!]) },
    { fehlertyp: 'KL', glieder: sortiert([ol!, ul!, ur!]) },
  ]);
}

function grafik(f: Figur): string {
  // nicht maßstäblich: erster Abschnitt (Variable) lang, zweiter kürzer; Zahlen etwa nach Größe
  const laenge = (g: Glied, erster: boolean) =>
    Object.keys(g.monom).length > 0 ? (erster ? 130 : 80) : Math.min(40 + 6 * Number(g.koeffizient.zaehler), 95);
  const seite = (g: Glied, erster: boolean) => ({ beschriftung: formel([g]).text, laenge: laenge(g, erster) });
  const b = seitenFormel(f.breite).text;
  const h = seitenFormel(f.hoehe).text;
  const titel = f.quadrat ? `Quadrat mit der Seitenlänge ${b}, zerlegt in vier Teilflächen` : `Rechteck mit den Seitenlängen ${b} und ${h}, zerlegt in vier Teilflächen`;
  return zerlegtesRechteck([seite(f.breite[0], true), seite(f.breite[1], false)], [seite(f.hoehe[0], true), seite(f.hoehe[1], false)], titel);
}

export const binomGeometrie: Generator = {
  id: 't8-binom-geometrie',
  version: 1,
  baustein: 't8-binom-geometrie',
  afb: ['I', 'II'],
  darstellungen: ['grafisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II'] as const);
    if (afb === 'III') throw new GeneratorFehler('AFB III wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 1000; versuch++) {
      const f = ziehe(z, afb);
      if (!f.quadrat && f.breite[1].koeffizient.gleich(f.hoehe[1].koeffizient)) continue; // sonst Quadrat
      const fehler = fehlantworten(f);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const teile = teilflaechen(f);
      const end = sortiert(teile);
      const b = seitenFormel(f.breite);
      const h = seitenFormel(f.hoehe);
      const aufgabe: Formel = f.quadrat
        ? { text: `(${b.text})²`, latex: `\\left(${b.latex}\\right)^{2}` }
        : { text: `(${b.text})·(${h.text})`, latex: `\\left(${b.latex}\\right) \\cdot \\left(${h.latex}\\right)` };
      const loesung = formel(end);
      const teileF = formel(teile);
      const ansatz: Formel = { text: `${aufgabe.text} = ${teileF.text}`, latex: `${aufgabe.latex} = ${teileF.latex}` };
      const loesungsweg = [ansatz, { text: `= ${loesung.text}`, latex: `= ${loesung.latex}` }];
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fehler) : undefined;
      const loesungPoly = summeAlsPolynom(end);
      const form = f.quadrat ? `Das Quadrat hat die Seitenlänge ${b.text}.` : `Das Rechteck hat die Seitenlängen ${b.text} und ${h.text}.`;

      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'grafisch',
        typ,
        ohneHilfsmittel: true,
        anweisung:
          typ === 'auswahl'
            ? `${form} Welcher Term beschreibt seinen Flächeninhalt als Summe der Teilflächen?`
            : `${form} Gib seinen Flächeninhalt als Summe der Teilflächen an (zusammengefasst).`,
        aufgabe,
        loesung,
        grafik: grafik(f),
        hilfen: {
          denkanstoss: 'Die Figur besteht aus vier Teilflächen. Berechne jede einzeln (Breite mal Höhe) und addiere sie.',
          ansatz,
          loesungsweg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort, RM);
          return pruefeTermEingabe(antwort, loesungPoly, fehler, RM);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
