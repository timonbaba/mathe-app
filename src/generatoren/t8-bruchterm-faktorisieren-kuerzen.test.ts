import { describe, expect, it } from 'vitest';
import { gemeinsamerZahlfaktor, gesamtgrad, rational } from '../mathe/bruchterm';
import { leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { bruchtermFaktorisierenKuerzen as gen } from './t8-bruchterm-faktorisieren-kuerzen';
import { gleichwertigDurchEinsetzen } from './test-hilfen';

const KOMB = [['III', 'eingabe'], ['III', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

describe('t8-bruchterm-faktorisieren-kuerzen', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit: Lösung gleichwertig (unabhängig), deutlich einfacher und ohne gemeinsamen Zahlfaktor', () => {
    const z = new Zufall(1);
    for (const a of aufgaben) {
      expect(gleichwertigDurchEinsetzen(a.aufgabe.text, a.loesung.text, z), `${a.aufgabe.text} | ${a.loesung.text}`).toBe(true);
      const l = rational(leseTerm(a.loesung.text));
      expect(gemeinsamerZahlfaktor(l), a.loesung.text).toBe(1n);
      expect(gesamtgrad(l)).toBeLessThan(gesamtgrad(rational(leseTerm(a.aufgabe.text))));
    }
  });

  it('alle fünf Formen kommen vor; Vielfalt', () => {
    const t = aufgaben.map((a) => a.aufgabe.text);
    expect(t.filter((x) => /^\d+·\(|^\(\d+·|^\([a-z]/.test(x) && x.includes('²')).length).toBeGreaterThan(100);
    expect(aufgaben.filter((a) => a.loesung.text.startsWith('1/(')).length).toBeGreaterThan(100);
    expect(aufgaben.filter((a) => /^\d+(\/\d+)?$/.test(a.loesung.text)).length).toBeGreaterThan(100);
    for (const [afb, typ] of KOMB) {
      const s = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(s).size).toBeGreaterThan(600);
    }
  });

  it('Eingabe: Lösung richtig, Aufgabe abgeschrieben → unvollständig, Fehlantworten typisiert', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      expect(a.pruefe(a.aufgabe.text).ergebnis).toBe('unvollstaendig');
      expect(a.pruefe('3x/(').ergebnis).toBe('unlesbar');
    }
  });

  it('Auswahl: genau eine Option gleichwertig zur Lösung, alle verschieden', () => {
    const z = new Zufall(2);
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      o.forEach((x, i) => {
        expect(gleichwertigDurchEinsetzen(a.loesung.text, x.formel.text, z), `${a.aufgabe.text} | ${x.formel.text}`).toBe(x.richtig);
        if (!x.richtig) expect(['BR', 'VZ', 'PO']).toContain(x.fehlertyp);
        for (let j = i + 1; j < o.length; j++) expect(gleichwertigDurchEinsetzen(x.formel.text, o[j]!.formel.text, z)).toBe(false);
        expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
      });
    }
  });

  it('Hilfen: Rechenzeilen gleichwertig, Hinweis auf ausgeschlossene Werte stimmt', () => {
    const z = new Zufall(3);
    for (const a of aufgaben) {
      const weg = a.hilfen.loesungsweg;
      const h = weg[weg.length - 1]!.text;
      expect(h).toMatch(/^Hinweis: /);
      const m = /für (\w) ≠ (−?[\d/]+)/.exec(h);
      if (m) {
        // an der ausgeschlossenen Stelle ist die Aufgabe wirklich nicht definiert
        expect(() => gleichwertigDurchEinsetzen(a.aufgabe.text.replace(new RegExp(m[1]!, 'g'), `(${m[2]!.replace('−', '-')})`), '0', z)).toThrow();
      }
      expect(weg[weg.length - 2]!.text).toBe(`= ${a.loesung.text}`);
      for (const zeile of weg.slice(1, -1)) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeile.text.slice(2), z)).toBe(true);
    }
  });
});
