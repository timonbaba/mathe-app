/**
 * Generator für Baustein t8-termwert
 * „Werte in Terme einsetzen“ (Gym Kl. 8, LB 1).
 *
 *  - AFB I:  ganze Zahlen (auch negative), z. B. 3x² − 5 für x = −2; Wertetabelle mit Lücke
 *  - AFB II: Brüche und zwei Variablen, z. B. 2x² − 3xy + 1 für x = −1/2, y = 3
 *
 * Diagnostische Fehlantworten:
 *  - VZ  negative Zahl ohne Klammer quadriert: (−2)² als −2² = −4 gerechnet
 *  - VZ  Minus mal Minus als Minus gerechnet
 *  - PO  x² als 2·x gerechnet
 */
import { Bruch } from '../mathe/bruch';
import { werteTermAus } from '../mathe/auswertung';
import { leseTerm, type Knoten } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { formel, pruefeAuswahl } from './gemeinsam';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';
import type { Glied } from '../mathe/polynom';

type Modus = 'richtig' | 'VZ-quadrat' | 'VZ-produkt' | 'PO';

/** Auswertung mit einem typischen Fehler. */
function werteMitFehler(k: Knoten, b: Readonly<Record<string, Bruch>>, modus: Modus): Bruch {
  const w = (x: Knoten) => werteMitFehler(x, b, modus);
  switch (k.art) {
    case 'zahl': return k.wert;
    case 'variable': return b[k.name]!;
    case 'klammer': return w(k.knoten);
    case 'negation': return w(k.knoten).negiert();
    case 'summe': return k.glieder.reduce((s, g) => (g.minus ? s.minus(w(g.knoten)) : s.plus(w(g.knoten))), Bruch.NULL);
    case 'produkt': {
      const werte = k.faktoren.map(w);
      const p = werte.reduce((s, x) => s.mal(x), Bruch.EINS);
      if (modus === 'VZ-produkt' && werte.filter((x) => x.istNegativ()).length >= 2) return p.betrag().negiert();
      return p;
    }
    case 'potenz': {
      const basis = w(k.basis);
      if (modus === 'PO') return basis.mal(k.exponent);
      if (modus === 'VZ-quadrat' && k.basis.art === 'variable' && basis.istNegativ() && k.exponent % 2 === 0) return basis.betrag().hoch(k.exponent).negiert();
      return basis.hoch(k.exponent);
    }
    case 'quotient': return w(k.zaehler).durch(w(k.nenner));
  }
}

/** Text des Terms mit eingesetzten Werten, z. B. „3·(−2)² − 5“. */
function eingesetzt(k: Knoten, b: Readonly<Record<string, Bruch>>, ziel: 'text' | 'latex'): string {
  const wert = (x: Bruch) => {
    const t = ziel === 'latex' ? (x.istGanz() ? x.toString() : `${x.istNegativ() ? '-' : ''}\\frac{${x.betrag().zaehler}}{${x.betrag().nenner}}`) : x.alsText();
    return x.istNegativ() || !x.istGanz() ? (ziel === 'latex' ? `\\left(${t}\\right)` : `(${t})`) : t;
  };
  const e = (x: Knoten) => eingesetzt(x, b, ziel);
  const mal = ziel === 'latex' ? ' \\cdot ' : '·';
  switch (k.art) {
    case 'zahl': return k.wert.alsText();
    case 'variable': return wert(b[k.name]!);
    case 'klammer': return ziel === 'latex' ? `\\left(${e(k.knoten)}\\right)` : `(${e(k.knoten)})`;
    case 'negation': return `−${e(k.knoten)}`;
    case 'summe':
      return k.glieder.map((g, i) => (i === 0 ? (g.minus ? (ziel === 'latex' ? '-' : '−') : '') + e(g.knoten) : `${g.minus ? (ziel === 'latex' ? ' - ' : ' − ') : ' + '}${e(g.knoten)}`)).join('');
    case 'produkt': return k.faktoren.map(e).join(mal);
    case 'potenz': return ziel === 'latex' ? `${e(k.basis)}^{${k.exponent}}` : `${e(k.basis)}${k.exponent === 2 ? '²' : k.exponent === 3 ? '³' : `^${k.exponent}`}`;
    case 'quotient': return `${e(k.zaehler)} : ${e(k.nenner)}`;
  }
}

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

interface Roh {
  term: Formel;
  belegung: Record<string, Bruch>;
}

function ziehe(z: Zufall, afb: AFB): Roh {
  const v = z.auswahl(['x', 'a', 'n']);
  const k = () => z.ganzzahlOhne(-9, 9, [0]);
  if (afb === 'I') {
    const x = Bruch.von(z.ganzzahlOhne(-6, 6, [0]));
    const form = z.auswahl(['linear', 'quadrat', 'klammer', 'quadratLinear'] as const);
    if (form === 'klammer') {
      const a = k();
      const b = k();
      const innen = formel([gl(1, { [v]: 1 }), gl(b)]);
      return { term: { text: `${Bruch.von(a).alsText()}·(${innen.text})`, latex: `${a} \\cdot \\left(${innen.latex}\\right)` }, belegung: { [v]: x } };
    }
    const glieder =
      form === 'linear' ? [gl(k(), { [v]: 1 }), gl(k())]
      : form === 'quadrat' ? [gl(k(), { [v]: 2 }), gl(k())]
      : [gl(k(), { [v]: 2 }), gl(k(), { [v]: 1 })];
    return { term: formel(glieder), belegung: { [v]: x } };
  }
  const zweiVariablen = z.mitWahrscheinlichkeit(0.5);
  if (zweiVariablen) {
    const w = v === 'x' ? 'y' : 'b';
    return {
      term: formel([gl(k(), { [v]: 2 }), gl(k(), { [v]: 1, [w]: 1 }), gl(k())]),
      belegung: { [v]: Bruch.von(z.ganzzahlOhne(-5, 5, [0])), [w]: Bruch.von(z.ganzzahlOhne(-5, 5, [0])) },
    };
  }
  const x = Bruch.von(z.ganzzahlOhne(-5, 5, [0]), z.ganzzahl(2, 4));
  return { term: formel([gl(k(), { [v]: 2 }), gl(k(), { [v]: 1 }), gl(k())]), belegung: { [v]: x } };
}

export const termwert: Generator = {
  id: 't8-termwert',
  version: 1,
  baustein: 't8-termwert',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch', 'tabelle'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II'] as const);
    if (afb === 'III') throw new GeneratorFehler('AFB III wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 1000; versuch++) {
      const r = ziehe(z, afb);
      if (r.belegung[Object.keys(r.belegung)[0]!]!.istNull()) continue;
      const k = leseTerm(r.term.text);
      const wert = werteTermAus(k, r.belegung);
      if (wert.betrag().vergleiche(200) > 0) continue;
      // Fehlantworten
      const fehler: { fehlertyp: FehlertypCode; wert: Bruch; rueckmeldung: string }[] = [];
      const fehlerwert = (m: Modus, t: FehlertypCode, rm: string) => {
        const f = werteMitFehler(k, r.belegung, m);
        if (!f.gleich(wert) && !fehler.some((x) => x.wert.gleich(f))) fehler.push({ fehlertyp: t, wert: f, rueckmeldung: rm });
      };
      fehlerwert('VZ-quadrat', 'VZ', 'Setze negative Zahlen in Klammern ein: (−2)² = 4, aber −2² = −4.');
      fehlerwert('VZ-produkt', 'VZ', 'Minus mal Minus ergibt Plus.');
      fehlerwert('PO', 'PO', 'x² heißt x·x, nicht 2·x.');
      if (typ === 'auswahl' && fehler.length < 2) continue;

      const tabelleVariante = afb === 'I' && Object.keys(r.belegung).length === 1 && z.mitWahrscheinlichkeit(0.35);
      const v = Object.keys(r.belegung)[0]!;
      const belegungText = Object.entries(r.belegung).map(([n, x]) => `${n} = ${x.alsText()}`).join(' und ');
      const loesung: Formel = { text: wert.alsText(), latex: wert.istGanz() ? wert.toString() : `${wert.istNegativ() ? '-' : ''}\\frac{${wert.betrag().zaehler}}{${wert.betrag().nenner}}` };
      const einsetzen: Formel = { text: eingesetzt(k, r.belegung, 'text'), latex: eingesetzt(k, r.belegung, 'latex') };
      // Zwischenzeile: Werte der einzelnen Glieder
      const zwischen =
        k.art === 'summe'
          ? k.glieder.map((g, i) => { const gw = werteTermAus(g.knoten, r.belegung); const s = g.minus ? gw.negiert() : gw; return i === 0 ? s.alsText() : s.istNegativ() ? ` − ${s.betrag().alsText()}` : ` + ${s.alsText()}`; }).join('')
          : null;
      const loesungsweg: Formel[] = [{ text: `${r.term.text} = ${einsetzen.text}`, latex: `${r.term.latex} = ${einsetzen.latex}` }];
      if (zwischen && zwischen !== wert.alsText()) loesungsweg.push({ text: `= ${zwischen}`, latex: `= ${zwischen.replace(/−/g, '-')}` });
      loesungsweg.push({ text: `= ${loesung.text}`, latex: `= ${loesung.latex}` });

      let tabelle: Aufgabe['tabelle'];
      if (tabelleVariante) {
        const xs = [-2, -1, 0, 1, 2, 3];
        const gesucht = r.belegung[v]!;
        const spalten = xs.includes(Number(gesucht.zaehler)) ? xs : [...xs.slice(0, 5), Number(gesucht.zaehler)].sort((a, b) => a - b);
        tabelle = {
          kopf: [v, ...spalten.map((x) => Bruch.von(x).alsText())],
          zeilen: [['Wert', ...spalten.map((x) => (Bruch.von(x).gleich(gesucht) ? '?' : werteTermAus(k, { [v]: Bruch.von(x) }).alsText()))]],
        };
      }
      const optionen: Auswahloption[] | undefined =
        typ === 'auswahl'
          ? z.gemischt([
              { formel: loesung, richtig: true },
              ...fehler.slice(0, 3).map((f) => ({ formel: { text: f.wert.alsText(), latex: f.wert.alsText().replace('−', '-') }, richtig: false, fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung })),
            ])
          : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: tabelle ? 'tabelle' : 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: tabelle ? 'Ergänze den fehlenden Wert in der Wertetabelle.' : `Berechne den Wert des Terms für ${belegungText}.`,
        aufgabe: r.term,
        loesung,
        tabelle,
        hilfen: {
          denkanstoss: 'Setze die Zahl für die Variable ein – negative Zahlen und Brüche immer in Klammern. Dann gilt: Potenzen vor Punkt vor Strich.',
          ansatz: loesungsweg[0]!,
          loesungsweg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          const teil = antwort.includes('=') ? antwort.slice(antwort.lastIndexOf('=') + 1) : antwort;
          const a = Bruch.parse(teil);
          if (!a) return { ergebnis: 'unlesbar', rueckmeldung: 'Gib eine Zahl ein, z. B. −7 oder 3/4.' };
          if (a.gleich(wert)) return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
          const f = fehler.find((x) => x.wert.gleich(a));
          if (f) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung };
          return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das stimmt noch nicht. Setze Schritt für Schritt ein und rechne die Glieder einzeln aus.' };
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
