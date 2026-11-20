import { describe, expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { Polynom } from '../mathe/polynom';
import { istNormalform, leseAlsPolynom, leseTerm, type Knoten } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { ausmultiplizierenMonom as gen } from './t8-ausmultiplizieren-monom';
import type { AFB, Aufgabe, Aufgabentyp } from './typen';

const SEEDS = 1000;
const KOMBINATIONEN: [AFB, Aufgabentyp][] = [
  ['I', 'eingabe'],
  ['I', 'auswahl'],
  ['II', 'eingabe'],
  ['II', 'auswahl'],
];

/**
 * Unabhängige Auswertung direkt auf dem Syntaxbaum mit Bruch-Arithmetik
 * (ohne die Polynom-Klasse), damit die Korrektheitsprüfung nicht denselben
 * Code nutzt wie der Generator.
 */
function werteAus(k: Knoten, b: Record<string, Bruch>): Bruch {
  switch (k.art) {
    case 'zahl': return k.wert;
    case 'variable': return b[k.name]!;
    case 'klammer': return werteAus(k.knoten, b);
    case 'negation': return werteAus(k.knoten, b).negiert();
    case 'summe': return k.glieder.reduce((s, g) => (g.minus ? s.minus(werteAus(g.knoten, b)) : s.plus(werteAus(g.knoten, b))), Bruch.NULL);
    case 'produkt': return k.faktoren.reduce((s, f) => s.mal(werteAus(f, b)), Bruch.EINS);
    case 'potenz': return werteAus(k.basis, b).hoch(k.exponent);
    case 'quotient': return werteAus(k.zaehler, b).durch(werteAus(k.nenner, b));
  }
}

function gleichwertigDurchEinsetzen(a: string, c: string, z: Zufall): boolean {
  const ka = leseTerm(a);
  const kc = leseTerm(c);
  for (let i = 0; i < 4; i++) {
    const b: Record<string, Bruch> = {};
    for (const v of 'abcmnxy') b[v] = Bruch.von(z.ganzzahl(-30, 30), z.ganzzahl(1, 7));
    if (!werteAus(ka, b).gleich(werteAus(kc, b))) return false;
  }
  return true;
}

function alleAufgaben(): Aufgabe[] {
  const liste: Aufgabe[] = [];
  for (const [afb, typ] of KOMBINATIONEN) for (let s = 0; s < SEEDS; s++) liste.push(gen.erzeuge(s, { afb, typ }));
  return liste;
}
const AUFGABEN = alleAufgaben();

/** Zerlegt eine Aufgabe in Faktor und Klammerglieder – unabhängig vom Generator, nur aus dem Aufgabentext. */
function zerlegeAufgabe(a: Aufgabe): { faktor: Polynom; glieder: Polynom[] } {
  let k = leseTerm(a.aufgabe.text);
  let vorzeichen = Polynom.zahl(1);
  // führendes Minus: "−(…)" oder "−2·(…)"
  if (k.art === 'summe' && k.glieder.length === 1 && k.glieder[0]!.minus) {
    vorzeichen = Polynom.zahl(-1);
    k = k.glieder[0]!.knoten;
  }
  const gliederVon = (kl: Knoten): Polynom[] => {
    if (kl.art !== 'klammer' || kl.knoten.art !== 'summe') throw new Error('Klammer mit Summe erwartet');
    return kl.knoten.glieder.map((g) => (g.minus ? werteAlsPolynom(g.knoten).negiert() : werteAlsPolynom(g.knoten)));
  };
  if (k.art === 'klammer') return { faktor: vorzeichen, glieder: gliederVon(k) };
  if (k.art !== 'produkt') throw new Error('Produkt erwartet');
  const klammer = k.faktoren[k.faktoren.length - 1]!;
  const faktor = k.faktoren.slice(0, -1).map(werteAlsPolynom).reduce((x, y) => x.mal(y)).mal(vorzeichen);
  return { faktor, glieder: gliederVon(klammer) };
}
function werteAlsPolynom(k: Knoten): Polynom {
  // eigener kleiner Umweg über Text wäre zirkulär; Polynom-Aufbau aus Baum ist hier ok,
  // da nur Aufgabenstruktur (nicht die Lösung) gelesen wird
  switch (k.art) {
    case 'zahl': return Polynom.zahl(k.wert);
    case 'variable': return Polynom.variable(k.name);
    case 'negation': return werteAlsPolynom(k.knoten).negiert();
    case 'potenz': return werteAlsPolynom(k.basis).hoch(k.exponent);
    case 'produkt': return k.faktoren.map(werteAlsPolynom).reduce((x, y) => x.mal(y));
    case 'klammer': return werteAlsPolynom(k.knoten);
    case 'summe': return Polynom.summe(k.glieder.map((g) => (g.minus ? werteAlsPolynom(g.knoten).negiert() : werteAlsPolynom(g.knoten))));
    case 'quotient': throw new Error('unerwartet');
  }
}

describe('t8-ausmultiplizieren-monom', () => {
  it('Metadaten passen zum Baustein', () => {
    expect(gen.baustein).toBe('t8-ausmultiplizieren-monom');
    expect(gen.afb).toEqual(['I', 'II']);
  });

  it('Determinismus: gleicher Seed → identische Aufgabe', () => {
    for (const [afb, typ] of KOMBINATIONEN) {
      for (let s = 0; s < 50; s++) {
        const a = gen.erzeuge(s, { afb, typ });
        const b = gen.erzeuge(s, { afb, typ });
        expect(JSON.stringify({ ...a, pruefe: 0 })).toBe(JSON.stringify({ ...b, pruefe: 0 }));
      }
    }
  });

  it(`Masse: ${SEEDS * KOMBINATIONEN.length} Aufgaben ohne Fehler, Metadaten korrekt`, () => {
    expect(AUFGABEN).toHaveLength(SEEDS * KOMBINATIONEN.length);
    for (const a of AUFGABEN) {
      expect(a.generator).toBe(gen.id);
      expect(a.ohneHilfsmittel).toBe(true);
    }
  });

  it('Korrektheit: Lösung ist gleichwertig zur Aufgabe (unabhängig durch Einsetzen geprüft)', () => {
    const z = new Zufall(99);
    for (const a of AUFGABEN) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, a.loesung.text, z), a.aufgabe.text).toBe(true);
  });

  it('Lösung ist vollständig ausmultipliziert und zusammengefasst', () => {
    for (const a of AUFGABEN) expect(istNormalform(leseTerm(a.loesung.text)), a.loesung.text).toBe(true);
  });

  it('Zahlenbereiche: Koeffizienten ≤ 81, Hochzahlen ≤ 3, Faktor nie ±1 (außer Minusklammer)', () => {
    for (const a of AUFGABEN) {
      for (const g of leseAlsPolynom(a.loesung.text)!.gliederSortiert()) {
        expect(g.koeffizient.betrag().vergleiche(81)).toBeLessThanOrEqual(0);
        expect(g.koeffizient.istGanz()).toBe(true);
        for (const e of Object.values(g.monom)) expect(e).toBeLessThanOrEqual(3);
      }
      const { faktor } = zerlegeAufgabe(a);
      const k = faktor.alsKonstante();
      if (k && k.betrag().gleich(1)) expect(a.aufgabe.text.startsWith('−(')).toBe(true);
    }
  });

  it('AFB I nur Zahlenfaktoren, AFB II Faktor mit Variablen', () => {
    for (const a of AUFGABEN) {
      const { faktor } = zerlegeAufgabe(a);
      expect(faktor.alsKonstante() !== null).toBe(a.afb === 'I');
    }
  });

  it('keine Duplikate über 5 % je Kombination', () => {
    for (const [afb, typ] of KOMBINATIONEN) {
      const texte = AUFGABEN.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      expect(new Set(texte).size / texte.length).toBeGreaterThan(0.95);
    }
  });

  it('Antwortprüfung: richtige Lösung in verschiedenen Schreibweisen wird akzeptiert', () => {
    for (const a of AUFGABEN.filter((x) => x.typ === 'eingabe')) {
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      const p = leseAlsPolynom(a.loesung.text)!;
      expect(a.pruefe(p.alsText()).ergebnis).toBe('richtig'); // ohne Malpunkt
      // andere Reihenfolge der Glieder
      const umgedreht = [...p.gliederSortiert()].reverse().map((g) => Polynom.glied(g.koeffizient, g.monom).alsText()).join(' + ');
      expect(a.pruefe(umgedreht).ergebnis).toBe('richtig');
    }
  });

  it('Antwortprüfung: nicht ausmultipliziert → unvollständig, Unsinn → unlesbar', () => {
    for (const a of AUFGABEN.filter((x) => x.typ === 'eingabe').slice(0, 300)) {
      expect(a.pruefe(a.aufgabe.text).ergebnis).toBe('unvollstaendig');
      expect(a.pruefe('3x+(').ergebnis).toBe('unlesbar');
      expect(a.pruefe('').ergebnis).toBe('unlesbar');
    }
  });

  it('Antwortprüfung: typische Fehler werden dem richtigen Fehlertyp zugeordnet (unabhängig nachgebildet)', () => {
    let kl = 0;
    let vz = 0;
    for (const a of AUFGABEN.filter((x) => x.typ === 'eingabe')) {
      const { faktor, glieder } = zerlegeAufgabe(a);
      const loesung = leseAlsPolynom(a.loesung.text)!;
      // KL: nur erstes Glied multipliziert
      const klAntwort = Polynom.summe([faktor.mal(glieder[0]!), ...glieder.slice(1)]);
      if (!klAntwort.gleich(loesung)) {
        const b = a.pruefe(klAntwort.alsText());
        expect(b.ergebnis).toBe('falsch');
        expect(b.fehlertyp).toBe('KL');
        kl++;
      }
      // VZ bei negativem Faktor: Vorzeichen ab dem 2. Glied nicht geändert
      const k = faktor.gliederSortiert()[0]!.koeffizient;
      if (k.istNegativ()) {
        const vzAntwort = Polynom.summe(glieder.map((g, i) => (i === 0 ? faktor.mal(g) : faktor.mal(g).negiert())));
        if (!vzAntwort.gleich(loesung) && !vzAntwort.gleich(klAntwort)) {
          const b = a.pruefe(vzAntwort.alsText());
          expect(b.fehlertyp, a.aufgabe.text).toBe('VZ');
          vz++;
        }
      }
      // völlig andere Antwort → UK
      expect(a.pruefe('x + 12345').fehlertyp).toBe('UK');
    }
    expect(kl).toBeGreaterThan(500);
    expect(vz).toBeGreaterThan(200);
  });

  it('Auswahl: genau eine richtige Option, Fehloptionen verschieden, je mit Fehlertyp', () => {
    for (const a of AUFGABEN.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.length).toBeLessThanOrEqual(4);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      const polys = o.map((x) => leseAlsPolynom(x.formel.text)!);
      for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) expect(polys[i]!.gleich(polys[j]!)).toBe(false);
      for (const x of o) {
        if (x.richtig) expect(x.fehlertyp).toBeUndefined();
        else expect(['KL', 'VZ', 'PO']).toContain(x.fehlertyp);
      }
      // richtige Option ist wirklich die Lösung
      expect(polys[o.findIndex((x) => x.richtig)]!.gleich(leseAlsPolynom(a.loesung.text)!)).toBe(true);
      // Prüfen über den Index
      o.forEach((x, i) => {
        const b = a.pruefe(String(i));
        expect(b.ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
        if (!x.richtig) expect(b.fehlertyp).toBe(x.fehlertyp);
      });
      expect(a.pruefe('7').ergebnis).toBe('unlesbar');
    }
  });

  it('Auswahl: jede Fehloption entsteht tatsächlich durch ihren Fehler', () => {
    for (const a of AUFGABEN.filter((x) => x.typ === 'auswahl')) {
      const { faktor, glieder } = zerlegeAufgabe(a);
      const loesung = leseAlsPolynom(a.loesung.text)!;
      for (const x of a.optionen!.filter((o) => !o.richtig)) {
        const p = leseAlsPolynom(x.formel.text)!;
        if (x.fehlertyp === 'KL') {
          expect(p.gleich(Polynom.summe([faktor.mal(glieder[0]!), ...glieder.slice(1)]))).toBe(true);
        } else if (x.fehlertyp === 'VZ') {
          // gleiche Monome, gleiche Beträge, nur Vorzeichen anders
          const s = (q: Polynom) => q.gliederSortiert().map((g) => JSON.stringify(g.monom) + g.koeffizient.betrag().toString()).sort().join();
          expect(s(p)).toBe(s(loesung));
        } else if (x.fehlertyp === 'PO') {
          // gleiche Koeffizienten, aber niedrigerer Gesamtgrad (Hochzahlen nicht addiert)
          const grad = (q: Polynom) => q.gliederSortiert().reduce((m, g) => m + Object.values(g.monom).reduce((u, e) => u + e, 0), 0);
          expect(grad(p)).toBeLessThan(grad(loesung));
        }
      }
    }
  });

  it('Hilfen: drei Stufen, jede Zeile des Lösungswegs ist eine wahre Gleichung, letzte endet mit der Lösung', () => {
    const z = new Zufall(5);
    for (const a of AUFGABEN) {
      expect(a.hilfen.denkanstoss.length).toBeGreaterThan(20);
      expect(a.hilfen.ansatz.text).toContain('=');
      const weg = a.hilfen.loesungsweg;
      expect(weg.length).toBeGreaterThanOrEqual(2);
      expect(weg[weg.length - 1]!.text).toBe(`= ${a.loesung.text}`);
      // erste Zeile: Aufgabe = Ansatz
      const [links, rechts] = weg[0]!.text.split(' = ');
      expect(links).toBe(a.aufgabe.text);
      expect(gleichwertigDurchEinsetzen(links!, rechts!, z)).toBe(true);
      for (const zeile of weg.slice(1)) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeile.text.slice(2), z), zeile.text).toBe(true);
    }
  });

  it('Referenzaufgaben bleiben stabil (Version 1)', () => {
    const r = [0, 1, 2].map((s) => {
      const a = gen.erzeuge(s, { afb: 'II', typ: 'eingabe' });
      return `${a.aufgabe.text} = ${a.loesung.text}`;
    });
    expect(r).toMatchInlineSnapshot(`
      [
        "−2·a·(5·b² − 3·a) = −10·a·b² + 6·a²",
        "m·n·(8·n² + 8) = 8·m·n³ + 8·m·n",
        "−4·m·n·(3·m − 4·n) = −12·m²·n + 16·m·n²",
      ]
    `);
  });
});
