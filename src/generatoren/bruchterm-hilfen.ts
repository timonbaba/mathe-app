/**
 * Gemeinsames für Bruchterm-Generatoren: Anzeige von Brüchen und Antwortprüfung
 * (gleichwertig durch exaktes Einsetzen + Formprüfung „vollständig gekürzt“).
 */
import { gemeinsamerZahlfaktor, gesamtgrad, rational } from '../mathe/bruchterm';
import { gleichwertigeTerme } from '../mathe/auswertung';
import { leseTerm, TermFehler, type Knoten } from '../mathe/term-parser';
import { RUECKMELDUNG } from './gemeinsam';
import type { Bewertung, FehlertypCode, Formel } from './typen';

/** Braucht ein Ausdruck als Zähler Klammern (Summe) bzw. als Nenner (alles außer Zahl/Potenz einer Variablen)? */
function istSumme(t: string): boolean {
  return / [+−] /.test(t) || /^.+[+−]/.test(t.replace(/^−/, ''));
}
function brauchtNennerKlammer(t: string): boolean {
  return !/^\d+$/.test(t) && !/^[a-zA-Z][²³⁴]?$/.test(t);
}

/** Bruch aus Zähler- und Nenner-Formel: „(x³ + x²)/x²“ bzw. \frac{…}{…} */
export function bruch(z: Formel, n: Formel): Formel {
  const zt = istSumme(z.text) ? `(${z.text})` : z.text;
  const nt = brauchtNennerKlammer(n.text) ? `(${n.text})` : n.text;
  const negativ = z.latex.startsWith('-') && !istSumme(z.text);
  const zl = negativ ? z.latex.slice(1) : z.latex;
  return { text: `${zt}/${nt}`, latex: `${negativ ? '-' : ''}\\frac{${zl}}{${n.latex}}` };
}

export interface FalscherBruchterm {
  readonly fehlertyp: FehlertypCode;
  /** Text der Fehlantwort (wird gelesen und per Einsetzen verglichen) */
  readonly formel: Formel;
  readonly rueckmeldung?: string;
}

/**
 * Prüft einen Bruchterm. `erwarteterGesamtgrad` = Grad Zähler + Grad Nenner der
 * gekürzten Lösung (z. B. x/24 → 1, 1/(x + 1) → 1, 3/4 → 0).
 */
export function pruefeBruchterm(
  antwort: string,
  loesung: Knoten,
  erwarteterGesamtgrad: number,
  fehler: readonly FalscherBruchterm[],
  rm: Partial<Record<FehlertypCode, string>> = {},
): Bewertung {
  let k: Knoten;
  try {
    k = leseTerm(antwort);
  } catch (e) {
    if (e instanceof TermFehler || e instanceof RangeError) return { ergebnis: 'unlesbar', rueckmeldung: 'Das kann ich nicht als Term lesen. Prüfe Klammern und Bruchstriche.' };
    throw e;
  }
  if (gleichwertigeTerme(k, loesung)) {
    const r = rational(k);
    if (gesamtgrad(r) > erwarteterGesamtgrad || gemeinsamerZahlfaktor(r) > 1n) {
      return { ergebnis: 'unvollstaendig', rueckmeldung: 'Der Wert stimmt, aber du kannst noch weiter kürzen.' };
    }
    return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
  }
  for (const f of fehler) {
    if (gleichwertigeTerme(k, leseTerm(f.formel.text))) {
      return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung ?? rm[f.fehlertyp] ?? RUECKMELDUNG[f.fehlertyp] };
    }
  }
  return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: rm.UK ?? RUECKMELDUNG.UK };
}

/** Entfernt Fehlantworten, die gleichwertig zur Lösung oder zueinander sind. */
export function bereinigeBruchFehler(loesung: Knoten, liste: readonly FalscherBruchterm[]): FalscherBruchterm[] {
  const gesehen: Knoten[] = [loesung];
  return liste.filter((f) => {
    const k = leseTerm(f.formel.text);
    if (gesehen.some((g) => gleichwertigeTerme(g, k))) return false;
    gesehen.push(k);
    return true;
  });
}
