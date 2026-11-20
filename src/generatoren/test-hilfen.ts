/**
 * Allgemeine Pflichttests für Generatoren, die einen Term vereinfachen lassen
 * (CLAUDE.md, Arbeitsregel 3). Nur in Testdateien verwenden.
 */
import { expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { Polynom } from '../mathe/polynom';
import { istNormalform, leseAlsPolynom, leseTerm, type Knoten } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import type { AFB, Aufgabe, Aufgabentyp, FehlertypCode, Generator } from './typen';

/**
 * Unabhängige Auswertung direkt auf dem Syntaxbaum mit Bruch-Arithmetik
 * (ohne Polynom-Klasse und ohne Generator-Code).
 */
export function werteAus(k: Knoten, b: Record<string, Bruch>): Bruch {
  switch (k.art) {
    case 'zahl': return k.wert;
    case 'variable': return b[k.name]!;
    case 'klammer': return werteAus(k.knoten, b);
    case 'negation': return werteAus(k.knoten, b).negiert();
    case 'summe': return k.glieder.reduce((s, x) => (x.minus ? s.minus(werteAus(x.knoten, b)) : s.plus(werteAus(x.knoten, b))), Bruch.NULL);
    case 'produkt': return k.faktoren.reduce((s, f) => s.mal(werteAus(f, b)), Bruch.EINS);
    case 'potenz': return werteAus(k.basis, b).hoch(k.exponent);
    case 'quotient': return werteAus(k.zaehler, b).durch(werteAus(k.nenner, b));
  }
}

export function gleichwertigDurchEinsetzen(a: string, c: string, z: Zufall): boolean {
  const ka = leseTerm(a);
  const kc = leseTerm(c);
  let geprueft = 0;
  for (let i = 0; i < 40 && geprueft < 4; i++) {
    const b: Record<string, Bruch> = {};
    for (const v of 'abcdmnpqrstuvwxyzAFhlRVρπ') b[v] = Bruch.von(z.ganzzahl(-30, 30), z.ganzzahl(1, 7));
    let wa: Bruch;
    let wc: Bruch;
    try {
      wa = werteAus(ka, b);
      wc = werteAus(kc, b);
    } catch (e) {
      if (e instanceof RangeError) continue; // Nenner 0 – andere Stelle
      throw e;
    }
    if (!wa.gleich(wc)) return false;
    geprueft++;
  }
  if (geprueft < 4) throw new Error(`Zu wenige gültige Einsetzstellen: ${a} | ${c}`);
  return true;
}

export interface Optionen {
  readonly kombinationen: readonly (readonly [AFB, Aufgabentyp])[];
  readonly seeds?: number;
  /** Erlaubte Fehlertypen der Auswahloptionen. */
  readonly fehlertypen: readonly FehlertypCode[];
  /** Grenzen für das Ergebnis */
  readonly maxKoeffizient: number;
  readonly maxHochzahl: number;
  /** Mindestanteil verschiedener Aufgaben je Kombination (Standard 0,95) */
  readonly mindestVielfalt?: number;
  /**
   * Alternativ: Mindestanzahl verschiedener Aufgaben je Kombination – für Bausteine mit
   * naturgemäß kleinem Aufgabenraum (z. B. (x + 3)²). Wiederholungen innerhalb einer Runde
   * verhindert die Aufgabenauswahl.
   */
  readonly mindestAnzahlVerschieden?: Partial<Record<AFB, number>>;
}

/** Erzeugt alle Aufgaben (einmal pro Testdatei) und registriert die Pflichttests. */
export function pflichttestsTermVereinfachen(gen: Generator, o: Optionen): Aufgabe[] {
  const seeds = o.seeds ?? 1000;
  const aufgaben: Aufgabe[] = [];
  for (const [afb, typ] of o.kombinationen) for (let s = 0; s < seeds; s++) aufgaben.push(gen.erzeuge(s, { afb, typ }));
  const eingabe = aufgaben.filter((a) => a.typ === 'eingabe');
  const auswahl = aufgaben.filter((a) => a.typ === 'auswahl');

  it('Determinismus: gleicher Seed → identische Aufgabe', () => {
    for (const [afb, typ] of o.kombinationen) {
      for (let s = 0; s < 50; s++) {
        const a = gen.erzeuge(s, { afb, typ });
        const b = gen.erzeuge(s, { afb, typ });
        expect(JSON.stringify({ ...a, pruefe: 0 })).toBe(JSON.stringify({ ...b, pruefe: 0 }));
      }
    }
  });

  it(`Masse: ${aufgaben.length} Aufgaben ohne Fehler, Metadaten korrekt`, () => {
    for (const a of aufgaben) {
      expect(a.generator).toBe(gen.id);
      expect(a.baustein).toBe(gen.baustein);
      expect(gen.afb).toContain(a.afb);
      expect(a.ohneHilfsmittel).toBe(gen.ohneHilfsmittel);
    }
  });

  it('Korrektheit: Lösung gleichwertig zur Aufgabe (unabhängig durch Einsetzen geprüft)', () => {
    const z = new Zufall(99);
    for (const a of aufgaben) expect(gleichwertigDurchEinsetzen(a.aufgabe.text, a.loesung.text, z), a.aufgabe.text).toBe(true);
  });

  it('Lösung ist vollständig vereinfacht; Aufgabe ist es nicht', () => {
    for (const a of aufgaben) {
      expect(istNormalform(leseTerm(a.loesung.text)), a.loesung.text).toBe(true);
      expect(istNormalform(leseTerm(a.aufgabe.text)), a.aufgabe.text).toBe(false);
    }
  });

  it(`Zahlenbereiche: |Koeffizient| ≤ ${o.maxKoeffizient}, Hochzahlen ≤ ${o.maxHochzahl}, ganzzahlig`, () => {
    for (const a of aufgaben) {
      for (const x of leseAlsPolynom(a.loesung.text)!.gliederSortiert()) {
        expect(x.koeffizient.betrag().vergleiche(o.maxKoeffizient), a.loesung.text).toBeLessThanOrEqual(0);
        expect(x.koeffizient.istGanz()).toBe(true);
        for (const e of Object.values(x.monom)) expect(e).toBeLessThanOrEqual(o.maxHochzahl);
      }
    }
  });

  it('Vielfalt: kaum doppelte Aufgaben', () => {
    for (const [afb, typ] of o.kombinationen) {
      const texte = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text);
      const absolut = o.mindestAnzahlVerschieden?.[afb];
      if (absolut !== undefined) expect(new Set(texte).size, `${afb}/${typ}`).toBeGreaterThanOrEqual(absolut);
      else expect(new Set(texte).size / texte.length, `${afb}/${typ}`).toBeGreaterThan(o.mindestVielfalt ?? 0.95);
    }
  });

  if (eingabe.length) {
    it('Eingabe: richtige Lösung in verschiedenen Schreibweisen wird akzeptiert', () => {
      for (const a of eingabe) {
        expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
        const p = leseAlsPolynom(a.loesung.text)!;
        expect(a.pruefe(p.alsText({ malpunkt: true })).ergebnis).toBe('richtig');
        const umgedreht = [...p.gliederSortiert()].reverse().map((x) => Polynom.glied(x.koeffizient, x.monom).alsText()).join(' + ');
        expect(a.pruefe(umgedreht).ergebnis).toBe('richtig');
      }
    });

    it('Eingabe: Aufgabe abgeschrieben → unvollständig; Unsinn → unlesbar; Fremdes → UK', () => {
      for (const a of eingabe.slice(0, 300)) {
        expect(a.pruefe(a.aufgabe.text).ergebnis).toBe('unvollstaendig');
        expect(a.pruefe('3x+(').ergebnis).toBe('unlesbar');
        expect(a.pruefe('').ergebnis).toBe('unlesbar');
        expect(a.pruefe('z + 12345').fehlertyp).toBe('UK');
      }
    });
  }

  if (auswahl.length) {
    it('Auswahl: 3–4 Optionen, genau eine richtig, alle verschieden, Fehlertypen gesetzt', () => {
      for (const a of auswahl) {
        const opts = a.optionen!;
        expect(opts.length).toBeGreaterThanOrEqual(3);
        expect(opts.length).toBeLessThanOrEqual(4);
        expect(opts.filter((x) => x.richtig)).toHaveLength(1);
        const polys = opts.map((x) => leseAlsPolynom(x.formel.text)!);
        for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) expect(polys[i]!.gleich(polys[j]!), a.aufgabe.text).toBe(false);
        for (const x of opts) {
          if (x.richtig) expect(x.fehlertyp).toBeUndefined();
          else expect(o.fehlertypen).toContain(x.fehlertyp);
          expect(istNormalform(leseTerm(x.formel.text)), x.formel.text).toBe(true);
        }
        expect(polys[opts.findIndex((x) => x.richtig)]!.gleich(leseAlsPolynom(a.loesung.text)!)).toBe(true);
        opts.forEach((x, i) => {
          const b = a.pruefe(String(i));
          expect(b.ergebnis).toBe(x.richtig ? 'richtig' : 'falsch');
          if (!x.richtig) expect(b.fehlertyp).toBe(x.fehlertyp);
        });
        expect(a.pruefe('7').ergebnis).toBe('unlesbar');
      }
    });
  }

  it('Hilfen: drei Stufen; jede Zeile des Lösungswegs ist gleichwertig; letzte Zeile = Lösung', () => {
    const z = new Zufall(5);
    for (const a of aufgaben) {
      expect(a.hilfen.denkanstoss.length).toBeGreaterThan(20);
      expect(a.hilfen.ansatz.text).toContain('=');
      const weg = a.hilfen.loesungsweg;
      expect(weg.length).toBeGreaterThanOrEqual(2);
      expect(weg[weg.length - 1]!.text).toBe(`= ${a.loesung.text}`);
      const [links, rechts] = weg[0]!.text.split(' = ');
      expect(links).toBe(a.aufgabe.text);
      expect(gleichwertigDurchEinsetzen(links!, rechts!, z)).toBe(true);
      for (const zeile of weg.slice(1)) {
        expect(zeile.text.startsWith('= ')).toBe(true);
        expect(gleichwertigDurchEinsetzen(a.aufgabe.text, zeile.text.slice(2), z), zeile.text).toBe(true);
      }
    }
  });

  return aufgaben;
}
