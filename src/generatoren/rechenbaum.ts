/**
 * Rechenbaum für Level 1 „Terme lesen“: Struktur eines Terms und seine Beschreibung
 * in der Fachsprache (mit korrekten Fällen: „das Dreifache der Summe aus x und 5“).
 */
import type { Formel } from './typen';

export type Op = '+' | '−' | '·' | ':';

export type Baum =
  | { readonly art: 'zahl'; readonly wert: number }
  | { readonly art: 'var'; readonly name: string }
  | { readonly art: 'op'; readonly op: Op; readonly l: Baum; readonly r: Baum }
  | { readonly art: 'quadrat'; readonly k: Baum }
  /** k-faches: das Doppelte, Dreifache … (als Produkt Zahl · A) */
  | { readonly art: 'vielfach'; readonly faktor: number; readonly k: Baum }
  | { readonly art: 'haelfte'; readonly k: Baum };

export const zahl = (wert: number): Baum => ({ art: 'zahl', wert });
export const vari = (name: string): Baum => ({ art: 'var', name });
export const op = (o: Op, l: Baum, r: Baum): Baum => ({ art: 'op', op: o, l, r });

export type Termart = 'Summe' | 'Differenz' | 'Produkt' | 'Quotient' | 'Potenz';

/** Art des Terms = zuletzt ausgeführte Rechenart. */
export function termart(b: Baum): Termart | null {
  switch (b.art) {
    case 'op': return { '+': 'Summe', '−': 'Differenz', '·': 'Produkt', ':': 'Quotient' }[b.op] as Termart;
    case 'quadrat': return 'Potenz';
    case 'vielfach': return 'Produkt';
    case 'haelfte': return 'Quotient';
    default: return null;
  }
}

/** Alle Rechenarten, die im Term vorkommen (für die Diagnose). */
export function vorkommendeArten(b: Baum): Set<Termart> {
  const s = new Set<Termart>();
  const t = termart(b);
  if (t) s.add(t);
  if (b.art === 'op') { vorkommendeArten(b.l).forEach((x) => s.add(x)); vorkommendeArten(b.r).forEach((x) => s.add(x)); }
  if (b.art === 'quadrat' || b.art === 'vielfach' || b.art === 'haelfte') vorkommendeArten(b.k).forEach((x) => s.add(x));
  return s;
}

function rang(b: Baum): number {
  if (b.art === 'op') return b.op === '+' || b.op === '−' ? 1 : 2;
  if (b.art === 'vielfach' || b.art === 'haelfte') return 2;
  if (b.art === 'quadrat') return 3;
  return 4;
}

/** Termtext mit genau den nötigen Klammern, z. B. „3·(x + 5)“, „(a − 4) : 2“. */
export function termText(b: Baum, latex = false): string {
  const mal = latex ? ' \\cdot ' : '·';
  const k = (x: Baum, noetig: boolean) => (noetig ? (latex ? `\\left(${termText(x, latex)}\\right)` : `(${termText(x, latex)})`) : termText(x, latex));
  switch (b.art) {
    case 'zahl': return String(b.wert);
    case 'var': return b.name;
    case 'quadrat': return latex ? `${k(b.k, rang(b.k) < 4)}^{2}` : `${k(b.k, rang(b.k) < 4)}²`;
    case 'vielfach': return `${b.faktor}${mal}${k(b.k, rang(b.k) < 3)}`;
    case 'haelfte': return `${k(b.k, rang(b.k) < 3)} : 2`;
    case 'op': {
      const r = rang(b);
      const links = k(b.l, rang(b.l) < r);
      // rechts: gleicher Rang nur ohne Klammern bei a + (b + c) bzw. a·(b·c); sonst änderte sich
      // beim Lesen von links nach rechts die Struktur (a + (b − c) würde zu (a + b) − c)
      const gleichesOp = b.r.art === 'op' && b.r.op === b.op && (b.op === '+' || b.op === '·');
      const rechts = k(b.r, rang(b.r) < r || (rang(b.r) === r && !gleichesOp));
      const z = b.op === '·' ? mal : b.op === ':' ? ' : ' : ` ${latex && b.op === '−' ? '-' : b.op} `;
      return `${links}${z}${rechts}`;
    }
  }
}

export function termFormel(b: Baum): Formel {
  return { text: termText(b), latex: termText(b, true) };
}

// --- Fachsprache --------------------------------------------------------------------

type Fall = 'nom' | 'dat' | 'gen';

const VIELFACH: Record<number, string> = { 2: 'Doppelte', 3: 'Dreifache', 4: 'Vierfache', 5: 'Fünffache', 6: 'Sechsfache', 10: 'Zehnfache' };

function artikel(geschlecht: 'f' | 'm' | 'n', fall: Fall): string {
  return { f: { nom: 'die', dat: 'der', gen: 'der' }, m: { nom: 'der', dat: 'dem', gen: 'des' }, n: { nom: 'das', dat: 'dem', gen: 'des' } }[geschlecht][fall];
}

const istBlatt = (b: Baum) => b.art === 'zahl' || b.art === 'var';

/** Ergänzung nach „das Doppelte“, „das Quadrat“, „die Hälfte“: Blatt → „von x“, sonst Genitiv. */
function bezug(k: Baum): string {
  return istBlatt(k) ? `von ${text(k, 'dat')}` : text(k, 'gen');
}

/** Beschreibung in Worten, z. B. „die Summe aus x und 5“. */
export function text(b: Baum, fall: Fall = 'nom'): string {
  switch (b.art) {
    case 'zahl': return String(b.wert);
    case 'var': return b.name;
    case 'op': {
      const [wort, g] = {
        '+': ['Summe', 'f'],
        '−': ['Differenz', 'f'],
        '·': [fall === 'gen' ? 'Produkts' : 'Produkt', 'n'],
        ':': [fall === 'nom' ? 'Quotient' : 'Quotienten', 'm'],
      }[b.op] as [string, 'f' | 'm' | 'n'];
      return `${artikel(g, fall)} ${wort} aus ${text(b.l, 'dat')} und ${text(b.r, 'dat')}`;
    }
    case 'quadrat': return `${artikel('n', fall)} ${fall === 'gen' ? 'Quadrats' : 'Quadrat'} ${bezug(b.k)}`;
    case 'vielfach': {
      const w = VIELFACH[b.faktor] ?? `${b.faktor}-fache`;
      return `${artikel('n', fall)} ${fall === 'nom' ? w : `${w}n`} ${bezug(b.k)}`;
    }
    case 'haelfte': return `${artikel('f', fall)} Hälfte ${bezug(b.k)}`;
  }
}

/** Satzanfang groß */
export function satz(b: Baum): string {
  const t = text(b, 'nom');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
