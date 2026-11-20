/**
 * Generator für Baustein t8-ausmultiplizieren-monom
 * „Produkt mal Klammer ausmultiplizieren“ (Gym Kl. 8, LB 1).
 *
 * Varianten:
 *  - zahl          (AFB I)  Zahl · Summe, z. B. 3·(4·x + 2·y), −2·(3·a − 5)
 *  - minusklammer  (AFB I)  −(Summe), z. B. −(3·x − 4·y + 2)
 *  - monom         (AFB II) Produkt mit Variablen · Summe, z. B. 3·x·(2·x − 5·y), −4·a·b·(2·a − 3·b + 1)
 *
 * Diagnostische Fehlantworten (jede entsteht aus genau einem Fehler):
 *  - KL  Nur das erste Glied in der Klammer wird mit dem Faktor multipliziert.
 *  - VZ  Vorzeichenfehler: Bei negativem Faktor werden die Vorzeichen ab dem
 *        zweiten Glied nicht geändert; bei positivem Faktor wird das Minus eines
 *        negativen Glieds „verschluckt“ (3·(−2·y) = 6·y).
 *  - PO  Hochzahlen nicht addiert (x·x = x statt x²); nur bei Variante monom.
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, monomSchluessel, type Glied, type Monom } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import {
  auswahlOptionen,
  bereinigeFehlantworten,
  formel,
  gliedMal,
  hatVariablen,
  monomMal,
  monomMalOhneHochzahlen,
  pruefeAuswahl,
  pruefeTermEingabe,
  sortiereGlieder,
  summeAlsPolynom,
  zufallsMonom,
  type Fehlantwort,
} from './gemeinsam';
import { ANZEIGE, GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

type Variante = 'zahl' | 'minusklammer' | 'monom';

const RUECKMELDUNG: Partial<Record<FehlertypCode, string>> = {
  KL: 'Du hast nicht jedes Glied in der Klammer mit dem Faktor multipliziert.',
  VZ: 'Schau dir die Vorzeichen noch einmal an: Minus mal Minus ergibt Plus, Minus mal Plus ergibt Minus.',
  PO: 'Achte auf die Hochzahlen: x · x = x², bei gleichen Variablen werden die Hochzahlen addiert.',
  UK: 'Das stimmt noch nicht. Möchtest du einen Denkanstoß?',
};

const opt = ANZEIGE;

// --- Aufgabe zusammenstellen -------------------------------------------------

interface Rohaufgabe {
  variante: Variante;
  faktor: Glied;
  klammer: Glied[];
}

const VARIABLENPAARE: readonly (readonly [string, string])[] = [['x', 'y'], ['a', 'b'], ['m', 'n']];

function zieheRohaufgabe(z: Zufall, afb: AFB): Rohaufgabe {
  const vars = z.auswahl(VARIABLENPAARE);
  const variante: Variante = afb === 'II' ? 'monom' : z.mitWahrscheinlichkeit(0.25) ? 'minusklammer' : 'zahl';
  const anzahl = z.mitWahrscheinlichkeit(0.3) ? 3 : 2;
  const klammer: Glied[] = [];
  const maxGradInnen = variante === 'monom' ? 2 : 1;
  for (let i = 0; i < anzahl; i++) {
    klammer.push({ koeffizient: Bruch.von(z.ganzzahlOhne(-9, 9, [0])), monom: zufallsMonom(z, vars, maxGradInnen) });
  }
  // übliche Reihenfolge in der Klammer: höchster Grad zuerst, dann alphabetisch, Zahl zuletzt
  sortiereGlieder(klammer);
  let faktor: Glied;
  if (variante === 'minusklammer') faktor = { koeffizient: Bruch.von(-1), monom: {} };
  else if (variante === 'zahl') faktor = { koeffizient: Bruch.von(z.ganzzahlOhne(-9, 9, [-1, 0, 1])), monom: {} };
  else {
    let m: Monom = {};
    while (!hatVariablen(m)) m = zufallsMonom(z, vars, 2);
    faktor = { koeffizient: Bruch.von(z.ganzzahlOhne(-6, 6, [0])), monom: m };
  }
  return { variante, faktor, klammer };
}

/** Gültigkeitsregeln: verwirft ungeeignete Zufallswerte. */
function istGeeignet(r: Rohaufgabe): boolean {
  const schluessel = r.klammer.map((g) => monomSchluessel(g.monom));
  // Glieder in der Klammer müssen ungleichartig sein (sonst erst zusammenfassen)
  if (new Set(schluessel).size !== schluessel.length) return false;
  // mindestens ein Glied mit Variable in der Klammer
  if (!r.klammer.some((g) => hatVariablen(g.monom))) return false;
  // erstes Glied der Klammer positiv (übliche Schreibweise), außer bei Minusklammer egal
  if (r.klammer[0]!.koeffizient.istNegativ()) return false;
  if (r.variante === 'monom') {
    // Hochzahlen im Ergebnis höchstens 3 (Kl. 8, ohne Hilfsmittel)
    for (const g of r.klammer) {
      const p = monomMal(r.faktor.monom, g.monom);
      if (Object.values(p).some((e) => e > 3)) return false;
    }
    // PO-Fehler soll möglich sein: mindestens eine gemeinsame Variable
    if (!r.klammer.some((g) => Object.keys(g.monom).some((v) => (r.faktor.monom[v] ?? 0) > 0))) return false;
  }
  return true;
}

function fehlantworten(r: Rohaufgabe): Fehlantwort[] {
  const richtig = r.klammer.map((g) => gliedMal(r.faktor, g));
  const liste: Fehlantwort[] = [];
  // KL: nur erstes Glied multipliziert
  liste.push({ fehlertyp: 'KL', glieder: [richtig[0]!, ...r.klammer.slice(1)] });
  // VZ
  if (r.faktor.koeffizient.istNegativ()) {
    liste.push({ fehlertyp: 'VZ', glieder: richtig.map((g, i) => (i === 0 ? g : { ...g, koeffizient: g.koeffizient.negiert() })) });
  } else if (r.klammer.some((g) => g.koeffizient.istNegativ())) {
    liste.push({ fehlertyp: 'VZ', glieder: richtig.map((g) => ({ ...g, koeffizient: g.koeffizient.betrag() })) });
  }
  // PO
  if (r.variante === 'monom') {
    liste.push({
      fehlertyp: 'PO',
      glieder: r.klammer.map((g) => ({ koeffizient: r.faktor.koeffizient.mal(g.koeffizient), monom: monomMalOhneHochzahlen(r.faktor.monom, g.monom) })),
    });
  }
  return bereinigeFehlantworten(summeAlsPolynom(richtig), liste);
}

function aufgabeFormel(r: Rohaufgabe): Formel {
  const innen = formel(r.klammer);
  if (r.variante === 'minusklammer') return { text: `−(${innen.text})`, latex: `-\\left(${innen.latex}\\right)` };
  const f = { text: formatGlied(r.faktor, 'text', opt), latex: formatGlied(r.faktor, 'latex', opt) };
  return { text: `${f.text}·(${innen.text})`, latex: `${f.latex} \\cdot \\left(${innen.latex}\\right)` };
}

function produktZeile(r: Rohaufgabe): Formel {
  const faktor = r.variante === 'minusklammer' ? { koeffizient: Bruch.von(-1), monom: {} } : r.faktor;
  const teile = r.klammer.map((g) => ({
    text: `${formatGlied(faktor, 'text', opt, true)}·${formatGlied(g, 'text', opt, true)}`,
    latex: `${formatGlied(faktor, 'latex', opt, true)} \\cdot ${formatGlied(g, 'latex', opt, true)}`,
  }));
  return { text: teile.map((t) => t.text).join(' + '), latex: teile.map((t) => t.latex).join(' + ') };
}

function zwischenZeile(richtig: readonly Glied[]): Formel {
  const teile = richtig.map((g, i) => ({
    text: formatGlied(g, 'text', opt, i > 0),
    latex: formatGlied(g, 'latex', opt, i > 0).replace(/^\((.*)\)$/, '\\left($1\\right)'),
  }));
  return { text: teile.map((t) => t.text).join(' + '), latex: teile.map((t) => t.latex).join(' + ') };
}

function denkanstoss(r: Rohaufgabe): string {
  if (r.variante === 'minusklammer') {
    return 'Ein Minus vor der Klammer bedeutet: mal (−1). Dadurch ändert sich das Vorzeichen jedes Glieds in der Klammer.';
  }
  const teile = ['Multipliziere den Faktor vor der Klammer mit jedem Glied in der Klammer.'];
  if (r.faktor.koeffizient.istNegativ()) teile.push('Der Faktor ist negativ – achte auf die Vorzeichen.');
  if (r.variante === 'monom') teile.push('Bei gleichen Variablen werden die Hochzahlen addiert, z. B. x · x² = x³.');
  return teile.join(' ');
}

// --- Generator ---------------------------------------------------------------

const MAX_VERSUCHE = 1000;

export const ausmultiplizierenMonom: Generator = {
  id: 't8-ausmultiplizieren-monom',
  version: 1,
  baustein: 't8-ausmultiplizieren-monom',
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

    for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
      const r = zieheRohaufgabe(z, afb);
      if (!istGeeignet(r)) continue;
      const fehler = fehlantworten(r);
      // Auswahl braucht mindestens zwei diagnostische Fehlantworten
      if (typ === 'auswahl' && fehler.length < 2) continue;

      const richtig = r.klammer.map((g) => gliedMal(r.faktor, g));
      const loesungPoly = summeAlsPolynom(richtig);
      const loesung = formel(richtig);
      const ansatzRechts = produktZeile(r);
      const start = aufgabeFormel(r);
      const ansatz: Formel = { text: `${start.text} = ${ansatzRechts.text}`, latex: `${start.latex} = ${ansatzRechts.latex}` };
      const zwischen = zwischenZeile(richtig);
      const loesungsweg: Formel[] = [ansatz];
      if (zwischen.text !== loesung.text) loesungsweg.push({ text: `= ${zwischen.text}`, latex: `= ${zwischen.latex}` });
      loesungsweg.push({ text: `= ${loesung.text}`, latex: `= ${loesung.latex}` });

      let optionen: Auswahloption[] | undefined;
      if (typ === 'auswahl') {
        optionen = auswahlOptionen(z, loesung, fehler);
      }

      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht beim Ausmultiplizieren?' : 'Multipliziere aus.',
        aufgabe: start,
        loesung,
        hilfen: { denkanstoss: denkanstoss(r), ansatz, loesungsweg },
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
