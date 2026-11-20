import { describe, expect, it } from 'vitest';
import { Polynom } from '../mathe/polynom';
import { istNormalform, leseAlsPolynom, leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { produktForm } from './faktorisierung';
import { binomFaktorisieren as gen } from './t8-binom-faktorisieren';
import { gleichwertigDurchEinsetzen } from './test-hilfen';
import type { AFB, Aufgabentyp } from './typen';

const KOMB: [AFB, Aufgabentyp][] = [['II', 'eingabe'], ['II', 'auswahl'], ['III', 'eingabe'], ['III', 'auswahl']];
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

const linear = (p: Polynom) => p.gliederSortiert().every((g) => Object.values(g.monom).reduce((s, e) => s + e, 0) <= 1);
const ggtKoeff = (p: Polynom) => {
  const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
  return p.gliederSortiert().reduce((t, x) => g(t, Number(x.koeffizient.zaehler)), 0);
};

describe('t8-binom-faktorisieren', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit: Lösung gleichwertig zur Aufgabe; Aufgabe zusammengefasst', () => {
    const z = new Zufall(1);
    for (const a of aufgaben) {
      expect(gleichwertigDurchEinsetzen(a.aufgabe.text, a.loesung.text, z), `${a.aufgabe.text} | ${a.loesung.text}`).toBe(true);
      expect(istNormalform(leseTerm(a.aufgabe.text))).toBe(true);
    }
  });

  it('Lösung: zwei lineare Klammern ohne gemeinsamen Faktor; in AFB III ein Faktor davor', () => {
    for (const a of aufgaben) {
      const f = produktForm(leseTerm(a.loesung.text));
      expect(f.istProdukt).toBe(true);
      expect(f.klammern).toHaveLength(2);
      for (const k of f.klammern) {
        expect(linear(k)).toBe(true);
        expect(ggtKoeff(k)).toBe(1);
      }
      const faktor = f.faktor.alsKonstante()!;
      expect(faktor.betrag().gleich(1)).toBe(a.afb === 'II');
    }
  });

  it('Vielfalt', () => {
    for (const [afb, typ] of KOMB) {
      const t = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(t).size, `${afb}/${typ}`).toBeGreaterThan(afb === 'II' ? 300 : 60);
    }
  });

  it('Eingabe: andere Schreibweisen richtig; nicht faktorisiert bzw. nicht vollständig → unvollständig', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      const f = produktForm(leseTerm(a.loesung.text));
      const [k1, k2] = f.klammern;
      // Klammern vertauscht, Quadrat ausgeschrieben
      expect(a.pruefe(`${f.faktor.alsText()}·(${k2!.alsText()})·(${k1!.alsText()})`).ergebnis).toBe('richtig');
      // Vorzeichen in beiden Klammern umgedreht ändert nichts: (4 − x)·(4 − x) = (x − 4)²
      expect(a.pruefe(`${f.faktor.alsText()}·(${k1!.negiert().alsText()})·(${k2!.negiert().alsText()})`).ergebnis).toBe('richtig');
      expect(a.pruefe(a.aufgabe.text).ergebnis).toBe('unvollstaendig');
      if (a.afb === 'III') {
        // Faktor in die erste Klammer gezogen: 2·(x + 2) statt 2 davor → gemeinsamer Faktor in der Klammer
        expect(a.pruefe(`(${k1!.mal(f.faktor).alsText()})·(${k2!.alsText()})`).ergebnis).toBe('unvollstaendig');
      }
      expect(a.pruefe('z + 999').fehlertyp).toBe('UK');
    }
  });

  it('Auswahl: genau eine richtig, Fehloptionen falsch, verschieden und Produkte', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      const aufgabe = leseAlsPolynom(a.aufgabe.text)!;
      const werte = o.map((x) => leseAlsPolynom(x.formel.text)!);
      werte.forEach((w, i) => {
        expect(w.gleich(aufgabe)).toBe(o[i]!.richtig);
        expect(produktForm(leseTerm(o[i]!.formel.text)).istProdukt).toBe(true);
        for (let j = i + 1; j < werte.length; j++) expect(w.gleich(werte[j]!)).toBe(false);
        if (!o[i]!.richtig) expect(['VZ', 'PO', 'KL']).toContain(o[i]!.fehlertyp);
        expect(a.pruefe(String(i)).ergebnis).toBe(o[i]!.richtig ? 'richtig' : 'falsch');
      });
    }
  });

  it('Fehloptionen: VZ unterscheidet sich nur im Vorzeichen des Mittelglieds; KL nur um den Faktor', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const r = leseAlsPolynom(a.aufgabe.text)!;
      const k = produktForm(leseTerm(a.loesung.text)).faktor;
      for (const o of a.optionen!.filter((x) => !x.richtig)) {
        const p = leseAlsPolynom(o.formel.text)!;
        if (o.fehlertyp === 'VZ') expect(r.minus(p).anzahlGlieder()).toBe(1);
        if (o.fehlertyp === 'KL') expect(p.mal(k).gleich(r)).toBe(true);
      }
    }
  });

  it('Hilfen: jede Zeile gleichwertig, letzte Zeile ist die Lösung', () => {
    const z = new Zufall(2);
    for (const a of aufgaben) {
      const [l, r] = a.hilfen.ansatz.text.split(' = ');
      expect(l).toBe(a.aufgabe.text);
      expect(gleichwertigDurchEinsetzen(l!, r!, z), a.hilfen.ansatz.text).toBe(true);
      for (const zeile of a.hilfen.loesungsweg.slice(1)) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeile.text.slice(2), z), zeile.text).toBe(true);
      expect(a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text).toBe(`= ${a.loesung.text}`);
    }
  });
});
