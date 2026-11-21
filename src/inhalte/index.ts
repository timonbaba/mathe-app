/**
 * Typisierter Zugriff auf die Lehrplan-Inhalte (erzeugt aus inhalte/*.yaml mit `npm run inhalte`).
 * Enthält KEINE personenbezogenen Daten.
 */
import daten from './inhalte.json';
import type { AFB, Darstellung, FehlertypCode } from '../generatoren/typen';

export interface BausteinInfo {
  readonly titel: string;
  readonly beschreibung?: string;
  readonly klasse: number;
  readonly afb: readonly AFB[];
  readonly ohne_hm: boolean;
  readonly darstellungen?: readonly Darstellung[];
  readonly fehlertypen: readonly FehlertypCode[];
  /** [Baustein-ID, 'notwendig' | 'hilfreich'] */
  readonly voraussetzungen: readonly (readonly [string, 'notwendig' | 'hilfreich'])[];
}

export interface LevelInfo {
  readonly id: string;
  readonly titel: string;
  readonly lernziel: string;
  readonly bausteine: readonly string[];
  readonly hinweis?: string;
}

export interface GeheimesLevelInfo {
  readonly id: string;
  readonly titel: string;
  readonly idee: string;
  readonly freischalten_durch: string;
}

export interface WeltInfo {
  readonly id: string;
  readonly titel: string;
  readonly welt_name: string;
  readonly klasse: number;
  readonly lernziele: Readonly<Record<string, { lehrplan: string; niveau: string }>>;
  readonly level: readonly LevelInfo[];
  readonly geheime_level: readonly GeheimesLevelInfo[];
}

export interface FehlertypInfo {
  readonly name: string;
  readonly beschreibung: string;
  readonly hinweis: string;
}

export const BAUSTEINE = daten.bausteine as unknown as Readonly<Record<string, BausteinInfo>>;
export const WELTEN = daten.welten as unknown as readonly WeltInfo[];
export const FEHLERTYPEN = daten.fehlertypen as unknown as Readonly<Record<FehlertypCode, FehlertypInfo>>;

/** Alle (direkten) Voraussetzungen eines Bausteins. */
export function voraussetzungen(id: string): readonly (readonly [string, 'notwendig' | 'hilfreich'])[] {
  return BAUSTEINE[id]?.voraussetzungen ?? [];
}
