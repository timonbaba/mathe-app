/**
 * Testvorbereitung (SPEC 9.4) und Vorschlag für die nächste Stunde (SPEC 9.5).
 * Reine Logik; Startwerte nach SPEC, nach dem Pilot zu überprüfen.
 */
import type { FehlerEinordnung, Meisterung } from './bewertung';
import { TAG } from './bewertung';
import { reparaturVorschlag } from './runde';

const RANG: Record<Meisterung['stufe'], number> = { neu: 0, 'in Arbeit': 1, sicher: 2, gemeistert: 3 };

/** Schwächste Bausteine zuerst (Stufe, dann Punkteanteil). */
export function nachSchwaeche(bausteine: readonly string[], meisterungVon: (b: string) => Meisterung): string[] {
  return [...bausteine].sort((a, b) => {
    const ma = meisterungVon(a);
    const mb = meisterungVon(b);
    return RANG[ma.stufe] - RANG[mb.stufe] || ma.wert - mb.wert || a.localeCompare(b);
  });
}

export interface PlanTag {
  /** Tagesbeginn (Zeitpunkt) */
  readonly tag: number;
  readonly bausteine: readonly string[];
  readonly probeArbeit: boolean;
}

/**
 * Countdown-Plan bis zum Test: höchstens zwei Bausteine pro Tag, Schwächen zuerst,
 * jeder Baustein wird in Abständen wiederholt (nach 1, 3 und 7 Tagen, soweit Zeit bleibt).
 * Probe-Arbeit 2–3 Tage vor dem Termin (bei genügend Vorlauf). Der Plan ist ein Angebot.
 */
export function testplan(testTermin: number, themen: readonly string[], meisterungVon: (b: string) => Meisterung, jetzt: number): PlanTag[] {
  const heute = Math.floor(jetzt / TAG) * TAG;
  const tage = Math.floor((testTermin - heute) / TAG); // Tage bis zum Test (Testtag nicht mitgezählt)
  if (tage <= 0) return [];
  const plan: string[][] = Array.from({ length: tage }, () => []);
  const probeTag = tage >= 4 ? tage - 3 : tage >= 2 ? tage - 2 : -1;
  const reihenfolge = nachSchwaeche(themen, meisterungVon).filter((b) => meisterungVon(b).stufe !== 'gemeistert' || meisterungVon(b).auffrischen);
  const gemeistert = themen.filter((b) => !reihenfolge.includes(b));
  const abstaende = [0, 1, 3, 7];
  let start = 0;
  for (const b of reihenfolge) {
    // ersten freien Tag suchen, dann in Abständen wiederholen
    while (start < tage && (plan[start]!.length >= 2 || start === probeTag)) start++;
    if (start >= tage) break;
    for (const d of abstaende) {
      const t = start + d;
      if (t >= tage) break;
      if (t !== probeTag && plan[t]!.length < 2 && !plan[t]!.includes(b)) plan[t]!.push(b);
    }
  }
  // gemeisterte Themen einmal kurz vor dem Test auffrischen
  for (const b of gemeistert) {
    for (let t = tage - 1; t >= 0; t--) {
      if (t !== probeTag && plan[t]!.length < 2) {
        plan[t]!.push(b);
        break;
      }
    }
  }
  return plan.map((bausteine, i) => ({ tag: heute + i * TAG, bausteine, probeArbeit: i === probeTag }));
}

export type Bereitschaft =
  | { readonly art: 'bereit' }
  | { readonly art: 'fast bereit'; readonly luecken: readonly string[] }
  | { readonly art: 'Lücke'; readonly luecken: readonly string[] };

/**
 * Einschätzung (SPEC 9.4, Startwerte):
 *  bereit: alle Test-Bausteine mind. „sicher“ und Probe-Arbeit ≥ 80 %
 *  fast bereit: höchstens 2 Bausteine unter „sicher“ oder Probe-Arbeit 60–79 %
 *  Lücke bei X: sonst (X = schwächste Bausteine)
 */
export function einschaetzung(themen: readonly string[], meisterungVon: (b: string) => Meisterung, probeArbeit?: number): Bereitschaft {
  const unterSicher = nachSchwaeche(themen, meisterungVon).filter((b) => RANG[meisterungVon(b).stufe] < RANG.sicher);
  const probeGut = probeArbeit !== undefined && probeArbeit >= 0.8;
  const probeMittel = probeArbeit !== undefined && probeArbeit >= 0.6;
  if (unterSicher.length === 0 && probeGut) return { art: 'bereit' };
  if (unterSicher.length <= 2 && (probeMittel || probeArbeit === undefined)) return { art: 'fast bereit', luecken: unterSicher };
  return { art: 'Lücke', luecken: unterSicher.slice(0, 3) };
}

export interface Termin {
  readonly datum: number;
  readonly themen: readonly string[];
  readonly bezeichnung: string;
}
export interface ZuweisungStatus {
  readonly titel: string;
  readonly frist: number;
  readonly erledigt: boolean;
}

export interface StundenPunkt {
  readonly art: 'systematischer Fehler' | 'Test' | 'Zuweisung überfällig' | 'nächstes Thema';
  readonly text: string;
  readonly bausteine: readonly string[];
}

/**
 * Regelbasierter Vorschlag für die nächste Nachhilfestunde (SPEC 9.5), höchstens 3 Punkte:
 *  1. systematischer Fehler (neuester) + passender Reparatur-Baustein
 *  2. Test in ≤ 14 Tagen mit Lücke
 *  3. überfällige Zuweisungen
 *  4. nächstes noch nicht gemeistertes Level im aktuellen Lernbereich
 */
export function stundenVorschlag(p: {
  fehler: readonly FehlerEinordnung[];
  meisterungVon: (b: string) => Meisterung;
  titelVon: (b: string) => string;
  tests: readonly Termin[];
  zuweisungen: readonly ZuweisungStatus[];
  levelReihenfolge: readonly { titel: string; bausteine: readonly string[] }[];
  jetzt: number;
}): StundenPunkt[] {
  const punkte: StundenPunkt[] = [];
  const sys = p.fehler.filter((f) => f.einordnung === 'systematisch').sort((a, b) => b.zuletzt - a.zuletzt)[0];
  if (sys) {
    const rep = reparaturVorschlag([sys], (b) => p.meisterungVon(b).stufe);
    punkte.push({
      art: 'systematischer Fehler',
      text: `Wiederkehrender Fehler (${sys.fehlertyp}) bei „${p.titelVon(sys.baustein)}“` + (rep ? ` – Grundlage üben: „${p.titelVon(rep.baustein)}“.` : '.'),
      bausteine: rep ? [sys.baustein, rep.baustein] : [sys.baustein],
    });
  }
  const test = p.tests.filter((t) => t.datum >= p.jetzt && t.datum - p.jetzt <= 14 * TAG).sort((a, b) => a.datum - b.datum)[0];
  if (test) {
    const e = einschaetzung(test.themen, p.meisterungVon);
    if (e.art !== 'bereit' && e.luecken.length) {
      const tageBis = Math.ceil((test.datum - p.jetzt) / TAG);
      punkte.push({ art: 'Test', text: `${test.bezeichnung} in ${tageBis} Tag${tageBis === 1 ? '' : 'en'}: Lücken bei ${e.luecken.map((b) => `„${p.titelVon(b)}“`).join(', ')}.`, bausteine: e.luecken });
    }
  }
  const ueberfaellig = p.zuweisungen.filter((z) => !z.erledigt && z.frist < p.jetzt);
  if (ueberfaellig.length) punkte.push({ art: 'Zuweisung überfällig', text: `Überfällig: ${ueberfaellig.map((z) => `„${z.titel}“`).join(', ')} – kurz besprechen, woran es hing.`, bausteine: [] });
  const naechstes = p.levelReihenfolge.find((l) => l.bausteine.some((b) => p.meisterungVon(b).stufe !== 'gemeistert'));
  if (naechstes && punkte.length < 3) punkte.push({ art: 'nächstes Thema', text: `Nächstes Level: „${naechstes.titel}“.`, bausteine: naechstes.bausteine });
  return punkte.slice(0, 3);
}
