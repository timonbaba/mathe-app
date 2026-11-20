/**
 * Erzeugt Beispielaufgaben je Generator zur Sichtprüfung durch Timon:
 *   npm run beispiele
 * Ausgabe: beispiele/<generator-id>.md (wird mit eingecheckt).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { GENERATOREN } from './index';
import type { AFB, Aufgabentyp } from './typen';

const ZEICHEN_JE_TYP: Record<string, string> = { eingabe: 'Eingabe', auswahl: 'Auswahl', 'fehler-finden': 'Finde den Fehler' };

function anzahlKombinationen(g: (typeof GENERATOREN)[number]): number {
  let n = 0;
  for (const afb of g.afb) for (const typ of g.typen) { try { g.erzeuge(0, { afb, typ }); n++; } catch { /* nicht angeboten */ } }
  return n;
}

mkdirSync('beispiele', { recursive: true });
for (const g of GENERATOREN) {
  const zeilen: string[] = [
    `# Beispiele: ${g.id} (Version ${g.version})`,
    '',
    '> Automatisch erzeugt mit `npm run beispiele`. Bitte nicht von Hand bearbeiten.',
    '> Zur Sichtprüfung: Stimmen Aufgaben, Lösungen, Hilfen und Fehloptionen? Wirkt der Schwierigkeitsgrad passend?',
    '',
  ];
  let nr = 0;
  for (const afb of g.afb as AFB[]) {
    for (const typ of g.typen as Aufgabentyp[]) {
      // nur angebotene Kombinationen (manche Generatoren koppeln Typ und AFB)
      try { g.erzeuge(0, { afb, typ }); } catch { continue; }
      zeilen.push(`## AFB ${afb} · ${ZEICHEN_JE_TYP[typ] ?? typ}`, '');
      // insgesamt ca. 20 Beispiele je Generator, gleichmäßig auf AFB und Aufgabentypen verteilt
      const jeKombination = Math.ceil(20 / anzahlKombinationen(g));
      for (let seed = 0; seed < jeKombination; seed++) {
        const a = g.erzeuge(seed, { afb, typ });
        nr++;
        zeilen.push(`### ${nr}. ${a.anweisung}  (Seed ${seed})`, '');
        if (a.grafik) {
          mkdirSync('beispiele/grafiken', { recursive: true });
          const datei = `grafiken/${g.id}-${nr}.svg`;
          writeFileSync(`beispiele/${datei}`, a.grafik);
          zeilen.push(`![Grafik](${datei})`, '');
        }
        zeilen.push(`**Aufgabe:** ${a.aufgabe.text}`, '');
        if (a.tabelle) {
          zeilen.push(`| ${a.tabelle.kopf.join(' | ')} |`, `|${a.tabelle.kopf.map(() => '---').join('|')}|`);
          for (const z of a.tabelle.zeilen) zeilen.push(`| ${z.join(' | ')} |`);
          zeilen.push('');
        }
        if (a.zeilen) {
          a.zeilen.forEach((z, i) => zeilen.push(`${i + 1}. = ${z.text}`));
          zeilen.push('');
        }
        if (a.optionen) {
          a.optionen.forEach((o, i) => zeilen.push(`- ${String.fromCharCode(65 + i)}) ${o.formel.text}${o.richtig ? '  ✅ richtig' : `  ❌ Fehlertyp ${o.fehlertyp}`}`));
          zeilen.push('');
        }
        zeilen.push(`**Lösung:** ${a.loesung.text}`, '');
        zeilen.push(`<details><summary>Hilfen</summary>`, '');
        zeilen.push(`1. **Denkanstoß:** ${a.hilfen.denkanstoss}`);
        zeilen.push(`2. **Ansatz:** ${a.hilfen.ansatz.text}`);
        zeilen.push(`3. **Lösungsweg:**`);
        for (const z of a.hilfen.loesungsweg) zeilen.push(`   - ${z.text}`);
        zeilen.push('', '</details>', '');
      }
    }
  }
  writeFileSync(`beispiele/${g.id}.md`, zeilen.join('\n'));
  console.log(`beispiele/${g.id}.md (${nr} Aufgaben)`);
}
