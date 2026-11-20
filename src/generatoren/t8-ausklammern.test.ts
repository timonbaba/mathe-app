import { describe, expect, it } from 'vitest';
import { Polynom } from '../mathe/polynom';
import { istNormalform, leseAlsPolynom, leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { produktForm } from './faktorisierung';
import { ausklammern as gen } from './t8-ausklammern';
import { gleichwertigDurchEinsetzen } from './test-hilfen';
import type { AFB, Aufgabentyp } from './typen';

const KOMB: [AFB, Aufgabentyp][] = [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']];
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

/** Unabhängig: ggT der Koeffizienten und gemeinsame Variablen eines Polynoms. */
function gemeinsamesUnabhaengig(p: Polynom): { zahl: number; vars: string[] } {
  const gl = p.gliederSortiert();
  const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
  const zahl = gl.reduce((t, x) => g(t, Number(x.koeffizient.zaehler)), 0);
  const vars = p.variablen().filter((v) => gl.every((x) => (x.monom[v] ?? 0) > 0));
  return { zahl, vars };
}

describe('t8-ausklammern', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit: Lösung ist gleichwertig zur Aufgabe (unabhängig durch Einsetzen)', () => {
    const z = new Zufall(1);
    for (const a of aufgaben) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, a.loesung.text, z), `${a.aufgabe.text} | ${a.loesung.text}`).toBe(true);
  });

  it('Aufgabe ist eine zusammengefasste Summe mit echtem gemeinsamem Faktor', () => {
    for (const a of aufgaben) {
      expect(istNormalform(leseTerm(a.aufgabe.text))).toBe(true);
      const p = leseAlsPolynom(a.aufgabe.text)!;
      expect(p.anzahlGlieder()).toBeGreaterThanOrEqual(2);
      const g = gemeinsamesUnabhaengig(p);
      expect(g.zahl > 1 || g.vars.length > 0, a.aufgabe.text).toBe(true);
      if (a.afb === 'II') expect(g.vars.length, a.aufgabe.text).toBeGreaterThan(0);
    }
  });

  it('Lösung: Faktor mal genau eine Klammer, vollständig ausgeklammert', () => {
    for (const a of aufgaben) {
      const f = produktForm(leseTerm(a.loesung.text));
      expect(f.istProdukt).toBe(true);
      expect(f.klammern).toHaveLength(1);
      const innen = gemeinsamesUnabhaengig(f.klammern[0]!);
      expect(innen.zahl, a.loesung.text).toBe(1);
      expect(innen.vars, a.loesung.text).toEqual([]);
      // Klammer beginnt mit positivem Glied
      expect(a.loesung.text).toMatch(/\((?!−)/);
    }
  });

  it('Zahlenbereiche: Koeffizienten ≤ 81, Hochzahlen ≤ 4', () => {
    for (const a of aufgaben) for (const g of leseAlsPolynom(a.aufgabe.text)!.gliederSortiert()) {
      expect(g.koeffizient.betrag().vergleiche(81)).toBeLessThanOrEqual(0);
      for (const e of Object.values(g.monom)) expect(e).toBeLessThanOrEqual(4);
    }
  });

  it('Vielfalt', () => {
    for (const [afb, typ] of KOMB) {
      const t = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(t).size / t.length).toBeGreaterThan(0.9);
    }
  });

  it('negative Faktoren kommen in AFB II vor', () => {
    expect(aufgaben.filter((a) => a.afb === 'II' && a.loesung.text.startsWith('−')).length).toBeGreaterThan(200);
  });

  it('Eingabe: Lösung, andere Schreibweisen und Vorzeichen-Alternative sind richtig', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      expect(a.pruefe(a.loesung.text.replace(/·/g, '*')).ergebnis).toBe('richtig');
      const f = produktForm(leseTerm(a.loesung.text));
      // Klammer zuerst, Faktor danach
      expect(a.pruefe(`(${f.klammern[0]!.alsText()})·${f.faktor.alsText()}`).ergebnis).toBe('richtig');
      // Vorzeichen-Alternative: −F·(K) = F·(−K)
      expect(a.pruefe(`${f.faktor.negiert().alsText()}·(${f.klammern[0]!.negiert().alsText()})`).ergebnis).toBe('richtig');
    }
  });

  it('Eingabe: „1 vergessen“ wird als KL erkannt (z. B. 5m² − 5m = 5m·m)', () => {
    let geprueft = 0;
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const f = produktForm(leseTerm(a.loesung.text));
      const innen = f.klammern[0]!.gliederSortiert();
      const eins = innen.findIndex((g) => g.koeffizient.betrag().gleich(1) && Object.keys(g.monom).length === 0);
      if (eins < 0) continue;
      const ohne = innen.filter((_, i) => i !== eins).map((g) => Polynom.glied(g.koeffizient, g.monom).alsText()).join(' + ');
      const b = a.pruefe(`${f.faktor.alsText()}·(${ohne})`);
      expect(b.fehlertyp, `${a.aufgabe.text} → ${f.faktor.alsText()}·(${ohne})`).toBe('KL');
      geprueft++;
    }
    expect(geprueft).toBeGreaterThan(50);
  });

  it('Eingabe: unvollständig ausgeklammert, nicht ausgeklammert, Unsinn', () => {
    let teilweise = 0;
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.aufgabe.text).ergebnis).toBe('unvollstaendig');
      expect(a.pruefe('3x+(').ergebnis).toBe('unlesbar');
      expect(a.pruefe('z + 999').fehlertyp).toBe('UK');
      const f = produktForm(leseTerm(a.loesung.text));
      const k = Number(f.faktor.gliederSortiert()[0]!.koeffizient.betrag().zaehler);
      const p = [2, 3, 5, 7].find((q) => k % q === 0 && q < k);
      if (p) {
        // nur einen Teil der Zahl ausklammern, z. B. 2·(6x + 9) statt 6·(2x + 3)
        const rest = leseAlsPolynom(a.aufgabe.text)!.mal(Polynom.zahl(1)).gliederSortiert().map((g) => Polynom.glied(g.koeffizient.durch(p), g.monom).alsText()).join(' + ');
        expect(a.pruefe(`${p}·(${rest})`).ergebnis, `${a.aufgabe.text} → ${p}·(${rest})`).toBe('unvollstaendig');
        teilweise++;
      }
    }
    expect(teilweise).toBeGreaterThan(300);
  });

  it('Auswahl: 3–4 verschiedene Optionen, genau eine richtig, Fehloptionen sind falsch und typisiert', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.length).toBeLessThanOrEqual(4);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      const aufgabe = leseAlsPolynom(a.aufgabe.text)!;
      const werte = o.map((x) => leseAlsPolynom(x.formel.text)!);
      for (let i = 0; i < werte.length; i++) {
        expect(werte[i]!.gleich(aufgabe)).toBe(o[i]!.richtig);
        expect(produktForm(leseTerm(o[i]!.formel.text)).istProdukt).toBe(true);
        for (let j = i + 1; j < werte.length; j++) expect(werte[i]!.gleich(werte[j]!)).toBe(false);
      }
      o.forEach((x, i) => {
        if (!x.richtig) expect(['KL', 'PO', 'VZ']).toContain(x.fehlertyp);
        expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
      });
    }
  });

  it('Auswahl: Fehloptionen entstehen durch ihren Fehler (unabhängig nachgebildet)', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const aufgabe = leseAlsPolynom(a.aufgabe.text)!.gliederSortiert();
      const richtig = produktForm(leseTerm(a.loesung.text));
      for (const x of a.optionen!.filter((q) => !q.richtig)) {
        const f = produktForm(leseTerm(x.formel.text));
        expect(f.faktor.gleich(richtig.faktor)).toBe(true); // gleicher Faktor davor
        const innen = f.klammern[0]!.gliederSortiert();
        if (x.fehlertyp === 'PO') {
          // Variablen in der Klammer wie in der Aufgabe (Hochzahlen nicht verringert)
          const m = (l: typeof innen) => l.map((g) => JSON.stringify(g.monom)).sort().join();
          expect(m(innen)).toBe(m(aufgabe));
        } else if (x.fehlertyp === 'VZ') {
          // gleiche Beträge wie richtig, aber Vorzeichen wie in der Aufgabe
          expect(richtig.faktor.gliederSortiert()[0]!.koeffizient.istNegativ()).toBe(true);
          const rk = richtig.klammern[0]!.gliederSortiert();
          expect(innen.map((g) => g.koeffizient.betrag().toString()).sort()).toEqual(rk.map((g) => g.koeffizient.betrag().toString()).sort());
        } else {
          // KL: entweder eine 1 fehlt oder die Zahlen sind nicht geteilt
          const rk = richtig.klammern[0]!.gliederSortiert();
          const einsFehlt = innen.length === rk.length - 1;
          const nichtGeteilt = innen.map((g) => g.koeffizient.betrag().toString()).sort().join() === aufgabe.map((g) => g.koeffizient.betrag().toString()).sort().join();
          expect(einsFehlt || nichtGeteilt, `${a.aufgabe.text} | ${x.formel.text}`).toBe(true);
        }
      }
    }
  });

  it('Hilfen: Zerlegungszeile ist gleichwertig, letzte Zeile ist die Lösung', () => {
    const z = new Zufall(2);
    for (const a of aufgaben) {
      const [links, rechts] = a.hilfen.ansatz.text.split(' = ');
      expect(links).toBe(a.aufgabe.text);
      expect(gleichwertigDurchEinsetzen(links!, rechts!, z)).toBe(true);
      expect(a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text).toBe(`= ${a.loesung.text}`);
      expect(a.hilfen.denkanstoss.length).toBeGreaterThan(20);
    }
  });
});
