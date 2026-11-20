/**
 * Gemeinsame Bausteine für Term-Generatoren: Formatierung, Glied-Rechnung,
 * Antwortprüfung, Auswahloptionen.
 */
import { formatGlieder, gliedAlsPolynom, monomSchluessel, Polynom, type Glied, type Monom } from '../mathe/polynom';
import { alsPolynom, formBefund, leseTerm, TermFehler } from '../mathe/term-parser';
import type { Zufall } from '../mathe/zufall';
import { ANZEIGE, type Auswahloption, type Bewertung, type FehlertypCode, type Formel } from './typen';

export interface Fehlantwort {
  readonly fehlertyp: FehlertypCode;
  readonly glieder: readonly Glied[];
  /** Optional: genauere Rückmeldung als der Standardtext des Fehlertyps. */
  readonly rueckmeldung?: string;
}

/** Standard-Rückmeldungen je Fehlertyp; Generatoren können eigene, genauere Texte mitgeben. */
export const RUECKMELDUNG: Readonly<Record<FehlertypCode, string>> = {
  VZ: 'Schau dir die Vorzeichen noch einmal an: Minus mal Minus ergibt Plus, Minus mal Plus ergibt Minus.',
  KL: 'Beim Auflösen der Klammer muss jedes Glied in der Klammer berücksichtigt werden.',
  ZF: 'Nur gleichartige Glieder (gleiche Variablen mit gleichen Hochzahlen) darf man zusammenfassen.',
  VR: 'Denk an die Reihenfolge: Klammern, Potenzen, Punkt vor Strich.',
  BR: 'Brüche: erst gleichnamig machen – und kürzen darf man nur Faktoren, nicht Summanden.',
  PO: 'Achte auf die Hochzahlen: x · x = x², beim Multiplizieren gleicher Variablen werden die Hochzahlen addiert.',
  UM: 'Was du auf einer Seite machst, musst du auf der anderen Seite genauso machen.',
  EH: 'Prüfe die Einheiten.',
  DA: 'Lies noch einmal genau ab.',
  TV: 'Lies den Text noch einmal Satz für Satz und übersetze ihn Stück für Stück.',
  RE: 'Da hat sich ein Rechenfehler eingeschlichen.',
  UK: 'Das stimmt noch nicht. Möchtest du einen Denkanstoß?',
};

export function formel(glieder: readonly Glied[]): Formel {
  return { text: formatGlieder(glieder, 'text', ANZEIGE), latex: formatGlieder(glieder, 'latex', ANZEIGE) };
}

export function monomMal(a: Monom, b: Monom): Monom {
  const m: Record<string, number> = { ...a };
  for (const [v, e] of Object.entries(b)) m[v] = (m[v] ?? 0) + e;
  return m;
}

/** Fehler PO: Hochzahlen nicht addiert, sondern die größere genommen (x·x = x). */
export function monomMalOhneHochzahlen(a: Monom, b: Monom): Monom {
  const m: Record<string, number> = { ...a };
  for (const [v, e] of Object.entries(b)) m[v] = Math.max(m[v] ?? 0, e);
  return m;
}

export function gliedMal(a: Glied, b: Glied): Glied {
  return { koeffizient: a.koeffizient.mal(b.koeffizient), monom: monomMal(a.monom, b.monom) };
}

export function summeAlsPolynom(glieder: readonly Glied[]): Polynom {
  return Polynom.summe(glieder.map(gliedAlsPolynom));
}

export function hatVariablen(m: Monom): boolean {
  return Object.values(m).some((e) => e > 0);
}

/** Übliche Reihenfolge: höchster Grad zuerst, dann alphabetisch, Zahl zuletzt (sortiert in-place). */
export function sortiereGlieder(glieder: Glied[]): void {
  const reihenfolge = Polynom.summe(glieder.map((g) => Polynom.glied(1, g.monom))).gliederSortiert().map((g) => monomSchluessel(g.monom));
  glieder.sort((x, y) => reihenfolge.indexOf(monomSchluessel(x.monom)) - reihenfolge.indexOf(monomSchluessel(y.monom)));
}

export function zufallsMonom(z: Zufall, vars: readonly string[], maxGrad: number, minGrad = 0): Monom {
  const grad = z.ganzzahl(minGrad, maxGrad);
  const m: Record<string, number> = {};
  for (let i = 0; i < grad; i++) {
    const v = z.auswahl(vars);
    m[v] = (m[v] ?? 0) + 1;
  }
  return m;
}

/** Haben die Glieder paarweise verschiedene Monome (also nichts mehr zusammenzufassen)? */
export function alleUngleichartig(glieder: readonly Glied[]): boolean {
  const s = glieder.map((g) => monomSchluessel(g.monom));
  return new Set(s).size === s.length;
}

/**
 * Entfernt Fehlantworten, die mit der Lösung oder einer früheren Fehlantwort
 * übereinstimmen oder nicht „fertig aussehen“ (gleichartige Glieder nebeneinander).
 */
export function bereinigeFehlantworten(loesung: Polynom, liste: readonly Fehlantwort[]): Fehlantwort[] {
  const gesehen: Polynom[] = [loesung];
  return liste.filter((f) => {
    if (!alleUngleichartig(f.glieder)) return false;
    if (f.glieder.length === 0) return false;
    const p = summeAlsPolynom(f.glieder);
    if (gesehen.some((q) => q.gleich(p))) return false;
    gesehen.push(p);
    return true;
  });
}

/** Bis zu drei Fehloptionen (verschiedene Fehlertypen bevorzugt) + Lösung, gemischt. */
export function auswahlOptionen(z: Zufall, loesung: Formel, fehler: readonly Fehlantwort[]): Auswahloption[] {
  const gewaehlt: Fehlantwort[] = [];
  for (const f of fehler) if (gewaehlt.length < 3 && !gewaehlt.some((g) => g.fehlertyp === f.fehlertyp)) gewaehlt.push(f);
  for (const f of fehler) if (gewaehlt.length < 3 && !gewaehlt.includes(f)) gewaehlt.push(f);
  return z.gemischt([
    { formel: loesung, richtig: true },
    ...gewaehlt.map((f) => ({ formel: formel(f.glieder), richtig: false, fehlertyp: f.fehlertyp, ...(f.rueckmeldung ? { rueckmeldung: f.rueckmeldung } : {}) })),
  ]);
}

export function pruefeAuswahl(optionen: readonly Auswahloption[], antwort: string, rm: Partial<Record<FehlertypCode, string>> = {}): Bewertung {
  if (!/^\d+$/.test(antwort.trim())) return { ergebnis: 'unlesbar', rueckmeldung: 'Bitte wähle eine Antwort aus.' };
  const o = optionen[Number(antwort)];
  if (!o) return { ergebnis: 'unlesbar', rueckmeldung: 'Bitte wähle eine Antwort aus.' };
  if (o.richtig) return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
  const t = o.fehlertyp ?? 'UK';
  return { ergebnis: 'falsch', fehlertyp: t, rueckmeldung: o.rueckmeldung ?? rm[t] ?? RUECKMELDUNG[t] };
}

/**
 * Prüft eine Termeingabe, die vollständig vereinfacht sein soll
 * (ausmultipliziert, zusammengefasst).
 */
export function pruefeTermEingabe(
  antwort: string,
  loesung: Polynom,
  fehler: readonly Fehlantwort[],
  rm: Partial<Record<FehlertypCode, string>> = {},
): Bewertung {
  let knoten;
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
  if (p.gleich(loesung)) {
    const befund = formBefund(knoten);
    if (befund.klammernUebrig) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Der Wert stimmt, aber es steht noch eine Klammer da. Löse sie auf.' };
    if (befund.produkteUnvereinfacht) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Der Wert stimmt. Rechne die Produkte in den einzelnen Gliedern noch aus.' };
    if (befund.zusammenfassbar) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Der Wert stimmt. Fasse gleichartige Glieder noch zusammen.' };
    return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
  }
  const text = (t: FehlertypCode) => rm[t] ?? RUECKMELDUNG[t];
  for (const f of fehler) {
    if (summeAlsPolynom(f.glieder).gleich(p)) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung ?? text(f.fehlertyp) };
  }
  // allgemeiner Vorzeichenfehler: gleiche Glieder, nur Vorzeichen anders
  const a = loesung.gliederSortiert();
  const b = p.gliederSortiert();
  if (
    a.length === b.length &&
    a.every((g, i) => monomSchluessel(g.monom) === monomSchluessel(b[i]!.monom) && g.koeffizient.betrag().gleich(b[i]!.koeffizient.betrag()))
  ) {
    return { ergebnis: 'falsch', fehlertyp: 'VZ', rueckmeldung: text('VZ') };
  }
  return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: text('UK') };
}
