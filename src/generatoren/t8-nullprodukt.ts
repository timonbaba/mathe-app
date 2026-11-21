/**
 * Generatoren für Level 9 „Produkt gleich null“ (Gym Kl. 8, LB 1):
 *
 * t8-nullprodukt (AFB I/II): (x − 3)·(x + 4) = 0;  x·(x − 5) = 0;  (2x + 4)·(3x − 1) = 0
 * t8-gleichung-ausklammern-null (AFB III): x² − 3x = 0;  3x² = 12x  (erst ausklammern)
 *
 * Diagnostische Fehlantworten:
 *  - VZ  Vorzeichen der Lösungen vertauscht: (x − 3)·(x + 4) = 0 ⇒ L = {3; −4} falsch als {−3; 4}
 *  - UM  nur eine Lösung angegeben bzw. durch x geteilt und die Lösung 0 verloren
 *  - UM  Koeffizient nicht berücksichtigt: 2x + 4 = 0 ⇒ x = −4
 */
import { Bruch } from '../mathe/bruch';
import { endlich, gleicheMenge, mengeFormel, type Loesungsmenge } from '../mathe/loesungsmenge';
import { formatGlied, type Glied } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { formel, pruefeAuswahl } from './gemeinsam';
import { mengenOptionen, pruefeLoesungsmenge, type FalscheMenge } from './gleichung-hilfen';
import { ANZEIGE, GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

const gl = (k: number | Bruch, m: Record<string, number> = {}): Glied => ({ koeffizient: k instanceof Bruch ? k : Bruch.von(k), monom: m });

/** Linearer Faktor a·x + b (b = 0 erlaubt, dann einfach „a·x“). */
interface Faktor {
  a: number;
  b: number;
}

const nullstelle = (f: Faktor) => Bruch.von(-f.b, f.a);

function faktorFormel(f: Faktor, v: string, inKlammer: boolean): Formel {
  if (f.b === 0) {
    const t = formel([gl(f.a, { [v]: 1 })]);
    return t;
  }
  const t = formel([gl(f.a, { [v]: 1 }), gl(f.b)]);
  return inKlammer ? { text: `(${t.text})`, latex: `\\left(${t.latex}\\right)` } : t;
}

function verbinden(a: Formel, b: Formel): Formel {
  return { text: `${a.text}·${b.text}`, latex: `${a.latex} \\cdot ${b.latex}` };
}

function zahl(b: Bruch): Formel {
  return { text: b.alsText(), latex: b.istGanz() ? b.toString() : `${b.istNegativ() ? '-' : ''}\\frac{${b.betrag().zaehler}}{${b.betrag().nenner}}` };
}

function wegNullprodukt(f1: Faktor, f2: Faktor, v: string): Formel[] {
  const l1 = faktorFormel(f1, v, false);
  const l2 = faktorFormel(f2, v, false);
  const n1 = zahl(nullstelle(f1));
  const n2 = zahl(nullstelle(f2));
  return [
    { text: `${l1.text} = 0 oder ${l2.text} = 0`, latex: `${l1.latex} = 0 \\;\\text{ oder }\\; ${l2.latex} = 0` },
    { text: `${v} = ${n1.text} oder ${v} = ${n2.text}`, latex: `${v} = ${n1.latex} \\;\\text{ oder }\\; ${v} = ${n2.latex}` },
  ];
}

function fehlerNullprodukt(f1: Faktor, f2: Faktor, richtig: Loesungsmenge, durchXGeteilt: boolean): FalscheMenge[] {
  const liste: FalscheMenge[] = [];
  const add = (m: Loesungsmenge, fehlertyp: 'VZ' | 'UM', rueckmeldung: string) => {
    if (!gleicheMenge(m, richtig) && !liste.some((x) => gleicheMenge(x.menge, m))) liste.push({ fehlertyp, menge: m, rueckmeldung });
  };
  const n1 = nullstelle(f1);
  const n2 = nullstelle(f2);
  if (durchXGeteilt) {
    const nichtNull = n1.istNull() ? n2 : n1;
    add(endlich(nichtNull), 'UM', 'Teile nicht durch die Variable – sie könnte 0 sein, und dann geht eine Lösung verloren. Klammere stattdessen aus.');
  }
  add(endlich(n1.negiert(), n2.negiert()), 'VZ', 'Prüfe die Vorzeichen: Aus x − 3 = 0 folgt x = 3, aus x + 4 = 0 folgt x = −4.');
  add(endlich(Bruch.von(-f1.b), Bruch.von(-f2.b)), 'UM', 'Bei 2x + 4 = 0 musst du am Ende noch durch 2 teilen.');
  add(endlich(n1), 'UM', 'Ein Produkt ist 0, wenn EINER der Faktoren 0 ist – das ergibt hier zwei Lösungen.');
  add(endlich(n2), 'UM', 'Ein Produkt ist 0, wenn EINER der Faktoren 0 ist – das ergibt hier zwei Lösungen.');
  return liste;
}

// --- t8-nullprodukt ---------------------------------------------------------------

export const nullprodukt: Generator = {
  id: 't8-nullprodukt',
  version: 1,
  baustein: 't8-nullprodukt',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II'] as const);
    if (afb === 'III') throw new GeneratorFehler('AFB III wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);
    for (let versuch = 0; versuch < 1000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      const n = () => z.ganzzahlOhne(-12, 12, [0]);
      let f1: Faktor;
      let f2: Faktor;
      if (afb === 'I') {
        f1 = z.mitWahrscheinlichkeit(0.25) ? { a: 1, b: 0 } : { a: 1, b: n() };
        f2 = { a: 1, b: n() };
      } else {
        f1 = { a: z.ganzzahl(2, 5), b: n() };
        f2 = { a: z.ganzzahl(1, 5) * z.auswahl([1, 1, -1]), b: n() };
      }
      if (nullstelle(f1).gleich(nullstelle(f2))) continue;
      const m = endlich(nullstelle(f1), nullstelle(f2));
      const fehler = fehlerNullprodukt(f1, f2, m, false);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const aufgabe0 = verbinden(faktorFormel(f1, v, true), faktorFormel(f2, v, true));
      const aufgabe: Formel = { text: `${aufgabe0.text} = 0`, latex: `${aufgabe0.latex} = 0` };
      const weg: Formel[] = [aufgabe, ...wegNullprodukt(f1, f2, v), mengeFormel(m)];
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fehler) : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? `Welche Lösungsmenge hat die Gleichung (Variable ${v})?` : `Löse die Gleichung nach ${v} auf und gib die Lösungsmenge an.`,
        aufgabe,
        loesung: mengeFormel(m),
        hilfen: {
          denkanstoss: 'Ein Produkt ist genau dann 0, wenn (mindestens) einer der Faktoren 0 ist. Setze jeden Faktor einzeln gleich 0.',
          ansatz: weg[1]!,
          loesungsweg: weg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          return pruefeLoesungsmenge(antwort, v, m, fehler);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- t8-gleichung-ausklammern-null ----------------------------------------------------

export const gleichungAusklammernNull: Generator = {
  id: 't8-gleichung-ausklammern-null',
  version: 1,
  baustein: 't8-gleichung-ausklammern-null',
  afb: ['III'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb = wunsch.afb ?? 'III';
    if (afb !== 'III') throw new GeneratorFehler('Dieser Generator bietet nur AFB III an');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);
    for (let versuch = 0; versuch < 1000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      // k·x·(x + c) = 0  ⇔  k·x² + k·c·x = 0
      const k = z.auswahl([1, 1, 2, 3, 4, 5, -1, -2]);
      const c = z.ganzzahlOhne(-12, 12, [0]);
      const x2 = gl(k, { [v]: 2 });
      const x1 = gl(k * c, { [v]: 1 });
      const gleichSeite = z.mitWahrscheinlichkeit(0.35); // Form k·x² = −k·c·x
      const m = endlich(Bruch.NULL, Bruch.von(-c));
      const f1: Faktor = { a: k, b: 0 };
      const f2: Faktor = { a: 1, b: c };
      const fehler = fehlerNullprodukt(f1, f2, m, true);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const t = (g: Glied) => formatGlied(g, 'text', ANZEIGE);
      const tl = (g: Glied) => formatGlied(g, 'latex', ANZEIGE);
      const neg = (g: Glied): Glied => ({ ...g, koeffizient: g.koeffizient.negiert() });
      const aufgabe: Formel = gleichSeite
        ? { text: `${t(x2)} = ${t(neg(x1))}`, latex: `${tl(x2)} = ${tl(neg(x1))}` }
        : { text: `${formel([x2, x1]).text} = 0`, latex: `${formel([x2, x1]).latex} = 0` };
      const ausgeklammert = verbinden(faktorFormel(f1, v, true), faktorFormel(f2, v, true));
      const weg: Formel[] = [];
      if (gleichSeite) {
        // rechts steht −x1; Gegenoperation bringt es nach links
        const rechts = neg(x1);
        const betrag = { ...rechts, koeffizient: rechts.koeffizient.betrag() };
        const op = rechts.koeffizient.istNegativ() ? { text: `+ ${t(betrag)}`, latex: `+ ${tl(betrag)}` } : { text: `− ${t(betrag)}`, latex: `- ${tl(betrag)}` };
        weg.push({ text: `${aufgabe.text}   | ${op.text}`, latex: `${aufgabe.latex} \\quad \\mid ${op.latex}` });
      }
      weg.push({ text: `${formel([x2, x1]).text} = 0`, latex: `${formel([x2, x1]).latex} = 0` });
      weg.push({ text: `${ausgeklammert.text} = 0`, latex: `${ausgeklammert.latex} = 0` });
      weg.push(...wegNullprodukt(f1, f2, v), mengeFormel(m));
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fehler) : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'III',
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? `Welche Lösungsmenge hat die Gleichung (Variable ${v})?` : `Löse die Gleichung nach ${v} auf und gib die Lösungsmenge an.`,
        aufgabe,
        loesung: mengeFormel(m),
        hilfen: {
          denkanstoss: `Bringe alles auf eine Seite, sodass rechts 0 steht. Klammere dann ${v} aus – und teile nicht durch ${v}, sonst verlierst du eine Lösung.`,
          ansatz: { text: `${ausgeklammert.text} = 0`, latex: `${ausgeklammert.latex} = 0` },
          loesungsweg: weg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          return pruefeLoesungsmenge(antwort, v, m, fehler);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
