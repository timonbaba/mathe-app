/**
 * Zusammenstellung einer Runde (SPEC 8.3): 5–10 Aufgaben, adaptiv nach Meisterung,
 * mit fälligen Wiederholungen und ggf. einem Reparatur-Baustein (über das Voraussetzungs-Netz).
 */
import { BAUSTEINE, voraussetzungen } from '../inhalte';
import { Zufall } from '../mathe/zufall';
import type { AFB, Aufgabe, Aufgabentyp, FehlertypCode, Generator } from '../generatoren/typen';
import type { FehlerEinordnung, Meisterung } from './bewertung';

export interface RundenAufgabe {
  readonly aufgabe: Aufgabe;
  readonly grund: 'level' | 'wiederholung' | 'reparatur';
}

export interface Reparatur {
  /** Voraussetzungs-Baustein, der geübt werden soll */
  readonly baustein: string;
  readonly fehlertyp: FehlertypCode;
  /** Baustein, in dem der systematische Fehler aufgetreten ist */
  readonly ausBaustein: string;
}

/**
 * Sucht für systematische Fehler einen passenden Voraussetzungs-Baustein (SPEC 4.2):
 * Breitensuche über die Voraussetzungen (notwendige zuerst, bis Tiefe 3); geeignet ist ein
 * Baustein, in dem derselbe Fehlertyp typisch ist und der noch nicht gemeistert ist.
 */
export function reparaturVorschlag(fehler: readonly FehlerEinordnung[], stufeVon: (b: string) => Meisterung['stufe']): Reparatur | null {
  const systematisch = fehler.filter((f) => f.einordnung === 'systematisch').sort((a, b) => b.zuletzt - a.zuletzt);
  for (const f of systematisch) {
    let ebene = [f.baustein];
    const gesehen = new Set(ebene);
    for (let tiefe = 0; tiefe < 3; tiefe++) {
      const naechste: string[] = [];
      for (const b of ebene) {
        const vs = [...voraussetzungen(b)].sort((x, y) => (x[1] === y[1] ? 0 : x[1] === 'notwendig' ? -1 : 1));
        for (const [id] of vs) {
          if (gesehen.has(id)) continue;
          gesehen.add(id);
          naechste.push(id);
          const info = BAUSTEINE[id];
          if (info && info.fehlertypen.includes(f.fehlertyp) && stufeVon(id) !== 'gemeistert') {
            return { baustein: id, fehlertyp: f.fehlertyp, ausBaustein: f.baustein };
          }
        }
      }
      ebene = naechste;
    }
  }
  return null;
}

/** Bausteine, deren Wiederholung fällig ist (sicher/gemeistert/auffrischen), am längsten fällige zuerst. */
export function faelligeWiederholungen(bausteine: readonly string[], meisterungVon: (b: string) => Meisterung, jetzt: number): string[] {
  return bausteine
    .map((b) => ({ b, m: meisterungVon(b) }))
    .filter(({ m }) => (m.stufe === 'sicher' || m.stufe === 'gemeistert' || m.auffrischen) && m.naechsteWiederholung <= jetzt)
    .sort((x, y) => x.m.naechsteWiederholung - y.m.naechsteWiederholung)
    .map(({ b }) => b);
}

const GEWICHT: Record<Meisterung['stufe'], number> = { neu: 3, 'in Arbeit': 4, sicher: 2, gemeistert: 1 };
const RANG: Record<AFB, number> = { I: 1, II: 2, III: 3 };

/** Passender Anforderungsbereich zur Meisterungsstufe (Schwierigkeit steigt mit der Meisterung). */
function afbFuer(z: Zufall, gen: Generator, m: Meisterung): AFB {
  const angebot = [...gen.afb].sort((a, b) => RANG[a] - RANG[b]);
  const niedrig = angebot[0]!;
  const hoch = angebot[angebot.length - 1]!;
  switch (m.stufe) {
    case 'neu': return niedrig;
    case 'in Arbeit': return z.mitWahrscheinlichkeit(0.6) ? niedrig : angebot[Math.min(1, angebot.length - 1)]!;
    case 'sicher': return z.mitWahrscheinlichkeit(0.6) ? hoch : z.auswahl(angebot);
    case 'gemeistert': return z.auswahl(angebot);
  }
}

export interface RundenEingabe {
  /** Bausteine des aktuellen Levels */
  readonly bausteine: readonly string[];
  readonly generatorFuer: (baustein: string) => Generator | undefined;
  readonly meisterungVon: (baustein: string) => Meisterung;
  /** fällige Wiederholungen aus anderen Leveln */
  readonly wiederholungen?: readonly string[];
  readonly reparatur?: Reparatur | null;
  /** bereits bearbeitete Aufgaben („generator:seed“) – werden nicht erneut gestellt */
  readonly bekannt?: ReadonlySet<string>;
  readonly laenge?: number;
  readonly seed: number;
}

/** Erzeugt eine Aufgabe für einen Baustein; probiert passende Typen, bis der Generator sie anbietet. */
function aufgabeFuer(z: Zufall, gen: Generator, afb: AFB, bekannt: Set<string>, texte: Set<string>): Aufgabe | null {
  const typen = z.gemischt([...gen.typen]) as Aufgabentyp[];
  for (let versuch = 0; versuch < 20; versuch++) {
    const seed = z.ganzzahl(0, 2 ** 31 - 1);
    if (bekannt.has(`${gen.id}:${seed}`)) continue;
    for (const typ of typen) {
      let a: Aufgabe;
      try {
        a = gen.erzeuge(seed, { afb, typ });
      } catch {
        continue; // Kombination wird nicht angeboten
      }
      const schluessel = a.aufgabe.text + '|' + a.typ;
      if (texte.has(schluessel)) break; // gleiche Aufgabe schon in der Runde → anderer Seed
      texte.add(schluessel);
      bekannt.add(`${gen.id}:${seed}`);
      return a;
    }
  }
  return null;
}

/**
 * Stellt eine Runde zusammen. Reihenfolge: Level-Aufgaben, dazwischen (Position 3 und 6)
 * Wiederholungen, an Position 2 ggf. die Reparatur-Aufgabe.
 */
export function stelleRundeZusammen(e: RundenEingabe): RundenAufgabe[] {
  const z = new Zufall(e.seed);
  const laenge = Math.max(5, Math.min(10, e.laenge ?? 8));
  const bekannt = new Set(e.bekannt ?? []);
  const texte = new Set<string>();
  const wiederholungen = (e.wiederholungen ?? []).filter((b) => !e.bausteine.includes(b)).slice(0, 2);
  const reparatur = e.reparatur ?? null;
  const anzahlLevel = laenge - wiederholungen.length - (reparatur ? 1 : 0);

  // Level-Aufgaben: gewichtet nach Meisterung, höchstens 3 je Baustein
  const verfuegbar = e.bausteine.filter((b) => e.generatorFuer(b));
  if (verfuegbar.length === 0) throw new Error('Keine Generatoren für die Bausteine dieses Levels');
  const zaehler = new Map<string, number>();
  const level: RundenAufgabe[] = [];
  for (let i = 0; i < anzahlLevel * 3 && level.length < anzahlLevel; i++) {
    const kandidaten = verfuegbar.filter((b) => (zaehler.get(b) ?? 0) < 3);
    const pool = kandidaten.length ? kandidaten : verfuegbar;
    const gewichte = pool.map((b) => GEWICHT[e.meisterungVon(b).stufe] + (e.meisterungVon(b).auffrischen ? 1 : 0));
    let r = z.naechste() * gewichte.reduce((s, x) => s + x, 0);
    let b = pool[0]!;
    for (let j = 0; j < pool.length; j++) {
      r -= gewichte[j]!;
      if (r < 0) { b = pool[j]!; break; }
    }
    const gen = e.generatorFuer(b)!;
    const a = aufgabeFuer(z, gen, afbFuer(z, gen, e.meisterungVon(b)), bekannt, texte);
    if (a) {
      level.push({ aufgabe: a, grund: 'level' });
      zaehler.set(b, (zaehler.get(b) ?? 0) + 1);
    }
  }
  // leichtere Aufgaben zuerst
  level.sort((x, y) => RANG[x.aufgabe.afb] - RANG[y.aufgabe.afb]);

  const extra = (b: string, grund: RundenAufgabe['grund']): RundenAufgabe | null => {
    const gen = e.generatorFuer(b);
    if (!gen) return null;
    const a = aufgabeFuer(z, gen, afbFuer(z, gen, e.meisterungVon(b)), bekannt, texte);
    return a ? { aufgabe: a, grund } : null;
  };
  const runde = [...level];
  if (reparatur) {
    const r = extra(reparatur.baustein, 'reparatur');
    if (r) runde.splice(Math.min(1, runde.length), 0, r);
  }
  wiederholungen.forEach((b, i) => {
    const w = extra(b, 'wiederholung');
    if (w) runde.splice(Math.min(2 + 3 * i, runde.length), 0, w);
  });
  return runde.slice(0, laenge);
}
