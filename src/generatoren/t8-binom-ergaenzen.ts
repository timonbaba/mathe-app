/**
 * Generator für Baustein t8-binom-ergaenzen
 * „Binomische Formeln: Lücken ergänzen“ (Gym Kl. 8, LB 1, AFB II).
 *
 * Eine Gleichung „ausmultipliziert = Binom“ hat genau eine Lücke ▢, z. B.
 *   x² + ▢ + 9 = (x + 3)²      x² − 12x + ▢ = (x − 6)²      (▢ + 3)² = 4x² + 12x + 9
 *   x² − ▢ = (x + 7)·(x − 7)   x² + 10x + 25 = (x + ▢)²
 * Die Lücke steht für den Betrag eines Glieds (das Vorzeichen steht davor).
 *
 * Diagnostische Fehlantworten (je nach Lücke):
 *  - PO  2 vergessen (Mittelglied = a·b), nicht quadriert / Wurzel nicht gezogen
 *  - KL  im Mittelglied ein Faktor vergessen (nur 2·b statt 2·a·b)
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, type Glied } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { auswahlOptionen, bereinigeFehlantworten, formel, gliedMal, pruefeAuswahl, pruefeTermEingabe, summeAlsPolynom, type Fehlantwort } from './gemeinsam';
import { type Binom } from './binom';
import { ANZEIGE, GeneratorFehler, type Aufgabe, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });
const betrag = (g: Glied): Glied => ({ ...g, koeffizient: g.koeffizient.betrag() });

type Luecke = 'mitte' | 'ende' | 'anfang' | 'klammerA' | 'klammerB';

const RM: Partial<Record<FehlertypCode, string>> = {
  PO: 'Vergleiche Glied für Glied mit der Formel: (a + b)² = a² + 2ab + b². Beim Mittelglied die 2 nicht vergessen; außen stehen Quadrate.',
  KL: 'Das Mittelglied ist 2·a·b – darin stecken beide Glieder der Klammer.',
};

const LUECKE = { text: '▢', latex: '\\square' };

/** Gliedtexte mit Vorzeichen; Index `luecke` wird durch ▢ ersetzt (Vorzeichen bleibt). */
function summeMitLuecke(glieder: readonly Glied[], luecke: number | null): Formel {
  const teile = glieder.map((g, i) => {
    const neg = g.koeffizient.istNegativ();
    const b = i === luecke ? LUECKE : { text: formatGlied(betrag(g), 'text', ANZEIGE), latex: formatGlied(betrag(g), 'latex', ANZEIGE) };
    if (i === 0) return { text: (neg ? '−' : '') + b.text, latex: (neg ? '-' : '') + b.latex };
    return { text: ` ${neg ? '−' : '+'} ${b.text}`, latex: ` ${neg ? '-' : '+'} ${b.latex}` };
  });
  return { text: teile.map((t) => t.text).join(''), latex: teile.map((t) => t.latex).join('') };
}

function binomMitLuecke(x: Binom, luecke: 'a' | 'b' | null): Formel {
  const a = luecke === 'a' ? LUECKE : formel([x.a]);
  const b = luecke === 'b' ? LUECKE : formel([betrag(x.b)]);
  if (x.art === 'quadrat') {
    const op = x.b.koeffizient.istNegativ() ? '−' : '+';
    return { text: `(${a.text} ${op} ${b.text})²`, latex: `\\left(${a.latex} ${op === '−' ? '-' : '+'} ${b.latex}\\right)^{2}` };
  }
  return { text: `(${a.text} + ${b.text})·(${a.text} − ${b.text})`, latex: `\\left(${a.latex} + ${b.latex}\\right) \\cdot \\left(${a.latex} - ${b.latex}\\right)` };
}

interface Roh {
  x: Binom;
  luecke: Luecke;
  binomLinks: boolean;
}

function ziehe(z: Zufall): Roh {
  const v = z.auswahl(['x', 'a', 'y', 'm', 'p']);
  const koeff = z.mitWahrscheinlichkeit(0.35) ? z.ganzzahl(2, 5) : 1;
  const b = z.ganzzahl(1, 12);
  const art = z.mitWahrscheinlichkeit(0.25) ? 'dritte' : 'quadrat';
  const x: Binom = { art, a: gl(koeff, { [v]: 1 }), b: gl(art === 'quadrat' && z.mitWahrscheinlichkeit(0.5) ? -b : b), k: 1 };
  const moeglich: Luecke[] = art === 'quadrat' ? ['mitte', 'mitte', 'ende', 'klammerB', 'klammerA'] : ['anfang', 'ende', 'klammerB', 'klammerA'];
  return { x, luecke: z.auswahl(moeglich), binomLinks: z.mitWahrscheinlichkeit(0.3) };
}

function ausmultipliziert(x: Binom): Glied[] {
  if (x.art === 'quadrat') return [gliedMal(x.a, x.a), { ...gliedMal(x.a, x.b), koeffizient: gliedMal(x.a, x.b).koeffizient.mal(2) }, gliedMal(x.b, x.b)];
  return [gliedMal(x.a, x.a), { ...gliedMal(x.b, x.b), koeffizient: gliedMal(x.b, x.b).koeffizient.negiert() }];
}

/** Inhalt der Lücke (positiv) und typische Fehlantworten. */
function lueckeUndFehler(r: Roh): { inhalt: Glied; fehler: Fehlantwort[]; weg: Formel } {
  const { x } = r;
  const a = x.a;
  const b = betrag(x.b);
  const f = (g: Glied) => formatGlied(g, 'text', ANZEIGE);
  const fl = (g: Glied) => formatGlied(g, 'latex', ANZEIGE);
  const quad = (g: Glied) => gliedMal(g, g);
  switch (r.luecke) {
    case 'mitte': {
      const inhalt = { ...gliedMal(a, b), koeffizient: gliedMal(a, b).koeffizient.mal(2) };
      return {
        inhalt,
        fehler: [
          { fehlertyp: 'PO', glieder: [gliedMal(a, b)], rueckmeldung: 'Das Mittelglied ist 2·a·b – die 2 nicht vergessen.' },
          { fehlertyp: 'KL', glieder: [{ ...b, koeffizient: b.koeffizient.mal(2) }] },
        ],
        weg: { text: `▢ = 2·${f(a)}·${f(b)}`, latex: `\\square = 2 \\cdot ${fl(a)} \\cdot ${fl(b)}` },
      };
    }
    case 'ende':
      return {
        inhalt: quad(b),
        fehler: [
          { fehlertyp: 'PO', glieder: [b], rueckmeldung: 'Am Ende steht b² – das Quadrat, nicht b selbst.' },
          { fehlertyp: 'PO', glieder: [{ ...b, koeffizient: b.koeffizient.mal(2) }], rueckmeldung: 'Am Ende steht b² = b·b, nicht 2·b.' },
        ],
        weg: { text: `▢ = ${f(b)}²`, latex: `\\square = ${fl(b)}^{2}` },
      };
    case 'anfang':
      return {
        inhalt: quad(a),
        fehler: [
          { fehlertyp: 'PO', glieder: [a], rueckmeldung: 'Vorne steht a² – das Quadrat, nicht a selbst.' },
          { fehlertyp: 'PO', glieder: [{ ...a, koeffizient: a.koeffizient.mal(2) }], rueckmeldung: 'Vorne steht a² = a·a, nicht 2·a.' },
        ],
        weg: { text: `▢ = (${f(a)})²`, latex: `\\square = \\left(${fl(a)}\\right)^{2}` },
      };
    case 'klammerB': {
      const fehler: Fehlantwort[] = [{ fehlertyp: 'PO', glieder: [quad(b)], rueckmeldung: 'In der Klammer steht b, nicht b². Ziehe die Wurzel aus dem letzten Glied.' }];
      if (x.art === 'quadrat') fehler.push({ fehlertyp: 'PO', glieder: [{ ...gliedMal(a, b), koeffizient: gliedMal(a, b).koeffizient.mal(2) }], rueckmeldung: 'Das ist das Mittelglied 2ab. In der Klammer steht b – die Wurzel aus dem letzten Glied.' });
      else fehler.push({ fehlertyp: 'PO', glieder: [{ ...b, koeffizient: b.koeffizient.mal(2) }] });
      return { inhalt: b, fehler, weg: { text: `▢² = ${f(quad(b))}, also ▢ = ${f(b)}`, latex: `\\square^{2} = ${fl(quad(b))} \\Rightarrow \\square = ${fl(b)}` } };
    }
    case 'klammerA':
      return {
        inhalt: a,
        fehler: [
          { fehlertyp: 'PO', glieder: [quad(a)], rueckmeldung: 'In der Klammer steht a, nicht a². Ziehe die Wurzel aus dem ersten Glied.' },
          { fehlertyp: 'PO', glieder: [{ koeffizient: quad(a).koeffizient, monom: a.monom }], rueckmeldung: 'Auch aus der Zahl muss die Wurzel gezogen werden: (2x)² = 4x², also steht 2x in der Klammer.' },
        ],
        weg: { text: `▢² = ${f(quad(a))}, also ▢ = ${f(a)}`, latex: `\\square^{2} = ${fl(quad(a))} \\Rightarrow \\square = ${fl(a)}` },
      };
  }
}

export const binomErgaenzen: Generator = {
  id: 't8-binom-ergaenzen',
  version: 1,
  baustein: 't8-binom-ergaenzen',
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

    for (let versuch = 0; versuch < 1000; versuch++) {
      const r = ziehe(z);
      // kein gemeinsamer Zahlfaktor in der Klammer (z. B. nicht (2a + 2)²)
      const ggT = (p: bigint, q: bigint): bigint => (q === 0n ? (p < 0n ? -p : p) : ggT(q, p % q));
      if (ggT(r.x.a.koeffizient.zaehler, r.x.b.koeffizient.zaehler) > 1n) continue;
      const { inhalt, fehler: roh, weg } = lueckeUndFehler(r);
      const fehler = bereinigeFehlantworten(summeAlsPolynom([inhalt]), roh);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      if (ausmultipliziert(r.x).some((g) => g.koeffizient.betrag().vergleiche(150) > 0)) continue;

      const aus = ausmultipliziert(r.x);
      const index = { mitte: 1, ende: r.x.art === 'quadrat' ? 2 : 1, anfang: 0, klammerA: null, klammerB: null }[r.luecke];
      const summe = summeMitLuecke(aus, index);
      const binom = binomMitLuecke(r.x, r.luecke === 'klammerA' ? 'a' : r.luecke === 'klammerB' ? 'b' : null);
      const [l, rr] = r.binomLinks ? [binom, summe] : [summe, binom];
      const aufgabe: Formel = { text: `${l.text} = ${rr.text}`, latex: `${l.latex} = ${rr.latex}` };
      const loesung = formel([inhalt]);
      const formelText =
        r.x.art === 'dritte' ? '(a + b)·(a − b) = a² − b²' : r.x.b.koeffizient.istNegativ() ? '(a − b)² = a² − 2ab + b²' : '(a + b)² = a² + 2ab + b²';
      const ab = `Hier ist a = ${formel([r.x.a]).text} und b = ${formel([betrag(r.x.b)]).text}.`;
      const ansatz: Formel = { text: ab, latex: `a = ${formel([r.x.a]).latex},\\; b = ${formel([betrag(r.x.b)]).latex}` };
      const loesungsweg: Formel[] = [weg];
      if (!weg.text.endsWith(`= ${loesung.text}`)) loesungsweg.push({ text: `▢ = ${loesung.text}`, latex: `\\square = ${loesung.latex}` });
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fehler) : undefined;
      const loesungPoly = summeAlsPolynom([inhalt]);

      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'II',
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Was muss in die Lücke ▢?' : 'Ergänze die Lücke ▢ so, dass die Gleichung stimmt.',
        aufgabe,
        loesung,
        hilfen: { denkanstoss: `Vergleiche mit der Formel ${formelText}. Was ist hier a, was ist b?`, ansatz, loesungsweg },
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
