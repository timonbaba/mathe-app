/**
 * Generator für Baustein t8-binom-faktorisieren
 * „Binomische Formeln: Faktorisieren“ (Gym Kl. 8, LB 1).
 *
 *  - AFB II:  x² − 8x + 16 = (x − 4)²;  4x² − 9 = (2x + 3)·(2x − 3);  9a² + 12ab + 4b² = (3a + 2b)²
 *  - AFB III: erst ausklammern: 2x² − 8 = 2·(x + 2)·(x − 2);  3x² + 12x + 12 = 3·(x + 2)²
 *
 * Diagnostische Fehlantworten:
 *  - VZ  falsches Vorzeichen in der Klammer: x² − 8x + 16 = (x + 4)²
 *  - PO  Zahl aus dem Mittelglied bzw. ohne Wurzel übernommen: (x − 8)², (x + 9)·(x − 9) bei x² − 9
 *  - PO  Formeln verwechselt: x² − 9 = (x − 3)²
 *  - KL  ausgeklammerten Faktor vergessen: 2x² − 8 = (x + 2)·(x − 2)
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, Polynom, type Glied } from '../mathe/polynom';
import { alsPolynom, leseTerm, TermFehler } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { formel, pruefeAuswahl, RUECKMELDUNG, summeAlsPolynom } from './gemeinsam';
import { binomErgebnis, binomFormel, binomOhneFaktor, type Binom } from './binom';
import { hatGemeinsamenFaktor, produktForm } from './faktorisierung';
import { ANZEIGE, GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });
const betrag = (g: Glied): Glied => ({ ...g, koeffizient: g.koeffizient.betrag() });

const RM: Partial<Record<FehlertypCode, string>> = {
  VZ: 'Das Vorzeichen in der Klammer ist dasselbe wie beim Mittelglied.',
  PO: 'In die Klammer gehören die Wurzeln aus dem ersten und dem letzten Glied. Prüfe mit der passenden binomischen Formel.',
  KL: 'Den Faktor, den du zuerst ausgeklammert hast, darfst du nicht vergessen – er steht vor den Klammern.',
};

interface Fehl {
  fehlertyp: FehlertypCode;
  x: Binom;
  rueckmeldung?: string;
}

function ziehe(z: Zufall, afb: AFB): Binom {
  const [v, w] = z.auswahl([['x', 'y'], ['a', 'b'], ['m', 'n'], ['p', 'q']] as const);
  if (afb === 'III') {
    const k = z.auswahl([2, 3, 4, 5, -2, -3]);
    const b = z.ganzzahl(1, 6);
    return z.mitWahrscheinlichkeit(0.5)
      ? { art: 'dritte', a: gl(1, { [v]: 1 }), b: gl(b), k }
      : { art: 'quadrat', a: gl(1, { [v]: 1 }), b: gl(z.auswahl([1, -1]) * b), k };
  }
  const s = z.auswahl([1, -1]);
  switch (z.auswahl(['einfach', 'einfach', 'koeffizient', 'zweiVariablen'] as const)) {
    case 'einfach': {
      const b = z.ganzzahl(1, 12);
      return z.mitWahrscheinlichkeit(0.4) ? { art: 'dritte', a: gl(1, { [v]: 1 }), b: gl(b), k: 1 } : { art: 'quadrat', a: gl(1, { [v]: 1 }), b: gl(s * b), k: 1 };
    }
    case 'koeffizient': {
      const a = gl(z.ganzzahl(2, 5), { [v]: 1 });
      const b = z.ganzzahl(1, 9);
      return z.mitWahrscheinlichkeit(0.4) ? { art: 'dritte', a, b: gl(b), k: 1 } : { art: 'quadrat', a, b: gl(s * b), k: 1 };
    }
    case 'zweiVariablen': {
      const a = gl(z.ganzzahl(1, 4), { [v]: 1 });
      const b = z.ganzzahl(1, 4);
      return z.mitWahrscheinlichkeit(0.4) ? { art: 'dritte', a, b: gl(b, { [w]: 1 }), k: 1 } : { art: 'quadrat', a, b: gl(s * b, { [w]: 1 }), k: 1 };
    }
  }
}

function geeignet(x: Binom): boolean {
  const g = (p: bigint, q: bigint): bigint => (q === 0n ? (p < 0n ? -p : p) : g(q, p % q));
  if (g(x.a.koeffizient.zaehler, x.b.koeffizient.zaehler) > 1n) return false;
  return binomErgebnis(x).every((y) => y.koeffizient.betrag().vergleiche(150) <= 0);
}

function fehler(x: Binom): Fehl[] {
  const liste: Fehl[] = [];
  const b = betrag(x.b);
  if (x.art === 'quadrat') {
    liste.push({ fehlertyp: 'VZ', x: { ...x, b: { ...x.b, koeffizient: x.b.koeffizient.negiert() } } });
    // Zahl aus dem Mittelglied übernommen: (a ± 2b)²
    liste.push({ fehlertyp: 'PO', x: { ...x, b: { ...x.b, koeffizient: x.b.koeffizient.mal(2) } }, rueckmeldung: 'Das Mittelglied ist 2·a·b. In die Klammer gehört b – die Wurzel aus dem letzten Glied.' });
    liste.push({ fehlertyp: 'PO', x: { ...x, art: 'dritte', b }, rueckmeldung: 'Das ist die 3. binomische Formel – sie ergibt nur zwei Glieder. Hier gibt es ein Mittelglied.' });
  } else {
    liste.push({ fehlertyp: 'PO', x: { ...x, art: 'quadrat', b: { ...b, koeffizient: b.koeffizient.negiert() } }, rueckmeldung: 'Eine Differenz zweier Quadrate ohne Mittelglied: Das ist die 3. binomische Formel (a + b)·(a − b).' });
    const bQuadrat: Glied = { koeffizient: b.koeffizient.mal(b.koeffizient), monom: Object.fromEntries(Object.entries(b.monom).map(([k, e]) => [k, e * 2])) };
    liste.push({ fehlertyp: 'PO', x: { ...x, b: bQuadrat }, rueckmeldung: 'In die Klammer gehört die Wurzel aus dem letzten Glied, nicht das Glied selbst.' });
  }
  if (x.k !== 1) liste.push({ fehlertyp: 'KL', x: { ...x, k: 1 } });
  const richtig = summeAlsPolynom(binomErgebnis(x));
  const gesehen: Polynom[] = [richtig];
  return liste.filter((f) => {
    const p = summeAlsPolynom(binomErgebnis(f.x));
    if (gesehen.some((q) => q.gleich(p))) return false;
    gesehen.push(p);
    return true;
  });
}

function pruefe(antwort: string, aufgabe: Polynom, fl: readonly Fehl[]): Bewertung {
  let knoten;
  let p: Polynom;
  try {
    knoten = leseTerm(antwort);
    p = alsPolynom(knoten);
  } catch (e) {
    if (e instanceof TermFehler || e instanceof RangeError) return { ergebnis: 'unlesbar', rueckmeldung: 'Das kann ich nicht als Term lesen. Prüfe Klammern und Rechenzeichen.' };
    throw e;
  }
  if (p.gleich(aufgabe)) {
    const f = produktForm(knoten);
    if (!f.istProdukt) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Der Wert stimmt, aber der Term soll als Produkt dastehen.' };
    if (!f.klammernZusammengefasst) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Fasse in den Klammern noch zusammen.' };
    const linear = f.klammern.every((k) => k.gliederSortiert().every((g) => Object.values(g.monom).reduce((s, e) => s + e, 0) <= 1));
    if (f.klammern.length !== 2 || !linear) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Das lässt sich noch weiter zerlegen – mit einer binomischen Formel.' };
    if (f.klammern.some(hatGemeinsamenFaktor)) return { ergebnis: 'unvollstaendig', rueckmeldung: 'In einer Klammer steckt noch ein gemeinsamer Faktor. Klammere ihn aus.' };
    return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
  }
  for (const f of fl) {
    if (summeAlsPolynom(binomErgebnis(f.x)).gleich(p)) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung ?? RM[f.fehlertyp] ?? RUECKMELDUNG[f.fehlertyp] };
  }
  return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: RUECKMELDUNG.UK };
}

function wegZeilen(x: Binom, aufgabe: Formel): { ansatz: Formel; loesungsweg: Formel[] } {
  const f = (g: Glied, z: 'text' | 'latex') => formatGlied(betrag(g), z, ANZEIGE);
  const quadratText = (g: Glied, z: 'text' | 'latex') => {
    const einfach = g.koeffizient.betrag().gleich(1) && Object.keys(g.monom).length <= 1 || Object.keys(g.monom).length === 0;
    const t = f(g, z);
    const t2 = einfach ? t : z === 'latex' ? `\\left(${t}\\right)` : `(${t})`;
    return z === 'latex' ? `${t2}^{2}` : `${t2}²`;
  };
  const innen = (z: 'text' | 'latex'): string => {
    if (x.art === 'dritte') return `${quadratText(x.a, z)} ${z === 'latex' ? '-' : '−'} ${quadratText(x.b, z)}`;
    const op = x.b.koeffizient.istNegativ() ? (z === 'latex' ? '-' : '−') : '+';
    const mal = z === 'latex' ? ' \\cdot ' : '·';
    return `${quadratText(x.a, z)} ${op} 2${mal}${f(x.a, z)}${mal}${f(x.b, z)} + ${quadratText(x.b, z)}`;
  };
  const vor = x.k === 1 ? { text: '', latex: '' } : { text: `${Bruch.von(x.k).alsText()}·`, latex: `${x.k} \\cdot ` };
  const zeilen: Formel[] = [];
  if (x.k !== 1) {
    const ausgeklammert = formel(binomOhneFaktor(x));
    zeilen.push({ text: `${vor.text}(${ausgeklammert.text})`, latex: `${vor.latex}\\left(${ausgeklammert.latex}\\right)` });
  }
  zeilen.push({ text: x.k === 1 ? innen('text') : `${vor.text}(${innen('text')})`, latex: x.k === 1 ? innen('latex') : `${vor.latex}\\left(${innen('latex')}\\right)` });
  zeilen.push(binomFormel(x));
  const ansatz = { text: `${aufgabe.text} = ${zeilen[0]!.text}`, latex: `${aufgabe.latex} = ${zeilen[0]!.latex}` };
  return { ansatz, loesungsweg: [ansatz, ...zeilen.slice(1).map((z) => ({ text: `= ${z.text}`, latex: `= ${z.latex}` }))] };
}

export const binomFaktorisieren: Generator = {
  id: 't8-binom-faktorisieren',
  version: 1,
  baustein: 't8-binom-faktorisieren',
  afb: ['II', 'III'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['II', 'III'] as const);
    if (afb === 'I') throw new GeneratorFehler('AFB I wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 1000; versuch++) {
      const x = ziehe(z, afb);
      if (!geeignet(x)) continue;
      const fl = fehler(x);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const aufgabeGlieder = binomErgebnis(x);
      const aufgabe = formel(aufgabeGlieder);
      const aufgabePoly = summeAlsPolynom(aufgabeGlieder);
      const loesung = binomFormel(x);
      const { ansatz, loesungsweg } = wegZeilen(x, aufgabe);
      let optionen: Auswahloption[] | undefined;
      if (typ === 'auswahl') {
        const ersteJeTyp = fl.filter((f, i) => fl.findIndex((g) => g.fehlertyp === f.fehlertyp) === i);
        const gewaehlt = [...ersteJeTyp, ...fl.filter((f) => !ersteJeTyp.includes(f))].slice(0, 3);
        optionen = z.gemischt([
          { formel: loesung, richtig: true },
          ...gewaehlt.map((f) => ({ formel: binomFormel(f.x), richtig: false, fehlertyp: f.fehlertyp, ...(f.rueckmeldung ? { rueckmeldung: f.rueckmeldung } : {}) })),
        ]);
      }
      const denkanstoss =
        (x.k !== 1 ? 'Klammere zuerst den gemeinsamen Faktor aus. ' : '') +
        'Sind das erste und das letzte Glied Quadrate? Gibt es ein Mittelglied 2·a·b, passt die 1. oder 2. binomische Formel; ist es eine Differenz zweier Quadrate, die 3.';
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welches Produkt ist gleich diesem Term?' : 'Schreibe den Term als Produkt. Nutze eine binomische Formel.',
        aufgabe,
        loesung,
        hilfen: { denkanstoss, ansatz, loesungsweg },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort, RM);
          return pruefe(antwort, aufgabePoly, fl);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
