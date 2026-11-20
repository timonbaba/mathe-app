import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { termGleichwertig as gen } from './t8-term-gleichwertig';
import { gleichwertigDurchEinsetzen, werteAus } from './test-hilfen';

const N = 1000;
const fehlerFinden = Array.from({ length: N }, (_, s) => gen.erzeuge(s, { afb: 'II', typ: 'fehler-finden' }));
const gegenbeispiel = Array.from({ length: N }, (_, s) => gen.erzeuge(s, { afb: 'III', typ: 'eingabe' }));
const loesungsZeile = (text: string) => Number(/Zeile (\d+)/.exec(text)![1]) - 1;

describe('t8-term-gleichwertig', () => {
  it('Determinismus', () => {
    for (let s = 0; s < 50; s++) {
      for (const w of [{ afb: 'II', typ: 'fehler-finden' }, { afb: 'III', typ: 'eingabe' }] as const) {
        const a = gen.erzeuge(s, w);
        const b = gen.erzeuge(s, w);
        expect(JSON.stringify({ ...a, pruefe: 0 })).toBe(JSON.stringify({ ...b, pruefe: 0 }));
      }
    }
  });

  it('lehnt nicht angebotene Kombinationen ab', () => {
    expect(() => gen.erzeuge(1, { afb: 'I' })).toThrow();
    expect(() => gen.erzeuge(1, { afb: 'II', typ: 'eingabe' })).toThrow();
  });

  describe('Finde den Fehler (AFB II)', () => {
    it('Zeilen vor dem Fehler stimmen, die Fehlerzeile nicht, danach wird folgerichtig weitergerechnet', () => {
      const z = new Zufall(1);
      for (const a of fehlerFinden) {
        const k = loesungsZeile(a.loesung.text);
        const zeilen = a.zeilen!;
        expect(zeilen.length).toBeGreaterThanOrEqual(2);
        for (let i = 0; i < k; i++) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeilen[i]!.text, z), `${a.aufgabe.text} | ${zeilen[i]!.text}`).toBe(true);
        expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeilen[k]!.text, z), `${a.aufgabe.text} | ${zeilen[k]!.text}`).toBe(false);
        for (let i = k + 1; i < zeilen.length; i++) expect(gleichwertigDurchEinsetzen(zeilen[k]!.text, zeilen[i]!.text, z)).toBe(true);
      }
    });

    it('Fehler kommen in verschiedenen Zeilen vor und haben passende Fehlertypen', () => {
      const positionen = new Map<number, number>();
      for (const a of fehlerFinden) {
        const k = loesungsZeile(a.loesung.text);
        positionen.set(k, (positionen.get(k) ?? 0) + 1);
        const b = a.pruefe(String(k === 0 ? 1 : 0));
        expect(['KL', 'VZ', 'PO']).toContain(b.fehlertyp);
      }
      for (const k of [0, 1, 2]) expect(positionen.get(k) ?? 0, `Zeile ${k + 1}`).toBeGreaterThan(50);
    });

    it('Antwortprüfung', () => {
      for (const a of fehlerFinden) {
        const k = loesungsZeile(a.loesung.text);
        a.zeilen!.forEach((_, i) => expect(a.pruefe(String(i)).ergebnis).toBe(i === k ? 'richtig' : 'falsch'));
        expect(a.pruefe(String(a.zeilen!.length)).ergebnis).toBe('unlesbar');
        expect(a.pruefe('x').ergebnis).toBe('unlesbar');
      }
    });

    it('Hilfen: „Richtig wäre“ ist gleichwertig zur Aufgabe, folgende Zeilen ebenfalls', () => {
      const z = new Zufall(2);
      for (const a of fehlerFinden) {
        expect(a.hilfen.denkanstoss.length).toBeGreaterThan(20);
        // Probe im Ansatz: der Wert der Aufgabe stimmt
        const m = /Probe mit (\w) = (-?\d+): Die Aufgabe hat den Wert (−?\d+), Zeile 1 hat den Wert (−?\d+)\./.exec(a.hilfen.ansatz.text)!;
        expect(m, a.hilfen.ansatz.text).not.toBeNull();
        const bel = { [m[1]!]: Bruch.von(Number(m[2])) };
        expect(werteAus(leseTerm(a.aufgabe.text), bel).alsText()).toBe(m[3]);
        expect(werteAus(leseTerm(a.zeilen![0]!.text), bel).alsText()).toBe(m[4]);
        const [, ...rest] = a.hilfen.loesungsweg;
        const richtig = rest[0]!.text.replace('Richtig wäre: = ', '');
        expect(gleichwertigDurchEinsetzen(a.aufgabe.text, richtig, z)).toBe(true);
        for (const zeile of rest.slice(1)) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeile.text.slice(2), z)).toBe(true);
      }
    });

    it('Vielfalt', () => {
      expect(new Set(fehlerFinden.map((a) => a.aufgabe.text + a.zeilen!.map((x) => x.text).join())).size / N).toBeGreaterThan(0.95);
    });
  });

  describe('Gegenbeispiel (AFB III)', () => {
    const seiten = (text: string) => text.split(' = ') as [string, string];
    const variable = (a: { loesung: { text: string } }) => a.loesung.text.split(' = ')[0]!;

    it('die Behauptung ist wirklich falsch, und die Musterlösung ist ein Gegenbeispiel (unabhängig geprüft)', () => {
      const z = new Zufall(3);
      for (const a of gegenbeispiel) {
        const [l, r] = seiten(a.aufgabe.text);
        expect(gleichwertigDurchEinsetzen(l, r, z), a.aufgabe.text).toBe(false);
        const v = variable(a);
        const x = Bruch.parse(a.loesung.text.split(' = ')[1]!)!;
        expect(werteAus(leseTerm(l), { [v]: x }).gleich(werteAus(leseTerm(r), { [v]: x }))).toBe(false);
      }
    });

    it('Antwortprüfung: Gegenbeispiele richtig, Werte mit gleichem Ergebnis falsch, verschiedene Schreibweisen', () => {
      let gleicheGefunden = 0;
      for (const a of gegenbeispiel) {
        const [l, r] = seiten(a.aufgabe.text);
        const v = variable(a);
        const wert = a.loesung.text.split(' = ')[1]!;
        expect(a.pruefe(wert).ergebnis).toBe('richtig');
        expect(a.pruefe(`${v} = ${wert}`).ergebnis).toBe('richtig');
        expect(a.pruefe('abc').ergebnis).toBe('unlesbar');
        for (let x = -10; x <= 10; x++) {
          const gleich = werteAus(leseTerm(l), { [v]: Bruch.von(x) }).gleich(werteAus(leseTerm(r), { [v]: Bruch.von(x) }));
          expect(a.pruefe(String(x)).ergebnis).toBe(gleich ? 'falsch' : 'richtig');
          if (gleich) gleicheGefunden++;
        }
      }
      expect(gleicheGefunden).toBeGreaterThan(100); // die Falle „x = 0 passt zufällig“ kommt vor
    });

    it('Hilfen: „Richtig wäre“ ist eine wahre Gleichung', () => {
      const z = new Zufall(4);
      for (const a of gegenbeispiel) {
        const letzte = a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text.replace('Richtig wäre: ', '');
        const [l, r] = seiten(letzte);
        expect(gleichwertigDurchEinsetzen(l, r, z), letzte).toBe(true);
      }
    });

    it('Vielfalt', () => {
      expect(new Set(gegenbeispiel.map((a) => a.aufgabe.text)).size / N).toBeGreaterThan(0.8);
    });
  });
});
