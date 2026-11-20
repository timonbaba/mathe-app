/**
 * Generator für Baustein t8-zusammenfassen
 * „Terme mit mehreren Variablen zusammenfassen“ (Gym Kl. 8, LB 1, AFB I),
 * Aufgaben vom Typ 19ab − 17ac − ab.
 *
 * Diagnostische Fehlantworten:
 *  - ZF  Ungleichartige Glieder zusammengefasst: Glieder mit denselben Variablen,
 *        aber anderen Hochzahlen (z. B. a²b und ab²) werden wie gleichartige behandelt.
 *  - ZF  Koeffizient 1 übersehen: Ein Glied ohne Zahl (z. B. −ab) wird beim
 *        Zusammenfassen weggelassen.
 *  - PO  Beim Addieren die Hochzahlen addiert (x² + x² = 2x⁴).
 *  - VZ  Minus vor einem Glied übersehen.
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, monomSchluessel, type Glied, type Monom } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { auswahlOptionen, bereinigeFehlantworten, formel, pruefeAuswahl, pruefeTermEingabe, sortiereGlieder, summeAlsPolynom, zufallsMonom, type Fehlantwort } from './gemeinsam';
import { zusammenfassen, zusammenfassenSortiert } from './termbaum';
import { ANZEIGE, GeneratorFehler, type Aufgabe, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

const VARIABLEN: readonly (readonly string[])[] = [['a', 'b', 'c'], ['x', 'y'], ['m', 'n'], ['p', 'q']];

const variablenMenge = (m: Monom) => Object.keys(m).filter((v) => (m[v] ?? 0) > 0).sort().join();

interface Roh {
  /** Glieder in Anzeigereihenfolge */
  glieder: Glied[];
}

function ziehe(z: Zufall): Roh {
  const vars = z.auswahl(VARIABLEN);
  const anzahlMonome = z.ganzzahl(2, 3);
  const monome: Monom[] = [];
  monome.push(zufallsMonom(z, vars, 2, 1));
  if (z.mitWahrscheinlichkeit(0.5)) {
    // „Verwechsler“: gleiche Variablen, andere Hochzahlen (a²b ↔ ab², x² ↔ x)
    const m = monome[0]!;
    const vs = Object.keys(m);
    if (vs.length === 2) monome.push({ [vs[0]!]: m[vs[1]!]!, [vs[1]!]: m[vs[0]!]! });
    else monome.push({ [vs[0]!]: m[vs[0]!] === 1 ? 2 : 1 });
  }
  while (monome.length < anzahlMonome) monome.push(z.mitWahrscheinlichkeit(0.15) ? {} : zufallsMonom(z, vars, 2, 1));

  const glieder: Glied[] = [];
  monome.forEach((m, i) => {
    const anzahl = i === 0 ? z.ganzzahl(2, 3) : z.ganzzahl(1, 2);
    for (let j = 0; j < anzahl; j++) {
      const k = z.mitWahrscheinlichkeit(0.2) ? z.auswahl([1, -1]) : z.ganzzahlOhne(-20, 20, [0]);
      glieder.push({ koeffizient: Bruch.von(k), monom: m });
    }
  });
  return { glieder: z.gemischt(glieder) };
}

function geeignet(r: Roh): boolean {
  const schluessel = r.glieder.map((g) => monomSchluessel(g.monom));
  // mindestens zwei verschiedene Monome und mindestens eine Gruppe mit ≥ 2 Gliedern
  const gruppen = new Map<string, number>();
  for (const s of schluessel) gruppen.set(s, (gruppen.get(s) ?? 0) + 1);
  if (![...gruppen.values()].some((n) => n >= 2)) return false;
  if (gruppen.size < 2) return false;
  if (r.glieder.length > 6 || r.glieder.length < 3) return false;
  if (r.glieder[0]!.koeffizient.istNegativ()) return false;
  const ergebnis = zusammenfassen(r.glieder);
  if (ergebnis.length === 0) return false;
  if (ergebnis.some((g) => g.koeffizient.betrag().vergleiche(60) > 0)) return false;
  return true;
}

function fehlantworten(r: Roh): Fehlantwort[] {
  const liste: Fehlantwort[] = [];
  const zaehle = new Map<string, number>();
  for (const g of r.glieder) zaehle.set(monomSchluessel(g.monom), (zaehle.get(monomSchluessel(g.monom)) ?? 0) + 1);

  // ZF: gleiche Variablen, andere Hochzahlen → wie gleichartig behandelt
  const ersterMitMenge = new Map<string, Monom>();
  let verwechselt = false;
  const zf = r.glieder.map((g) => {
    const menge = variablenMenge(g.monom);
    if (menge === '') return g;
    const erster = ersterMitMenge.get(menge);
    if (!erster) { ersterMitMenge.set(menge, g.monom); return g; }
    if (monomSchluessel(erster) !== monomSchluessel(g.monom)) verwechselt = true;
    return { ...g, monom: erster };
  });
  if (verwechselt) liste.push({ fehlertyp: 'ZF', glieder: zusammenfassen(zf) });

  // ZF: Koeffizient 1 übersehen (Glied ohne Zahl fällt weg)
  const ohneEins = r.glieder.filter((g) => !(g.koeffizient.betrag().gleich(1) && Object.keys(g.monom).length > 0 && (zaehle.get(monomSchluessel(g.monom)) ?? 0) >= 2));
  if (ohneEins.length < r.glieder.length) {
    liste.push({ fehlertyp: 'ZF', glieder: zusammenfassen(ohneEins), rueckmeldung: 'Ein Glied ohne Zahl davor hat den Koeffizienten 1, z. B. ab = 1ab. Es darf nicht wegfallen.' });
  }

  // PO: Hochzahlen beim Addieren addiert
  const po = zusammenfassen(r.glieder).map((g) => {
    const n = zaehle.get(monomSchluessel(g.monom)) ?? 1;
    if (n < 2) return g;
    const m: Record<string, number> = {};
    for (const [v, e] of Object.entries(g.monom)) m[v] = e * n;
    return { ...g, monom: m };
  });
  liste.push({ fehlertyp: 'PO', glieder: po, rueckmeldung: 'Beim Addieren bleiben die Hochzahlen gleich: x² + x² = 2x², nicht 2x⁴.' });

  // VZ: Minus vor dem ersten negativen Glied einer Gruppe übersehen
  const idx = r.glieder.findIndex((g) => g.koeffizient.istNegativ() && (zaehle.get(monomSchluessel(g.monom)) ?? 0) >= 2);
  if (idx >= 0) {
    const vz = r.glieder.map((g, i) => (i === idx ? { ...g, koeffizient: g.koeffizient.negiert() } : g));
    liste.push({ fehlertyp: 'VZ', glieder: zusammenfassen(vz), rueckmeldung: 'Das Minus gehört zum Glied dahinter. Achte beim Zusammenfassen auf jedes Vorzeichen.' });
  }
  return bereinigeFehlantworten(
    summeAlsPolynom(zusammenfassen(r.glieder)),
    // nur sortieren, nicht zusammenfassen: Fehlantworten mit gleichartigen Gliedern werden verworfen
    liste.map((f) => {
      const sortiert = [...f.glieder];
      sortiereGlieder(sortiert);
      return { ...f, glieder: sortiert };
    }),
  );
}

/** Monome der Aufgabe in üblicher Reihenfolge (höchster Grad zuerst, alphabetisch, Zahl zuletzt). */
function monomReihenfolge(glieder: readonly Glied[]): string[] {
  const eindeutig: Glied[] = [];
  for (const g of glieder) if (!eindeutig.some((e) => monomSchluessel(e.monom) === monomSchluessel(g.monom))) eindeutig.push({ ...g, koeffizient: Bruch.EINS });
  sortiereGlieder(eindeutig);
  return eindeutig.map((g) => monomSchluessel(g.monom));
}

/** Glieder so umsortiert, dass gleichartige nebeneinander stehen (übliche Reihenfolge). */
function gruppiert(glieder: readonly Glied[]): Glied[] {
  const reihenfolge = monomReihenfolge(glieder);
  return reihenfolge.flatMap((k) => glieder.filter((g) => monomSchluessel(g.monom) === k));
}

/** Zeile wie „(19 − 1)·ab − 17ac“. */
function koeffizientenZeile(glieder: readonly Glied[]): Formel {
  const reihenfolge = monomReihenfolge(glieder);
  const teile = reihenfolge.map((k, i) => {
    const gruppe = glieder.filter((g) => monomSchluessel(g.monom) === k);
    if (gruppe.length === 1) {
      const g = gruppe[0]!;
      const t = formatGlied({ ...g, koeffizient: g.koeffizient.betrag() }, 'text', ANZEIGE);
      const l = formatGlied({ ...g, koeffizient: g.koeffizient.betrag() }, 'latex', ANZEIGE);
      const neg = g.koeffizient.istNegativ();
      return { text: i === 0 ? (neg ? `−${t}` : t) : neg ? ` − ${t}` : ` + ${t}`, latex: i === 0 ? (neg ? `-${l}` : l) : neg ? ` - ${l}` : ` + ${l}` };
    }
    const zahlen = gruppe.map((g, j) => {
      const b = g.koeffizient.betrag().toString();
      const neg = g.koeffizient.istNegativ();
      return j === 0 ? { t: neg ? `−${b}` : b, l: neg ? `-${b}` : b } : { t: neg ? ` − ${b}` : ` + ${b}`, l: neg ? ` - ${b}` : ` + ${b}` };
    });
    const monomText = formatGlied({ koeffizient: Bruch.EINS, monom: gruppe[0]!.monom }, 'text', ANZEIGE);
    const monomLatex = formatGlied({ koeffizient: Bruch.EINS, monom: gruppe[0]!.monom }, 'latex', ANZEIGE);
    const konstant = Object.keys(gruppe[0]!.monom).length === 0;
    const t = `(${zahlen.map((x) => x.t).join('')})${konstant ? '' : `·${monomText}`}`;
    const l = `\\left(${zahlen.map((x) => x.l).join('')}\\right)${konstant ? '' : ` \\cdot ${monomLatex}`}`;
    return { text: i === 0 ? t : ` + ${t}`, latex: i === 0 ? l : ` + ${l}` };
  });
  return { text: teile.map((x) => x.text).join(''), latex: teile.map((x) => x.latex).join('') };
}

export const zusammenfassenGenerator: Generator = {
  id: 't8-zusammenfassen',
  version: 1,
  baustein: 't8-zusammenfassen',
  afb: ['I'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb = wunsch.afb ?? 'I';
    if (afb !== 'I') throw new GeneratorFehler('Dieser Generator bietet nur AFB I an');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 1000; versuch++) {
      const r = ziehe(z);
      if (!geeignet(r)) continue;
      const fehler = fehlantworten(r);
      if (typ === 'auswahl' && fehler.length < 2) continue;

      const ergebnis = zusammenfassenSortiert(r.glieder);
      const loesung = formel(ergebnis);
      const aufgabe = formel(r.glieder);
      const sortiert = formel(gruppiert(r.glieder));
      const koeff = koeffizientenZeile(r.glieder);
      const zeilen: Formel[] = [];
      if (sortiert.text !== aufgabe.text) zeilen.push(sortiert);
      zeilen.push(koeff, loesung);
      const ansatz: Formel = { text: `${aufgabe.text} = ${zeilen[0]!.text}`, latex: `${aufgabe.latex} = ${zeilen[0]!.latex}` };
      const loesungsweg: Formel[] = [ansatz, ...zeilen.slice(1).map((f) => ({ text: `= ${f.text}`, latex: `= ${f.latex}` }))];
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fehler) : undefined;
      const loesungPoly = summeAlsPolynom(ergebnis);

      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'I',
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht beim Zusammenfassen?' : 'Fasse zusammen.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss:
            'Gleichartige Glieder haben dieselben Variablen mit denselben Hochzahlen – nur diese darfst du zusammenfassen. Addiere dann ihre Zahlen. Steht keine Zahl davor, ist es eine 1.',
          ansatz,
          loesungsweg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          return pruefeTermEingabe(antwort, loesungPoly, fehler);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
