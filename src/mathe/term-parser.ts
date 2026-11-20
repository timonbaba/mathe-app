/**
 * Liest Terme aus Schülereingaben und analysiert ihre Form.
 *
 * Unterstützt:
 *  - Zahlen: 3, 0,5, 0.5
 *  - Variablen: einzelne Buchstaben (x, y, a, b, A, V …) sowie ρ und π (als Formelzeichen)
 *  - + − (auch typografisches Minus), Malzeichen * · × ⋅, Division /
 *  - Potenzen: x^2, x², x³
 *  - Klammern ( )
 *  - weggelassener Malpunkt: 3x, 2(x+1), (x+1)(x−1), xy
 *
 * Der Syntaxbaum erlaubt Division durch beliebige Terme (Bruchterme); die Umwandlung
 * in ein Polynom (alsPolynom) nur Division durch Zahlen.
 *
 * Ergebnis ist ein Syntaxbaum (für die Formprüfung, z. B. „noch Klammern übrig?“)
 * und daraus ein Polynom (für die Wertprüfung).
 */
import { Bruch } from './bruch';
import { monomSchluessel, Polynom } from './polynom';

export type Knoten =
  | { art: 'zahl'; wert: Bruch }
  | { art: 'variable'; name: string }
  | { art: 'summe'; glieder: { minus: boolean; knoten: Knoten }[] }
  | { art: 'produkt'; faktoren: Knoten[] }
  | { art: 'quotient'; zaehler: Knoten; nenner: Knoten }
  | { art: 'potenz'; basis: Knoten; exponent: number }
  | { art: 'negation'; knoten: Knoten }
  | { art: 'klammer'; knoten: Knoten };

export class TermFehler extends Error {}

type Token =
  | { t: 'zahl'; wert: Bruch }
  | { t: 'var'; name: string }
  | { t: 'op'; op: '+' | '-' | '*' | '/' | '^' | '(' | ')' }
  | { t: 'hoch'; exponent: number };

const HOCHZAHLEN: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

function zerlege(eingabe: string): Token[] {
  const s = eingabe.replace(/[−–]/g, '-').replace(/[·×⋅]/g, '*').replace(/:/g, '/');
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) { i++; continue; }
    const zahl = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
    if (zahl) {
      const wert = Bruch.parse(zahl[0]);
      if (!wert) throw new TermFehler(`Ungültige Zahl: ${zahl[0]}`);
      tokens.push({ t: 'zahl', wert });
      i += zahl[0].length;
      continue;
    }
    if (/[a-zA-Zρπ]/.test(c)) { tokens.push({ t: 'var', name: c }); i++; continue; }
    if ('+-*/^()'.includes(c)) { tokens.push({ t: 'op', op: c as '+' }); i++; continue; }
    if (c in HOCHZAHLEN) {
      let ziffern = '';
      while (i < s.length && s[i]! in HOCHZAHLEN) ziffern += HOCHZAHLEN[s[i++]!];
      tokens.push({ t: 'hoch', exponent: Number(ziffern) });
      continue;
    }
    throw new TermFehler(`Unbekanntes Zeichen: ${c}`);
  }
  return tokens;
}

class Leser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private sieh(): Token | undefined { return this.tokens[this.pos]; }
  private istOp(op: string): boolean { const t = this.sieh(); return t?.t === 'op' && t.op === op; }

  lies(): Knoten {
    if (this.tokens.length === 0) throw new TermFehler('Leere Eingabe');
    const k = this.summe();
    if (this.pos < this.tokens.length) throw new TermFehler('Unerwartetes Zeichen am Ende');
    return k;
  }

  private summe(): Knoten {
    const glieder: { minus: boolean; knoten: Knoten }[] = [];
    // führendes Vorzeichen gehört zum ersten Glied
    let minus = false;
    if (this.istOp('+') || this.istOp('-')) {
      minus = this.istOp('-');
      this.pos++;
    }
    glieder.push({ minus, knoten: this.produkt() });
    while (this.istOp('+') || this.istOp('-')) {
      const m = this.istOp('-');
      this.pos++;
      glieder.push({ minus: m, knoten: this.produkt() });
    }
    if (glieder.length === 1 && !glieder[0]!.minus) return glieder[0]!.knoten;
    return { art: 'summe', glieder };
  }

  private produkt(): Knoten {
    let links = this.vorzeichen();
    const faktoren: Knoten[] = [links];
    for (;;) {
      const t = this.sieh();
      if (t?.t === 'op' && t.op === '*') {
        this.pos++;
        faktoren.push(this.vorzeichen());
      } else if (t?.t === 'op' && t.op === '/') {
        this.pos++;
        const nenner = this.vorzeichen();
        links = faktoren.length === 1 ? faktoren[0]! : { art: 'produkt', faktoren: [...faktoren] };
        faktoren.length = 0;
        faktoren.push({ art: 'quotient', zaehler: links, nenner });
      } else if (t && (t.t === 'zahl' || t.t === 'var' || (t.t === 'op' && t.op === '('))) {
        // weggelassener Malpunkt; aber "x2" (Zahl nach Variable) ist unzulässig
        const vorher = this.tokens[this.pos - 1];
        if (t.t === 'zahl' && vorher && vorher.t !== 'op') throw new TermFehler('Zahl direkt nach Variable oder Klammer – bitte Malpunkt oder Hochzahl verwenden');
        faktoren.push(this.potenz());
      } else break;
    }
    return faktoren.length === 1 ? faktoren[0]! : { art: 'produkt', faktoren };
  }

  /** Vorzeichen direkt vor einem Faktor, z. B. 3·(−2) oder 3·−2. */
  private vorzeichen(): Knoten {
    if (this.istOp('-')) { this.pos++; return { art: 'negation', knoten: this.vorzeichen() }; }
    if (this.istOp('+')) { this.pos++; return this.vorzeichen(); }
    return this.potenz();
  }

  private potenz(): Knoten {
    let basis = this.atom();
    for (;;) {
      const t = this.sieh();
      if (t?.t === 'hoch') { this.pos++; basis = { art: 'potenz', basis, exponent: t.exponent }; continue; }
      if (t?.t === 'op' && t.op === '^') {
        this.pos++;
        const e = this.sieh();
        if (e?.t !== 'zahl' || !e.wert.istGanz()) throw new TermFehler('Hochzahl muss eine natürliche Zahl sein');
        this.pos++;
        basis = { art: 'potenz', basis, exponent: Number(e.wert.zaehler) };
        continue;
      }
      return basis;
    }
  }

  private atom(): Knoten {
    const t = this.sieh();
    if (!t) throw new TermFehler('Term endet unerwartet');
    if (t.t === 'zahl') { this.pos++; return { art: 'zahl', wert: t.wert }; }
    if (t.t === 'var') { this.pos++; return { art: 'variable', name: t.name }; }
    if (t.t === 'op' && t.op === '(') {
      this.pos++;
      const innen = this.summe();
      if (!this.istOp(')')) throw new TermFehler('Klammer wird nicht geschlossen');
      this.pos++;
      return { art: 'klammer', knoten: innen };
    }
    throw new TermFehler('Unerwartetes Zeichen');
  }
}

/** Liest einen Term; wirft TermFehler bei ungültiger Eingabe. */
export function leseTerm(eingabe: string): Knoten {
  return new Leser(zerlege(eingabe)).lies();
}

/** Wandelt einen Syntaxbaum in ein Polynom um (rechnet exakt aus). */
export function alsPolynom(k: Knoten): Polynom {
  switch (k.art) {
    case 'zahl': return Polynom.zahl(k.wert);
    case 'variable': return Polynom.variable(k.name);
    case 'klammer': return alsPolynom(k.knoten);
    case 'negation': return alsPolynom(k.knoten).negiert();
    case 'summe':
      return Polynom.summe(k.glieder.map((g) => (g.minus ? alsPolynom(g.knoten).negiert() : alsPolynom(g.knoten))));
    case 'produkt': return k.faktoren.map(alsPolynom).reduce((a, b) => a.mal(b));
    case 'potenz': return alsPolynom(k.basis).hoch(k.exponent);
    case 'quotient': {
      const n = alsPolynom(k.nenner).alsKonstante();
      if (n === null) throw new TermFehler('Division durch Terme mit Variablen wird hier nicht unterstützt');
      if (n.istNull()) throw new TermFehler('Division durch 0');
      return alsPolynom(k.zaehler).durchZahl(n);
    }
  }
}

/** Bequem: Eingabe → Polynom oder null bei ungültiger Eingabe. */
export function leseAlsPolynom(eingabe: string): Polynom | null {
  try {
    return alsPolynom(leseTerm(eingabe));
  } catch (e) {
    if (e instanceof TermFehler || e instanceof RangeError) return null;
    throw e;
  }
}

// --- Formanalyse -----------------------------------------------------------

export interface FormBefund {
  /** Enthält der Term noch eine Klammer um eine Summe (z. B. 3·(x + 1))? */
  klammernUebrig: boolean;
  /** Enthält ein Glied ein unausgerechnetes Produkt (z. B. 3·x·2 oder x·x)? */
  produkteUnvereinfacht: boolean;
  /** Gibt es gleichartige Glieder, die man noch zusammenfassen kann? */
  zusammenfassbar: boolean;
}

function enthaeltSummeInKlammer(k: Knoten): boolean {
  switch (k.art) {
    case 'zahl': case 'variable': return false;
    case 'klammer': return k.knoten.art === 'summe' || enthaeltSummeInKlammer(k.knoten);
    case 'negation': return enthaeltSummeInKlammer(k.knoten);
    case 'summe': return k.glieder.some((g) => enthaeltSummeInKlammer(g.knoten));
    case 'produkt': return k.faktoren.some(enthaeltSummeInKlammer);
    case 'potenz': return enthaeltSummeInKlammer(k.basis);
    case 'quotient': return enthaeltSummeInKlammer(k.zaehler) || enthaeltSummeInKlammer(k.nenner);
  }
}

/** Ist ein Glied ein „fertiges“ Monom: höchstens eine Zahl und jede Variable höchstens einmal? */
function istFertigesGlied(k: Knoten): boolean {
  const faktoren: Knoten[] = [];
  const sammle = (n: Knoten): boolean => {
    if (n.art === 'produkt') return n.faktoren.every(sammle);
    if (n.art === 'negation') return sammle(n.knoten);
    faktoren.push(n);
    return true;
  };
  sammle(k);
  let zahlen = 0;
  const vars = new Set<string>();
  for (const f of faktoren) {
    if (f.art === 'zahl') zahlen++;
    else if (f.art === 'variable') {
      if (vars.has(f.name)) return false;
      vars.add(f.name);
    } else if (f.art === 'potenz' && f.basis.art === 'variable') {
      if (vars.has(f.basis.name) || f.exponent < 2) return false;
      vars.add(f.basis.name);
    } else if (f.art === 'quotient' && f.zaehler.art === 'zahl' && f.nenner.art === 'zahl') {
      zahlen++; // Bruch als Koeffizient, z. B. 1/2·x
    } else return false;
  }
  return zahlen <= 1;
}

export function formBefund(k: Knoten): FormBefund {
  const glieder = k.art === 'summe' ? k.glieder.map((g) => g.knoten) : [k];
  const polys = glieder.map((g) => {
    try { return alsPolynom(g); } catch { return null; }
  });
  // Schlüssel des Monoms jedes Glieds (null, wenn das Glied kein einzelnes Monom ist)
  const schluessel = polys.map((p) => (p && p.anzahlGlieder() === 1 ? monomSchluessel(p.gliederSortiert()[0]!.monom) : null));
  const zusammenfassbar =
    schluessel.some((s, i) => s !== null && schluessel.indexOf(s) !== i) ||
    polys.some((p) => p !== null && p.istNull() && glieder.length > 1);
  return {
    klammernUebrig: enthaeltSummeInKlammer(k),
    produkteUnvereinfacht: !glieder.every(istFertigesGlied),
    zusammenfassbar,
  };
}

/** Ist der Term vollständig ausmultipliziert und zusammengefasst? */
export function istNormalform(k: Knoten): boolean {
  const b = formBefund(k);
  return !b.klammernUebrig && !b.produkteUnvereinfacht && !b.zusammenfassbar;
}
