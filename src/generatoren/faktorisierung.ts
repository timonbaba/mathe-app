/**
 * Formprüfung für Faktorisierungen (Ausklammern, später binomische Formeln).
 *
 * Eine Antwort wie  −3xy·(2x + 3y)  wird zerlegt in
 *   - den Faktor vor (oder hinter) den Klammern (hier −3xy) und
 *   - die Klammern (hier 2x + 3y).
 */
import { Bruch, ggT } from '../mathe/bruch';
import { formatGlied, Polynom, type Glied } from '../mathe/polynom';
import { alsPolynom, istNormalform, leseTerm, TermFehler, type Knoten } from '../mathe/term-parser';
import { formel } from './gemeinsam';
import { ANZEIGE, type Bewertung, type FehlertypCode, type Formel } from './typen';

export interface ProduktForm {
  /** Ist der Term (bis auf ein Vorzeichen) ein Produkt mit mindestens einer Klammer? */
  readonly istProdukt: boolean;
  /** Die Klammern (Summen) als Polynome */
  readonly klammern: readonly Polynom[];
  /** Ist der Inhalt jeder Klammer zusammengefasst? */
  readonly klammernZusammengefasst: boolean;
  /** Produkt aller übrigen Faktoren (Zahlen, Variablen, Potenzen) */
  readonly faktor: Polynom;
}

/** Zerlegt einen Syntaxbaum in Faktor und Klammern. */
export function produktForm(k: Knoten): ProduktForm {
  let vorzeichen = 1;
  // führendes Minus: „−3x·(…)“ wird als Summe mit einem negativen Glied gelesen
  while (k.art === 'summe' && k.glieder.length === 1) {
    if (k.glieder[0]!.minus) vorzeichen = -vorzeichen;
    k = k.glieder[0]!.knoten;
  }
  while (k.art === 'negation') {
    vorzeichen = -vorzeichen;
    k = k.knoten;
  }
  const faktoren: Knoten[] = [];
  const sammle = (n: Knoten): void => {
    if (n.art === 'produkt') n.faktoren.forEach(sammle);
    else if (n.art === 'negation') {
      vorzeichen = -vorzeichen;
      sammle(n.knoten);
    } else faktoren.push(n);
  };
  sammle(k);
  const klammern: Polynom[] = [];
  let zusammengefasst = true;
  let faktor = Polynom.zahl(vorzeichen);
  for (const f of faktoren) {
    // Klammer mit Summe, ggf. als Potenz (x − 4)²
    const basis = f.art === 'potenz' ? f.basis : f;
    if (basis.art === 'klammer' && basis.knoten.art === 'summe') {
      const p = alsPolynom(basis.knoten);
      if (!istNormalform(basis.knoten)) zusammengefasst = false;
      const n = f.art === 'potenz' ? f.exponent : 1;
      for (let i = 0; i < n; i++) klammern.push(p);
    } else {
      faktor = faktor.mal(alsPolynom(f));
    }
  }
  return { istProdukt: klammern.length > 0 && faktor.anzahlGlieder() === 1, klammern, klammernZusammengefasst: zusammengefasst, faktor };
}

/**
 * Größter gemeinsamer Faktor (Zahl ≥ 1 und Variablen mit kleinster Hochzahl)
 * aller Glieder eines Polynoms mit ganzzahligen Koeffizienten.
 */
export function gemeinsamerFaktor(p: Polynom): Glied {
  const glieder = p.gliederSortiert();
  let t = 0n;
  for (const g of glieder) t = ggT(t, g.koeffizient.zaehler);
  const vars: Record<string, number> = {};
  if (glieder.length > 0) {
    for (const v of Object.keys(glieder[0]!.monom)) {
      const minE = Math.min(...glieder.map((g) => g.monom[v] ?? 0));
      if (minE > 0) vars[v] = minE;
    }
  }
  return { koeffizient: Bruch.von(t === 0n ? 1n : t), monom: vars };
}

/** Hat das Polynom (Klammerinhalt) noch einen gemeinsamen Faktor außer ±1? */
export function hatGemeinsamenFaktor(p: Polynom): boolean {
  const f = gemeinsamerFaktor(p);
  return !f.koeffizient.gleich(1) || Object.keys(f.monom).length > 0;
}

/** Anzeige „F·(Klammer)“ bzw. „−(Klammer)“. */
export function faktorisierungFormel(faktor: Glied, innen: readonly Glied[]): Formel {
  const i = formel(innen);
  const nurZahl = Object.keys(faktor.monom).length === 0;
  if (nurZahl && faktor.koeffizient.gleich(-1)) return { text: `−(${i.text})`, latex: `-\\left(${i.latex}\\right)` };
  return {
    text: `${formatGlied(faktor, 'text', ANZEIGE)}·(${i.text})`,
    latex: `${formatGlied(faktor, 'latex', ANZEIGE)} \\cdot \\left(${i.latex}\\right)`,
  };
}

export interface FalscheFaktorisierung {
  readonly fehlertyp: FehlertypCode;
  readonly wert: Polynom;
  readonly rueckmeldung?: string;
}

/** Prüft eine Ausklammer-Antwort: Wert, Produktform, vollständig ausgeklammert. */
export function pruefeAusklammern(
  antwort: string,
  aufgabe: Polynom,
  fehler: readonly FalscheFaktorisierung[],
  rm: Partial<Record<FehlertypCode, string>>,
  standard: Readonly<Record<FehlertypCode, string>>,
): Bewertung {
  let knoten: Knoten;
  let p: Polynom;
  try {
    knoten = leseTerm(antwort);
    p = alsPolynom(knoten);
  } catch (e) {
    if (e instanceof TermFehler || e instanceof RangeError) {
      return { ergebnis: 'unlesbar', rueckmeldung: 'Das kann ich nicht als Term lesen. Prüfe Klammern und Rechenzeichen.' };
    }
    throw e;
  }
  if (p.gleich(aufgabe)) {
    const form = produktForm(knoten);
    if (!form.istProdukt || form.klammern.length !== 1) {
      return { ergebnis: 'unvollstaendig', rueckmeldung: 'Der Wert stimmt, aber der Term soll als Produkt dastehen: gemeinsamer Faktor mal Klammer.' };
    }
    if (!form.klammernZusammengefasst) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Fasse in der Klammer noch zusammen.' };
    if (hatGemeinsamenFaktor(form.klammern[0]!)) {
      return { ergebnis: 'unvollstaendig', rueckmeldung: 'Richtig umgeformt – aber in der Klammer steckt noch ein gemeinsamer Faktor. Klammere ihn auch aus.' };
    }
    return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
  }
  for (const f of fehler) {
    if (f.wert.gleich(p)) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung ?? rm[f.fehlertyp] ?? standard[f.fehlertyp] };
  }
  return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: rm.UK ?? standard.UK };
}
