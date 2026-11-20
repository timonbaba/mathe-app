/**
 * Generator für Baustein t8-summe-mal-summe
 * „Summe mal Summe“ (Gym Kl. 8, LB 1), Typ (x − 3)·(x + 2).
 *
 * Varianten:
 *  - AFB I:  (ax + b)·(cx + d) mit kleinen Zahlen; (x + a)·(y + b)
 *  - AFB II: (ax + by)·(cx + dy); Klammer mit drei Gliedern; Minus vor dem Produkt −(…)·(…)
 * Binomische Formeln (gleiche Klammern, a+b mal a−b) werden hier bewusst ausgeschlossen
 * – dafür gibt es eigene Bausteine.
 *
 * Diagnostische Fehlantworten:
 *  - KL  nur „erstes mal erstes“ und „letztes mal letztes“ (gemischte Produkte vergessen)
 *  - KL  bei −(…)·(…): Minus nur auf das erste Glied angewendet
 *  - VZ  Minus mal Minus als Minus gerechnet
 *  - PO  Hochzahlen nicht addiert (x·x = x)
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, formatGlieder, monomSchluessel, type Glied, type Monom } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import {
  auswahlOptionen,
  bereinigeFehlantworten,
  formel,
  gliedMal,
  monomMalOhneHochzahlen,
  pruefeAuswahl,
  pruefeTermEingabe,
  summeAlsPolynom,
  type Fehlantwort,
} from './gemeinsam';
import { zusammenfassen, zusammenfassenSortiert } from './termbaum';
import { ANZEIGE, GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const RUECKMELDUNG: Partial<Record<FehlertypCode, string>> = {
  KL: 'Jedes Glied der ersten Klammer muss mit jedem Glied der zweiten Klammer multipliziert werden.',
  VZ: 'Achte auf die Vorzeichen: Minus mal Minus ergibt Plus.',
};

export interface Produkt {
  /** −1 bei „−(…)·(…)“, sonst 1 */
  readonly vorzeichen: 1 | -1;
  readonly a: readonly Glied[];
  readonly b: readonly Glied[];
}

const gl = (k: number, m: Monom = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

/** Alle Einzelprodukte in Reihenfolge a₁b₁, a₁b₂, …, a₂b₁, … */
export function einzelprodukte(p: Produkt, modus: 'richtig' | 'VZ' | 'PO' = 'richtig'): Glied[] {
  return p.a.flatMap((x) =>
    p.b.map((y) => {
      if (modus === 'PO') return { koeffizient: x.koeffizient.mal(y.koeffizient), monom: monomMalOhneHochzahlen(x.monom, y.monom) };
      const r = gliedMal(x, y);
      if (modus === 'VZ' && x.koeffizient.istNegativ() && y.koeffizient.istNegativ()) return { ...r, koeffizient: r.koeffizient.negiert() };
      return r;
    }),
  );
}

const mitVorzeichen = (p: Produkt, glieder: readonly Glied[]): Glied[] =>
  p.vorzeichen === 1 ? [...glieder] : glieder.map((x) => ({ ...x, koeffizient: x.koeffizient.negiert() }));

export function ergebnisVon(p: Produkt, modus: 'richtig' | 'VZ' | 'PO' = 'richtig'): Glied[] {
  return zusammenfassenSortiert(mitVorzeichen(p, einzelprodukte(p, modus)));
}

function klammerText(glieder: readonly Glied[], ziel: 'text' | 'latex'): string {
  const innen = formatGlieder(glieder, ziel, ANZEIGE);
  return ziel === 'latex' ? `\\left(${innen}\\right)` : `(${innen})`;
}

export function produktFormel(p: Produkt): Formel {
  const vz = p.vorzeichen === -1;
  return {
    text: `${vz ? '−' : ''}${klammerText(p.a, 'text')}·${klammerText(p.b, 'text')}`,
    latex: `${vz ? '-' : ''}${klammerText(p.a, 'latex')} \\cdot ${klammerText(p.b, 'latex')}`,
  };
}

/** „x·x + x·(−3) + 2·x + 2·(−3)“ */
function produktZeile(p: Produkt): Formel {
  const teile = p.a.flatMap((x) =>
    p.b.map((y) => ({
      text: `${formatGlied(x, 'text', ANZEIGE, true)}·${formatGlied(y, 'text', ANZEIGE, true)}`,
      latex: `${formatGlied(x, 'latex', ANZEIGE, true).replace(/^\((.*)\)$/, '\\left($1\\right)')} \\cdot ${formatGlied(y, 'latex', ANZEIGE, true).replace(/^\((.*)\)$/, '\\left($1\\right)')}`,
    })),
  );
  return { text: teile.map((t) => t.text).join(' + '), latex: teile.map((t) => t.latex).join(' + ') };
}

function umklammern(f: Formel, vz: boolean): Formel {
  if (!vz) return f;
  return { text: `−(${f.text})`, latex: `-\\left(${f.latex}\\right)` };
}

/** Lösungsweg-Zeilen (ohne Ausgangsterm). */
export function wegZeilen(p: Produkt): Formel[] {
  const vz = p.vorzeichen === -1;
  const zeilen: Formel[] = [umklammern(produktZeile(p), vz)];
  const einzeln = einzelprodukte(p);
  zeilen.push(umklammern(formel(einzeln), vz));
  const zusammen = zusammenfassenSortiert(einzeln);
  // zusammengefasst bzw. in übliche Reihenfolge gebracht
  if (formel(zusammen).text !== formel(einzeln).text) zeilen.push(umklammern(formel(zusammen), vz));
  if (vz) zeilen.push(formel(ergebnisVon(p)));
  return zeilen;
}

// --- Zufall ----------------------------------------------------------------------

function ziehe(z: Zufall, afb: AFB): Produkt {
  // Variablenpaare in alphabetischer Reihenfolge, damit das sortierte Ergebnis natürlich aussieht
  const [v, zweiteVar] = z.auswahl([['x', 'y'], ['a', 'b'], ['m', 'n'], ['p', 'q']] as const);
  const koeffKlein = () => z.auswahl([1, 1, 1, 2, 3, 4, 5]);
  if (afb === 'I') {
    if (z.mitWahrscheinlichkeit(0.25)) {
      // (x + a)·(y + b)
      return { vorzeichen: 1, a: [gl(1, { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))], b: [gl(1, { [zweiteVar]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))] };
    }
    return {
      vorzeichen: 1,
      a: [gl(koeffKlein(), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
      b: [gl(koeffKlein(), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
    };
  }
  const art = z.auswahl(['zweiVariablen', 'dreiGlieder', 'minus'] as const);
  if (art === 'zweiVariablen') {
    return {
      vorzeichen: 1,
      a: [gl(z.ganzzahlOhne(1, 6, []), { [v]: 1 }), gl(z.ganzzahlOhne(-6, 6, [0]), { [zweiteVar]: 1 })],
      b: [gl(z.ganzzahlOhne(1, 6, []), { [v]: 1 }), gl(z.ganzzahlOhne(-6, 6, [0]), { [zweiteVar]: 1 })],
    };
  }
  if (art === 'dreiGlieder') {
    const a = [gl(1, { [v]: 1 }), gl(z.ganzzahlOhne(-5, 5, [0]), { [zweiteVar]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))];
    return { vorzeichen: 1, a, b: [gl(koeffKlein(), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))] };
  }
  return {
    vorzeichen: -1,
    a: [gl(koeffKlein(), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
    b: [gl(koeffKlein(), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
  };
}

function geeignet(p: Produkt): boolean {
  // gleiche Klammern oder „a + b mal a − b“ → binomische Formel, hier nicht gewollt
  const schl = (gs: readonly Glied[]) => gs.map((x) => `${monomSchluessel(x.monom)}:${x.koeffizient.betrag()}`).join('|');
  if (schl(p.a) === schl(p.b)) return false;
  if (p.a[0]!.koeffizient.istNegativ() || p.b[0]!.koeffizient.istNegativ()) return false;
  const einzeln = einzelprodukte(p);
  const zusammen = zusammenfassen(einzeln);
  // gemischte Glieder dürfen sich nicht aufheben (sonst 3. binomische Formel)
  const verschiedeneMonome = new Set(einzeln.map((x) => monomSchluessel(x.monom))).size;
  if (zusammen.length < verschiedeneMonome) return false;
  return ergebnisVon(p).every((x) => x.koeffizient.betrag().vergleiche(81) <= 0);
}

function fehlantworten(p: Produkt): Fehlantwort[] {
  const liste: Fehlantwort[] = [];
  // KL: nur „erstes·erstes“ und „letztes·letztes“
  const kl = [gliedMal(p.a[0]!, p.b[0]!), gliedMal(p.a[p.a.length - 1]!, p.b[p.b.length - 1]!)];
  liste.push({ fehlertyp: 'KL', glieder: zusammenfassenSortiert(mitVorzeichen(p, kl)) });
  if (p.vorzeichen === -1) {
    const richtigOhneMinus = zusammenfassenSortiert(einzelprodukte(p));
    liste.push({
      fehlertyp: 'KL',
      glieder: richtigOhneMinus.map((x, i) => (i === 0 ? { ...x, koeffizient: x.koeffizient.negiert() } : x)),
      rueckmeldung: 'Das Minus vor dem Produkt gilt für das ganze Ergebnis – jedes Vorzeichen ändert sich.',
    });
  }
  liste.push({ fehlertyp: 'VZ', glieder: ergebnisVon(p, 'VZ') });
  liste.push({ fehlertyp: 'PO', glieder: ergebnisVon(p, 'PO') });
  return bereinigeFehlantworten(summeAlsPolynom(ergebnisVon(p)), liste);
}

export const summeMalSumme: Generator = {
  id: 't8-summe-mal-summe',
  version: 1,
  baustein: 't8-summe-mal-summe',
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

    for (let versuch = 0; versuch < 1000; versuch++) {
      const p = ziehe(z, afb);
      if (!geeignet(p)) continue;
      const fehler = fehlantworten(p);
      if (typ === 'auswahl' && fehler.length < 2) continue;

      const aufgabe = produktFormel(p);
      const end = ergebnisVon(p);
      const loesung = formel(end);
      const zeilen = wegZeilen(p);
      const ansatz: Formel = { text: `${aufgabe.text} = ${zeilen[0]!.text}`, latex: `${aufgabe.latex} = ${zeilen[0]!.latex}` };
      const loesungsweg = [ansatz, ...zeilen.slice(1).map((f) => ({ text: `= ${f.text}`, latex: `= ${f.latex}` }))];
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fehler) : undefined;
      const loesungPoly = summeAlsPolynom(end);

      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht beim Ausmultiplizieren?' : 'Multipliziere aus und fasse zusammen.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss:
            p.vorzeichen === -1
              ? 'Multipliziere zuerst die beiden Klammern aus: jedes Glied der ersten mit jedem Glied der zweiten. Das Minus davor ändert danach jedes Vorzeichen.'
              : 'Multipliziere jedes Glied der ersten Klammer mit jedem Glied der zweiten Klammer. Fasse danach gleichartige Glieder zusammen.',
          ansatz,
          loesungsweg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort, RUECKMELDUNG);
          return pruefeTermEingabe(antwort, loesungPoly, fehler, RUECKMELDUNG);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
