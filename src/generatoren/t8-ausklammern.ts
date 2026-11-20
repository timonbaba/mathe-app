/**
 * Generator für Baustein t8-ausklammern
 * „Ausklammern (Faktorisieren mit dem Distributivgesetz)“ (Gym Kl. 8, LB 1).
 *
 * Varianten:
 *  - AFB I:  gemeinsamer Zahlfaktor bzw. Zahl mal Variable, zwei Glieder (12x + 18; 5ab − 15a)
 *  - AFB II: Potenzen und mehrere Variablen, bis zu drei Glieder, auch negativer
 *            Faktor (x³ + x² = x²·(x + 1); 6x²y − 9xy² = 3xy·(2x − 3y); −4a² − 6a = −2a·(2a + 3))
 *
 * Verlangt wird VOLLSTÄNDIGES Ausklammern (größter gemeinsamer Faktor).
 * Bei negativem ersten Glied sind −3·(2x + 3) und 3·(−2x − 3) beide richtig.
 *
 * Diagnostische Fehlantworten:
 *  - KL  „1 vergessen“: Glied, das genau dem Faktor entspricht, fällt in der Klammer weg (x³ + x² = x²·x)
 *  - KL  Zahlen in der Klammer nicht durch den Faktor geteilt (6x + 9 = 3·(6x + 9))
 *  - PO  Hochzahlen in der Klammer nicht verringert (x³ + x² = x²·(x³ + x²))
 *  - VZ  negativer Faktor, aber Vorzeichen in der Klammer nicht geändert
 */
import { Bruch } from '../mathe/bruch';
import { formatGlied, Polynom, type Glied, type Monom } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { alleUngleichartig, formel, gliedMal, pruefeAuswahl, RUECKMELDUNG, sortiereGlieder, summeAlsPolynom, zufallsMonom } from './gemeinsam';
import { faktorisierungFormel, gemeinsamerFaktor, hatGemeinsamenFaktor, pruefeAusklammern, type FalscheFaktorisierung } from './faktorisierung';
import { ANZEIGE, GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const RM: Partial<Record<FehlertypCode, string>> = {
  KL: 'Beim Ausklammern wird jedes Glied durch den Faktor geteilt. Was übrig bleibt, steht in der Klammer – auch eine 1.',
  PO: 'Teile auch die Variablen: x³ : x² = x. Die Hochzahl in der Klammer wird kleiner.',
  VZ: 'Klammerst du einen negativen Faktor aus, ändern sich alle Vorzeichen in der Klammer.',
};

interface Roh {
  faktor: Glied;
  innen: Glied[];
}

const VARIABLEN: readonly (readonly string[])[] = [['x', 'y'], ['a', 'b'], ['m', 'n']];

function ziehe(z: Zufall, afb: AFB): Roh {
  const vars = z.auswahl(VARIABLEN);
  if (afb === 'I') {
    const mitVariable = z.mitWahrscheinlichkeit(0.4);
    const faktor: Glied = { koeffizient: Bruch.von(z.ganzzahl(2, 9)), monom: mitVariable ? { [vars[0]!]: 1 } : {} };
    const innen: Glied[] = [
      { koeffizient: Bruch.von(z.ganzzahl(1, 9)), monom: zufallsMonom(z, vars, 1, mitVariable ? 0 : 1) },
      { koeffizient: Bruch.von(z.ganzzahlOhne(-9, 9, [0])), monom: zufallsMonom(z, vars, 1) },
    ];
    return { faktor, innen };
  }
  const negativ = z.mitWahrscheinlichkeit(0.3);
  const faktor: Glied = { koeffizient: Bruch.von(z.ganzzahl(1, 6) * (negativ ? -1 : 1)), monom: zufallsMonom(z, vars, 2, 1) };
  const anzahl = z.mitWahrscheinlichkeit(0.35) ? 3 : 2;
  const innen: Glied[] = [];
  for (let i = 0; i < anzahl; i++) {
    const k = i === 0 ? z.ganzzahl(1, 9) : z.ganzzahlOhne(-9, 9, [0]);
    innen.push({ koeffizient: Bruch.von(z.mitWahrscheinlichkeit(0.25) ? Math.sign(k) : k), monom: zufallsMonom(z, vars, 2) });
  }
  return { faktor, innen };
}

function ausmultipliziert(r: Roh): Glied[] {
  const g = r.innen.map((x) => gliedMal(r.faktor, x));
  sortiereGlieder(g);
  return g;
}

function geeignet(r: Roh, afb: AFB): boolean {
  if (!alleUngleichartig(r.innen)) return false;
  const innenPoly = summeAlsPolynom(r.innen);
  // Faktor muss der GRÖSSTE gemeinsame sein: Klammerinhalt ohne gemeinsamen Faktor
  if (hatGemeinsamenFaktor(innenPoly)) return false;
  // Faktor nicht trivial (±1 ohne Variable)
  if (r.faktor.koeffizient.betrag().gleich(1) && Object.keys(r.faktor.monom).length === 0) return false;
  const aus = ausmultipliziert(r);
  if (aus.some((g) => g.koeffizient.betrag().vergleiche(81) > 0)) return false;
  if (aus.some((g) => Object.values(g.monom).some((e) => e > 4))) return false;
  // bei negativem Faktor muss das erste Glied der Aufgabe negativ sein (sonst klammert man positiv aus)
  if (r.faktor.koeffizient.istNegativ() !== aus[0]!.koeffizient.istNegativ()) return false;
  if (afb === 'II' && Object.keys(r.faktor.monom).length === 0) return false;
  return true;
}

interface Fehl {
  fehlertyp: FehlertypCode;
  faktor: Glied;
  innen: Glied[];
  rueckmeldung?: string;
  /** nur zur Diagnose freier Eingaben, nicht als Auswahloption (z. B. Klammer mit nur einem Glied) */
  nurDiagnose?: boolean;
}

function fehler(r: Roh): Fehl[] {
  const liste: Fehl[] = [];
  const aufgabe = ausmultipliziert(r);
  // in der Reihenfolge der Aufgabe: innen_i = aufgabe_i / faktor
  const innenSortiert = aufgabe.map((g) => ({
    koeffizient: g.koeffizient.durch(r.faktor.koeffizient),
    monom: Object.fromEntries(Object.entries(g.monom).map(([v, e]) => [v, e - (r.faktor.monom[v] ?? 0)]).filter(([, e]) => (e as number) > 0)) as Monom,
  }));
  // KL: „1 vergessen“
  const ohneEins = innenSortiert.filter((g) => !(g.koeffizient.betrag().gleich(1) && Object.keys(g.monom).length === 0));
  if (ohneEins.length < innenSortiert.length && ohneEins.length > 0) {
    liste.push({
      fehlertyp: 'KL',
      faktor: r.faktor,
      innen: ohneEins,
      rueckmeldung: 'Wenn ein Glied genau dem ausgeklammerten Faktor entspricht, bleibt in der Klammer eine 1 stehen.',
      nurDiagnose: ohneEins.length < 2,
    });
  }
  // KL: Zahlen nicht geteilt
  if (!r.faktor.koeffizient.betrag().gleich(1)) {
    liste.push({ fehlertyp: 'KL', faktor: r.faktor, innen: innenSortiert.map((g, i) => ({ ...g, koeffizient: aufgabe[i]!.koeffizient.durch(Math.sign(Number(r.faktor.koeffizient.zaehler))) })) });
  }
  // PO: Hochzahlen nicht verringert
  if (Object.keys(r.faktor.monom).length > 0) {
    liste.push({ fehlertyp: 'PO', faktor: r.faktor, innen: innenSortiert.map((g, i) => ({ ...g, monom: aufgabe[i]!.monom })) });
  }
  // VZ: negativer Faktor, Vorzeichen in der Klammer nicht geändert
  if (r.faktor.koeffizient.istNegativ()) {
    liste.push({ fehlertyp: 'VZ', faktor: r.faktor, innen: innenSortiert.map((g, i) => ({ ...g, koeffizient: g.koeffizient.betrag().mal(aufgabe[i]!.koeffizient.istNegativ() ? -1 : 1) })) });
  }
  // nur wirklich falsche, verschiedene Fehlantworten
  const loesung = summeAlsPolynom(aufgabe);
  const gesehen: Polynom[] = [loesung];
  return liste.filter((f) => {
    const p = Polynom.glied(f.faktor.koeffizient, f.faktor.monom).mal(summeAlsPolynom(f.innen));
    if (gesehen.some((q) => q.gleich(p))) return false;
    if (!alleUngleichartig(f.innen)) return false;
    gesehen.push(p);
    return true;
  });
}

function zerlegungsZeile(faktor: Glied, innen: readonly Glied[]): Formel {
  const f = (ziel: 'text' | 'latex') => formatGlied(faktor, ziel, ANZEIGE, true).replace(/^\((.*)\)$/, ziel === 'latex' ? '\\left($1\\right)' : '($1)');
  const teile = innen.map((g) => {
    const rest = (ziel: 'text' | 'latex') => {
      const t = formatGlied(g, ziel, ANZEIGE, true);
      return ziel === 'latex' ? t.replace(/^\((.*)\)$/, '\\left($1\\right)') : t;
    };
    return { text: `${f('text')}·${rest('text')}`, latex: `${f('latex')} \\cdot ${rest('latex')}` };
  });
  return { text: teile.map((t) => t.text).join(' + '), latex: teile.map((t) => t.latex).join(' + ') };
}

export const ausklammern: Generator = {
  id: 't8-ausklammern',
  version: 1,
  baustein: 't8-ausklammern',
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
      const r = ziehe(z, afb);
      if (!geeignet(r, afb)) continue;
      const fl = fehler(r);
      const alsOption = fl.filter((x) => !x.nurDiagnose);
      if (typ === 'auswahl' && alsOption.length < 2) continue;

      const aufgabeGlieder = ausmultipliziert(r);
      const aufgabePoly = summeAlsPolynom(aufgabeGlieder);
      const f = gemeinsamerFaktor(aufgabePoly);
      const faktor = r.faktor.koeffizient.istNegativ() ? { ...f, koeffizient: f.koeffizient.negiert() } : f;
      // Klammerinhalt in Aufgabenreihenfolge
      const innen = aufgabeGlieder.map((g) => ({
        koeffizient: g.koeffizient.durch(faktor.koeffizient),
        monom: Object.fromEntries(Object.entries(g.monom).map(([v, e]) => [v, e - (faktor.monom[v] ?? 0)]).filter(([, e]) => (e as number) > 0)) as Monom,
      }));
      const aufgabe = formel(aufgabeGlieder);
      const loesung = faktorisierungFormel(faktor, innen);
      const zerlegung = zerlegungsZeile(faktor, innen);
      const ansatz: Formel = { text: `${aufgabe.text} = ${zerlegung.text}`, latex: `${aufgabe.latex} = ${zerlegung.latex}` };
      const loesungsweg: Formel[] = [ansatz, { text: `= ${loesung.text}`, latex: `= ${loesung.latex}` }];

      const fehlerWerte: FalscheFaktorisierung[] = fl.map((x) => ({
        fehlertyp: x.fehlertyp,
        wert: Polynom.glied(x.faktor.koeffizient, x.faktor.monom).mal(summeAlsPolynom(x.innen)),
        ...(x.rueckmeldung ? { rueckmeldung: x.rueckmeldung } : {}),
      }));
      let optionen: Auswahloption[] | undefined;
      if (typ === 'auswahl') {
        // bis zu drei Fehloptionen, verschiedene Fehlertypen bevorzugt
        const ersteJeTyp = alsOption.filter((x, i) => alsOption.findIndex((y) => y.fehlertyp === x.fehlertyp) === i);
        const gewaehlt = [...ersteJeTyp, ...alsOption.filter((x) => !ersteJeTyp.includes(x))].slice(0, 3);
        optionen = z.gemischt([
          { formel: loesung, richtig: true },
          ...gewaehlt.map((x) => ({ formel: faktorisierungFormel(x.faktor, x.innen), richtig: false, fehlertyp: x.fehlertyp, ...(x.rueckmeldung ? { rueckmeldung: x.rueckmeldung } : {}) })),
        ]);
      }

      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht, wenn du den größten gemeinsamen Faktor ausklammerst?' : 'Klammere den größten gemeinsamen Faktor aus.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss:
            'Suche den größten gemeinsamen Faktor aller Glieder: die größte Zahl, durch die alle Zahlen teilbar sind, und jede Variable, die in allen Gliedern vorkommt – mit der kleinsten Hochzahl.' +
            (faktor.koeffizient.istNegativ() ? ' Beginnt der Term mit Minus, klammere einen negativen Faktor aus.' : ''),
          ansatz,
          loesungsweg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort, RM);
          return pruefeAusklammern(antwort, aufgabePoly, fehlerWerte, RM, RUECKMELDUNG);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
