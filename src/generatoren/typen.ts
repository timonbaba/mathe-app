/**
 * Gemeinsame Typen aller Aufgabengeneratoren (SPEC Abschnitt 5).
 */

export type AFB = 'I' | 'II' | 'III';
export type Darstellung = 'symbolisch' | 'grafisch' | 'tabelle' | 'text';
export type Aufgabentyp = 'eingabe' | 'auswahl' | 'zuordnen' | 'ordnen' | 'fehler-finden' | 'schaetzen' | 'graph';

/** Codes aus inhalte/fehlertypen.yaml (Version 1). */
export type FehlertypCode = 'VZ' | 'KL' | 'ZF' | 'VR' | 'BR' | 'PO' | 'UM' | 'EH' | 'DA' | 'TV' | 'RE' | 'UK';

import type { Formel } from '../mathe/formel';
export type { Formel };

export interface Bewertung {
  /**
   * richtig        – Wert und geforderte Form stimmen
   * unvollstaendig – Wert stimmt, aber Form nicht (z. B. noch nicht zusammengefasst);
   *                  zählt nicht als Fehler, Schüler darf weiterrechnen
   * falsch         – Wert stimmt nicht
   * unlesbar       – Eingabe ist kein gültiger Term; zählt nicht als Versuch
   */
  readonly ergebnis: 'richtig' | 'unvollstaendig' | 'falsch' | 'unlesbar';
  readonly fehlertyp?: FehlertypCode;
  readonly rueckmeldung: string;
}

export interface Auswahloption {
  readonly formel: Formel;
  readonly richtig: boolean;
  /** Bei falschen Optionen: der Fehler, der genau diese Antwort erzeugt. */
  readonly fehlertyp?: FehlertypCode;
  /** Optional: genauere Rückmeldung als der Standardtext des Fehlertyps. */
  readonly rueckmeldung?: string;
}

export interface Hilfen {
  /** Stufe 1: Hinweis ohne Rechnung */
  readonly denkanstoss: string;
  /** Stufe 2: erster Schritt vorgemacht */
  readonly ansatz: Formel;
  /** Stufe 3: vollständiger Lösungsweg, Zeile für Zeile; letzte Zeile endet mit der Lösung */
  readonly loesungsweg: readonly Formel[];
}

export interface Aufgabe {
  readonly generator: string;
  readonly version: number;
  readonly seed: number;
  readonly baustein: string;
  readonly afb: AFB;
  readonly darstellung: Darstellung;
  readonly typ: Aufgabentyp;
  readonly ohneHilfsmittel: boolean;
  /** Arbeitsauftrag, z. B. „Multipliziere aus.“ */
  readonly anweisung: string;
  /** Der Term / die Gleichung der Aufgabe. */
  readonly aufgabe: Formel;
  readonly loesung: Formel;
  readonly hilfen: Hilfen;
  /** Nur bei typ 'auswahl': Optionen in Anzeigereihenfolge. */
  readonly optionen?: readonly Auswahloption[];
  /**
   * Nur bei typ 'fehler-finden': die vorgerechneten Zeilen nach der Aufgabe
   * (jeweils ohne führendes „=“). Antwort ist der Index der ersten falschen Zeile.
   */
  readonly zeilen?: readonly Formel[];
  /** Optional: Grafik als SVG-Text (selbst erzeugt; Farben über CSS-Variablen, damit hell/dunkel funktioniert). */
  readonly grafik?: string;
  /** Optional: Wertetabelle; eine Zelle mit „?“ ist gesucht. */
  readonly tabelle?: { readonly kopf: readonly string[]; readonly zeilen: readonly (readonly string[])[] };
  /**
   * Prüft eine Antwort. Bei 'eingabe' die Schülereingabe als Text,
   * bei 'auswahl' der Index der gewählten Option als Text ("0", "1", …),
   * bei 'fehler-finden' der Index der gewählten Zeile als Text.
   */
  pruefe(antwort: string): Bewertung;
}

export interface Wunsch {
  readonly afb?: AFB;
  readonly typ?: Aufgabentyp;
}

export interface Generator {
  readonly id: string;
  /** Steigt bei jeder inhaltlichen Änderung; alte Versuche bleiben über (id, version, seed) reproduzierbar. */
  readonly version: number;
  readonly baustein: string;
  readonly afb: readonly AFB[];
  readonly darstellungen: readonly Darstellung[];
  readonly typen: readonly Aufgabentyp[];
  readonly ohneHilfsmittel: boolean;
  erzeuge(seed: number, wunsch?: Wunsch): Aufgabe;
}

export class GeneratorFehler extends Error {}

/**
 * Anzeige-Schreibweise (Entscheidung 20.11.2026, SPEC 5.5): kein Malpunkt innerhalb eines
 * Glieds (3xy), aber Malpunkt vor/zwischen Klammern (−2a·(5b² − 3a)). Zentral umschaltbar.
 */
export const ANZEIGE = { malpunkt: false } as const;
