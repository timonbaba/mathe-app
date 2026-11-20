import { describe, expect, it } from 'vitest';
import { istNormalform, leseAlsPolynom, leseTerm } from '../mathe/term-parser';
import { binomErgaenzen as gen } from './t8-binom-ergaenzen';

const KOMB = [['II', 'eingabe'], ['II', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

/** Setzt einen Term in die Lücke ein und prüft unabhängig, ob die Gleichung als Termgleichheit stimmt. */
function stimmt(aufgabe: string, einsatz: string): boolean {
  const [l, r] = aufgabe.replace(/▢/g, `(${einsatz})`).split(' = ');
  return leseAlsPolynom(l!)!.gleich(leseAlsPolynom(r!)!);
}

describe('t8-binom-ergaenzen', () => {
  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('genau eine Lücke; mit der Lösung stimmt die Gleichung (unabhängig geprüft)', () => {
    for (const a of aufgaben) {
      expect((a.aufgabe.text.match(/▢/g) ?? []).length).toBe(a.aufgabe.text.includes(')·(') ? (a.aufgabe.text.split(' = ').find((s) => s.includes(')·('))!.includes('▢') ? 2 : 1) : 1);
      expect(stimmt(a.aufgabe.text, a.loesung.text), `${a.aufgabe.text} | ${a.loesung.text}`).toBe(true);
      expect(istNormalform(leseTerm(a.loesung.text))).toBe(true);
    }
  });

  it('alle Lückenarten kommen vor', () => {
    const t = aufgaben.map((a) => a.aufgabe.text);
    expect(t.filter((x) => /\(▢/.test(x)).length).toBeGreaterThan(100); // vorne in der Klammer
    expect(t.filter((x) => /[+−] ▢\)/.test(x)).length).toBeGreaterThan(100); // hinten in der Klammer
    expect(t.filter((x) => /[+−] ▢ [+−]/.test(x)).length).toBeGreaterThan(200); // Mittelglied
    expect(t.filter((x) => /^▢ /.test(x) || /= ▢ /.test(x)).length).toBeGreaterThan(30); // a² bei 3. Formel
  });

  it('Vielfalt', () => {
    for (const [afb, typ] of KOMB) {
      const t = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(t).size).toBeGreaterThan(600);
    }
  });

  it('Eingabe: Lösung richtig, Fehlantworten mit Fehlertyp, falsches Vorzeichen → VZ', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      expect(a.pruefe('3x+(').ergebnis).toBe('unlesbar');
      const neg = leseAlsPolynom(a.loesung.text)!.negiert().alsText();
      expect(a.pruefe(neg).fehlertyp).toBe('VZ');
    }
  });

  it('Auswahl: genau eine Option macht die Gleichung wahr; Fehloptionen nicht', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      for (const x of o) {
        expect(stimmt(a.aufgabe.text, x.formel.text), `${a.aufgabe.text} | ${x.formel.text}`).toBe(x.richtig);
        if (!x.richtig) expect(['PO', 'KL']).toContain(x.fehlertyp);
      }
      expect(new Set(o.map((x) => leseAlsPolynom(x.formel.text)!.alsText())).size).toBe(o.length);
      o.forEach((x, i) => expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch'));
    }
  });

  it('Hilfen: Ansatz nennt a und b, Lösungsweg endet mit der Lösung', () => {
    for (const a of aufgaben) {
      expect(a.hilfen.ansatz.text).toMatch(/^Hier ist a = .+ und b = .+\.$/);
      expect(a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text.endsWith(`= ${a.loesung.text}`)).toBe(true);
    }
  });
});
