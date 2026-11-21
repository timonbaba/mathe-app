import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENERATOREN } from './index';

/** Liest die Kl.-8-Bausteine (id, afb, ohne_hm) aus der Inhaltsdatei – ohne YAML-Bibliothek, zeilenweise. */
function bausteine(): { id: string; afb: string[]; ohneHm: boolean }[] {
  const text = readFileSync('inhalte/bausteine/kl8-terme-gleichungen.yaml', 'utf8');
  const liste: { id: string; afb: string[]; ohneHm: boolean }[] = [];
  for (const block of text.split(/\n(?=  t8-)/).slice(1)) {
    const id = /^ {2}(t8-[\w-]+):/.exec(block)![1]!;
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
