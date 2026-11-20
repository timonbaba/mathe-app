/**
 * Bruchterme als Paar (Zähler, Nenner) von Polynomen – OHNE automatisches Kürzen.
 * Dient der Formprüfung „vollständig gekürzt?“: Ein Ergebnis ist gekürzt, wenn
 *  - der Gesamtgrad (Grad Zähler + Grad Nenner) nicht größer ist als beim erwarteten
 *    gekürzten Ergebnis und
 *  - Zähler und Nenner keinen gemeinsamen Zahlfaktor haben.
 */
import { Bruch, ggT, kgV } from './bruch';
import { monomGrad, Polynom } from './polynom';
import type { Knoten } from './term-parser';

export interface Rational {
  readonly n: Polynom;
  readonly d: Polynom;
}

export function rational(k: Knoten): Rational {
  switch (k.art) {
    case 'zahl': return { n: Polynom.zahl(k.wert), d: Polynom.zahl(1) };
    case 'variable': return { n: Polynom.variable(k.name), d: Polynom.zahl(1) };
    case 'klammer': return rational(k.knoten);
    case 'negation': {
      const r = rational(k.knoten);
      return { n: r.n.negiert(), d: r.d };
    }
    case 'potenz': {
      const r = rational(k.basis);
      return { n: r.n.hoch(k.exponent), d: r.d.hoch(k.exponent) };
    }
    case 'produkt':
      return k.faktoren.map(rational).reduce((a, b) => ({ n: a.n.mal(b.n), d: a.d.mal(b.d) }));
    case 'quotient': {
      const a = rational(k.zaehler);
      const b = rational(k.nenner);
      return { n: a.n.mal(b.d), d: a.d.mal(b.n) };
    }
    case 'summe': {
      const teile = k.glieder.map((g) => {
        const r = rational(g.knoten);
        return g.minus ? { n: r.n.negiert(), d: r.d } : r;
      });
      return teile.reduce((a, b) => (a.d.gleich(b.d) ? { n: a.n.plus(b.n), d: a.d } : { n: a.n.mal(b.d).plus(b.n.mal(a.d)), d: a.d.mal(b.d) }));
    }
  }
}

export function grad(p: Polynom): number {
  return p.gliederSortiert().reduce((m, g) => Math.max(m, monomGrad(g.monom)), 0);
}

/** Gemeinsamer Zahlfaktor von Zähler und Nenner (nach Erweitern auf ganze Zahlen). */
export function gemeinsamerZahlfaktor(r: Rational): bigint {
  const alle = [...r.n.gliederSortiert(), ...r.d.gliederSortiert()].map((g) => g.koeffizient);
  const hauptnenner = alle.reduce((m, b) => kgV(m, b.nenner), 1n);
  return alle.reduce((t, b) => ggT(t, b.mal(Bruch.von(hauptnenner)).zaehler), 0n);
}

export function gesamtgrad(r: Rational): number {
  return grad(r.n) + grad(r.d);
}
