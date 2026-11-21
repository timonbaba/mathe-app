/**
 * Pflichttests für Gleichungs-Generatoren (CLAUDE.md, Arbeitsregel 3). Nur in Tests verwenden.
 * Die Korrektheit wird unabhängig vom Generator geprüft: Die Aufgabe wird gelesen und
 * L − R als Funktion von x an mehreren Stellen exakt ausgewertet.
 */
import { expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { gleicheMenge, leseLoesungsmenge, mengeFormel, type Loesungsmenge } from '../mathe/loesungsmenge';
import { leseTerm } from '../mathe/term-parser';
import { werteAus } from './test-hilfen';
import type { AFB, Aufgabe, Aufgabentyp, FehlertypCode, Generator } from './typen';

/** f(x) = linke Seite − rechte Seite, unabhängig ausgewertet. */
export function differenz(gleichung: string, v: string): (x: Bruch) => Bruch {
  const [l, r] = gleichung.split(' = ');
  const kl = leseTerm(l!);
  const kr = leseTerm(r!);
  return (x) => werteAus(kl, { [v]: x }).minus(werteAus(kr, { [v]: x }));
}

/** Unabhängig bestimmte Lösungsmenge einer linearen Gleichung (f muss linear sein). */
export function unabhaengigeLoesung(gleichung: string, v: string): Loesungsmenge {
  const f = differenz(gleichung, v);
  const f0 = f(Bruch.von(0));
  const f1 = f(Bruch.von(1));
  const f2 = f(Bruch.von(2));
  const f7 = f(Bruch.von(-7, 3));
  // Linearität prüfen: gleiche Steigung zwischen allen Stellen
  const m = f1.minus(f0);
  expect(f2.minus(f1).gleich(m), `nicht linear: ${gleichung}`).toBe(true);
  expect(f7.minus(f0).gleich(m.mal(Bruch.von(-7, 3))), `nicht linear: ${gleichung}`).toBe(true);
  if (m.istNull()) return f0.istNull() ? { art: 'alle' } : { art: 'leer' };
  return { art: 'endlich', werte: [f0.negiert().durch(m)] };
}

/** Variable aus der Anweisung („… nach x auf …“ bzw. „(Variable x)“). */
export const variableVon = (a: Aufgabe): string => /(?:Variable|nach) ([a-zA-Z])\b/.exec(a.anweisung)![1]!;

export interface GleichungsOptionen {
  readonly kombinationen: readonly (readonly [AFB, Aufgabentyp])[];
  readonly fehlertypen: readonly FehlertypCode[];
  readonly variable: (a: Aufgabe) => string;
  readonly mindestVerschieden: number;
}

export function pflichttestsGleichung(gen: Generator, o: GleichungsOptionen): Aufgabe[] {
  const aufgaben = o.kombinationen.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

  it('Determinismus', () => {
    for (const [afb, typ] of o.kombinationen) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Masse und Metadaten', () => {
    for (const a of aufgaben) {
      expect(a.generator).toBe(gen.id);
      expect(gen.afb).toContain(a.afb);
    }
  });

  it('Korrektheit: Lösungsmenge stimmt mit der unabhängig berechneten überein', () => {
    for (const a of aufgaben) {
      const v = o.variable(a);
      const m = unabhaengigeLoesung(a.aufgabe.text, v);
      expect(a.loesung.text, a.aufgabe.text).toBe(mengeFormel(m).text);
    }
  });

  it('Vielfalt', () => {
    for (const [afb, typ] of o.kombinationen) {
      const t = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(t).size, `${afb}/${typ}`).toBeGreaterThanOrEqual(o.mindestVerschieden);
    }
  });

  const eingabe = aufgaben.filter((a) => a.typ === 'eingabe');
  if (eingabe.length) {
    it('Eingabe: verschiedene Schreibweisen der Lösung werden akzeptiert', () => {
      for (const a of eingabe) {
        const v = o.variable(a);
        const m = leseLoesungsmenge(a.loesung.text, v)!;
        expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
        if (m.art === 'endlich') {
          const w = m.werte[0]!;
          expect(a.pruefe(`${v} = ${w.alsText()}`).ergebnis).toBe('richtig');
          expect(a.pruefe(w.alsText()).ergebnis).toBe('richtig');
          const d = w.alsDezimal();
          if (d) expect(a.pruefe(`${v} = ${d}`).ergebnis).toBe('richtig');
          expect(a.pruefe(`${v} = ${w.plus(1).alsText()}`).ergebnis).toBe('falsch');
        }
        expect(a.pruefe('abc').ergebnis).toBe('unlesbar');
      }
    });
  }

  const auswahl = aufgaben.filter((a) => a.typ === 'auswahl');
  if (auswahl.length) {
    it('Auswahl: 3–4 verschiedene Lösungsmengen, genau eine richtig, Fehlertypen gesetzt', () => {
      for (const a of auswahl) {
        const v = o.variable(a);
        const opts = a.optionen!;
        expect(opts.length).toBeGreaterThanOrEqual(3);
        expect(opts.length).toBeLessThanOrEqual(4);
        const mengen = opts.map((x) => leseLoesungsmenge(x.formel.text, v)!);
        const richtig = leseLoesungsmenge(a.loesung.text, v)!;
        mengen.forEach((m, i) => {
          expect(gleicheMenge(m, richtig)).toBe(opts[i]!.richtig);
          for (let j = i + 1; j < mengen.length; j++) expect(gleicheMenge(m, mengen[j]!)).toBe(false);
          if (!opts[i]!.richtig) expect(o.fehlertypen).toContain(opts[i]!.fehlertyp);
          expect(a.pruefe(String(i)).ergebnis).toBe(opts[i]!.richtig ? 'richtig' : 'falsch');
        });
      }
    });
  }

  it('Hilfen: jede Zeile des Lösungswegs hat dieselbe Lösungsmenge; letzte Zeile = Lösung', () => {
    for (const a of aufgaben) {
      const v = o.variable(a);
      const richtig = unabhaengigeLoesung(a.aufgabe.text, v);
      const weg = a.hilfen.loesungsweg;
      expect(weg[weg.length - 1]!.text).toBe(a.loesung.text);
      for (const zeile of weg.slice(0, -1)) {
        const gl = zeile.text.split('   ')[0]!;
        if (gl.startsWith('L =') || /^Seiten/.test(gl)) continue;
        const m = new RegExp(`^${v} = (.+)$`).exec(gl);
        if (m && !/[a-zA-Z]/.test(m[1]!)) {
          expect(richtig.art).toBe('endlich');
          continue;
        }
        expect(gleicheMenge(unabhaengigeLoesung(gl, v), richtig), `${a.aufgabe.text} | ${gl}`).toBe(true);
      }
      expect(a.hilfen.denkanstoss.length).toBeGreaterThan(20);
    }
  });

  return aufgaben;
}
