/**
 * Generator für Baustein t8-term-gleichwertig
 * „Prüfen, ob zwei Terme gleichwertig sind“ (Gym Kl. 8, LB 1, AFB II/III).
 *
 * Aufgabentypen:
 *  - fehler-finden (AFB II): Eine vorgerechnete Umformung enthält genau einen Fehler.
 *    Ab der falschen Zeile wird folgerichtig weitergerechnet (wie es ein Schüler täte).
 *    Gesucht ist die erste falsche Zeile.
 *  - eingabe / Gegenbeispiel (AFB III): Eine falsche Umformung wie (x + 3)² = x² + 9
 *    soll durch einen Wert für x widerlegt werden.
 *
 * Eingebaute Fehler (Fehlertypen): KL (gemischte Produkte vergessen bzw. Minus vor der
 * Klammer nur auf das erste Glied), VZ (Minus mal Minus = Minus; Vorzeichen beim
 * Zusammenfassen), PO (x · x = x).
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, monomSchluessel, Polynom, type Glied } from '../mathe/polynom';
import { leseAlsPolynom } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { formel, gliedMal, summeAlsPolynom } from './gemeinsam';
import { formelVon, g, glied, kl, loese, type Modus, type Summe } from './termbaum';
import { ergebnisVon, einzelprodukte, produktFormel, type Produkt } from './t8-summe-mal-summe';
import { zusammenfassenSortiert } from './termbaum';
import { ANZEIGE, GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

interface Kette {
  start: Formel;
  /** richtige Zeilen */
  richtig: Formel[];
  /** Zeilen mit Fehler; ab Index `fehlerBei` weichen sie ab */
  falsch: Formel[];
  fehlerBei: number;
  fehlertyp: FehlertypCode;
  /** Variable und Wert zum Nachprüfen durch Einsetzen */
  variable: string;
}

// --- Hilfsfunktionen -------------------------------------------------------------

/** Fasst zusammen, aber beim ersten zusammengefassten Paar wird das Vorzeichen des zweiten Glieds übersehen (VZ). */
function zusammenfassenMitVorzeichenfehler(glieder: readonly Glied[]): Glied[] | null {
  const schluessel = glieder.map((x) => monomSchluessel(x.monom));
  const idx = schluessel.findIndex((s, i) => schluessel.indexOf(s) !== i && glieder[i]!.koeffizient.istNegativ());
  if (idx < 0) return null;
  const geaendert = glieder.map((x, i) => (i === idx ? { ...x, koeffizient: x.koeffizient.negiert() } : x));
  return zusammenfassenSortiert(geaendert);
}

function produktZeileText(paare: readonly (readonly [Glied, Glied])[]): Formel {
  const f = (x: Glied, ziel: 'text' | 'latex') => {
    const t = formatGlied(x, ziel, ANZEIGE, true);
    return ziel === 'latex' ? t.replace(/^\((.*)\)$/, '\\left($1\\right)') : t;
  };
  return {
    text: paare.map(([x, y]) => `${f(x, 'text')}·${f(y, 'text')}`).join(' + '),
    latex: paare.map(([x, y]) => `${f(x, 'latex')} \\cdot ${f(y, 'latex')}`).join(' + '),
  };
}

// --- Ketten erzeugen -------------------------------------------------------------

function ketteSummeMalSumme(z: Zufall): Kette | null {
  const v = z.auswahl(['x', 'a', 'm']);
  const p: Produkt = {
    vorzeichen: 1,
    a: [gl(z.auswahl([1, 1, 2, 3]), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
    b: [gl(z.auswahl([1, 1, 2, 3]), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
  };
  const paare = p.a.flatMap((x) => p.b.map((y) => [x, y] as const));
  const einzeln = einzelprodukte(p);
  const zusammen = zusammenfassenSortiert(einzeln);
  if (zusammen.length !== 3) return null; // gemischte Glieder heben sich nicht auf, keine Binome
  const richtig = [produktZeileText(paare), formel(einzeln), formel(zusammen)];

  const art = z.auswahl(['KL', 'VZ', 'PO', 'VZ-zusammenfassen'] as const);
  let falsch: Formel[];
  let fehlerBei: number;
  let fehlertyp: FehlertypCode;
  if (art === 'KL') {
    const nur = [paare[0]!, paare[3]!];
    const e = nur.map(([x, y]) => gliedMal(x, y));
    falsch = [produktZeileText(nur), formel(e)];
    fehlerBei = 0;
    fehlertyp = 'KL';
  } else if (art === 'VZ' || art === 'PO') {
    const e = einzelprodukte(p, art);
    falsch = [richtig[0]!, formel(e), formel(zusammenfassenSortiert(e))];
    fehlerBei = 1;
    fehlertyp = art;
  } else {
    const e = zusammenfassenMitVorzeichenfehler(einzeln);
    if (!e) return null;
    falsch = [richtig[0]!, richtig[1]!, formel(e)];
    fehlerBei = 2;
    fehlertyp = 'VZ';
  }
  return { start: produktFormel(p), richtig, falsch, fehlerBei, fehlertyp, variable: v };
}

function ketteMinusKlammer(z: Zufall): Kette | null {
  const v = z.auswahl(['x', 'a', 'y']);
  const faktor = z.auswahl([-1, -1, -2, -3, -4]);
  const t: Summe = [
    g(z.ganzzahlOhne(2, 9, []), { [v]: 1 }),
    kl(glied(faktor), [g(z.ganzzahlOhne(1, 9, []), { [v]: 1 }), g(z.ganzzahlOhne(-9, 9, [0]))]),
  ];
  if (z.mitWahrscheinlichkeit(0.5)) (t as Summe[number][]).push(g(z.ganzzahlOhne(-9, 9, [0])));
  const richtigeSchritte = loese(t);
  if (richtigeSchritte.length < 2) return null;
  const richtig = richtigeSchritte.map(formelVon);
  const art = z.auswahl(['KL', 'VZ', 'VZ-zusammenfassen'] as const);
  if (art === 'VZ-zusammenfassen') {
    const vorletzte = richtigeSchritte[richtigeSchritte.length - 2]!;
    const glieder = vorletzte.map((s) => (s.art === 'glied' ? s.glied : null)).filter((x): x is Glied => x !== null);
    if (glieder.length !== vorletzte.length) return null;
    const e = zusammenfassenMitVorzeichenfehler(glieder);
    if (!e) return null;
    return { start: formelVon(t), richtig, falsch: [...richtig.slice(0, -1), formel(e)], fehlerBei: richtig.length - 1, fehlertyp: 'VZ', variable: v };
  }
  // VZ bei −1 ist identisch mit KL; deshalb VZ nur bei echtem Zahlenfaktor
  const modus: Modus = art === 'VZ' && faktor !== -1 ? 'VZ' : 'KL';
  const falsch = loese(t, modus).map(formelVon);
  return { start: formelVon(t), richtig, falsch, fehlerBei: 0, fehlertyp: modus === 'VZ' ? 'VZ' : 'KL', variable: v };
}

// --- Gegenbeispiel -----------------------------------------------------------------

interface Behauptung {
  links: Formel;
  linksPoly: Polynom;
  rechts: Glied[];
  richtigRechts: Glied[];
  variable: string;
  fehlertyp: FehlertypCode;
}

function behauptung(z: Zufall): Behauptung | null {
  const v = z.auswahl(['x', 'a', 'y']);
  const art = z.auswahl(['quadrat', 'produkt', 'monom'] as const);
  if (art === 'quadrat') {
    const b = z.ganzzahlOhne(-9, 9, [0]);
    const k = z.auswahl([1, 1, 2, 3]);
    const p: Produkt = { vorzeichen: 1, a: [gl(k, { [v]: 1 }), gl(b)], b: [gl(k, { [v]: 1 }), gl(b)] };
    const innen = formel(p.a);
    const links = { text: `(${innen.text})²`, latex: `\\left(${innen.latex}\\right)^{2}` };
    const richtigRechts = ergebnisVon(p);
    if (b < 0 && z.mitWahrscheinlichkeit(0.4)) {
      // (x − b)² = x² − 2bx − b²: Vorzeichen des letzten Glieds falsch
      const rechts = richtigRechts.map((x, i) => (i === richtigRechts.length - 1 ? { ...x, koeffizient: x.koeffizient.negiert() } : x));
      return { links, linksPoly: summeAlsPolynom(richtigRechts), rechts, richtigRechts, variable: v, fehlertyp: 'VZ' };
    }
    // klassischer Fehler: Mittelglied vergessen
    return { links, linksPoly: summeAlsPolynom(richtigRechts), rechts: [gl(k * k, { [v]: 2 }), gl(b * b)], richtigRechts, variable: v, fehlertyp: 'PO' };
  }
  if (art === 'produkt') {
    const p: Produkt = {
      vorzeichen: 1,
      a: [gl(z.auswahl([1, 2, 3]), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
      b: [gl(z.auswahl([1, 2, 3]), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))],
    };
    const falsch = zusammenfassenSortiert([gliedMal(p.a[0]!, p.b[0]!), gliedMal(p.a[1]!, p.b[1]!)]);
    return { links: produktFormel(p), linksPoly: summeAlsPolynom(ergebnisVon(p)), rechts: falsch, richtigRechts: ergebnisVon(p), variable: v, fehlertyp: 'KL' };
  }
  // k·(ax + b) = k·ax + b
  const k = z.ganzzahlOhne(-6, 6, [-1, 0, 1]);
  const innen = [gl(z.ganzzahlOhne(1, 9, []), { [v]: 1 }), gl(z.ganzzahlOhne(-9, 9, [0]))];
  const f = gl(k);
  const t: Summe = [kl(f, innen.map((x) => ({ art: 'glied' as const, glied: x })))];
  const richtigRechts = innen.map((x) => gliedMal(f, x));
  return { links: formelVon(t), linksPoly: summeAlsPolynom(richtigRechts), rechts: [richtigRechts[0]!, innen[1]!], richtigRechts, variable: v, fehlertyp: 'KL' };
}

function wertBei(p: Polynom, v: string, x: Bruch): Bruch {
  return p.auswerten({ [v]: x });
}

function leseZahl(antwort: string, v: string): Bruch | null {
  const s = antwort.replace(/\s+/g, '').replace(new RegExp(`^${v}=`), '');
  return Bruch.parse(s);
}

/**
 * Stufe 2 bei „Finde den Fehler“: Einsetzprobe für Aufgabe und Zeile 1 vormachen,
 * mit einer Zahl, bei der sich der Fehler im Wert zeigt.
 */
function probeAnsatz(k: Kette, zeilen: readonly Formel[]): Formel {
  const start = leseAlsPolynom(k.start.text)!;
  const falsch = leseAlsPolynom(zeilen[k.fehlerBei]!.text)!;
  const t = [2, 3, 1, -1, 4].find((x) => !wertBei(start, k.variable, Bruch.von(x)).gleich(wertBei(falsch, k.variable, Bruch.von(x)))) ?? 2;
  const w0 = wertBei(start, k.variable, Bruch.von(t)).alsText();
  const w1 = wertBei(leseAlsPolynom(zeilen[0]!.text)!, k.variable, Bruch.von(t)).alsText();
  return {
    text: `Probe mit ${k.variable} = ${t}: Die Aufgabe hat den Wert ${w0}, Zeile 1 hat den Wert ${w1}.`,
    latex: `\\text{Probe mit } ${k.variable} = ${t}:\\; \\text{Aufgabe } = ${w0.replace('−', '-')},\\; \\text{Zeile 1 } = ${w1.replace('−', '-')}`,
  };
}

// --- Generator ---------------------------------------------------------------------

export const termGleichwertig: Generator = {
  id: 't8-term-gleichwertig',
  version: 1,
  baustein: 't8-term-gleichwertig',
  afb: ['II', 'III'],
  darstellungen: ['symbolisch'],
  typen: ['fehler-finden', 'eingabe'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? (wunsch.typ === 'eingabe' ? 'III' : wunsch.typ === 'fehler-finden' ? 'II' : z.auswahl(['II', 'III'] as const));
    const typ = wunsch.typ ?? (afb === 'II' ? 'fehler-finden' : 'eingabe');
    if (!((afb === 'II' && typ === 'fehler-finden') || (afb === 'III' && typ === 'eingabe'))) {
      throw new GeneratorFehler('Angeboten werden: AFB II „Finde den Fehler“ und AFB III „Gegenbeispiel“');
    }

    for (let versuch = 0; versuch < 1000; versuch++) {
      if (typ === 'fehler-finden') {
        const k = z.mitWahrscheinlichkeit(0.6) ? ketteSummeMalSumme(z) : ketteMinusKlammer(z);
        if (!k) continue;
        // Fehlerzeile muss wirklich falsch sein, keine Zeile doppelt
        if (k.falsch[k.fehlerBei]!.text === k.richtig[k.fehlerBei]?.text) continue;
        if (new Set(k.falsch.map((f) => f.text)).size !== k.falsch.length) continue;
        const zeilen = k.falsch;
        const richtigeZeile = k.richtig[k.fehlerBei]!;
        const nr = k.fehlerBei + 1;
        return {
          generator: this.id,
          version: this.version,
          seed,
          baustein: this.baustein,
          afb: 'II',
          darstellung: 'symbolisch',
          typ,
          ohneHilfsmittel: true,
          anweisung: 'In dieser Rechnung steckt genau ein Fehler. Tippe auf die erste falsche Zeile.',
          aufgabe: k.start,
          zeilen,
          loesung: { text: `Zeile ${nr}`, latex: `\\text{Zeile } ${nr}` },
          hilfen: {
            denkanstoss: `Prüfe Zeile für Zeile, ob sie zur Zeile davor passt. Tipp: Setze eine Zahl für ${k.variable} ein – wo sich der Wert ändert, steckt der Fehler.`,
            ansatz: probeAnsatz(k, zeilen),
            loesungsweg: [
              { text: `Der Fehler steckt in Zeile ${nr}: = ${zeilen[k.fehlerBei]!.text}`, latex: `\\text{Fehler in Zeile ${nr}: } = ${zeilen[k.fehlerBei]!.latex}` },
              { text: `Richtig wäre: = ${richtigeZeile.text}`, latex: `\\text{Richtig: } = ${richtigeZeile.latex}` },
              ...k.richtig.slice(k.fehlerBei + 1).map((f) => ({ text: `= ${f.text}`, latex: `= ${f.latex}` })),
            ],
          },
          pruefe(antwort: string): Bewertung {
            if (!/^\d+$/.test(antwort.trim())) return { ergebnis: 'unlesbar', rueckmeldung: 'Bitte tippe auf eine Zeile.' };
            const i = Number(antwort);
            if (i < 0 || i >= zeilen.length) return { ergebnis: 'unlesbar', rueckmeldung: 'Bitte tippe auf eine Zeile.' };
            if (i === k.fehlerBei) return { ergebnis: 'richtig', rueckmeldung: 'Richtig, hier steckt der Fehler!' };
            if (i < k.fehlerBei) return { ergebnis: 'falsch', fehlertyp: k.fehlertyp, rueckmeldung: `Zeile ${i + 1} stimmt noch. Der Fehler passiert später.` };
            return { ergebnis: 'falsch', fehlertyp: k.fehlertyp, rueckmeldung: `Zeile ${i + 1} ist falsch – aber nur als Folge eines früheren Fehlers. Suche weiter oben.` };
          },
        };
      }

      // Gegenbeispiel
      const b = behauptung(z);
      if (!b) continue;
      const rechtsPoly = summeAlsPolynom(b.rechts);
      if (rechtsPoly.gleich(b.linksPoly)) continue;
      // kleinster positiver ganzzahliger Wert mit verschiedenen Ergebnissen
      let gegen: number | null = null;
      for (const x of [1, 2, 3, -1, -2, 4, 5]) {
        if (!wertBei(b.linksPoly, b.variable, Bruch.von(x)).gleich(wertBei(rechtsPoly, b.variable, Bruch.von(x)))) { gegen = x; break; }
      }
      if (gegen === null) continue;
      if (b.rechts.some((x) => x.koeffizient.betrag().vergleiche(81) > 0)) continue;
      const rechts = formel(b.rechts);
      const v = b.variable;
      const lw = wertBei(b.linksPoly, v, Bruch.von(gegen));
      const rw = wertBei(rechtsPoly, v, Bruch.von(gegen));
      const linksP = b.linksPoly;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'III',
        darstellung: 'symbolisch',
        typ: 'eingabe',
        ohneHilfsmittel: true,
        anweisung: `Diese Umformung ist falsch. Zeige es mit einem Gegenbeispiel: Gib eine Zahl für ${v} an, bei der beide Seiten verschiedene Werte haben.`,
        aufgabe: { text: `${b.links.text} = ${rechts.text}`, latex: `${b.links.latex} = ${rechts.latex}` },
        loesung: { text: `${v} = ${gegen}`, latex: `${v} = ${gegen}` },
        hilfen: {
          denkanstoss: `Setze eine einfache Zahl für ${v} ein, z. B. 1 oder 2, und rechne beide Seiten getrennt aus.`,
          ansatz: { text: `Für ${v} = ${gegen}: linke Seite ${b.links.text} = ${lw.alsText()}`, latex: `${v} = ${gegen}:\\; ${b.links.latex} = ${lw.alsText().replace('−', '-')}` },
          loesungsweg: [
            { text: `Für ${v} = ${gegen}: linke Seite = ${lw.alsText()}, rechte Seite = ${rw.alsText()}`, latex: `${v} = ${gegen}:\\; ${lw.alsText().replace('−', '-')} \\neq ${rw.alsText().replace('−', '-')}` },
            { text: `${lw.alsText()} ≠ ${rw.alsText()}, also ist ${v} = ${gegen} ein Gegenbeispiel.`, latex: `\\text{Also ist } ${v} = ${gegen} \\text{ ein Gegenbeispiel.}` },
            { text: `Richtig wäre: ${b.links.text} = ${formel(b.richtigRechts).text}`, latex: `${b.links.latex} = ${formel(b.richtigRechts).latex}` },
          ],
        },
        pruefe(antwort: string): Bewertung {
          const x = leseZahl(antwort, v);
          if (!x) return { ergebnis: 'unlesbar', rueckmeldung: `Gib eine Zahl für ${v} ein, z. B. 2.` };
          const l = wertBei(linksP, v, x);
          const r = wertBei(rechtsPoly, v, x);
          if (!l.gleich(r)) return { ergebnis: 'richtig', rueckmeldung: `Richtig! Für ${v} = ${x.alsText()} ist die linke Seite ${l.alsText()}, die rechte ${r.alsText()}.` };
          return {
            ergebnis: 'falsch',
            fehlertyp: 'UK',
            rueckmeldung: `Für ${v} = ${x.alsText()} haben zufällig beide Seiten den Wert ${l.alsText()} – das ist kein Gegenbeispiel. Probiere eine andere Zahl.`,
          };
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
