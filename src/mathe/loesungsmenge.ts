/**
 * Lösungsmengen von Gleichungen und Ungleichungen: Darstellung und Einlesen
 * von Schülereingaben (SPEC 5.5).
 *
 * Akzeptierte Eingaben (Variable z. B. x):
 *   "x = 3", "3", "L = {3}", "L={-3/4}", "{0; 3}", "x = 0 oder x = 3", "x₁ = 0; x₂ = 3",
 *   "L = { }", "L = {}", "∅", "keine Lösung", "L = ℚ", "L = Q", "unendlich viele"
 * Mehrere Elemente werden durch „;“, „oder“ oder „, “ (Komma MIT Leerzeichen) getrennt –
 * ein Komma ohne Leerzeichen ist ein Dezimalkomma.
 *
 * Ungleichungen: "x < 3", "x ≥ −2", "x >= 1/2", "L = {x | x < 3}", "3 > x".
 */
import { Bruch } from './bruch';
import type { Formel } from './formel';

export type Loesungsmenge =
  | { readonly art: 'endlich'; readonly werte: readonly Bruch[] }
  | { readonly art: 'leer' }
  | { readonly art: 'alle' };

export type Relation = '<' | '>' | '≤' | '≥';
export type UngleichungsLoesung =
  | { readonly art: 'intervall'; readonly relation: Relation; readonly grenze: Bruch }
  | { readonly art: 'leer' }
  | { readonly art: 'alle' };

export const endlich = (...werte: Bruch[]): Loesungsmenge => ({ art: 'endlich', werte: sortiert(werte) });

function sortiert(w: readonly Bruch[]): Bruch[] {
  const eindeutig: Bruch[] = [];
  for (const x of w) if (!eindeutig.some((y) => y.gleich(x))) eindeutig.push(x);
  return eindeutig.sort((a, b) => a.vergleiche(b));
}

export function gleicheMenge(a: Loesungsmenge, b: Loesungsmenge): boolean {
  if (a.art !== b.art) return false;
  if (a.art !== 'endlich' || b.art !== 'endlich') return true;
  const x = sortiert(a.werte);
  const y = sortiert(b.werte);
  return x.length === y.length && x.every((v, i) => v.gleich(y[i]!));
}

function zahlLatex(b: Bruch): string {
  const a = b.betrag();
  const t = a.istGanz() ? a.toString() : `\\frac{${a.zaehler}}{${a.nenner}}`;
  return b.istNegativ() ? `-${t}` : t;
}

/** Zahl für die Anzeige: ganze Zahl, endlicher Dezimalbruch nur wenn gewünscht, sonst Bruch. */
export function zahlFormel(b: Bruch): Formel {
  return { text: b.alsText(), latex: zahlLatex(b) };
}

export function mengeFormel(m: Loesungsmenge, grundmenge = 'ℚ'): Formel {
  if (m.art === 'leer') return { text: 'L = { }', latex: 'L = \\{\\,\\}' };
  if (m.art === 'alle') return { text: `L = ${grundmenge}`, latex: grundmenge === 'ℚ' ? 'L = \\mathbb{Q}' : `L = ${grundmenge}` };
  const w = sortiert(m.werte);
  return { text: `L = {${w.map((x) => x.alsText()).join('; ')}}`, latex: `L = \\{${w.map(zahlLatex).join(';\\ ')}\\}` };
}

function normalisiere(s: string): string {
  return s
    .replace(/[−–]/g, '-')
    .replace(/[₀-₉]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Liest eine Zahl, auch mit Variablenname davor ("x = 3", "x1 = 3"). */
function leseWert(s: string, v: string): Bruch | null {
  let t = s.trim();
  const m = new RegExp(`^${v}\\d?\\s*=\\s*(.*)$`).exec(t);
  if (m) t = m[1]!;
  return Bruch.parse(t);
}

/** Liest eine Lösungsmenge; null, wenn die Eingabe nicht verständlich ist. */
export function leseLoesungsmenge(eingabe: string, v: string): Loesungsmenge | null {
  let s = normalisiere(eingabe);
  if (s === '') return null;
  const klein = s.toLowerCase();
  if (/^(l\s*=\s*)?(\{\s*\}|∅|\{\s*∅\s*\})$/.test(klein) || /keine\s+l(ö|oe)sung/.test(klein)) return { art: 'leer' };
  if (/^(l\s*=\s*)?(ℚ|q|ℝ|r)$/.test(klein) || /unendlich|alle\s+(zahlen|rationalen)/.test(klein)) return { art: 'alle' };
  s = s.replace(/^L\s*=\s*/i, '');
  const inMenge = /^\{(.*)\}$/.exec(s);
  if (inMenge) s = inMenge[1]!;
  const teile = s
    .split(/\s*;\s*|\s+oder\s+|,\s+|\s+und\s+/i)
    .map((t) => t.trim())
    .filter((t) => t !== '');
  if (teile.length === 0) return null;
  const werte: Bruch[] = [];
  for (const t of teile) {
    const w = leseWert(t, v);
    if (!w) return null;
    werte.push(w);
  }
  return endlich(...werte);
}

// --- Ungleichungen ---------------------------------------------------------------------

const UMKEHR: Record<Relation, Relation> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };

export function ungleichungFormel(l: UngleichungsLoesung, v: string): Formel {
  if (l.art === 'leer') return { text: 'L = { }', latex: 'L = \\{\\,\\}' };
  if (l.art === 'alle') return { text: 'L = ℚ', latex: 'L = \\mathbb{Q}' };
  const rel = { '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' }[l.relation];
  return { text: `${v} ${l.relation} ${l.grenze.alsText()}`, latex: `${v} ${rel} ${zahlLatex(l.grenze)}` };
}

export function gleicheUngleichungsLoesung(a: UngleichungsLoesung, b: UngleichungsLoesung): boolean {
  if (a.art !== b.art) return false;
  if (a.art !== 'intervall' || b.art !== 'intervall') return true;
  return a.relation === b.relation && a.grenze.gleich(b.grenze);
}

export function leseUngleichungsLoesung(eingabe: string, v: string): UngleichungsLoesung | null {
  let s = normalisiere(eingabe).replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/=</g, '≤').replace(/=>/g, '≥');
  const klein = s.toLowerCase();
  if (/^(l\s*=\s*)?(\{\s*\}|∅)$/.test(klein) || /keine\s+l(ö|oe)sung/.test(klein)) return { art: 'leer' };
  if (/^(l\s*=\s*)?(ℚ|q|ℝ|r)$/.test(klein) || /alle\s+zahlen/.test(klein)) return { art: 'alle' };
  s = s.replace(/^L\s*=\s*/i, '');
  const menge = new RegExp(`^\\{\\s*${v}\\s*[|:]\\s*(.*)\\}$`).exec(s);
  if (menge) s = menge[1]!.trim();
  // v rel zahl
  let m = new RegExp(`^${v}\\s*([<>≤≥])\\s*(.+)$`).exec(s);
  if (m) {
    const g = Bruch.parse(m[2]!);
    return g ? { art: 'intervall', relation: m[1] as Relation, grenze: g } : null;
  }
  // zahl rel v
  m = new RegExp(`^(.+?)\\s*([<>≤≥])\\s*${v}$`).exec(s);
  if (m) {
    const g = Bruch.parse(m[1]!);
    return g ? { art: 'intervall', relation: UMKEHR[m[2] as Relation], grenze: g } : null;
  }
  return null;
}
