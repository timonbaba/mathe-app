import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inhalteAlsJson } from '../../werkzeuge/inhalte-json';
import { BAUSTEINE, FEHLERTYPEN, WELTEN } from './index';

describe('Inhalte (JSON)', () => {
  it('ist aktuell (sonst `npm run inhalte` ausführen)', () => {
    expect(readFileSync('src/inhalte/inhalte.json', 'utf8')).toBe(inhalteAlsJson());
  });
  it('enthält Bausteine, eine Welt mit 13 Leveln und 12 Fehlertypen', () => {
    expect(Object.keys(BAUSTEINE)).toHaveLength(39);
    expect(WELTEN[0]!.level).toHaveLength(13);
    expect(Object.keys(FEHLERTYPEN)).toHaveLength(12);
    for (const l of WELTEN[0]!.level) for (const b of l.bausteine) expect(BAUSTEINE[b], b).toBeDefined();
  });
});
