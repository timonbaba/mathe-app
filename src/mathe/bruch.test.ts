import { describe, expect, it } from 'vitest';
import { Bruch, ggT, kgV } from './bruch';
import { Zufall } from './zufall';

const b = (z: number, n = 1) => Bruch.von(z, n);

describe('ggT / kgV', () => {
  it('rechnet Standardfälle', () => {
    expect(ggT(12n, 18n)).toBe(6n);
    expect(ggT(-12n, 18n)).toBe(6n);
    expect(ggT(0n, 5n)).toBe(5n);
    expect(kgV(4n, 6n)).toBe(12n);
    expect(kgV(0n, 6n)).toBe(0n);
  });
});

describe('Bruch: Normalform', () => {
  it('kürzt vollständig und hält den Nenner positiv', () => {
    expect(b(6, 8).toString()).toBe('3/4');
    expect(b(3, -4).toString()).toBe('-3/4');
    expect(b(-3, -4).toString()).toBe('3/4');
    expect(b(0, -7).toString()).toBe('0');
    expect(b(10, 5).toString()).toBe('2');
  });

  it('verbietet Nenner 0', () => {
    expect(() => b(1, 0)).toThrow();
  });

  it('verbietet unsichere Ganzzahlen (Gleitkomma-Schutz)', () => {
    expect(() => Bruch.von(0.5)).toThrow();
    expect(() => Bruch.von(2 ** 60)).toThrow();
  });
});

describe('Bruch: Rechnen', () => {
  it('Grundrechenarten', () => {
    expect(b(1, 2).plus(b(1, 3)).toString()).toBe('5/6');
    expect(b(1, 2).minus(b(3, 4)).toString()).toBe('-1/4');
    expect(b(-2, 3).mal(b(9, 4)).toString()).toBe('-3/2');
    expect(b(3, 5).durch(b(-6, 10)).toString()).toBe('-1');
    expect(b(13, 6).plus(b(11, 15)).toString()).toBe('29/10');
  });

  it('Division durch 0 und Kehrwert von 0 werfen', () => {
    expect(() => b(1).durch(0)).toThrow();
    expect(() => Bruch.NULL.kehrwert()).toThrow();
  });

  it('Potenzen, auch mit negativem Exponenten', () => {
    expect(b(-2).hoch(5).toString()).toBe('-32');
    expect(b(-2).hoch(4).toString()).toBe('16');
    expect(b(3, 4).hoch(-1).toString()).toBe('4/3');
    expect(b(5).hoch(0).toString()).toBe('1');
    expect(() => b(0).hoch(-1)).toThrow();
  });

  it('vergleicht korrekt', () => {
    expect(b(1, 3).vergleiche(b(1, 2))).toBe(-1);
    expect(b(-1, 2).vergleiche(b(-2, 3))).toBe(1);
    expect(b(2, 4).vergleiche(b(1, 2))).toBe(0);
    expect(b(2, 4).gleich(b(1, 2))).toBe(true);
  });

  it('Rechengesetze gelten für 1.000 zufällige Brüche', () => {
    const z = new Zufall(42);
    const zufallsbruch = () => b(z.ganzzahl(-50, 50), z.ganzzahlOhne(-20, 20, [0]));
    for (let i = 0; i < 1000; i++) {
      const [x, y, w] = [zufallsbruch(), zufallsbruch(), zufallsbruch()];
      expect(x.plus(y).gleich(y.plus(x))).toBe(true);
      expect(x.mal(y.plus(w)).gleich(x.mal(y).plus(x.mal(w)))).toBe(true);
      expect(x.minus(y).plus(y).gleich(x)).toBe(true);
      if (!y.istNull()) expect(x.durch(y).mal(y).gleich(x)).toBe(true);
      // Normalform bleibt erhalten
      const r = x.mal(y).plus(w);
      expect(r.nenner > 0n).toBe(true);
      expect(Bruch.von(r.zaehler, r.nenner).gleich(r)).toBe(true);
    }
  });
});

describe('Bruch.parse (Schülereingaben)', () => {
  const faelle: [string, string | null][] = [
    ['3', '3'],
    ['-3', '-3'],
    ['−3', '-3'],
    ['+2', '2'],
    ['3/4', '3/4'],
    ['6/8', '3/4'],
    ['-3/4', '-3/4'],
    ['3/-4', '-3/4'],
    [' 3 / 4 ', '3/4'],
    ['0,25', '1/4'],
    ['-1,5', '-3/2'],
    [',5', '1/2'],
    ['0.25', '1/4'],
    ['12,40', '62/5'],
    ['', null],
    ['abc', null],
    ['3/0', null],
    ['3,', null],
    ['1,2,3', null],
    ['--3', null],
    ['3/4/5', null],
  ];

  it.each(faelle)('%s → %s', (eingabe, erwartet) => {
    const r = Bruch.parse(eingabe);
    expect(r === null ? null : r.toString()).toBe(erwartet);
  });
});

describe('Bruch: Ausgabe', () => {
  it('Dezimalschreibweise mit Komma und typografischem Minus', () => {
    expect(b(1, 4).alsDezimal()).toBe('0,25');
    expect(b(-3, 2).alsDezimal()).toBe('−1,5');
    expect(b(62, 5).alsDezimal()).toBe('12,4');
    expect(b(7).alsDezimal()).toBe('7');
    expect(b(1, 8).alsDezimal()).toBe('0,125');
    expect(b(-1, 20).alsDezimal()).toBe('−0,05');
    expect(b(1, 3).alsDezimal()).toBeNull();
    expect(b(1, 6).alsDezimal()).toBeNull();
  });

  it('Dezimalausgabe und parse sind zueinander invers (1.000 Fälle)', () => {
    const z = new Zufall(7);
    for (let i = 0; i < 1000; i++) {
      const x = b(z.ganzzahl(-10000, 10000), z.auswahl([1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 1000]));
      const text = x.alsDezimal();
      expect(text).not.toBeNull();
      expect(Bruch.parse(text!)!.gleich(x)).toBe(true);
    }
  });

  it('Text für Schüler', () => {
    expect(b(-3, 4).alsText()).toBe('−3/4');
    expect(b(5).alsText()).toBe('5');
  });
});
