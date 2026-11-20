/**
 * Binome für die Generatoren zu den binomischen Formeln:
 *   quadrat:  k·(a + b)²   (b kann negativ sein → 2. binomische Formel)
 *   dritte:   k·(a + b)·(a − b)
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, type Glied } from '../mathe/polynom';
import { formel, gliedMal, sortiereGlieder } from './gemeinsam';
import { zusammenfassen } from './termbaum';
import { ANZEIGE, type Formel } from './typen';

export interface Binom {
  readonly art: 'quadrat' | 'dritte';
  readonly a: Glied;
  /** bei 'dritte' immer positiv */
  readonly b: Glied;
  /** Faktor davor (meist 1) */
  readonly k: number;
}

const mal = (g: Glied, z: number): Glied => ({ ...g, koeffizient: g.koeffizient.mal(z) });
const neg = (g: Glied): Glied => ({ ...g, koeffizient: g.koeffizient.negiert() });

/** Ergebnis ohne Faktor k, in Formel-Reihenfolge (a², 2ab, b²). */
export function binomOhneFaktor(x: Binom): Glied[] {
  if (x.art === 'quadrat') return [gliedMal(x.a, x.a), mal(gliedMal(x.a, x.b), 2), gliedMal(x.b, x.b)];
  return [gliedMal(x.a, x.a), neg(gliedMal(x.b, x.b))];
}

/** Ausmultipliziertes Ergebnis, zusammengefasst und in üblicher Reihenfolge. */
export function binomErgebnis(x: Binom): Glied[] {
  const g = zusammenfassen(binomOhneFaktor(x).map((y) => mal(y, x.k)));
  sortiereGlieder(g);
  return g;
}

function klammer(f: Formel): Formel {
  return { text: `(${f.text})`, latex: `\\left(${f.latex}\\right)` };
}

/** Anzeige, z. B. „2·(x − 5)²“ oder „(a + 2b)·(a − 2b)“. */
export function binomFormel(x: Binom): Formel {
  const vor = x.k === 1 ? { text: '', latex: '' } : x.k === -1 ? { text: '−', latex: '-' } : { text: `${Bruch.von(x.k).alsText()}·`, latex: `${x.k} \\cdot ` };
  if (x.art === 'quadrat') {
    const f = klammer(formel([x.a, x.b]));
    return { text: `${vor.text}${f.text}²`, latex: `${vor.latex}${f.latex}^{2}` };
  }
  const p = klammer(formel([x.a, x.b]));
  const m = klammer(formel([x.a, neg(x.b)]));
  return { text: `${vor.text}${p.text}·${m.text}`, latex: `${vor.latex}${p.latex} \\cdot ${m.latex}` };
}

/** Glied als Basis einer Potenz: „x“, „2²“ → „2“, „(2a)“ */
function basis(g: Glied, ziel: 'text' | 'latex'): string {
  const t = formatGlied({ ...g, koeffizient: g.koeffizient.betrag() }, ziel, ANZEIGE);
  const einfach = (g.koeffizient.betrag().gleich(1) && Object.keys(g.monom).length === 1 && Object.values(g.monom)[0] === 1) || Object.keys(g.monom).length === 0;
  if (einfach) return t;
  return ziel === 'latex' ? `\\left(${t}\\right)` : `(${t})`;
}

/** Zeile mit eingesetzter Formel, z. B. „x² − 2·x·5 + 5²“ bzw. „(2a)² − (3b)²“. */
export function formelZeile(x: Binom): Formel {
  const b = { ...x.b, koeffizient: x.b.koeffizient.betrag() };
  const minus = x.b.koeffizient.istNegativ();
  const f = (g: Glied, ziel: 'text' | 'latex') => formatGlied({ ...g, koeffizient: g.koeffizient.betrag() }, ziel, ANZEIGE);
  let text: string;
  let latex: string;
  if (x.art === 'quadrat') {
    text = `${basis(x.a, 'text')}² ${minus ? '−' : '+'} 2·${f(x.a, 'text')}·${f(b, 'text')} + ${basis(b, 'text')}²`;
    latex = `${basis(x.a, 'latex')}^{2} ${minus ? '-' : '+'} 2 \\cdot ${f(x.a, 'latex')} \\cdot ${f(b, 'latex')} + ${basis(b, 'latex')}^{2}`;
  } else {
    text = `${basis(x.a, 'text')}² − ${basis(b, 'text')}²`;
    latex = `${basis(x.a, 'latex')}^{2} - ${basis(b, 'latex')}^{2}`;
  }
  if (x.k === 1) return { text, latex };
  const vor = x.k === -1 ? { text: '−', latex: '-' } : { text: `${Bruch.von(x.k).alsText()}·`, latex: `${x.k} \\cdot ` };
  return { text: `${vor.text}(${text})`, latex: `${vor.latex}\\left(${latex}\\right)` };
}

/** Lösungsweg-Zeilen ab der eingesetzten Formel (ohne Ausgangsterm). */
export function binomWeg(x: Binom): Formel[] {
  const zeilen: Formel[] = [formelZeile(x)];
  const innen = binomOhneFaktor(x);
  const innenF = formel(innen);
  if (x.k === 1) {
    zeilen.push(innenF);
  } else {
    const vor = x.k === -1 ? { text: '−', latex: '-' } : { text: `${Bruch.von(x.k).alsText()}·`, latex: `${x.k} \\cdot ` };
    zeilen.push({ text: `${vor.text}(${innenF.text})`, latex: `${vor.latex}\\left(${innenF.latex}\\right)` });
  }
  const end = formel(binomErgebnis(x));
  if (end.text !== zeilen[zeilen.length - 1]!.text) zeilen.push(end);
  return zeilen;
}
