import { describe, expect, it } from 'vitest';
import { Bruch } from './bruch';
import { Polynom } from './polynom';
import { formBefund, istNormalform, leseAlsPolynom, leseTerm } from './term-parser';
import { Zufall } from './zufall';

const P = (s: string) => {
  const p = leseAlsPolynom(s);
  if (!p) throw new Error(`nicht lesbar: ${s}`);
  return p;
};
const gleichwertig = (a: string, b: string) => P(a).gleich(P(b));

describe('Polynom: Rechnen', () => {
  it('fasst gleichartige Glieder zusammen', () => {
    expect(P('19ab - 17ac - ab').alsText()).toBe('18ab − 17ac');
    expect(P('2x - 8 + 3x + 4').alsText()).toBe('5x − 4');
    expect(P('x^2 + x^2 + 2x^2').alsText()).toBe('4x²');
    expect(P('3x - 3x').alsText()).toBe('0');
  });

  it('multipliziert aus (Beispiele nach Lehrplan-Mustern)', () => {
    expect(P('3(4x + 2y)').alsText()).toBe('12x + 6y');
    expect(P('(x+2)(x-3)').alsText()).toBe('x² − x − 6');
    expect(P('15xy(3x + 4xy) - 3x^2y').alsText()).toBe('60x²y² + 42x²y');
    expect(P('a(a - (3c + 2a))').alsText()).toBe('−a² − 3ac');
    expect(P('(2-a)^2').alsText()).toBe('a² − 4a + 4');
    expect(P('(a + 2b)(a - 2b)').alsText()).toBe('a² − 4b²');
  });

  it('binomische Formeln gelten', () => {
    expect(gleichwertig('(a+b)^2', 'a^2 + 2ab + b^2')).toBe(true);
    expect(gleichwertig('(a-b)^2', 'a^2 - 2ab + b^2')).toBe(true);
    expect(gleichwertig('(a+b)(a-b)', 'a^2 - b^2')).toBe(true);
    expect(gleichwertig('(a+b)^2', 'a^2 + b^2')).toBe(false);
  });

  it('wertet exakt aus', () => {
    const p = P('3x^2 - 2xy + 1/2');
    expect(p.auswerten({ x: Bruch.von(-2), y: Bruch.von(1, 3) }).toString()).toBe('83/6');
  });

  it('Ausmultiplizieren ändert den Wert nicht (1.000 Zufallsproben)', () => {
    const z = new Zufall(3);
    for (let i = 0; i < 1000; i++) {
      const [a, b, c, d] = [1, 2, 3, 4].map(() => z.ganzzahl(-9, 9));
      const term = `(${a}x + ${b}y)(${c}x - ${d})`;
      const p = P(term);
      const x = Bruch.von(z.ganzzahl(-20, 20), z.ganzzahlOhne(1, 5, []));
      const y = Bruch.von(z.ganzzahl(-20, 20));
      const direkt = Bruch.von(a!).mal(x).plus(Bruch.von(b!).mal(y)).mal(Bruch.von(c!).mal(x).minus(d!));
      expect(p.auswerten({ x, y }).gleich(direkt)).toBe(true);
    }
  });
});

describe('Polynom: Ausgabe', () => {
  it('mit und ohne Malpunkt, Text und LaTeX', () => {
    const p = P('6x^2 - 15xy');
    expect(p.alsText()).toBe('6x² − 15xy');
    expect(p.alsText({ malpunkt: true })).toBe('6·x² − 15·x·y');
    expect(p.alsLatex({ malpunkt: true })).toBe('6 \\cdot x^{2} - 15 \\cdot x \\cdot y');
    expect(P('-x + 1').alsText()).toBe('−x + 1');
    expect(P('1/2 x').alsText()).toBe('1/2·x');
    expect(P('1/2 x').alsLatex()).toBe('\\frac{1}{2}x');
  });
});

describe('Term-Parser: Eingaben', () => {
  it.each([
    ['3x', '3x'],
    ['3·x', '3x'],
    ['3*x', '3x'],
    ['3 x', '3x'],
    ['x²', 'x²'],
    ['x^2', 'x²'],
    ['−2(3a − 5)', '−6a + 10'],
    ['2·(−3)', '−6'],
    ['2·-3', '−6'],
    ['0,5x', '1/2·x'],
    ['x/2', '1/2·x'],
    ['6x/3', '2x'],
    ['-x^2', '−x²'],
    ['(-x)^2', 'x²'],
    ['xy', 'xy'],
    ['yx', 'xy'],
  ])('%s → %s', (eingabe, erwartet) => {
    expect(P(eingabe).alsText()).toBe(erwartet);
  });

  it.each(['', '3+', '(x+1', 'x+1)', '3x2', 'x/y', 'x/0', '3 # 4', 'X', 'x^y', 'x^-1', '2..3'])(
    'lehnt ungültige Eingabe ab: "%s"',
    (eingabe) => {
      expect(leseAlsPolynom(eingabe)).toBeNull();
    },
  );
});

describe('Formprüfung', () => {
  it.each([
    ['6x² − 15xy', true],
    ['-6a + 10', true],
    ['10 - 6a', true],
    ['3·x', true],
    ['1/2·x + 3', true],
    ['3(2x - 5y)', false],
    ['3x·2x - 15xy', false],
    ['6x·x', false],
    ['6x + 2x', false],
    ['6x - 6x + 1', false],
    ['−(6a − 10)', false],
  ])('%s ist Normalform: %s', (eingabe, erwartet) => {
    expect(istNormalform(leseTerm(eingabe))).toBe(erwartet);
  });

  it('gibt den Grund an', () => {
    expect(formBefund(leseTerm('3(x+1)')).klammernUebrig).toBe(true);
    expect(formBefund(leseTerm('3x·2')).produkteUnvereinfacht).toBe(true);
    expect(formBefund(leseTerm('3x + 2x')).zusammenfassbar).toBe(true);
  });
});

describe('Polynom: Gleichheit', () => {
  it('ist unabhängig von Reihenfolge und Schreibweise', () => {
    expect(gleichwertig('3x + 2y', '2y + 3x')).toBe(true);
    expect(gleichwertig('x·y·x', 'x^2 y')).toBe(true);
    expect(gleichwertig('0,5x', '1/2 x')).toBe(true);
    expect(Polynom.NULL.gleich(P('x - x'))).toBe(true);
  });
});
