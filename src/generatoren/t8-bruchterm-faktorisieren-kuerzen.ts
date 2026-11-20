/**
 * Generator für Baustein t8-bruchterm-faktorisieren-kuerzen
 * „Bruchterme durch Faktorisieren kürzen“ (Gym Kl. 8, LB 1, AFB III).
 *
 * Formen (nach der Interpretationshilfe Kl. 8):
 *  - ausklammernZaehler:  (x³ + x²)/x² = x + 1
 *  - ausklammernNenner:   x²/(x³ + x²) = 1/(x + 1)
 *  - dritte:              (a² − b²)/(a − b) = a + b
 *  - quadratFaktor:       3·(x − 4)²/(4·(x² − 8x + 16)) = 3/4
 *  - nennerAusklammern:   (x² + 6x + 9)/(2x + 6) = (x + 3)/2
 *
 * Diagnostische Fehlantworten: BR (aus Summen gekürzt, Kehrwert, Faktor vergessen), VZ, PO.
 * Ausgeschlossene Werte nur als Hinweis (SPEC 5.5).
 */
import { Bruch } from '../mathe/bruch';
import { Polynom, type Glied } from '../mathe/polynom';
import { leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { alleUngleichartig, formel, gliedMal, pruefeAuswahl, sortiereGlieder, summeAlsPolynom, zufallsMonom } from './gemeinsam';
import { binomErgebnis, binomFormel, type Binom } from './binom';
import { bereinigeBruchFehler, bruch, pruefeBruchterm, type FalscherBruchterm } from './bruchterm-hilfen';
import { hatGemeinsamenFaktor } from './faktorisierung';
import { GeneratorFehler, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });
const neg = (g: Glied): Glied => ({ ...g, koeffizient: g.koeffizient.negiert() });

const RM: Partial<Record<FehlertypCode, string>> = {
  BR: 'Kürzen darf man nur Faktoren, nicht einzelne Summanden. Zerlege Zähler und Nenner zuerst in Faktoren.',
  VZ: 'Achte auf die Vorzeichen in den Klammern: (a + b)·(a − b) – welcher Faktor kürzt sich weg?',
};

interface Roh {
  aufgabe: Formel;
  loesung: Formel;
  grad: number;
  weg: Formel[];
  fehler: FalscherBruchterm[];
  nenner: Polynom;
  variable: string;
  denkanstoss: string;
}

const sortiert = (g: Glied[]): Glied[] => {
  const r = [...g];
  sortiereGlieder(r);
  return r;
};
const teile = (g: Glied, d: Glied): Glied => ({
  koeffizient: g.koeffizient.durch(d.koeffizient),
  monom: Object.fromEntries(Object.entries(g.monom).map(([v, e]) => [v, e - (d.monom[v] ?? 0)]).filter(([, e]) => (e as number) > 0)),
});
const klammer = (f: Formel): Formel => ({ text: `(${f.text})`, latex: `\\left(${f.latex}\\right)` });
const produkt = (a: Formel, b: Formel): Formel => ({ text: `${a.text}·${b.text}`, latex: `${a.latex} \\cdot ${b.latex}` });
const grad = (g: readonly Glied[]) => Math.max(...g.map((x) => Object.values(x.monom).reduce((s, e) => s + e, 0)));

function ausklammernFall(z: Zufall, v: string, umgekehrt: boolean): Roh | null {
  const m = gl(z.ganzzahl(1, 6), { [v]: z.ganzzahl(1, 2) });
  const innen = sortiert([gl(z.ganzzahl(1, 9), zufallsMonom(z, [v], 2)), gl(z.ganzzahlOhne(-9, 9, [0]), zufallsMonom(z, [v], 2))]);
  if (!alleUngleichartig(innen) || hatGemeinsamenFaktor(summeAlsPolynom(innen)) || innen[0]!.koeffizient.istNegativ()) return null;
  const zaehler = innen.map((g) => gliedMal(m, g));
  const mF = formel([m]);
  const zF = formel(zaehler);
  const iF = formel(innen);
  const zerlegt = produkt(mF, klammer(iF));
  const nenner = umgekehrt ? summeAlsPolynom(zaehler) : summeAlsPolynom([m]);
  if (!umgekehrt) {
    return {
      aufgabe: bruch(zF, mF),
      loesung: iF,
      grad: grad(innen),
      weg: [bruch(zerlegt, mF), iF],
      fehler: [
        { fehlertyp: 'BR', formel: formel([teile(zaehler[0]!, m), zaehler[1]!]), rueckmeldung: 'Beide Summanden müssen durch den Nenner geteilt werden – kürzen darf man nur Faktoren. Klammere im Zähler zuerst aus.' },
        { fehlertyp: 'BR', formel: formel([zaehler[0]!, teile(zaehler[1]!, m)]), rueckmeldung: 'Beide Summanden müssen durch den Nenner geteilt werden – kürzen darf man nur Faktoren. Klammere im Zähler zuerst aus.' },
        { fehlertyp: 'PO', formel: formel(zaehler.map((g) => ({ koeffizient: g.koeffizient.durch(m.koeffizient), monom: g.monom }))), rueckmeldung: 'Auch die Variablen werden gekürzt: x³ : x² = x.' },
      ],
      nenner,
      variable: v,
      denkanstoss: 'Klammere im Zähler den gemeinsamen Faktor aus. Dann kannst du ihn gegen den Nenner kürzen.',
    };
  }
  const eins = { text: '1', latex: '1' };
  return {
    aufgabe: bruch(mF, zF),
    loesung: bruch(eins, iF),
    grad: grad(innen),
    weg: [bruch(mF, zerlegt), bruch(eins, iF)],
    fehler: [
      { fehlertyp: 'BR', formel: bruch(eins, formel([teile(zaehler[0]!, m), zaehler[1]!])), rueckmeldung: 'Kürzen darf man nur Faktoren, nicht einzelne Summanden. Klammere im Nenner zuerst aus.' },
      { fehlertyp: 'BR', formel: iF, rueckmeldung: 'Zähler und Nenner sind vertauscht: Der Faktor kürzt sich weg, im Zähler bleibt 1 stehen.' },
    ],
    nenner,
    variable: v,
    denkanstoss: 'Klammere im Nenner den gemeinsamen Faktor aus. Kürzt sich der ganze Zähler weg, bleibt im Zähler eine 1.',
  };
}

function dritteFall(z: Zufall, v: string): Roh | null {
  const a = gl(z.auswahl([1, 1, 2, 3]), { [v]: 1 });
  const b = z.mitWahrscheinlichkeit(0.7) ? gl(z.ganzzahl(1, 9)) : gl(z.ganzzahl(1, 3), { [v === 'x' ? 'y' : 'b']: 1 });
  const g = (p: bigint, q: bigint): bigint => (q === 0n ? p : g(q, p % q));
  if (g(a.koeffizient.zaehler, b.koeffizient.zaehler) > 1n) return null;
  const x: Binom = { art: 'dritte', a, b, k: 1 };
  const plus = formel([a, b]);
  const minus = formel([a, neg(b)]);
  const nennerPlus = z.mitWahrscheinlichkeit(0.5);
  const nennerF = nennerPlus ? plus : minus;
  const erg = nennerPlus ? minus : plus;
  const zaehler = binomErgebnis(x);
  return {
    aufgabe: bruch(formel(zaehler), nennerF),
    loesung: erg,
    grad: 1,
    weg: [bruch(binomFormel(x), nennerF), erg],
    fehler: [
      { fehlertyp: 'VZ', formel: nennerF, rueckmeldung: RM.VZ },
      { fehlertyp: 'BR', formel: formel([gliedMal(a, a), neg(b)]), rueckmeldung: 'Aus Summen darf man nicht kürzen. Zerlege den Zähler mit der 3. binomischen Formel.' },
      { fehlertyp: 'BR', formel: formel([a, neg(gliedMal(b, b))]), rueckmeldung: 'Aus Summen darf man nicht kürzen. Zerlege den Zähler mit der 3. binomischen Formel.' },
    ],
    nenner: summeAlsPolynom(nennerPlus ? [a, b] : [a, neg(b)]),
    variable: v,
    denkanstoss: 'Der Zähler ist eine Differenz zweier Quadrate. Zerlege ihn mit der 3. binomischen Formel – dann kürzt sich ein Faktor.',
  };
}

function quadratFaktorFall(z: Zufall, v: string): Roh | null {
  const k = z.ganzzahl(1, 9);
  const m = z.ganzzahl(2, 9);
  if (k === m) return null;
  const b = z.auswahl([1, -1]) * z.ganzzahl(1, 6);
  const x: Binom = { art: 'quadrat', a: gl(1, { [v]: 1 }), b: gl(b), k: 1 };
  const q = Bruch.von(k, m);
  const loesung = q.istGanz() ? { text: q.toString(), latex: q.toString() } : bruch({ text: `${q.zaehler}`, latex: `${q.zaehler}` }, { text: `${q.nenner}`, latex: `${q.nenner}` });
  const kF = { text: `${k}`, latex: `${k}` };
  const mF = { text: `${m}`, latex: `${m}` };
  const quadrat = binomFormel(x);
  const zaehlerF = k === 1 ? quadrat : produkt(kF, quadrat);
  const nennerF = produkt(mF, klammer(formel(binomErgebnis(x))));
  const klammerF = klammer(formel([x.a, x.b]));
  return {
    aufgabe: bruch(zaehlerF, nennerF),
    loesung,
    grad: 0,
    weg: [bruch(zaehlerF, produkt(mF, quadrat)), loesung],
    fehler: [
      { fehlertyp: 'BR', formel: bruch(k === 1 ? klammerF : produkt(kF, klammerF), mF), rueckmeldung: 'Der Nenner enthält (a − b)² – also kürzt sich das ganze Quadrat, nicht nur eine Klammer.' },
      { fehlertyp: 'BR', formel: bruch(mF, kF), rueckmeldung: 'Zähler und Nenner sind vertauscht.' },
    ],
    nenner: summeAlsPolynom(binomErgebnis(x)),
    variable: v,
    denkanstoss: 'Erkennst du im Nenner eine binomische Formel? Schreibe die Klammer als Quadrat – dann kürzt sich alles bis auf die Zahlen.',
  };
}

function nennerAusklammernFall(z: Zufall, v: string): Roh | null {
  const k = z.ganzzahl(2, 6);
  const b = z.auswahl([1, -1]) * z.ganzzahl(1, 9);
  if (b % k === 0) return null; // (x + b)/k soll nicht weiter vereinfachbar wirken
  const x: Binom = { art: 'quadrat', a: gl(1, { [v]: 1 }), b: gl(b), k: 1 };
  const lin = formel([x.a, x.b]);
  const nenner = [gl(k, { [v]: 1 }), gl(k * b)];
  const kF = { text: `${k}`, latex: `${k}` };
  const loesung = bruch(lin, kF);
  return {
    aufgabe: bruch(formel(binomErgebnis(x)), formel(nenner)),
    loesung,
    grad: 1,
    weg: [bruch(binomFormel(x), produkt(kF, klammer(lin))), loesung],
    fehler: [
      { fehlertyp: 'VZ', formel: bruch(formel([x.a, neg(x.b)]), kF) },
      { fehlertyp: 'BR', formel: lin, rueckmeldung: 'Im Nenner steht noch der Faktor ' + k + ' – er bleibt stehen.' },
      { fehlertyp: 'BR', formel: bruch(lin, formel([gl(1, { [v]: 1 }), gl(k * b)])), rueckmeldung: 'Klammere im Nenner zuerst aus – erst dann kannst du kürzen.' },
    ],
    nenner: summeAlsPolynom(nenner),
    variable: v,
    denkanstoss: 'Zerlege Zähler und Nenner in Faktoren: Im Zähler hilft eine binomische Formel, im Nenner Ausklammern.',
  };
}

/** Hinweis auf ausgeschlossene Werte (Nenner 0). */
function hinweis(nenner: Polynom, v: string): string {
  const g = nenner.gliederSortiert();
  const vars = nenner.variablen();
  if (vars.length === 1 && g.length === 1) return `Hinweis: Das gilt nur für ${v} ≠ 0 – durch 0 darf man nicht teilen.`;
  if (vars.length === 1 && g.length === 2 && g.every((x) => (x.monom[v] ?? 0) <= 1)) {
    const a = g.find((x) => (x.monom[v] ?? 0) === 1)!.koeffizient;
    const c = g.find((x) => (x.monom[v] ?? 0) === 0)?.koeffizient ?? Bruch.NULL;
    return `Hinweis: Das gilt nur für ${v} ≠ ${c.negiert().durch(a).alsText()} – dort wäre der Nenner 0.`;
  }
  return 'Hinweis: Das gilt nur, wenn der Nenner nicht 0 ist.';
}

export const bruchtermFaktorisierenKuerzen: Generator = {
  id: 't8-bruchterm-faktorisieren-kuerzen',
  version: 1,
  baustein: 't8-bruchterm-faktorisieren-kuerzen',
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

    for (let versuch = 0; versuch < 2000; versuch++) {
      const v = z.auswahl(['x', 'a', 'y', 'm']);
      const form = z.auswahl(['ausklammernZaehler', 'ausklammernNenner', 'dritte', 'quadratFaktor', 'nennerAusklammern'] as const);
      const r =
        form === 'ausklammernZaehler' ? ausklammernFall(z, v, false)
        : form === 'ausklammernNenner' ? ausklammernFall(z, v, true)
        : form === 'dritte' ? dritteFall(z, v)
        : form === 'quadratFaktor' ? quadratFaktorFall(z, v)
        : nennerAusklammernFall(z, v);
      if (!r) continue;
      const loesungK = leseTerm(r.loesung.text);
      const fehler = bereinigeBruchFehler(loesungK, r.fehler);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const ansatz: Formel = { text: `${r.aufgabe.text} = ${r.weg[0]!.text}`, latex: `${r.aufgabe.latex} = ${r.weg[0]!.latex}` };
      const h = hinweis(r.nenner, r.variable);
      const loesungsweg: Formel[] = [ansatz, ...r.weg.slice(1).map((x) => ({ text: `= ${x.text}`, latex: `= ${x.latex}` })), { text: h, latex: `\\text{${h}}` }];
      let optionen: Auswahloption[] | undefined;
      if (typ === 'auswahl') {
        optionen = z.gemischt([{ formel: r.loesung, richtig: true }, ...fehler.slice(0, 3).map((x) => ({ formel: x.formel, richtig: false, fehlertyp: x.fehlertyp, ...(x.rueckmeldung ? { rueckmeldung: x.rueckmeldung } : {}) }))]);
      }
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'III',
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht beim vollständigen Kürzen?' : 'Kürze so weit wie möglich.',
        aufgabe: r.aufgabe,
        loesung: r.loesung,
        hilfen: { denkanstoss: r.denkanstoss, ansatz, loesungsweg },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort, RM);
          return pruefeBruchterm(antwort, loesungK, r.grad, fehler, RM);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
