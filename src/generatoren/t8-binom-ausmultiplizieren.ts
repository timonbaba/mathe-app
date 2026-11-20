/**
 * Generator für Baustein t8-binom-ausmultiplizieren
 * „Binomische Formeln: Klammern auflösen“ (Gym Kl. 8, LB 1).
 *
 *  - AFB I:  (x + 5)², (a − 3)², (m + 7)·(m − 7)
 *  - AFB II: (2a + 3b)², (3x − 2)², (2 − a)², (a + 2b)·(a − 2b), 2·(x − 5)²
 *
 * Diagnostische Fehlantworten:
 *  - PO  Mittelglied vergessen: (a + b)² = a² + b²
 *  - PO  Koeffizient nicht quadriert: (2a)² = 2a²
 *  - PO  Formeln verwechselt: (a + b)·(a − b) = a² − 2ab + b²
 *  - VZ  Vorzeichen beim letzten Glied: (a − b)² = a² − 2ab − b²;  (a + b)·(a − b) = a² + b²
 *  - KL  Faktor vor dem Quadrat zuerst in die Klammer: 2·(x − 5)² = (2x − 10)²
 */
import { Bruch } from '../mathe/bruch';
import { type Glied } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { auswahlOptionen, bereinigeFehlantworten, formel, gliedMal, pruefeAuswahl, pruefeTermEingabe, sortiereGlieder, summeAlsPolynom, type Fehlantwort } from './gemeinsam';
import { binomErgebnis, binomFormel, binomOhneFaktor, binomWeg, type Binom } from './binom';
import { zusammenfassen } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const RM: Partial<Record<FehlertypCode, string>> = {
  PO: 'Vergleiche genau mit der binomischen Formel: (a + b)² = a² + 2ab + b² – mit Mittelglied, und das ganze Glied wird quadriert.',
  VZ: 'Achte auf die Vorzeichen: Bei (a − b)² ist nur das Mittelglied negativ, b² ist immer positiv.',
  KL: 'Erst quadrieren, dann mit dem Faktor davor multiplizieren – nicht den Faktor in die Klammer ziehen.',
};

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

function ziehe(z: Zufall, afb: AFB): Binom {
  const [v, w] = z.auswahl([['x', 'y'], ['a', 'b'], ['m', 'n'], ['p', 'q'], ['r', 's'], ['u', 'v']] as const);
  if (afb === 'I') {
    const b = z.ganzzahl(1, 15);
    const art = z.auswahl(['plus', 'minus', 'dritte'] as const);
    return art === 'dritte' ? { art: 'dritte', a: gl(1, { [v]: 1 }), b: gl(b), k: 1 } : { art: 'quadrat', a: gl(1, { [v]: 1 }), b: gl(art === 'minus' ? -b : b), k: 1 };
  }
  const form = z.auswahl(['zweiVariablen', 'koeffizient', 'zahlZuerst', 'dritteKoeff', 'faktor'] as const);
  const s = z.auswahl([1, -1]);
  switch (form) {
    case 'zweiVariablen':
      return { art: 'quadrat', a: gl(z.ganzzahl(1, 5), { [v]: 1 }), b: gl(s * z.ganzzahl(1, 5), { [w]: 1 }), k: 1 };
    case 'koeffizient':
      return { art: 'quadrat', a: gl(z.ganzzahl(2, 6), { [v]: 1 }), b: gl(s * z.ganzzahl(1, 9)), k: 1 };
    case 'zahlZuerst':
      return { art: 'quadrat', a: gl(z.ganzzahl(1, 9)), b: gl(s * z.ganzzahl(1, 4), { [v]: 1 }), k: 1 };
    case 'dritteKoeff':
      return z.mitWahrscheinlichkeit(0.5)
        ? { art: 'dritte', a: gl(z.ganzzahl(1, 4), { [v]: 1 }), b: gl(z.ganzzahl(2, 5), { [w]: 1 }), k: 1 }
        : { art: 'dritte', a: gl(z.ganzzahl(2, 6), { [v]: 1 }), b: gl(z.ganzzahl(1, 9)), k: 1 };
    case 'faktor':
      return { art: 'quadrat', a: gl(1, { [v]: 1 }), b: gl(s * z.ganzzahl(1, 9)), k: z.auswahl([2, 3, 4, 5, -2, -3]) };
  }
}

function geeignet(x: Binom): boolean {
  if (x.a.koeffizient.istNull() || x.b.koeffizient.istNull()) return false;
  // a und b ungleichartig (sonst kein Binom)
  if (JSON.stringify(x.a.monom) === JSON.stringify(x.b.monom)) return false;
  // a und b ohne gemeinsamen Zahlfaktor > 1 (z. B. nicht (2x + 4)²)
  const g = (p: bigint, q: bigint): bigint => (q === 0n ? (p < 0n ? -p : p) : g(q, p % q));
  if (g(x.a.koeffizient.zaehler, x.b.koeffizient.zaehler) > 1n) return false;
  return binomErgebnis(x).every((y) => y.koeffizient.betrag().vergleiche(150) <= 0);
}

function fehlantworten(x: Binom): Fehlantwort[] {
  const k = (gs: Glied[]): Glied[] => {
    const r = zusammenfassen(gs.map((y) => ({ ...y, koeffizient: y.koeffizient.mal(x.k) })));
    sortiereGlieder(r);
    return r;
  };
  const [a2, mitte, b2] = binomOhneFaktor(x);
  const liste: Fehlantwort[] = [];
  if (x.art === 'quadrat') {
    liste.push({ fehlertyp: 'PO', glieder: k([a2!, b2!]), rueckmeldung: 'Das Mittelglied 2ab fehlt: (a + b)² = a² + 2ab + b².' });
    // Koeffizient nicht quadriert
    const nichtQuadriert = (g: Glied): Glied => ({ koeffizient: g.koeffizient.betrag(), monom: gliedMal({ koeffizient: Bruch.EINS, monom: g.monom }, { koeffizient: Bruch.EINS, monom: g.monom }).monom });
    if (!x.a.koeffizient.betrag().gleich(1) || !x.b.koeffizient.betrag().gleich(1)) {
      liste.push({ fehlertyp: 'PO', glieder: k([nichtQuadriert(x.a), mitte!, nichtQuadriert(x.b)]), rueckmeldung: 'Das ganze Glied wird quadriert: (2a)² = 4a², nicht 2a².' });
    }
    if (x.b.koeffizient.istNegativ()) liste.push({ fehlertyp: 'VZ', glieder: k([a2!, mitte!, { ...b2!, koeffizient: b2!.koeffizient.negiert() }]) });
    else liste.push({ fehlertyp: 'PO', glieder: k([a2!, { ...mitte!, koeffizient: mitte!.koeffizient.durch(2) }, b2!]), rueckmeldung: 'Im Mittelglied steht 2·a·b – die 2 nicht vergessen.' });
    if (x.k !== 1) {
      const innen: Binom = { ...x, a: { ...x.a, koeffizient: x.a.koeffizient.mal(x.k) }, b: { ...x.b, koeffizient: x.b.koeffizient.mal(x.k) }, k: 1 };
      liste.push({ fehlertyp: 'KL', glieder: binomErgebnis(innen) });
    }
  } else {
    const negB2 = binomOhneFaktor(x)[1]!;
    liste.push({ fehlertyp: 'VZ', glieder: k([a2!, { ...negB2, koeffizient: negB2.koeffizient.negiert() }]) });
    const quadratMinus: Binom = { ...x, art: 'quadrat', b: { ...x.b, koeffizient: x.b.koeffizient.negiert() } };
    liste.push({ fehlertyp: 'PO', glieder: binomErgebnis(quadratMinus), rueckmeldung: 'Das ist die 2. binomische Formel. Bei (a + b)·(a − b) heben sich die gemischten Glieder auf: a² − b².' });
    if (!x.b.koeffizient.gleich(1) || !x.a.koeffizient.gleich(1)) {
      liste.push({
        fehlertyp: 'PO',
        glieder: k([{ koeffizient: x.a.koeffizient, monom: gliedMal(x.a, x.a).monom }, { koeffizient: x.b.koeffizient.negiert(), monom: gliedMal(x.b, x.b).monom }]),
        rueckmeldung: 'Das ganze Glied wird quadriert: (2b)² = 4b², nicht 2b².',
      });
    }
  }
  return bereinigeFehlantworten(summeAlsPolynom(binomErgebnis(x)), liste);
}

export const binomAusmultiplizieren: Generator = {
  id: 't8-binom-ausmultiplizieren',
  version: 1,
  baustein: 't8-binom-ausmultiplizieren',
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
      const x = ziehe(z, afb);
      if (!geeignet(x)) continue;
      const fehler = fehlantworten(x);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const aufgabe = binomFormel(x);
      const end = binomErgebnis(x);
      const loesung = formel(end);
      const weg = binomWeg(x);
      const ansatz: Formel = { text: `${aufgabe.text} = ${weg[0]!.text}`, latex: `${aufgabe.latex} = ${weg[0]!.latex}` };
      const loesungsweg = [ansatz, ...weg.slice(1).map((f) => ({ text: `= ${f.text}`, latex: `= ${f.latex}` }))];
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fehler) : undefined;
      const loesungPoly = summeAlsPolynom(end);
      const denkanstoss =
        x.art === 'quadrat'
          ? `Nutze die ${x.b.koeffizient.istNegativ() ? '2. binomische Formel: (a − b)² = a² − 2ab + b²' : '1. binomische Formel: (a + b)² = a² + 2ab + b²'}. Überlege zuerst: Was ist hier a, was ist b?` +
            (x.k !== 1 ? ' Den Faktor vor der Klammer multiplizierst du erst am Ende.' : '')
          : 'Nutze die 3. binomische Formel: (a + b)·(a − b) = a² − b². Überlege zuerst: Was ist hier a, was ist b?';
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht mit der binomischen Formel?' : 'Löse die Klammer mit einer binomischen Formel auf.',
        aufgabe,
        loesung,
        hilfen: { denkanstoss, ansatz, loesungsweg },
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
