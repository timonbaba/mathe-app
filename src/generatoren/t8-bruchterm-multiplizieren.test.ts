import { describe, expect, it } from 'vitest';
import { gemeinsamerZahlfaktor, rational } from '../mathe/bruchterm';
import { leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { bruchtermMultiplizieren as gen } from './t8-bruchterm-multiplizieren';
import { gleichwertigDurchEinsetzen } from './test-hilfen';

const KOMB = [['II', 'eingabe'], ['II', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

/** Unabhängig: keine Variable steht gleichzeitig im Zähler und im Nenner der Lösung. */
function gekuerzt(text: string): boolean {
  const r = rational(leseTerm(text));
  const vz = new Set(r.n.variablen());
  const gemeinsameVariable = r.d.variablen().some((v) => vz.has(v));
  return !gemeinsameVariable && gemeinsamerZahlfaktor(r) === 1n && r.n.anzahlGlieder() === 1 && r.d.anzahlGlieder() === 1;
}

describe('t8-bruchterm-multiplizieren', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit: Lösung gleichwertig (unabhängig durch Einsetzen), vollständig gekürzt', () => {
    const z = new Zufall(1);
    for (const a of aufgaben) {
      expect(gleichwertigDurchEinsetzen(a.aufgabe.text, a.loesung.text, z), `${a.aufgabe.text} | ${a.loesung.text}`).toBe(true);
      expect(gekuerzt(a.loesung.text), a.loesung.text).toBe(true);
    }
  });

  it('Multiplikation und Division kommen vor; Vielfalt', () => {
    expect(aufgaben.filter((a) => a.aufgabe.text.includes(' : ')).length).toBeGreaterThan(400);
    for (const [afb, typ] of KOMB) {
      const t = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(t).size / t.length).toBeGreaterThan(0.95);
    }
  });

  it('Eingabe: Lösung richtig, ungekürzt → unvollständig, Unsinn → unlesbar', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      // ungekürzter Zwischenschritt aus dem Lösungsweg
      const ungekuerzt = a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 3]!.text.replace(/^.* = |^= /, '');
      expect(a.pruefe(ungekuerzt).ergebnis, ungekuerzt).toBe('unvollstaendig');
      expect(a.pruefe('3x/(').ergebnis).toBe('unlesbar');
      expect(a.pruefe('z + 999').fehlertyp).toBe('UK');
    }
  });

  it('Auswahl: genau eine Option gleichwertig zur Lösung, alle verschieden, Fehlertypen gesetzt', () => {
    const z = new Zufall(2);
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      o.forEach((x, i) => {
        expect(gleichwertigDurchEinsetzen(a.loesung.text, x.formel.text, z), `${a.aufgabe.text} | ${x.formel.text}`).toBe(x.richtig);
        if (!x.richtig) expect(['BR', 'PO']).toContain(x.fehlertyp);
        for (let j = i + 1; j < o.length; j++) expect(gleichwertigDurchEinsetzen(x.formel.text, o[j]!.formel.text, z)).toBe(false);
        expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
      });
    }
  });

  it('Hilfen: Rechenzeilen gleichwertig, Hinweis auf ausgeschlossene Werte', () => {
    const z = new Zufall(3);
    for (const a of aufgaben) {
      const weg = a.hilfen.loesungsweg;
      expect(weg[weg.length - 1]!.text).toMatch(/^Hinweis: Das gilt nur für .* ≠ 0/);
      expect(weg[weg.length - 2]!.text).toBe(`= ${a.loesung.text}`);
      const [l, r] = weg[0]!.text.split(' = ');
      expect(l).toBe(a.aufgabe.text);
      expect(gleichwertigDurchEinsetzen(l!, r!, z)).toBe(true);
      for (const zeile of weg.slice(1, -1)) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeile.text.slice(2), z)).toBe(true);
    }
  });
});
