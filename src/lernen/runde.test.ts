import { describe, expect, it } from 'vitest';
import { GENERATOREN, REPARATUR_GENERATOREN } from '../generatoren';
import { WELTEN } from '../inhalte';
import type { FehlerEinordnung, Meisterung } from './bewertung';
import { faelligeWiederholungen, reparaturVorschlag, stelleRundeZusammen } from './runde';

const alle = [...GENERATOREN, ...REPARATUR_GENERATOREN];
const generatorFuer = (b: string) => alle.find((g) => g.baustein === b);
const m = (stufe: Meisterung['stufe'], extra: Partial<Meisterung> = {}): Meisterung => ({ stufe, wert: 0, auffrischen: false, naechsteWiederholung: 0, ...extra });

describe('Runde zusammenstellen', () => {
  it('für jedes Level: 8 verschiedene, erzeugbare Aufgaben aus den Level-Bausteinen', () => {
    for (const level of WELTEN[0]!.level) {
      const r = stelleRundeZusammen({ bausteine: level.bausteine, generatorFuer, meisterungVon: () => m('neu'), seed: 1 });
      expect(r, level.titel).toHaveLength(8);
      for (const x of r) expect(level.bausteine).toContain(x.aufgabe.baustein);
      expect(new Set(r.map((x) => x.aufgabe.aufgabe.text + x.aufgabe.typ)).size).toBe(8);
    }
  });

  it('deterministisch bei gleichem Seed, verschieden bei anderem', () => {
    const e = { bausteine: WELTEN[0]!.level[1]!.bausteine, generatorFuer, meisterungVon: () => m('in Arbeit'), seed: 7 };
    const a = stelleRundeZusammen(e).map((x) => x.aufgabe.aufgabe.text);
    expect(stelleRundeZusammen(e).map((x) => x.aufgabe.aufgabe.text)).toEqual(a);
    expect(stelleRundeZusammen({ ...e, seed: 8 }).map((x) => x.aufgabe.aufgabe.text)).not.toEqual(a);
  });

  it('neue Bausteine beginnen mit der niedrigsten AFB-Stufe; sichere bekommen meist die höchste', () => {
    const b = ['t8-ausmultiplizieren-monom'];
    const neu = stelleRundeZusammen({ bausteine: b, generatorFuer, meisterungVon: () => m('neu'), seed: 3, laenge: 10 });
    expect(neu.every((x) => x.aufgabe.afb === 'I')).toBe(true);
    const sicher = stelleRundeZusammen({ bausteine: b, generatorFuer, meisterungVon: () => m('sicher'), seed: 3, laenge: 10 });
    expect(sicher.filter((x) => x.aufgabe.afb === 'II').length).toBeGreaterThanOrEqual(5);
  });

  it('bekannte Aufgaben werden nicht wiederholt', () => {
    const e = { bausteine: ['t8-zusammenfassen'], generatorFuer, meisterungVon: () => m('neu'), seed: 5 };
    const erste = stelleRundeZusammen(e);
    const bekannt = new Set(erste.map((x) => `${x.aufgabe.generator}:${x.aufgabe.seed}`));
    const zweite = stelleRundeZusammen({ ...e, bekannt });
    for (const x of zweite) expect(bekannt.has(`${x.aufgabe.generator}:${x.aufgabe.seed}`)).toBe(false);
  });

  it('Wiederholungen und Reparatur werden eingestreut', () => {
    const r = stelleRundeZusammen({
      bausteine: WELTEN[0]!.level[6]!.bausteine,
      generatorFuer,
      meisterungVon: () => m('in Arbeit'),
      wiederholungen: ['t8-ausklammern', 't8-zusammenfassen'],
      reparatur: { baustein: 'v7-zahl-mal-summe', fehlertyp: 'KL', ausBaustein: 't8-gleichung-klammern' },
      seed: 2,
    });
    expect(r).toHaveLength(8);
    expect(r.filter((x) => x.grund === 'wiederholung')).toHaveLength(2);
    expect(r.filter((x) => x.grund === 'reparatur')).toHaveLength(1);
    expect(r[1]!.grund).toBe('reparatur');
  });
});

describe('Reparatur-Vorschlag über das Voraussetzungs-Netz', () => {
  const sys = (baustein: string, fehlertyp: FehlerEinordnung['fehlertyp']): FehlerEinordnung => ({ baustein, fehlertyp, einordnung: 'systematisch', anzahl: 2, zuletzt: 1 });

  it('Klammerfehler bei Gleichungen mit Klammern → „Zahl mal Klammer“ (Kl. 7) bzw. Produkt mal Klammer', () => {
    const r = reparaturVorschlag([sys('t8-gleichung-klammern', 'KL')], () => 'in Arbeit');
    expect(r).not.toBeNull();
    expect(['t8-ausmultiplizieren-monom', 'v7-zahl-mal-summe', 'v7-gleichung-linear']).toContain(r!.baustein);
  });

  it('Vorzeichenfehler beim Ausmultiplizieren → Rechnen mit negativen Zahlen', () => {
    const r = reparaturVorschlag([sys('v7-zahl-mal-summe', 'VZ')], () => 'in Arbeit');
    expect(r!.baustein).toBe('v7-rational-multiplizieren');
  });

  it('gemeisterte Voraussetzungen werden übersprungen; flüchtige Fehler lösen nichts aus', () => {
    const r = reparaturVorschlag([sys('v7-zahl-mal-summe', 'VZ')], (b) => (b === 'v7-rational-multiplizieren' ? 'gemeistert' : 'in Arbeit'));
    expect(r?.baustein).not.toBe('v7-rational-multiplizieren');
    expect(reparaturVorschlag([{ ...sys('v7-zahl-mal-summe', 'VZ'), einordnung: 'flüchtig' }], () => 'neu')).toBeNull();
  });
});

describe('Fällige Wiederholungen', () => {
  it('nur sichere/gemeisterte, deren Termin erreicht ist; älteste zuerst', () => {
    const daten: Record<string, Meisterung> = { a: m('sicher', { naechsteWiederholung: 5 }), b: m('gemeistert', { naechsteWiederholung: 2 }), c: m('in Arbeit'), d: m('sicher', { naechsteWiederholung: 50 }) };
    expect(faelligeWiederholungen(['a', 'b', 'c', 'd'], (x) => daten[x]!, 10)).toEqual(['b', 'a']);
  });
});
