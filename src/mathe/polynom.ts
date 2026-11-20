/**
 * Polynome in mehreren Variablen mit exakten (Bruch-)Koeffizienten.
 *
 * Beispiel: 15·x²·y − 3·x·y + 4
 *
 * Ein Polynom ist eine Summe von Gliedern; jedes Glied ist Koeffizient · Monom.
 * Ein Monom ist ein Produkt von Variablenpotenzen (z. B. x²·y), gespeichert als
 * Zuordnung Variable → Exponent (nur Exponenten ≥ 1).
 *
 * Polynome werden intern IMMER zusammengefasst gespeichert (gleichartige Glieder
 * addiert, Glieder mit Koeffizient 0 entfernt). Zwei Terme sind genau dann
 * gleichwertig, wenn ihre Polynome gleich sind.
 */
import { Bruch } from './bruch';

export type Monom = Readonly<Record<string, number>>;

/** Eindeutiger Schlüssel eines Monoms, z. B. "x^2*y^1"; "" für Konstante. */
export function monomSchluessel(m: Monom): string {
  return Object.keys(m)
    .filter((v) => (m[v] ?? 0) > 0)
    .sort()
    .map((v) => `${v}^${m[v]}`)
    .join('*');
}

function monomAusSchluessel(s: string): Monom {
  const m: Record<string, number> = {};
  if (s === '') return m;
  for (const teil of s.split('*')) {
    const [v, e] = teil.split('^');
    m[v!] = Number(e);
  }
  return m;
}

function monomMal(a: Monom, b: Monom): Monom {
  const m: Record<string, number> = { ...a };
  for (const [v, e] of Object.entries(b)) m[v] = (m[v] ?? 0) + e;
  return m;
}

export function monomGrad(m: Monom): number {
  return Object.values(m).reduce((s, e) => s + e, 0);
}

export interface Glied {
  readonly koeffizient: Bruch;
  readonly monom: Monom;
}

export interface FormatOptionen {
  /** Malpunkt zwischen Zahl und Variable bzw. zwischen Variablen (3·x·y statt 3xy). */
  malpunkt?: boolean;
}

export class Polynom {
  /** Schlüssel → Koeffizient (nie 0). */
  private readonly glieder: ReadonlyMap<string, Bruch>;

  private constructor(glieder: Map<string, Bruch>) {
    this.glieder = glieder;
  }

  static readonly NULL = new Polynom(new Map());

  static zahl(z: Bruch | number): Polynom {
    return Polynom.glied(z, {});
  }

  static variable(name: string, exponent = 1): Polynom {
    if (!/^[a-z]$/.test(name)) throw new RangeError(`Ungültiger Variablenname: ${name}`);
    return Polynom.glied(1, { [name]: exponent });
  }

  /** Ein einzelnes Glied k · Monom. */
  static glied(k: Bruch | number, monom: Monom): Polynom {
    const kb = k instanceof Bruch ? k : Bruch.von(k);
    for (const e of Object.values(monom)) {
      if (!Number.isInteger(e) || e < 0) throw new RangeError('Exponenten müssen ganze Zahlen ≥ 0 sein');
    }
    const g = new Map<string, Bruch>();
    if (!kb.istNull()) g.set(monomSchluessel(monom), kb);
    return new Polynom(g);
  }

  /** Summe mehrerer Glieder/Polynome. */
  static summe(teile: readonly Polynom[]): Polynom {
    return teile.reduce((a, b) => a.plus(b), Polynom.NULL);
  }

  // --- Rechnen ------------------------------------------------------------

  plus(p: Polynom): Polynom {
    const g = new Map(this.glieder);
    for (const [k, c] of p.glieder) {
      const neu = (g.get(k) ?? Bruch.NULL).plus(c);
      if (neu.istNull()) g.delete(k);
      else g.set(k, neu);
    }
    return new Polynom(g);
  }

  negiert(): Polynom {
    const g = new Map<string, Bruch>();
    for (const [k, c] of this.glieder) g.set(k, c.negiert());
    return new Polynom(g);
  }

  minus(p: Polynom): Polynom {
    return this.plus(p.negiert());
  }

  mal(p: Polynom): Polynom {
    let r = Polynom.NULL;
    for (const [k1, c1] of this.glieder) {
      for (const [k2, c2] of p.glieder) {
        r = r.plus(Polynom.glied(c1.mal(c2), monomMal(monomAusSchluessel(k1), monomAusSchluessel(k2))));
      }
    }
    return r;
  }

  hoch(n: number): Polynom {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('Nur Exponenten ≥ 0');
    let r = Polynom.zahl(1);
    for (let i = 0; i < n; i++) r = r.mal(this);
    return r;
  }

  /** Division durch eine Zahl ≠ 0. */
  durchZahl(z: Bruch): Polynom {
    return this.mal(Polynom.zahl(z.kehrwert()));
  }

  // --- Abfragen -----------------------------------------------------------

  gleich(p: Polynom): boolean {
    if (this.glieder.size !== p.glieder.size) return false;
    for (const [k, c] of this.glieder) {
      const d = p.glieder.get(k);
      if (!d || !d.gleich(c)) return false;
    }
    return true;
  }

  istNull(): boolean {
    return this.glieder.size === 0;
  }

  /** Ist das Polynom eine Konstante? Dann deren Wert, sonst null. */
  alsKonstante(): Bruch | null {
    if (this.glieder.size === 0) return Bruch.NULL;
    if (this.glieder.size === 1 && this.glieder.has('')) return this.glieder.get('')!;
    return null;
  }

  anzahlGlieder(): number {
    return this.glieder.size;
  }

  variablen(): string[] {
    const s = new Set<string>();
    for (const k of this.glieder.keys()) for (const v of Object.keys(monomAusSchluessel(k))) s.add(v);
    return [...s].sort();
  }

  /** Glieder in Standardreihenfolge: höchster Grad zuerst, dann alphabetisch. */
  gliederSortiert(): Glied[] {
    const liste = [...this.glieder].map(([k, c]) => ({ koeffizient: c, monom: monomAusSchluessel(k) }));
    const vars = this.variablen();
    return liste.sort((a, b) => {
      const d = monomGrad(b.monom) - monomGrad(a.monom);
      if (d !== 0) return d;
      for (const v of vars) {
        const e = (b.monom[v] ?? 0) - (a.monom[v] ?? 0);
        if (e !== 0) return e;
      }
      return 0;
    });
  }

  /** Exakter Wert bei gegebener Belegung der Variablen. */
  auswerten(belegung: Readonly<Record<string, Bruch>>): Bruch {
    let s = Bruch.NULL;
    for (const [k, c] of this.glieder) {
      let w = c;
      for (const [v, e] of Object.entries(monomAusSchluessel(k))) {
        const x = belegung[v];
        if (!x) throw new RangeError(`Keine Belegung für ${v}`);
        w = w.mal(x.hoch(e));
      }
      s = s.plus(w);
    }
    return s;
  }

  // --- Ausgabe ------------------------------------------------------------

  /** Schüleranzeige als Text, z. B. "6·x² − 15·x·y". */
  alsText(opt: FormatOptionen = {}): string {
    return formatGlieder(this.gliederSortiert(), 'text', opt);
  }

  /** LaTeX für KaTeX, z. B. "6 \cdot x^{2} - 15 \cdot x \cdot y". */
  alsLatex(opt: FormatOptionen = {}): string {
    return formatGlieder(this.gliederSortiert(), 'latex', opt);
  }

  toString(): string {
    return this.alsText({ malpunkt: true });
  }
}

// --- Formatierung (auch für Glied-Listen in gewünschter Reihenfolge) -------

type Ziel = 'text' | 'latex';

const HOCH: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

function formatPotenz(v: string, e: number, ziel: Ziel): string {
  if (e === 1) return v;
  if (ziel === 'latex') return `${v}^{${e}}`;
  return v + String(e).split('').map((c) => HOCH[c]).join('');
}

function formatBetrag(b: Bruch, ziel: Ziel): string {
  const a = b.betrag();
  if (a.istGanz()) return a.toString();
  if (ziel === 'latex') return `\\frac{${a.zaehler}}{${a.nenner}}`;
  return `${a.zaehler}/${a.nenner}`;
}

/** Formatiert ein einzelnes Glied ohne Vorzeichen. */
function formatGliedBetrag(g: Glied, ziel: Ziel, opt: FormatOptionen): string {
  // Ohne Malpunkt wäre "1/2x" im Text mehrdeutig – dann Malpunkt erzwingen.
  const brauchtPunkt = opt.malpunkt || (ziel === 'text' && !g.koeffizient.istGanz());
  const mal = brauchtPunkt ? (ziel === 'latex' ? ' \\cdot ' : '·') : '';
  const vars = Object.keys(g.monom)
    .filter((v) => (g.monom[v] ?? 0) > 0)
    .sort()
    .map((v) => formatPotenz(v, g.monom[v]!, ziel));
  const betrag = g.koeffizient.betrag();
  const teile: string[] = [];
  if (vars.length === 0 || !betrag.gleich(1)) teile.push(formatBetrag(betrag, ziel));
  teile.push(...vars);
  return teile.join(mal);
}

/** Formatiert eine Liste von Gliedern in der gegebenen Reihenfolge. */
export function formatGlieder(glieder: readonly Glied[], ziel: Ziel, opt: FormatOptionen = {}): string {
  const minus = ziel === 'latex' ? '-' : '−';
  const nichtNull = glieder.filter((g) => !g.koeffizient.istNull());
  if (nichtNull.length === 0) return '0';
  return nichtNull
    .map((g, i) => {
      const neg = g.koeffizient.istNegativ();
      const k = formatGliedBetrag(g, ziel, opt);
      if (i === 0) return neg ? `${minus}${k}` : k;
      return neg ? ` ${minus} ${k}` : ` + ${k}`;
    })
    .join('');
}

/** Ein Glied als eigenständiger Faktor (mit Vorzeichen; negativ in Klammern, wenn gewünscht). */
export function formatGlied(g: Glied, ziel: Ziel, opt: FormatOptionen = {}, klammerWennNegativ = false): string {
  const minus = ziel === 'latex' ? '-' : '−';
  const k = formatGliedBetrag(g, ziel, opt);
  if (!g.koeffizient.istNegativ()) return k;
  return klammerWennNegativ ? `(${minus}${k})` : `${minus}${k}`;
}

export function gliedAlsPolynom(g: Glied): Polynom {
  return Polynom.glied(g.koeffizient, g.monom);
}
