import { describe, expect, it } from 'vitest';
import { gleichwertigeTerme } from '../mathe/auswertung';
import { leseAlsPolynom, leseTerm, type Knoten } from '../mathe/term-parser';
import { op, satz, vari, zahl } from './rechenbaum';
import { termTextGenerator as gen } from './t8-term-text';

const KOMB = [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

function aeussereArt(text: string): string {
  let k: Knoten = leseTerm(text);
  while (k.art === 'klammer') k = k.knoten;
  if (k.art === 'summe') return k.glieder[k.glieder.length - 1]!.minus ? 'Differenz' : 'Summe';
  return { produkt: 'Produkt', quotient: 'Quotient', potenz: 'Potenz' }[k.art as 'produkt'] ?? '?';
}
const ART_DES_SATZES: [RegExp, string][] = [
  [/^Die Summe/, 'Summe'],
  [/^Die Differenz/, 'Differenz'],
  [/^Das Produkt|^Das (Doppelte|Dreifache|Vierfache|Fünffache|Zehnfache)/, 'Produkt'],
  [/^Der Quotient|^Die Hälfte/, 'Quotient'],
  [/^Das Quadrat/, 'Potenz'],
];
const artDesSatzes = (s: string) => ART_DES_SATZES.find(([r]) => r.test(s))?.[1] ?? '?';

describe('t8-term-text', () => {
  it('Grammatik der Fachsprache (feste Beispiele)', () => {
    expect(satz({ art: 'vielfach', faktor: 3, k: op('+', vari('x'), zahl(5)) })).toBe('Das Dreifache der Summe aus x und 5');
    expect(satz(op('·', zahl(4), op('−', vari('x'), zahl(2))))).toBe('Das Produkt aus 4 und der Differenz aus x und 2');
    expect(satz(op(':', op('+', vari('a'), zahl(4)), { art: 'vielfach', faktor: 2, k: vari('b') }))).toBe('Der Quotient aus der Summe aus a und 4 und dem Doppelten von b');
    expect(satz({ art: 'quadrat', k: op('·', zahl(3), vari('x')) })).toBe('Das Quadrat des Produkts aus 3 und x');
    expect(satz(op('+', { art: 'haelfte', k: vari('x') }, zahl(1)))).toBe('Die Summe aus der Hälfte von x und 1');
    expect(satz(op('−', zahl(7), op(':', vari('n'), zahl(2))))).toBe('Die Differenz aus 7 und dem Quotienten aus n und 2');
  });

  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Korrektheit: äußerstes Wort der Beschreibung passt zur äußersten Rechenart des Terms (unabhängig gelesen)', () => {
    for (const a of aufgaben) {
      const [beschreibung, term] = a.aufgabe.latex.startsWith('\\text') ? [a.aufgabe.text, a.loesung.text] : [a.loesung.text, a.aufgabe.text];
      expect(artDesSatzes(beschreibung), `${beschreibung} | ${term}`).toBe(aeussereArt(term));
    }
  });

  it('Eingabe: Lösung und gleichwertige Schreibweisen richtig, Unsinn unlesbar', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      const p = leseAlsPolynom(a.loesung.text);
      if (p) expect(a.pruefe(p.alsText()).ergebnis).toBe('richtig'); // ausmultipliziert ist auch richtig
      expect(a.pruefe('3x+(').ergebnis).toBe('unlesbar');
      expect(a.pruefe('z + 999').fehlertyp).toBe('UK');
    }
  });

  it('Auswahl: genau eine richtig, Fehloptionen TV und nicht gleichwertig', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      expect(new Set(o.map((x) => x.formel.text)).size).toBe(o.length);
      const termOptionen = !o[0]!.formel.latex.startsWith('\\text');
      o.forEach((x, i) => {
        if (!x.richtig) expect(x.fehlertyp).toBe('TV');
        if (termOptionen && !x.richtig) expect(gleichwertigeTerme(leseTerm(x.formel.text), leseTerm(a.loesung.text))).toBe(false);
        expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
      });
    }
    // beide Richtungen kommen vor
    const t2t = aufgaben.filter((a) => a.typ === 'auswahl' && a.aufgabe.latex.startsWith('\\text')).length;
    expect(t2t).toBeGreaterThan(500);
    expect(t2t).toBeLessThan(1500);
  });

  it('Vielfalt', () => {
    for (const [afb, typ] of KOMB) {
      const t = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(t).size, `${afb}/${typ}`).toBeGreaterThan(afb === 'I' ? 500 : 800);
    }
  });
});
