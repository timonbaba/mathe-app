/**
 * Wandelt Termtext (wie ihn der Term-Parser liest) in LaTeX um:
 *   "2A/h − a"        → "\frac{2A}{h} - a"
 *   "ρ·l/A"           → "\frac{\rho \cdot l}{A}"
 *   "u = 2·(a + b)"   → "u = 2 \cdot \left(a + b\right)"
 * Malpunkt-Regel wie in der Anzeige (SPEC 5.5): zwischen Zahl/Variablen kein Punkt, vor Klammern ein Punkt.
 */
import type { Bruch } from './bruch';
import { leseTerm, type Knoten } from './term-parser';

const SYMBOL: Record<string, string> = { ρ: '\\rho', π: '\\pi' };

function zahl(b: Bruch): string {
  const a = b.betrag();
  const t = a.istGanz() ? a.toString() : `\\frac{${a.zaehler}}{${a.nenner}}`;
  return b.istNegativ() ? `-${t}` : t;
}

const ohneKlammer = (k: Knoten): Knoten => (k.art === 'klammer' ? ohneKlammer(k.knoten) : k);

function latex(k: Knoten): string {
  switch (k.art) {
    case 'zahl': return zahl(k.wert);
    case 'variable': return SYMBOL[k.name] ?? k.name;
    case 'klammer': return `\\left(${latex(k.knoten)}\\right)`;
    case 'negation': return `-${latex(k.knoten)}`;
    case 'summe':
      return k.glieder.map((g, i) => (i === 0 ? (g.minus ? '-' : '') + latex(g.knoten) : `${g.minus ? ' - ' : ' + '}${latex(g.knoten)}`)).join('');
    case 'produkt':
      return k.faktoren
        .map((f, i) => {
          const t = latex(f);
          if (i === 0) return t;
          const vorher = k.faktoren[i - 1]!;
          // Punkt vor Klammern, Brüchen und zwischen zwei Zahlen; sonst nebeneinander (2A, ρl)
          const punkt = f.art === 'klammer' || f.art === 'quotient' || vorher.art === 'klammer' || vorher.art === 'quotient' || (f.art === 'zahl' && vorher.art === 'zahl') || SYMBOL[(f as { name?: string }).name ?? ''] !== undefined || SYMBOL[(vorher as { name?: string }).name ?? ''] !== undefined;
          return `${punkt ? ' \\cdot ' : ''}${t}`;
        })
        .join('');
    case 'potenz': return `${latex(k.basis)}^{${k.exponent}}`;
    case 'quotient': return `\\frac{${latex(ohneKlammer(k.zaehler))}}{${latex(ohneKlammer(k.nenner))}}`;
  }
}

/** LaTeX eines Terms oder einer Gleichung (Seiten durch „ = “ getrennt). */
export function textZuLatex(text: string): string {
  return text
    .split(' = ')
    .map((t) => latex(leseTerm(t)))
    .join(' = ');
}
