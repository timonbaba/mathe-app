/**
 * Wandelt die Inhaltsdateien (inhalte/*.yaml) in eine JSON-Datei für App und Lern-Logik um:
 *   npm run inhalte
 * Ausgabe: src/inhalte/inhalte.json (wird eingecheckt; ein Test prüft, dass sie aktuell ist).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

export function inhalteAlsJson(): string {
  const bausteine: Record<string, unknown> = {};
  for (const f of readdirSync('inhalte/bausteine').filter((d) => d.endsWith('.yaml')).sort()) {
    Object.assign(bausteine, (parse(readFileSync(`inhalte/bausteine/${f}`, 'utf8')) as { bausteine: Record<string, unknown> }).bausteine);
  }
  const welten = ['inhalte/gym/kl8/lb1-terme-und-gleichungen.yaml'].map((f) => parse(readFileSync(f, 'utf8')));
  const fehlertypen = (parse(readFileSync('inhalte/fehlertypen.yaml', 'utf8')) as { fehlertypen: unknown }).fehlertypen;
  return JSON.stringify({ bausteine, welten, fehlertypen }, null, 1) + '\n';
}

if (process.argv[1]?.endsWith('inhalte-json.ts')) {
  writeFileSync('src/inhalte/inhalte.json', inhalteAlsJson());
  console.log('src/inhalte/inhalte.json geschrieben');
}
