/**
 * Bewertung nach Meisterung (SPEC Abschnitt 6, Startwerte vom 20.11.2026) und
 * Fehlereinordnung flüchtig/systematisch (SPEC Abschnitt 7).
 *
 * Reine Logik ohne Oberfläche und Datenbank. Zeitangaben in Millisekunden (Date.now()).
 */
import type { AFB, Aufgabentyp, Darstellung, FehlertypCode } from '../generatoren/typen';

/** Ein gespeicherter Versuch (nur Ergebnisse, die zählen: richtig oder falsch). */
export interface Versuch {
  readonly baustein: string;
  readonly generator: string;
  readonly version: number;
  readonly seed: number;
  readonly afb: AFB;
  readonly darstellung: Darstellung;
  readonly typ: Aufgabentyp;
  readonly richtig: boolean;
  readonly fehlertyp?: FehlertypCode;
  /** höchste genutzte Hilfestufe: 0 = keine, 1 = Denkanstoß, 2 = Ansatz, 3 = Lösungsweg */
  readonly hilfeStufe: 0 | 1 | 2 | 3;
  readonly zeitpunkt: number;
  readonly rundeId: string;
}

export type Stufe = 'neu' | 'in Arbeit' | 'sicher' | 'gemeistert';

export const TAG = 24 * 60 * 60 * 1000;

/** Startwerte (SPEC 6/7) – zentral, damit sie nach dem Pilot leicht angepasst werden können. */
export const PARAMETER = {
  fensterSicher: 8,
  anteilSicher: 0.8,
  abstandBestaetigungTage: 2,
  bestaetigungAnzahl: 3,
  auffrischenNachTagen: 28,
  systematischAnzahl: 2,
  systematischFenster: 5,
  systematischRundenFenster: 10,
  sterne: [0.6, 0.8, 1] as const,
} as const;

/** Punkte eines Versuchs (SPEC 6.1). */
export function punkte(v: Pick<Versuch, 'richtig' | 'hilfeStufe'>): number {
  if (!v.richtig) return 0;
  return [1, 0.75, 0.5, 0][v.hilfeStufe]!;
}

/** Sterne einer Runde (SPEC 6.3): ★ ab 60 %, ★★ ab 80 %, ★★★ bei 100 %. */
export function sterne(versuche: readonly Pick<Versuch, 'richtig' | 'hilfeStufe'>[]): 0 | 1 | 2 | 3 {
  if (versuche.length === 0) return 0;
  const anteil = versuche.reduce((s, v) => s + punkte(v), 0) / versuche.length;
  if (anteil >= PARAMETER.sterne[2]) return 3;
  if (anteil >= PARAMETER.sterne[1]) return 2;
  if (anteil >= PARAMETER.sterne[0]) return 1;
  return 0;
}

export interface BausteinMeta {
  /** AFB-Stufen, die der Generator anbietet */
  readonly afb: readonly AFB[];
  /** Darstellungen, die der Generator anbietet */
  readonly darstellungen: readonly Darstellung[];
}

export interface Meisterung {
  readonly stufe: Stufe;
  /** Punkteanteil der letzten Versuche (0–1) */
  readonly wert: number;
  /** Zeitpunkt, ab dem der Baustein gemeistert ist */
  readonly gemeistertAm?: number;
  /** gemeistert, aber lange nicht geübt bzw. neue systematische Fehler → wird wiederholt */
  readonly auffrischen: boolean;
  /** Vorschlag für die nächste Wiederholung (Zeitpunkt) */
  readonly naechsteWiederholung: number;
  readonly letzteUebung?: number;
}

const afbRang: Record<AFB, number> = { I: 1, II: 2, III: 3 };

/** Ist das Fenster (letzte n Versuche bis Index i) „sicher“? */
function istSicher(versuche: readonly Versuch[], ende: number, meta: BausteinMeta): boolean {
  const n = PARAMETER.fensterSicher;
  if (ende + 1 < n) return false;
  const fenster = versuche.slice(ende + 1 - n, ende + 1);
  const anteil = fenster.reduce((s, v) => s + punkte(v), 0) / n;
  if (anteil < PARAMETER.anteilSicher) return false;
  // mindestens eine Aufgabe auf AFB II (bzw. der höchsten angebotenen Stufe, wenn nur AFB I)
  const ziel = meta.afb.some((a) => afbRang[a] >= 2) ? 2 : 1;
  if (!fenster.some((v) => afbRang[v.afb] >= ziel)) return false;
  // mindestens zwei verschiedene Darstellungen (wenn der Baustein mehrere anbietet)
  const darst = new Set(fenster.map((v) => v.darstellung));
  if (meta.darstellungen.length >= 2 && darst.size < 2) return false;
  return true;
}

/**
 * Meisterung eines Bausteins aus seinen Versuchen (zeitlich sortiert oder nicht).
 * SPEC 6.2: sicher = letzte 8 Versuche ≥ 80 %, inkl. AFB II und 2 Darstellungen;
 * gemeistert = sicher + an einem späteren Tag (≥ 2 Tage) 3 von 3 richtig ohne Hilfe.
 */
export function meisterung(alle: readonly Versuch[], meta: BausteinMeta, jetzt: number, systematischSeit?: number): Meisterung {
  const v = [...alle].sort((a, b) => a.zeitpunkt - b.zeitpunkt);
  if (v.length === 0) return { stufe: 'neu', wert: 0, auffrischen: false, naechsteWiederholung: jetzt };
  const letzte = v[v.length - 1]!.zeitpunkt;
  const fenster = v.slice(-PARAMETER.fensterSicher);
  const wert = fenster.reduce((s, x) => s + punkte(x), 0) / fenster.length;

  // erster Zeitpunkt, an dem „sicher“ erreicht wurde
  let sicherAb = -1;
  for (let i = 0; i < v.length; i++) if (istSicher(v, i, meta)) { sicherAb = i; break; }

  let gemeistertAm: number | undefined;
  if (sicherAb >= 0) {
    const frueheste = v[sicherAb]!.zeitpunkt + PARAMETER.abstandBestaetigungTage * TAG;
    let serie = 0;
    for (let i = sicherAb + 1; i < v.length; i++) {
      const x = v[i]!;
      if (x.zeitpunkt < frueheste) continue;
      serie = x.richtig && x.hilfeStufe === 0 ? serie + 1 : 0;
      if (serie >= PARAMETER.bestaetigungAnzahl) {
        gemeistertAm = x.zeitpunkt;
        break;
      }
    }
  }

  const aktuellSicher = istSicher(v, v.length - 1, meta);
  if (gemeistertAm !== undefined) {
    const lange = jetzt - letzte > PARAMETER.auffrischenNachTagen * TAG;
    const neueFehler = systematischSeit !== undefined && systematischSeit > gemeistertAm;
    if (lange || neueFehler) return { stufe: 'sicher', wert, gemeistertAm, auffrischen: true, naechsteWiederholung: jetzt, letzteUebung: letzte };
    return { stufe: 'gemeistert', wert, gemeistertAm, auffrischen: false, naechsteWiederholung: letzte + 14 * TAG, letzteUebung: letzte };
  }
  if (sicherAb >= 0 && (aktuellSicher || wert >= PARAMETER.anteilSicher)) {
    // Bestätigung frühestens nach dem Mindestabstand
    const frueheste = v[sicherAb]!.zeitpunkt + PARAMETER.abstandBestaetigungTage * TAG;
    return { stufe: 'sicher', wert, auffrischen: false, naechsteWiederholung: Math.max(frueheste, letzte), letzteUebung: letzte };
  }
  return { stufe: 'in Arbeit', wert, auffrischen: false, naechsteWiederholung: jetzt, letzteUebung: letzte };
}

export interface FehlerEinordnung {
  readonly baustein: string;
  readonly fehlertyp: FehlertypCode;
  readonly einordnung: 'flüchtig' | 'systematisch';
  readonly anzahl: number;
  readonly zuletzt: number;
}

/**
 * SPEC 7.1 b: systematisch, wenn derselbe Fehlertyp im selben Baustein ≥ 2-mal in den letzten
 * 5 Versuchen vorkommt oder (innerhalb der letzten 10 Versuche) in 2 verschiedenen Runden.
 * „UK“ (unklassifiziert) wird nie als systematisch eingeordnet.
 */
export function fehlerEinordnen(alle: readonly Versuch[]): FehlerEinordnung[] {
  const nachBaustein = new Map<string, Versuch[]>();
  for (const v of alle) nachBaustein.set(v.baustein, [...(nachBaustein.get(v.baustein) ?? []), v]);
  const ergebnis: FehlerEinordnung[] = [];
  for (const [baustein, liste] of nachBaustein) {
    const v = [...liste].sort((a, b) => a.zeitpunkt - b.zeitpunkt);
    const typen = new Set(v.filter((x) => !x.richtig && x.fehlertyp).map((x) => x.fehlertyp!));
    for (const t of typen) {
      const mitTyp = v.filter((x) => x.fehlertyp === t && !x.richtig);
      const letzte5 = v.slice(-PARAMETER.systematischFenster).filter((x) => x.fehlertyp === t && !x.richtig).length;
      const runden = new Set(v.slice(-PARAMETER.systematischRundenFenster).filter((x) => x.fehlertyp === t && !x.richtig).map((x) => x.rundeId)).size;
      const systematisch = t !== 'UK' && (letzte5 >= PARAMETER.systematischAnzahl || runden >= 2);
      ergebnis.push({ baustein, fehlertyp: t, einordnung: systematisch ? 'systematisch' : 'flüchtig', anzahl: mitTyp.length, zuletzt: mitTyp[mitTyp.length - 1]!.zeitpunkt });
    }
  }
  return ergebnis;
}
