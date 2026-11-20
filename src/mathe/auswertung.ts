/**
 * Exakte Auswertung beliebiger Terme (auch Bruchterme wie 3/(8x) oder (a + c)/2·h)
 * und Gleichwertigkeitsprüfung durch Einsetzen.
 *
 * Warum Einsetzen genügt: Zwei verschiedene rationale Terme (Quotienten von
 * Polynomen) stimmen nur an „wenigen“ Stellen überein. Setzt man an vielen zufälligen
 * rationalen Stellen exakt (ohne Rundung) ein und erhält immer dasselbe, sind die Terme
 * praktisch sicher gleichwertig. Für Polynome nutzen wir weiterhin den exakten
 * Vergleich über die Polynom-Klasse; dieses Verfahren ist für Bruchterme und Formeln.
 */
import { Bruch } from './bruch';
import type { Knoten } from './term-parser';
import { Zufall } from './zufall';

/** Wertet einen Syntaxbaum exakt aus. Wirft RangeError bei Division durch 0. */
export function werteTermAus(k: Knoten, belegung: Readonly<Record<string, Bruch>>): Bruch {
  switch (k.art) {
    case 'zahl': return k.wert;
    case 'variable': {
      const w = belegung[k.name];
      if (!w) throw new RangeError(`Keine Belegung für ${k.name}`);
      return w;
    }
    case 'klammer': return werteTermAus(k.knoten, belegung);
    case 'negation': return werteTermAus(k.knoten, belegung).negiert();
    case 'summe':
      return k.glieder.reduce((s, g) => (g.minus ? s.minus(werteTermAus(g.knoten, belegung)) : s.plus(werteTermAus(g.knoten, belegung))), Bruch.NULL);
    case 'produkt': return k.faktoren.reduce((s, f) => s.mal(werteTermAus(f, belegung)), Bruch.EINS);
    case 'potenz': return werteTermAus(k.basis, belegung).hoch(k.exponent);
    case 'quotient': return werteTermAus(k.zaehler, belegung).durch(werteTermAus(k.nenner, belegung));
  }
}

/** Alle Variablennamen in einem Syntaxbaum. */
export function variablenIn(k: Knoten): Set<string> {
  const s = new Set<string>();
  const besuche = (n: Knoten): void => {
    switch (n.art) {
      case 'variable': s.add(n.name); break;
      case 'klammer': case 'negation': besuche(n.knoten); break;
      case 'summe': n.glieder.forEach((g) => besuche(g.knoten)); break;
      case 'produkt': n.faktoren.forEach(besuche); break;
      case 'potenz': besuche(n.basis); break;
      case 'quotient': besuche(n.zaehler); besuche(n.nenner); break;
      case 'zahl': break;
    }
  };
  besuche(k);
  return s;
}

const PROBEN = 12;

/**
 * Sind zwei Terme gleichwertig (auf ihrem gemeinsamen Definitionsbereich)?
 * Deterministisch: feste Startzahl für die Probestellen.
 */
export function gleichwertigeTerme(a: Knoten, b: Knoten): boolean {
  const vars = [...new Set([...variablenIn(a), ...variablenIn(b)])].sort();
  const z = new Zufall(20261120);
  let erfolgreich = 0;
  for (let versuch = 0; versuch < PROBEN * 10 && erfolgreich < PROBEN; versuch++) {
    const bel: Record<string, Bruch> = {};
    for (const v of vars) bel[v] = Bruch.von(z.ganzzahlOhne(-60, 60, [0]), z.ganzzahl(1, 9));
    let wa: Bruch;
    let wb: Bruch;
    try {
      wa = werteTermAus(a, bel);
      wb = werteTermAus(b, bel);
    } catch (e) {
      if (e instanceof RangeError) continue; // Nenner 0 an dieser Stelle – andere Stelle probieren
      throw e;
    }
    if (!wa.gleich(wb)) return false;
    erfolgreich++;
  }
  return erfolgreich === PROBEN;
}
