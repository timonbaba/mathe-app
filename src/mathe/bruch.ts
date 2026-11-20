/**
 * Exakte rationale Zahlen (Brüche).
 *
 * Grundlage für alle Lösungen und Antwortprüfungen: Es wird NIE mit
 * Gleitkommazahlen gerechnet. Zähler und Nenner sind BigInt, damit auch
 * große Zwischenergebnisse nicht überlaufen.
 *
 * Invarianten (nach jeder Operation garantiert):
 *  - Nenner > 0
 *  - Zähler und Nenner sind teilerfremd (vollständig gekürzt)
 *  - Null wird immer als 0/1 gespeichert
 */

type Ganzzahl = bigint | number;

function zuBigInt(x: Ganzzahl): bigint {
  if (typeof x === 'bigint') return x;
  if (!Number.isSafeInteger(x)) {
    throw new RangeError(`Keine sichere ganze Zahl: ${x}`);
  }
  return BigInt(x);
}

function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

/** Größter gemeinsamer Teiler (immer ≥ 0). */
export function ggT(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Kleinstes gemeinsames Vielfaches (immer ≥ 0). */
export function kgV(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return abs(a / ggT(a, b) * b);
}

export class Bruch {
  readonly zaehler: bigint;
  readonly nenner: bigint;

  private constructor(zaehler: bigint, nenner: bigint) {
    this.zaehler = zaehler;
    this.nenner = nenner;
  }

  /** Erzeugt einen gekürzten Bruch. Wirft bei Nenner 0. */
  static von(zaehler: Ganzzahl, nenner: Ganzzahl = 1): Bruch {
    let z = zuBigInt(zaehler);
    let n = zuBigInt(nenner);
    if (n === 0n) throw new RangeError('Nenner darf nicht 0 sein');
    if (n < 0n) {
      z = -z;
      n = -n;
    }
    const t = ggT(z, n);
    if (t > 1n) {
      z /= t;
      n /= t;
    }
    if (z === 0n) n = 1n;
    return new Bruch(z, n);
  }

  static readonly NULL = Bruch.von(0);
  static readonly EINS = Bruch.von(1);

  /**
   * Liest eine Zahl aus Schülereingabe bzw. Inhaltsdateien:
   *   "3", "-3", "−3" (typografisches Minus), "3/4", "-3/4", "3/-4",
   *   "0,25", "-1,5", "0.25" (Punkt wird toleriert), "+2".
   * Leerzeichen werden ignoriert. Gibt null zurück, wenn die Eingabe
   * keine gültige Zahl ist (oder ein Nenner 0 wäre).
   */
  static parse(eingabe: string): Bruch | null {
    const s = eingabe
      .replace(/\s+/g, '')
      .replace(/[−–]/g, '-')
      .replace(/\./g, ',');
    if (s === '') return null;

    const bruch = /^([+-]?\d+)\/([+-]?\d+)$/.exec(s);
    if (bruch) {
      const n = BigInt(bruch[2]!);
      if (n === 0n) return null;
      return Bruch.von(BigInt(bruch[1]!), n);
    }

    const dezimal = /^([+-]?)(\d*),?(\d*)$/.exec(s);
    if (dezimal) {
      const [, vz, ganz, nachkomma] = dezimal;
      if ((ganz ?? '') === '' && (nachkomma ?? '') === '') return null;
      // "3," (Komma ohne Nachkommastellen) ist keine gültige Schreibweise
      if (s.endsWith(',')) return null;
      const ziffern = (ganz || '0') + (nachkomma ?? '');
      const nenner = 10n ** BigInt((nachkomma ?? '').length);
      const z = BigInt(ziffern) * (vz === '-' ? -1n : 1n);
      return Bruch.von(z, nenner);
    }
    return null;
  }

  // --- Rechnen ------------------------------------------------------------

  plus(b: Bruch | Ganzzahl): Bruch {
    const o = Bruch.alsBruch(b);
    return Bruch.von(this.zaehler * o.nenner + o.zaehler * this.nenner, this.nenner * o.nenner);
  }

  minus(b: Bruch | Ganzzahl): Bruch {
    return this.plus(Bruch.alsBruch(b).negiert());
  }

  mal(b: Bruch | Ganzzahl): Bruch {
    const o = Bruch.alsBruch(b);
    return Bruch.von(this.zaehler * o.zaehler, this.nenner * o.nenner);
  }

  /** Wirft bei Division durch 0. */
  durch(b: Bruch | Ganzzahl): Bruch {
    return this.mal(Bruch.alsBruch(b).kehrwert());
  }

  negiert(): Bruch {
    return Bruch.von(-this.zaehler, this.nenner);
  }

  /** Wirft bei 0. */
  kehrwert(): Bruch {
    if (this.istNull()) throw new RangeError('0 hat keinen Kehrwert');
    return Bruch.von(this.nenner, this.zaehler);
  }

  /** Potenz mit ganzzahligem Exponenten (auch negativ; 0^negativ wirft). */
  hoch(exponent: number): Bruch {
    if (!Number.isInteger(exponent)) throw new RangeError('Nur ganzzahlige Exponenten');
    if (exponent < 0) return this.kehrwert().hoch(-exponent);
    const e = BigInt(exponent);
    return Bruch.von(this.zaehler ** e, this.nenner ** e);
  }

  betrag(): Bruch {
    return this.zaehler < 0n ? this.negiert() : this;
  }

  // --- Vergleichen --------------------------------------------------------

  istNull(): boolean {
    return this.zaehler === 0n;
  }

  istGanz(): boolean {
    return this.nenner === 1n;
  }

  istNegativ(): boolean {
    return this.zaehler < 0n;
  }

  gleich(b: Bruch | Ganzzahl): boolean {
    const o = Bruch.alsBruch(b);
    return this.zaehler === o.zaehler && this.nenner === o.nenner;
  }

  /** -1, 0 oder 1 */
  vergleiche(b: Bruch | Ganzzahl): -1 | 0 | 1 {
    const o = Bruch.alsBruch(b);
    const d = this.zaehler * o.nenner - o.zaehler * this.nenner;
    return d < 0n ? -1 : d > 0n ? 1 : 0;
  }

  // --- Ausgabe ------------------------------------------------------------

  /** Technische Ausgabe, z. B. "-3/4" oder "5". Für Schüleranzeige: alsText(). */
  toString(): string {
    return this.istGanz() ? `${this.zaehler}` : `${this.zaehler}/${this.nenner}`;
  }

  /**
   * Hat der Bruch eine endliche Dezimaldarstellung?
   * (Genau dann, wenn der Nenner nur die Primfaktoren 2 und 5 hat.)
   */
  istEndlicherDezimalbruch(): boolean {
    let n = this.nenner;
    while (n % 2n === 0n) n /= 2n;
    while (n % 5n === 0n) n /= 5n;
    return n === 1n;
  }

  /**
   * Dezimalschreibweise mit Komma, z. B. "−0,25"; null, wenn periodisch.
   * Verwendet das typografische Minus (−) wie in der Schüleranzeige.
   */
  alsDezimal(): string | null {
    if (!this.istEndlicherDezimalbruch()) return null;
    // Anzahl Nachkommastellen = max(Exponent von 2, Exponent von 5) im Nenner
    let n = this.nenner;
    let zweier = 0;
    let fuenfer = 0;
    while (n % 2n === 0n) { n /= 2n; zweier++; }
    while (n % 5n === 0n) { n /= 5n; fuenfer++; }
    const stellen = Math.max(zweier, fuenfer);
    // exakt, da nenner ein Teiler von 10^stellen ist
    const skaliert = abs(this.zaehler) * 10n ** BigInt(stellen) / this.nenner;
    let text = skaliert.toString().padStart(stellen + 1, '0');
    if (stellen > 0) {
      text = `${text.slice(0, -stellen)},${text.slice(-stellen)}`.replace(/0+$/, '');
    }
    return (this.istNegativ() ? '−' : '') + text;
  }

  /** Schüleranzeige als Text: "−3/4" bzw. "5" (typografisches Minus). */
  alsText(): string {
    const b = this.betrag().toString();
    return this.istNegativ() ? `−${b}` : b;
  }

  // --- intern -------------------------------------------------------------

  private static alsBruch(x: Bruch | Ganzzahl): Bruch {
    return x instanceof Bruch ? x : Bruch.von(x);
  }
}
