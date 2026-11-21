/**
 * Gemeinsames für Aufgaben mit einer ZAHL als Antwort (Rechnen mit Brüchen,
 * rationalen Zahlen, Potenzen …): Anzeige, Einlesen (auch gemischte Zahlen),
 * Antwortprüfung mit „vollständig gekürzt?“, Auswahloptionen.
 */
import { Bruch, ggT } from '../mathe/bruch';
import type { Zufall } from '../mathe/zufall';
import { RUECKMELDUNG } from './gemeinsam';
import type { Auswahloption, Bewertung, FehlertypCode, Formel } from './typen';

export interface FalscheZahl {
  readonly wert: Bruch;
  readonly fehlertyp: FehlertypCode;
  readonly rueckmeldung?: string;
}

/** Zahl als Formel: ganze Zahl, Bruch (\frac) oder – wenn gewünscht – Dezimalzahl mit Komma. */
export function zahlFormel(b: Bruch, dezimal = false): Formel {
  if (dezimal) {
    const d = b.alsDezimal();
    if (d) return { text: d, latex: d.replace('−', '-').replace(',', '{,}') };
  }
  const a = b.betrag();
  const t = a.istGanz() ? a.toString() : `${a.zaehler}/${a.nenner}`;
  const l = a.istGanz() ? a.toString() : `\\frac{${a.zaehler}}{${a.nenner}}`;
  return { text: (b.istNegativ() ? '−' : '') + t, latex: (b.istNegativ() ? '-' : '') + l };
}

/** Zahl als Faktor/Summand mit Klammer, wenn negativ: „(−3/4)“. */
export function zahlInKlammer(b: Bruch, dezimal = false): Formel {
  const f = zahlFormel(b, dezimal);
  return b.istNegativ() ? { text: `(${f.text})`, latex: `\\left(${f.latex}\\right)` } : f;
}

export interface Zahlantwort {
  readonly wert: Bruch;
  /** als Bruch eingegeben, aber nicht vollständig gekürzt (z. B. 6/8) */
  readonly ungekuerzt: boolean;
  /** roher Zähler/Nenner, falls als Bruch eingegeben */
  readonly roh?: { zaehler: bigint; nenner: bigint };
}

/**
 * Liest „3/4“, „−0,75“, „1 1/2“ (gemischte Zahl), „x = 5“, „= 12“.
 */
export function leseZahlantwort(eingabe: string): Zahlantwort | null {
  let s = eingabe.replace(/[−–]/g, '-').trim();
  s = s.replace(/^.*=\s*/, '').trim();
  const gemischt = /^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (gemischt) {
    const [, vz, g, z, n] = gemischt;
    if (BigInt(n!) === 0n) return null;
    const w = Bruch.von(BigInt(g!) * BigInt(n!) + BigInt(z!), BigInt(n!));
    return { wert: vz === '-' ? w.negiert() : w, ungekuerzt: ggT(BigInt(z!), BigInt(n!)) > 1n };
  }
  const bruch = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(s);
  if (bruch) {
    const z = BigInt(bruch[1]!);
    const n = BigInt(bruch[2]!);
    if (n === 0n) return null;
    return { wert: Bruch.von(z, n), ungekuerzt: ggT(z, n) > 1n, roh: { zaehler: z, nenner: n } };
  }
  const w = Bruch.parse(s);
  return w ? { wert: w, ungekuerzt: false } : null;
}

export function pruefeZahl(
  antwort: string,
  richtig: Bruch,
  fehler: readonly FalscheZahl[],
  opt: { gekuerztVerlangt?: boolean; rm?: Partial<Record<FehlertypCode, string>> } = {},
): Bewertung {
  const a = leseZahlantwort(antwort);
  if (!a) return { ergebnis: 'unlesbar', rueckmeldung: 'Gib eine Zahl ein, z. B. 12, −3/4 oder 0,5.' };
  if (a.wert.gleich(richtig)) {
    if (opt.gekuerztVerlangt && a.ungekuerzt) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Der Wert stimmt. Kürze den Bruch noch vollständig.' };
    return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
  }
  const f = fehler.find((x) => x.wert.gleich(a.wert));
  if (f) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung ?? opt.rm?.[f.fehlertyp] ?? RUECKMELDUNG[f.fehlertyp] };
  return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das stimmt noch nicht. Rechne Schritt für Schritt und prüfe jeden Zwischenschritt.' };
}

/** Entfernt Fehlantworten, die dem richtigen Wert oder einander gleichen. */
export function bereinigeZahlen(richtig: Bruch, liste: readonly FalscheZahl[]): FalscheZahl[] {
  const gesehen: Bruch[] = [richtig];
  return liste.filter((f) => {
    if (gesehen.some((g) => g.gleich(f.wert))) return false;
    gesehen.push(f.wert);
    return true;
  });
}

export function zahlOptionen(z: Zufall, richtig: Bruch, fehler: readonly FalscheZahl[], dezimal = false): Auswahloption[] {
  const ersteJeTyp = fehler.filter((f, i) => fehler.findIndex((g) => g.fehlertyp === f.fehlertyp) === i);
  const gewaehlt = [...ersteJeTyp, ...fehler.filter((f) => !ersteJeTyp.includes(f))].slice(0, 3);
  return z.gemischt([
    { formel: zahlFormel(richtig, dezimal), richtig: true },
    ...gewaehlt.map((f) => ({ formel: zahlFormel(f.wert, dezimal), richtig: false, fehlertyp: f.fehlertyp, ...(f.rueckmeldung ? { rueckmeldung: f.rueckmeldung } : {}) })),
  ]);
}
