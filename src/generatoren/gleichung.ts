/**
 * Lineare Gleichungen (auch solche, bei denen x² beim Umformen wegfällt):
 * Darstellung, Lösung und Lösungsweg wie im Unterricht – optional mit einem typischen
 * Fehler (für diagnostische Fehlantworten).
 *
 * Lösungsweg:
 *  1. Klammern auf beiden Seiten auflösen und zusammenfassen (Termbaum-Schritte)
 *  2. ggf. mit dem Hauptnenner multiplizieren (Brüche)
 *  3. Variablenglieder nach links  (| − 5x)
 *  4. Zahlen nach rechts           (| − 4)
 *  5. durch den Koeffizienten teilen (| : 3) – oder Sonderfall erkennen
 */
import { Bruch, kgV } from '../mathe/bruch';
import { endlich, mengeFormel, type Loesungsmenge } from '../mathe/loesungsmenge';
import { formatGlied, monomSchluessel, Polynom, type Glied } from '../mathe/polynom';
import { formel, sortiereGlieder } from './gemeinsam';
import { format, schritt, zusammenfassen, type Modus, type Summe } from './termbaum';
import { ANZEIGE, type Formel } from './typen';

export interface Gleichung {
  readonly links: Summe;
  readonly rechts: Summe;
  readonly v: string;
}

export type UmFehler =
  | 'keiner'
  /** Zahl auf die andere Seite gebracht, ohne das Vorzeichen zu ändern */
  | 'rueberbringen'
  /** am Ende subtrahiert statt dividiert: 3x = 12 ⇒ x = 9 */
  | 'subtrahiert'
  /** beim Teilen durch eine negative Zahl das Vorzeichen verloren */
  | 'vorzeichenDivision'
  /** beim Multiplizieren mit dem Hauptnenner nur die Variablenglieder multipliziert */
  | 'hauptnennerTeilweise';

export interface Zeile {
  readonly gleichung: Formel;
  /** Umformung, die zur NÄCHSTEN Zeile führt, z. B. „− 5x“ */
  readonly op?: Formel;
  /** Abschlusssatz bei Sonderfällen („wahre Aussage“) */
  readonly bemerkung?: string;
}

const nurGlieder = (s: Summe): Glied[] => s.map((x) => (x.art === 'glied' ? x.glied : null)).filter((x): x is Glied => x !== null);
const hatVar = (g: Glied) => Object.keys(g.monom).length > 0;

export function seiteFormel(s: Summe): Formel {
  return { text: format(s, 'text'), latex: format(s, 'latex') };
}

export function gleichungFormel(g: Gleichung): Formel {
  const l = seiteFormel(g.links);
  const r = seiteFormel(g.rechts);
  return { text: `${l.text} = ${r.text}`, latex: `${l.latex} = ${r.latex}` };
}

function gleichungAusGliedern(l: readonly Glied[], r: readonly Glied[]): Formel {
  const lf = l.length ? formel(l) : { text: '0', latex: '0' };
  const rf = r.length ? formel(r) : { text: '0', latex: '0' };
  return { text: `${lf.text} = ${rf.text}`, latex: `${lf.latex} = ${rf.latex}` };
}

function gliedText(g: Glied): Formel {
  return { text: formatGlied(g, 'text', ANZEIGE), latex: formatGlied(g, 'latex', ANZEIGE) };
}

/** „− 5x“ bzw. „+ 4“ (Gegenoperation zum Glied) */
function gegenOp(g: Glied): Formel {
  const b = gliedText({ ...g, koeffizient: g.koeffizient.betrag() });
  return g.koeffizient.istNegativ() ? { text: `+ ${b.text}`, latex: `+ ${b.latex}` } : { text: `− ${b.text}`, latex: `- ${b.latex}` };
}

const zahlText = (b: Bruch): Formel => ({
  text: b.alsText(),
  latex: b.istGanz() ? b.toString() : `${b.istNegativ() ? '-' : ''}\\frac{${b.betrag().zaehler}}{${b.betrag().nenner}}`,
});

/** Lösungsmenge direkt (ohne Lösungsweg) – exakt über Polynome. */
export function loesungsmenge(g: Gleichung): Loesungsmenge {
  const diff = wertVon(g.links).minus(wertVon(g.rechts));
  return mengeAusDifferenz(diff, g.v);
}

function wertVon(s: Summe): Polynom {
  // nutzt die Termbaum-Auswertung über die vollständige Umformung
  let a: Summe | null = s;
  let letzte: Summe = s;
  for (let i = 0; i < 20 && a; i++) {
    letzte = a;
    a = schritt(a);
  }
  return Polynom.summe(nurGlieder(letzte).map((x) => Polynom.glied(x.koeffizient, x.monom)));
}

export function mengeAusDifferenz(diff: Polynom, v: string): Loesungsmenge {
  const glieder = diff.gliederSortiert();
  if (glieder.some((x) => Object.keys(x.monom).some((w) => w !== v) || (x.monom[v] ?? 0) > 1)) {
    throw new Error(`Keine lineare Gleichung in ${v}: ${diff.toString()}`);
  }
  const a = glieder.find((x) => (x.monom[v] ?? 0) === 1)?.koeffizient ?? Bruch.NULL;
  const b = glieder.find((x) => Object.keys(x.monom).length === 0)?.koeffizient ?? Bruch.NULL;
  if (a.istNull()) return b.istNull() ? { art: 'alle' } : { art: 'leer' };
  return endlich(b.negiert().durch(a));
}

/**
 * Lösungsweg, optional mit Klammer-/Vorzeichenfehler (modus) oder Umformungsfehler.
 * Liefert die Zeilen und die (ggf. falsche) Lösungsmenge, die sich daraus ergibt.
 */
export function loesungsweg(g: Gleichung, modus: Modus = 'richtig', um: UmFehler = 'keiner'): { zeilen: Zeile[]; menge: Loesungsmenge } {
  const zeilen: Zeile[] = [];
  let l: Summe = g.links;
  let r: Summe = g.rechts;
  const v = g.v;
  zeilen.push({ gleichung: gleichungFormel(g) });

  // 1. Klammern auflösen, zusammenfassen (beide Seiten gleichzeitig, Schritt für Schritt)
  for (let i = 0; i < 20; i++) {
    const nl = schritt(l, modus);
    const nr = schritt(r, modus);
    if (!nl && !nr) break;
    l = nl ?? l;
    r = nr ?? r;
    zeilen.push({ gleichung: { text: `${format(l, 'text')} = ${format(r, 'text')}`, latex: `${format(l, 'latex')} = ${format(r, 'latex')}` } });
  }
  let L = nurGlieder(l);
  let R = nurGlieder(r);
  const setzeOp = (op: Formel) => {
    const letzte = zeilen[zeilen.length - 1]!;
    zeilen[zeilen.length - 1] = { ...letzte, op };
  };
  const neueZeile = () => zeilen.push({ gleichung: gleichungAusGliedern(L, R) });

  // Seiten tauschen, wenn die Variable nur rechts steht
  if (!L.some(hatVar) && R.some(hatVar)) {
    [L, R] = [R, L];
    setzeOp({ text: 'Seiten tauschen', latex: '\\text{Seiten tauschen}' });
    neueZeile();
  }

  // 2. Hauptnenner
  const nenner = [...L, ...R].reduce((m, x) => kgV(m, x.koeffizient.nenner), 1n);
  if (nenner > 1n) {
    const hn = Bruch.von(nenner);
    setzeOp({ text: `· ${hn.toString()}`, latex: `\\cdot ${hn.toString()}` });
    const mal = (x: Glied): Glied => (um === 'hauptnennerTeilweise' && !hatVar(x) ? x : { ...x, koeffizient: x.koeffizient.mal(hn) });
    L = L.map(mal);
    R = R.map(mal);
    neueZeile();
  }

  // 3. Variablenglieder von rechts nach links (höchste Potenz zuerst)
  const rechtsVar = () => {
    const g2 = R.filter(hatVar);
    sortiereGlieder(g2);
    return g2[0];
  };
  for (let x = rechtsVar(); x; x = rechtsVar()) {
    const k = x;
    setzeOp(gegenOp(k));
    R = R.filter((y) => y !== k);
    L = zusammenfassen([...L, { ...k, koeffizient: k.koeffizient.negiert() }]);
    sortiereGlieder(L);
    neueZeile();
  }

  // 4. Zahlen von links nach rechts
  const zahlL = L.find((x) => !hatVar(x));
  if (zahlL && L.some(hatVar)) {
    setzeOp(gegenOp(zahlL));
    L = L.filter((x) => x !== zahlL);
    const versetzt = um === 'rueberbringen' ? zahlL : { ...zahlL, koeffizient: zahlL.koeffizient.negiert() };
    R = zusammenfassen([...R, versetzt]);
    neueZeile();
  }

  // 5. Teilen bzw. Sonderfall
  const xGlied = L.find((x) => monomSchluessel(x.monom) === `${v}^1`);
  const rechtsZahl = R.find((x) => !hatVar(x))?.koeffizient ?? Bruch.NULL;
  if (!xGlied) {
    const linksZahl = L.find((x) => !hatVar(x))?.koeffizient ?? Bruch.NULL;
    const wahr = linksZahl.gleich(rechtsZahl);
    const menge: Loesungsmenge = wahr ? { art: 'alle' } : { art: 'leer' };
    zeilen[zeilen.length - 1] = {
      ...zeilen[zeilen.length - 1]!,
      bemerkung: wahr ? 'Wahre Aussage – jede Zahl ist eine Lösung.' : 'Falsche Aussage – keine Zahl ist eine Lösung.',
    };
    zeilen.push({ gleichung: mengeFormel(menge) });
    return { zeilen, menge };
  }
  const a = xGlied.koeffizient;
  let x: Bruch;
  if (!a.gleich(1)) {
    setzeOp(a.istNegativ() ? { text: `: (${a.alsText()})`, latex: `: \\left(${zahlText(a).latex}\\right)` } : { text: `: ${a.alsText()}`, latex: `: ${zahlText(a).latex}` });
    x = um === 'subtrahiert' ? rechtsZahl.minus(a) : um === 'vorzeichenDivision' && a.istNegativ() ? rechtsZahl.durch(a.betrag()) : rechtsZahl.durch(a);
    zeilen.push({ gleichung: { text: `${v} = ${x.alsText()}`, latex: `${v} = ${zahlText(x).latex}` } });
  } else {
    x = rechtsZahl;
  }
  const menge = endlich(x);
  zeilen.push({ gleichung: mengeFormel(menge) });
  return { zeilen, menge };
}

/** Zeilen als Formeln für die Hilfen („… = …   | − 5x“). */
export function zeilenAlsFormeln(zeilen: readonly Zeile[]): Formel[] {
  return zeilen.map((z) => ({
    text: z.gleichung.text + (z.op ? `   | ${z.op.text}` : '') + (z.bemerkung ? `   (${z.bemerkung})` : ''),
    latex: z.gleichung.latex + (z.op ? ` \\quad \\mid ${z.op.latex}` : '') + (z.bemerkung ? ` \\quad \\text{(${z.bemerkung})}` : ''),
  }));
}
