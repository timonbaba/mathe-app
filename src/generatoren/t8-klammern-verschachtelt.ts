/**
 * Generator für Baustein t8-klammern-verschachtelt
 * „Mehrere und verschachtelte Klammern auflösen“ (Gym Kl. 8, LB 1, AFB II).
 *
 * Formen:
 *  - zweiTeile:     F₁·(…) ± G   bzw.  F₁·(…) ± F₂·(…)   (Typ 15xy·(3x + 4xy) − 3x²y)
 *  - verschachtelt: F·(G − (…))                          (Typ a·(a − (3c + 2a)))
 * In jeder Aufgabe muss nach dem Auflösen etwas zusammengefasst werden.
 *
 * Diagnostische Fehlantworten (Fehler wird bei JEDER Klammer gemacht, wie bei
 * einer echten Fehlvorstellung):
 *  - KL  nur das erste Glied in der Klammer wird mit dem Faktor multipliziert
 *  - VZ  bei negativem Faktor ändern sich die Vorzeichen ab dem zweiten Glied nicht
 *  - PO  Hochzahlen beim Multiplizieren nicht addiert
 */
import { Bruch } from '../mathe/bruch';
import { monomSchluessel, type Glied, type Monom } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import {
  auswahlOptionen,
  bereinigeFehlantworten,
  formel,
  gliedMal,
  hatVariablen,
  pruefeAuswahl,
  pruefeTermEingabe,
  sortiereGlieder,
  summeAlsPolynom,
  zufallsMonom,
  type Fehlantwort,
} from './gemeinsam';
import { ergebnis, formelVon, kl, loese, type Summand, type Summe } from './termbaum';
import { GeneratorFehler, type Aufgabe, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const VARIABLEN: readonly (readonly string[])[] = [['x', 'y'], ['a', 'b'], ['a', 'c'], ['m', 'n']];

const RUECKMELDUNG: Partial<Record<FehlertypCode, string>> = {
  KL: 'Beim Auflösen muss jedes Glied in der Klammer mit dem Faktor davor multipliziert werden – auch bei einem Minus vor der Klammer.',
};

type Form = 'zweiTeile' | 'verschachtelt';

const gl = (k: number, m: Monom): Summand => ({ art: 'glied', glied: { koeffizient: Bruch.von(k), monom: m } });
const faktorGlied = (k: number, m: Monom): Glied => ({ koeffizient: Bruch.von(k), monom: m });

function klammerInhalt(z: Zufall, vars: readonly string[], maxGrad: number): Glied[] {
  const innen: Glied[] = [];
  for (let i = 0; i < 2; i++) innen.push(faktorGlied(z.ganzzahlOhne(-9, 9, [0]), zufallsMonom(z, vars, maxGrad)));
  sortiereGlieder(innen);
  return innen;
}

const alsSumme = (gl: readonly Glied[]): Summe => gl.map((g) => ({ art: 'glied', glied: g }));

function zieheZweiTeile(z: Zufall, vars: readonly string[]): Summe {
  const f1 = faktorGlied(z.ganzzahlOhne(-6, 6, [0]), zufallsMonom(z, vars, 1));
  const innen1 = klammerInhalt(z, vars, 2);
  const produkte = innen1.map((g) => gliedMal(f1, g));
  if (z.mitWahrscheinlichkeit(0.3)) {
    // F₁·(…) ± G, wobei G gleichartig zu einem Produkt ist
    const ziel = z.auswahl(produkte);
    return [kl(f1, alsSumme(innen1)), gl(z.ganzzahlOhne(-12, 12, [0]), ziel.monom)];
  }
  // F₁·(…) ± F₂·(…), wobei ein Produkt der zweiten Klammer gleichartig zu einem der ersten ist
  const ziel = z.auswahl(produkte).monom;
  const zielVars = Object.keys(ziel).filter((v) => (ziel[v] ?? 0) > 0);
  const f2Monom: Record<string, number> = {};
  if (zielVars.length > 0 && z.mitWahrscheinlichkeit(0.5)) f2Monom[z.auswahl(zielVars)] = 1;
  const rest: Record<string, number> = {};
  for (const v of zielVars) {
    const e = (ziel[v] ?? 0) - (f2Monom[v] ?? 0);
    if (e > 0) rest[v] = e;
  }
  const f2 = faktorGlied(z.ganzzahlOhne(-6, 6, [0]), f2Monom);
  const innen2 = [faktorGlied(z.ganzzahlOhne(-9, 9, [0]), rest), faktorGlied(z.ganzzahlOhne(-9, 9, [0]), zufallsMonom(z, vars, 2))];
  sortiereGlieder(innen2);
  return [kl(f1, alsSumme(innen1)), kl(f2, alsSumme(innen2))];
}

function zieheVerschachtelt(z: Zufall, vars: readonly string[]): Summe {
  const f = faktorGlied(z.ganzzahlOhne(-5, 5, [0]), zufallsMonom(z, vars, 1));
  const innen = klammerInhalt(z, vars, 1);
  // G gleichartig zu einem Glied der inneren Klammer, damit innen zusammengefasst wird
  const g = faktorGlied(z.ganzzahlOhne(-9, 9, [0]), z.auswahl(innen).monom);
  const innererFaktor = faktorGlied(z.auswahl([-1, -1, -1, 1, -2, 2, -3, 3]), {});
  return [kl(f, [{ art: 'glied', glied: g }, kl(innererFaktor, alsSumme(innen))])];
}

function alleGlieder(s: Summe): Glied[] {
  return s.flatMap((x) => (x.art === 'glied' ? [x.glied] : [x.faktor, ...alleGlieder(x.innen)]));
}

function geeignet(t: Summe, form: Form): boolean {
  const erste = t[0]!;
  // erstes Element: Klammer mit sinnvollem Faktor (nicht 1, außer er enthält Variablen)
  if (erste.art !== 'klammer') return false;
  for (const x of alleGlieder(t)) {
    if (x.koeffizient.istNull()) return false;
  }
  // Klammern dürfen nicht nur aus gleichartigen Gliedern bestehen
  const pruefeKlammern = (s: Summe): boolean =>
    s.every((x) => {
      if (x.art === 'glied') return true;
      const innenGlieder = x.innen.filter((y) => y.art === 'glied').map((y) => (y as { glied: Glied }).glied);
      const schluessel = innenGlieder.map((g) => monomSchluessel(g.monom));
      // in keiner Klammer dürfen schon gleichartige Glieder stehen
      if (new Set(schluessel).size !== schluessel.length) return false;
      // jede Klammer beginnt mit einem positiven Glied (übliche Schreibweise)
      const erstes = x.innen[0]!;
      if (erstes.art === 'glied' && erstes.glied.koeffizient.istNegativ()) return false;
      if (!x.innen.some((y) => y.art === 'klammer' || hatVariablen(y.glied.monom))) return false;
      const f = x.faktor;
      if (f.koeffizient.betrag().gleich(1) && !hatVariablen(f.monom) && x !== erste && form === 'zweiTeile') return false;
      return pruefeKlammern(x.innen);
    });
  if (!pruefeKlammern(t)) return false;
  if (erste.faktor.koeffizient.istNegativ() && form === 'zweiTeile') return false;
  const f0 = erste.faktor;
  if (f0.koeffizient.betrag().gleich(1) && !hatVariablen(f0.monom)) return false;
  // erstes Glied der ersten Klammer positiv (übliche Schreibweise)
  const e0 = erste.innen[0]!;
  if (e0.art === 'glied' && e0.glied.koeffizient.istNegativ()) return false;

  const schritte = loese(t);
  // keine Klammer mit nur einem Glied im Lösungsweg (z. B. 5a·(10a))
  const einGliedKlammer = (x: Summe): boolean => x.some((y) => y.art === 'klammer' && (y.innen.length < 2 || einGliedKlammer(y.innen)));
  if (schritte.some(einGliedKlammer)) return false;
  const end = ergebnis(t);
  if (end.length === 0) return false;
  // es muss etwas zusammengefasst werden: Anzahl der Glieder sinkt im letzten Schritt bzw. innen
  const vorEnde = schritte.length >= 2 ? schritte[schritte.length - 2]! : t;
  const ausmultipliziertAnzahl = vorEnde.length;
  if (form === 'zweiTeile' && end.length >= ausmultipliziertAnzahl) return false;
  if (form === 'verschachtelt' && schritte.length < 3) return false;
  // Grenzen
  if (end.some((g) => g.koeffizient.betrag().vergleiche(99) > 0)) return false;
  if (end.some((g) => Object.values(g.monom).some((e) => e > 3))) return false;
  return true;
}

function fehlantworten(t: Summe): Fehlantwort[] {
  const liste: Fehlantwort[] = (['KL', 'VZ', 'PO'] as const).map((m) => ({ fehlertyp: m, glieder: ergebnis(t, m) }));
  return bereinigeFehlantworten(summeAlsPolynom(ergebnis(t)), liste);
}

export const klammernVerschachtelt: Generator = {
  id: 't8-klammern-verschachtelt',
  version: 1,
  baustein: 't8-klammern-verschachtelt',
  afb: ['II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb = wunsch.afb ?? 'II';
    if (afb !== 'II') throw new GeneratorFehler('Dieser Generator bietet nur AFB II an');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 2000; versuch++) {
      const vars = z.auswahl(VARIABLEN);
      const form: Form = z.mitWahrscheinlichkeit(0.6) ? 'zweiTeile' : 'verschachtelt';
      const t = form === 'zweiTeile' ? zieheZweiTeile(z, vars) : zieheVerschachtelt(z, vars);
      if (!geeignet(t, form)) continue;
      const fehler = fehlantworten(t);
      if (typ === 'auswahl' && fehler.length < 2) continue;

      const aufgabe = formelVon(t);
      const schritte = loese(t).map(formelVon);
      const end = ergebnis(t);
      const loesung = formel(end);
      // letzte Zeile mit Standard-Formatierung der Lösung
      schritte[schritte.length - 1] = loesung;
      const ansatz: Formel = { text: `${aufgabe.text} = ${schritte[0]!.text}`, latex: `${aufgabe.latex} = ${schritte[0]!.latex}` };
      const loesungsweg: Formel[] = [ansatz, ...schritte.slice(1).map((f) => ({ text: `= ${f.text}`, latex: `= ${f.latex}` }))];
      if (loesungsweg.length < 2) loesungsweg.push({ text: `= ${loesung.text}`, latex: `= ${loesung.latex}` });
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fehler) : undefined;
      const loesungPoly = summeAlsPolynom(end);

      const denkanstoss =
        form === 'verschachtelt'
          ? 'Arbeite von innen nach außen: Löse zuerst die innere Klammer auf und fasse in der äußeren Klammer zusammen. Multipliziere erst danach aus.'
          : 'Löse jede Klammer einzeln auf – jedes Glied in der Klammer wird mit dem Faktor davor multipliziert. Fasse danach gleichartige Glieder zusammen.';

      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'II',
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht, wenn du die Klammern auflöst und zusammenfasst?' : 'Löse die Klammern auf und fasse zusammen.',
        aufgabe,
        loesung,
        hilfen: { denkanstoss, ansatz, loesungsweg },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort, RUECKMELDUNG);
          return pruefeTermEingabe(antwort, loesungPoly, fehler, RUECKMELDUNG);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
