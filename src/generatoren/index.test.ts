import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENERATOREN, REPARATUR_GENERATOREN } from './index';

/** Liest die Kl.-8-Bausteine (id, afb, ohne_hm) aus der Inhaltsdatei – ohne YAML-Bibliothek, zeilenweise. */
function bausteine(datei = 'inhalte/bausteine/kl8-terme-gleichungen.yaml', praefix = 't8-'): { id: string; afb: string[]; ohneHm: boolean }[] {
  const text = readFileSync(datei, 'utf8');
  const liste: { id: string; afb: string[]; ohneHm: boolean }[] = [];
  for (const block of text.split(new RegExp(`\\n(?=  ${praefix})`)).slice(1)) {
    const id = new RegExp(`^ {2}(${praefix}[\\w-]+):`).exec(block)![1]!;
    const afb = /afb: \[([^\]]*)\]/.exec(block)![1]!.split(',').map((s) => s.trim());
    const ohneHm = /ohne_hm: (true|false)/.exec(block)![1] === 'true';
    liste.push({ id, afb, ohneHm });
  }
  return liste;
}

describe('Generator-Verzeichnis und Inhaltsdateien passen zusammen', () => {
  const b = bausteine();

  it('26 Bausteine in Kl. 8, jeder hat genau einen Generator', () => {
    expect(b).toHaveLength(26);
    for (const x of b) expect(GENERATOREN.filter((g) => g.baustein === x.id), x.id).toHaveLength(1);
    expect(GENERATOREN).toHaveLength(26);
  });

  it('AFB-Stufen und „ohne Hilfsmittel“ stimmen mit den Inhaltsdateien überein', () => {
    for (const x of b) {
      const g = GENERATOREN.find((y) => y.baustein === x.id)!;
      expect([...g.afb].sort(), x.id).toEqual([...x.afb].sort());
      expect(g.ohneHilfsmittel, x.id).toBe(x.ohneHm);
    }
  });

  it('Generator-IDs sind eindeutig', () => {
    expect(new Set(GENERATOREN.map((g) => g.id)).size).toBe(GENERATOREN.length);
  });
});

describe('Reparatur-Generatoren passen zu den Voraussetzungs-Bausteinen (Kl. 5–7)', () => {
  const b = bausteine('inhalte/bausteine/voraussetzungen-kl5-7.yaml', 'v');
  it('jeder der 13 Bausteine hat genau einen Generator mit passenden AFB und „ohne Hilfsmittel“', () => {
    expect(b).toHaveLength(13);
    expect(REPARATUR_GENERATOREN).toHaveLength(13);
    for (const x of b) {
      const g = REPARATUR_GENERATOREN.filter((y) => y.baustein === x.id);
      expect(g, x.id).toHaveLength(1);
      expect([...g[0]!.afb].sort(), x.id).toEqual([...x.afb].sort());
      expect(g[0]!.ohneHilfsmittel, x.id).toBe(x.ohneHm);
    }
  });
});
