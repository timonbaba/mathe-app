/**
 * Termbaum: Summen aus Gliedern und Klammerprodukten (auch verschachtelt),
 * z. B.  15xy·(3x + 4xy) − 3x²y   oder   a·(a − (3c + 2a)).
 *
 * Kann den Term
 *  - anzeigen (Text/LaTeX, Schreibweise wie in SPEC 5.5),
 *  - exakt auswerten (als Polynom),
 *  - Schritt für Schritt umformen wie im Unterricht (für den Lösungsweg):
 *      1. innerste Klammern zuerst,
 *      2. in einer Klammer zuerst zusammenfassen,
 *      3. Klammern ausmultiplizieren,
 *      4. gleichartige Glieder zusammenfassen,
 *  - dieselben Schritte mit einem typischen Fehler durchrechnen
 *    (für diagnostische Fehlantworten): KL, VZ, PO.
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, monomSchluessel, Polynom, type Glied } from '../mathe/polynom';
import { alleUngleichartig, gliedMal, monomMalOhneHochzahlen, sortiereGlieder, summeAlsPolynom } from './gemeinsam';
import { ANZEIGE, type Formel } from './typen';

export type Summand =
  | { readonly art: 'glied'; readonly glied: Glied }
  | { readonly art: 'klammer'; readonly faktor: Glied; readonly innen: Summe }
  /** Produkt zweier Klammern (a₁ + a₂)·(b₁ + b₂), mit Vorzeichen davor (+1 oder −1) */
  | { readonly art: 'produkt'; readonly vorzeichen: 1 | -1; readonly a: readonly Glied[]; readonly b: readonly Glied[] };
export type Summe = readonly Summand[];

/** Wie wird ausmultipliziert? 'richtig' oder mit einem typischen Fehler. */
export type Modus = 'richtig' | 'KL' | 'VZ' | 'PO';

export const g = (k: number | Bruch, monom: Record<string, number> = {}): Summand => ({
  art: 'glied',
  glied: { koeffizient: k instanceof Bruch ? k : Bruch.von(k), monom },
});
export const kl = (faktor: Glied, innen: Summe): Summand => ({ art: 'klammer', faktor, innen });
export const produkt = (a: readonly Glied[], b: readonly Glied[], vorzeichen: 1 | -1 = 1): Summand => ({ art: 'produkt', vorzeichen, a, b });
export const glied = (k: number, monom: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom });

// --- Anzeige -------------------------------------------------------------------

function istNegativ(s: Summand): boolean {
  if (s.art === 'produkt') return s.vorzeichen === -1;
  return s.art === 'glied' ? s.glied.koeffizient.istNegativ() : s.faktor.koeffizient.istNegativ();
}

function betragText(s: Summand, ziel: 'text' | 'latex'): string {
  if (s.art === 'glied') return formatGlied({ ...s.glied, koeffizient: s.glied.koeffizient.betrag() }, ziel, ANZEIGE);
  if (s.art === 'produkt') {
    const a = format(s.a.map((x) => ({ art: 'glied' as const, glied: x })), ziel);
    const b = format(s.b.map((x) => ({ art: 'glied' as const, glied: x })), ziel);
    return ziel === 'latex' ? `\\left(${a}\\right) \\cdot \\left(${b}\\right)` : `(${a})·(${b})`;
  }
  const f = { ...s.faktor, koeffizient: s.faktor.koeffizient.betrag() };
  const nurEins = f.koeffizient.gleich(1) && Object.keys(f.monom).length === 0;
  const innen = format(s.innen, ziel);
  if (ziel === 'latex') return (nurEins ? '' : `${formatGlied(f, 'latex', ANZEIGE)} \\cdot `) + `\\left(${innen}\\right)`;
  return (nurEins ? '' : `${formatGlied(f, 'text', ANZEIGE)}·`) + `(${innen})`;
}

export function format(summe: Summe, ziel: 'text' | 'latex'): string {
  if (summe.length === 0) return '0';
  const minus = ziel === 'latex' ? '-' : '−';
  return summe
    .map((s, i) => {
      const b = betragText(s, ziel);
      if (i === 0) return istNegativ(s) ? `${minus}${b}` : b;
      return istNegativ(s) ? ` ${minus} ${b}` : ` + ${b}`;
    })
    .join('');
}

export function formelVon(summe: Summe): Formel {
  return { text: format(summe, 'text'), latex: format(summe, 'latex') };
}

// --- Wert ----------------------------------------------------------------------

export function wert(summe: Summe): Polynom {
  return Polynom.summe(
    summe.map((s) =>
      s.art === 'glied'
        ? Polynom.glied(s.glied.koeffizient, s.glied.monom)
        : s.art === 'produkt'
          ? summeAlsPolynom(s.a).mal(summeAlsPolynom(s.b)).mal(Polynom.zahl(s.vorzeichen))
          : Polynom.glied(s.faktor.koeffizient, s.faktor.monom).mal(wert(s.innen)),
    ),
  );
}

// --- Umformen ------------------------------------------------------------------

const hatKlammer = (s: Summe) => s.some((x) => x.art === 'klammer' || x.art === 'produkt');
const nurGlieder = (s: Summe): Glied[] => s.map((x) => (x.art === 'glied' ? x.glied : (() => { throw new Error('Klammer übrig'); })()));

/** Fasst zusammen und sortiert in die übliche Reihenfolge (höchster Grad zuerst, alphabetisch). */
export function zusammenfassenSortiert(glieder: readonly Glied[]): Glied[] {
  const r = zusammenfassen(glieder);
  sortiereGlieder(r);
  return r;
}

/** Fasst gleichartige Glieder zusammen; Reihenfolge nach erstem Auftreten. */
export function zusammenfassen(glieder: readonly Glied[]): Glied[] {
  const reihenfolge: string[] = [];
  const summe = new Map<string, Glied>();
  for (const x of glieder) {
    const k = monomSchluessel(x.monom);
    const alt = summe.get(k);
    if (!alt) reihenfolge.push(k);
    summe.set(k, { koeffizient: (alt?.koeffizient ?? Bruch.NULL).plus(x.koeffizient), monom: x.monom });
  }
  return reihenfolge.map((k) => summe.get(k)!).filter((x) => !x.koeffizient.istNull());
}

function ausmultiplizieren(faktor: Glied, innen: readonly Glied[], modus: Modus): Glied[] {
  return innen.map((x, j) => {
    const richtig = gliedMal(faktor, x);
    switch (modus) {
      case 'richtig':
        return richtig;
      case 'KL': // nur das erste Glied wird mit dem Faktor multipliziert
        return j === 0 ? richtig : x;
      case 'VZ':
        if (faktor.koeffizient.istNegativ()) return j === 0 ? richtig : { ...richtig, koeffizient: richtig.koeffizient.negiert() };
        return { ...richtig, koeffizient: richtig.koeffizient.betrag() };
      case 'PO':
        return { koeffizient: faktor.koeffizient.mal(x.koeffizient), monom: monomMalOhneHochzahlen(faktor.monom, x.monom) };
    }
  });
}

/** (a₁ + a₂)·(b₁ + b₂) ausmultiplizieren – richtig oder mit typischem Fehler. */
function produktAusmultiplizieren(p: { vorzeichen: 1 | -1; a: readonly Glied[]; b: readonly Glied[] }, modus: Modus): Glied[] {
  let einzeln: Glied[];
  if (modus === 'KL') {
    // nur „erstes·erstes“ und „letztes·letztes“
    einzeln = [gliedMal(p.a[0]!, p.b[0]!), gliedMal(p.a[p.a.length - 1]!, p.b[p.b.length - 1]!)];
  } else {
    einzeln = p.a.flatMap((x) =>
      p.b.map((y) => {
        if (modus === 'PO') return { koeffizient: x.koeffizient.mal(y.koeffizient), monom: monomMalOhneHochzahlen(x.monom, y.monom) };
        const r = gliedMal(x, y);
        if (modus === 'VZ' && x.koeffizient.istNegativ() && y.koeffizient.istNegativ()) return { ...r, koeffizient: r.koeffizient.negiert() };
        return r;
      }),
    );
  }
  return p.vorzeichen === 1 ? einzeln : einzeln.map((x) => ({ ...x, koeffizient: x.koeffizient.negiert() }));
}

const alsSumme = (glieder: readonly Glied[]): Summe => glieder.map((x) => ({ art: 'glied', glied: x }));

/** Ein Umformungsschritt; null, wenn nichts mehr zu tun ist. */
export function schritt(summe: Summe, modus: Modus = 'richtig'): Summe | null {
  // 1. Klammern mit Klammern darin: innen weiterumformen
  if (summe.some((s) => s.art === 'klammer' && hatKlammer(s.innen))) {
    return summe.map((s) => (s.art === 'klammer' && hatKlammer(s.innen) ? { ...s, innen: schritt(s.innen, modus)! } : s));
  }
  // 2. innerhalb von Klammern zusammenfassen
  if (summe.some((s) => s.art === 'klammer' && !alleUngleichartig(nurGlieder(s.innen)))) {
    return summe.map((s) => (s.art === 'klammer' ? { ...s, innen: alsSumme(zusammenfassenSortiert(nurGlieder(s.innen))) } : s));
  }
  // 3. Klammern ausmultiplizieren
  if (hatKlammer(summe)) {
    return summe.flatMap((s) =>
      s.art === 'glied' ? [s] : s.art === 'produkt' ? alsSumme(produktAusmultiplizieren(s, modus)) : alsSumme(ausmultiplizieren(s.faktor, nurGlieder(s.innen), modus)),
    );
  }
  // 4. zusammenfassen
  const glieder = nurGlieder(summe);
  if (!alleUngleichartig(glieder) || glieder.some((x) => x.koeffizient.istNull())) return alsSumme(zusammenfassenSortiert(glieder));
  return null;
}

/** Alle Umformungsschritte bis zum Ergebnis (ohne den Ausgangsterm). */
export function loese(summe: Summe, modus: Modus = 'richtig'): Summe[] {
  const schritte: Summe[] = [];
  let aktuell: Summe | null = summe;
  for (let i = 0; i < 20; i++) {
    aktuell = schritt(aktuell, modus);
    if (aktuell === null) return schritte;
    schritte.push(aktuell);
  }
  throw new Error('Umformung endet nicht');
}

/** Endergebnis als Glied-Liste. */
export function ergebnis(summe: Summe, modus: Modus = 'richtig'): Glied[] {
  const s = loese(summe, modus);
  return nurGlieder(s.length ? s[s.length - 1]! : summe);
}

export { summeAlsPolynom };
