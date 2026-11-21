/**
 * Reparatur-Bausteine rationale Zahlen (Kl. 7, LB 2):
 *  - v7-rational-addieren        Addieren/Subtrahieren mit Vorzeichen (AFB I/II)
 *  - v7-rational-multiplizieren  Multiplizieren/Dividieren mit Vorzeichen (AFB I/II)
 *  - v7-potenz-wurzel            Potenzen negativer Zahlen, Quadratwurzeln (AFB I/II)
 * AFB I: ganze Zahlen; AFB II: Dezimalzahlen und Brüche (wie in der Interpretationshilfe).
 */
import { Bruch } from '../mathe/bruch';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { bereinigeZahlen, pruefeZahl, zahlFormel, zahlInKlammer, zahlOptionen, type FalscheZahl } from './zahlaufgabe';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

function afbUndTyp(z: Zufall, gen: Generator, w: Wunsch): { afb: AFB; typ: 'eingabe' | 'auswahl' } {
  const afb: AFB = w.afb ?? z.auswahl([...gen.afb]);
  if (!gen.afb.includes(afb)) throw new GeneratorFehler(`AFB ${afb} wird von ${gen.id} nicht angeboten`);
  const typ = w.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
  if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);
  return { afb, typ };
}

/** Zufällige rationale Zahl: ganz (AFB I) oder Dezimalzahl/Bruch (AFB II). */
function zahl(z: Zufall, afb: AFB, art: 'dezimal' | 'bruch'): Bruch {
  const vz = z.auswahl([1, -1]);
  if (afb === 'I') return Bruch.von(vz * z.ganzzahl(1, 30));
  if (art === 'dezimal') return Bruch.von(vz * z.ganzzahl(1, 99), z.auswahl([10, 10, 100]));
  for (;;) {
    const b = Bruch.von(vz * z.ganzzahl(1, 12), z.ganzzahl(2, 12));
    if (!b.istGanz()) return b;
  }
}

function basis(gen: Generator, seed: number, afb: AFB, typ: 'eingabe' | 'auswahl') {
  return { generator: gen.id, version: gen.version, seed, baustein: gen.baustein, afb, darstellung: 'symbolisch' as const, typ, ohneHilfsmittel: true };
}

const verbinde = (a: Formel, op: string, opL: string, b: Formel): Formel => ({ text: `${a.text} ${op} ${b.text}`, latex: `${a.latex} ${opL} ${b.latex}` });

// --- Addieren / Subtrahieren -------------------------------------------------------------

export const rationalAddieren: Generator = {
  id: 'v7-rational-addieren',
  version: 1,
  baustein: 'v7-rational-addieren',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 1000; versuch++) {
      const art = z.auswahl(['dezimal', 'bruch'] as const);
      const dez = afb === 'II' && art === 'dezimal';
      const a = zahl(z, afb, art);
      const b = zahl(z, afb, art);
      const minus = z.mitWahrscheinlichkeit(0.5);
      const w = minus ? a.minus(b) : a.plus(b);
      if (w.istNull()) continue;
      const fehler: FalscheZahl[] = [
        { wert: w.negiert(), fehlertyp: 'VZ', rueckmeldung: 'Das Vorzeichen des Ergebnisses stimmt nicht. Überlege: Welche Zahl hat den größeren Betrag?' },
        // Minus vor negativer Zahl übersehen: a − (−b) wie a − b
        { wert: minus ? a.minus(b.betrag()) : a.plus(b.betrag()), fehlertyp: 'VZ', rueckmeldung: 'Achte auf das Vorzeichen der zweiten Zahl: a − (−b) = a + b.' },
        { wert: a.betrag().plus(b.betrag()).mal(w.istNegativ() ? -1 : 1), fehlertyp: 'VZ', rueckmeldung: 'Bei verschiedenen Vorzeichen werden die Beträge subtrahiert, nicht addiert.' },
      ];
      const fl = bereinigeZahlen(w, fehler);
      if (typ === 'auswahl' && fl.length < 2) continue;
      if (!b.istNegativ() && z.mitWahrscheinlichkeit(0.5)) continue; // häufiger mit negativer zweiter Zahl
      const aufgabe = verbinde(zahlFormel(a, dez), minus ? '−' : '+', minus ? '-' : '+', zahlInKlammer(b, dez));
      const loesung = zahlFormel(w, dez);
      const zwischen = verbinde(zahlFormel(a, dez), '+', '+', zahlInKlammer(minus ? b.negiert() : b, dez));
      const weg: Formel[] = minus ? [{ text: `${aufgabe.text} = ${zwischen.text}`, latex: `${aufgabe.latex} = ${zwischen.latex}` }, { text: `= ${loesung.text}`, latex: `= ${loesung.latex}` }] : [{ text: `${aufgabe.text} = ${loesung.text}`, latex: `${aufgabe.latex} = ${loesung.latex}` }];
      const optionen = typ === 'auswahl' ? zahlOptionen(z, w, fl, dez) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: 'Berechne.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: 'Subtrahieren einer Zahl ist dasselbe wie Addieren der Gegenzahl: a − (−b) = a + b. Bei gleichen Vorzeichen addierst du die Beträge, bei verschiedenen subtrahierst du sie – das Vorzeichen bekommt die Zahl mit dem größeren Betrag.',
          ansatz: weg[0]!,
          loesungsweg: weg,
        },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeZahl(antwort, w, fl)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- Multiplizieren / Dividieren ---------------------------------------------------------------

export const rationalMultiplizieren: Generator = {
  id: 'v7-rational-multiplizieren',
  version: 1,
  baustein: 'v7-rational-multiplizieren',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 2000; versuch++) {
      const art = z.auswahl(['dezimal', 'bruch'] as const);
      const dez = afb === 'II' && art === 'dezimal';
      let a = zahl(z, afb, art);
      let b = zahl(z, afb, art);
      if (afb === 'I') {
        a = Bruch.von(z.auswahl([1, -1]) * z.ganzzahl(2, 15));
        b = Bruch.von(z.auswahl([1, -1]) * z.ganzzahl(2, 12));
      }
      const durch = z.mitWahrscheinlichkeit(0.45);
      if (durch && afb === 'I') a = a.mal(b.betrag()); // ganzzahliges Ergebnis
      if (dez && durch) b = Bruch.von(z.auswahl([1, -1]) * z.ganzzahl(2, 12), 10); // Divisor mit einer Nachkommastelle
      if (!a.istNegativ() && !b.istNegativ()) continue; // mindestens eine negative Zahl
      const w = durch ? a.durch(b) : a.mal(b);
      if (dez && !w.istEndlicherDezimalbruch()) continue;
      if (w.betrag().vergleiche(500) > 0 || (dez && w.nenner > 1000n)) continue;
      const fehler: FalscheZahl[] = [{ wert: w.negiert(), fehlertyp: 'VZ', rueckmeldung: 'Prüfe das Vorzeichen: Minus mal Minus ergibt Plus, Minus mal Plus ergibt Minus (beim Teilen genauso).' }];
      if (durch && art === 'bruch' && afb === 'II') fehler.push({ wert: a.mal(b), fehlertyp: 'BR', rueckmeldung: 'Durch einen Bruch dividiert man, indem man mit dem Kehrwert multipliziert.' });
      if (dez) {
        fehler.push({ wert: w.mal(10), fehlertyp: 'RE', rueckmeldung: 'Prüfe die Kommastelle – ein Überschlag hilft.' });
        fehler.push({ wert: w.durch(10), fehlertyp: 'RE', rueckmeldung: 'Prüfe die Kommastelle – ein Überschlag hilft.' });
      } else fehler.push({ wert: w.plus(b.betrag().mal(w.istNegativ() ? -1 : 1)), fehlertyp: 'RE', rueckmeldung: 'Da hat sich ein Rechenfehler eingeschlichen – prüfe das Einmaleins.' });
      const fl = bereinigeZahlen(w, fehler);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const aufgabe = verbinde(zahlFormel(a, dez), durch ? ':' : '·', durch ? ':' : '\\cdot', zahlInKlammer(b, dez));
      const loesung = zahlFormel(w, dez);
      const negativ = [a, b].filter((x) => x.istNegativ()).length;
      const vzText = negativ === 1 ? 'Genau eine Zahl ist negativ – das Ergebnis ist negativ.' : 'Beide Zahlen sind negativ – das Ergebnis ist positiv.';
      const betragF = verbinde(zahlFormel(a.betrag(), dez), durch ? ':' : '·', durch ? ':' : '\\cdot', zahlFormel(b.betrag(), dez));
      const optionen = typ === 'auswahl' ? zahlOptionen(z, w, fl, dez) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: 'Berechne.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: 'Bestimme zuerst das Vorzeichen: gleiche Vorzeichen → Plus, verschiedene → Minus. Rechne dann mit den Beträgen.',
          ansatz: { text: vzText, latex: `\\text{${vzText}}` },
          loesungsweg: [{ text: `${vzText} Beträge: ${betragF.text} = ${zahlFormel(w.betrag(), dez).text}`, latex: `${betragF.latex} = ${zahlFormel(w.betrag(), dez).latex}` }, { text: `${aufgabe.text} = ${loesung.text}`, latex: `${aufgabe.latex} = ${loesung.latex}` }],
        },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeZahl(antwort, w, fl)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- Potenzen und Quadratwurzeln ----------------------------------------------------------------

const HOCH: Record<number, string> = { 2: '²', 3: '³', 4: '⁴', 5: '⁵' };

export const potenzWurzel: Generator = {
  id: 'v7-potenz-wurzel',
  version: 1,
  baustein: 'v7-potenz-wurzel',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 1000; versuch++) {
      let aufgabe: Formel;
      let w: Bruch;
      const fehler: FalscheZahl[] = [];
      let weg: Formel[];
      let denk: string;
      const form = afb === 'I' ? z.auswahl(['klammer', 'ohneKlammer', 'wurzel'] as const) : z.auswahl(['bruchPotenz', 'wurzelTerm', 'gemischt'] as const);
      if (form === 'klammer' || form === 'ohneKlammer') {
        const a = z.ganzzahl(2, 5);
        const n = z.ganzzahl(2, a === 2 ? 5 : 3);
        const pot = Bruch.von(a).hoch(n);
        w = form === 'klammer' ? Bruch.von(-a).hoch(n) : pot.negiert();
        aufgabe = form === 'klammer' ? { text: `(−${a})${HOCH[n]}`, latex: `(-${a})^{${n}}` } : { text: `−${a}${HOCH[n]}`, latex: `-${a}^{${n}}` };
        fehler.push({ wert: w.negiert(), fehlertyp: 'VZ', rueckmeldung: form === 'klammer' ? 'Bei (−a)ⁿ wird die negative Zahl potenziert: Gerade Hochzahl → positiv, ungerade → negativ.' : 'Bei −aⁿ wird nur a potenziert, das Minus steht davor: −2⁴ = −16.' });
        fehler.push({ wert: Bruch.von(form === 'klammer' ? -a * n : -a * n), fehlertyp: 'PO', rueckmeldung: `Potenzieren heißt mehrfach multiplizieren: ${a}${HOCH[n]} = ${Array(n).fill(a).join('·')}, nicht ${a}·${n}.` });
        fehler.push({ wert: Bruch.von(a * n), fehlertyp: 'PO', rueckmeldung: `Potenzieren heißt mehrfach multiplizieren, nicht ${a}·${n}.` });
        const mal = Array(n).fill(form === 'klammer' ? `(−${a})` : `${a}`).join('·');
        weg = [{ text: `${aufgabe.text} = ${form === 'klammer' ? mal : `−(${mal})`}`, latex: aufgabe.latex }, { text: `= ${w.alsText()}`, latex: `= ${w.alsText().replace('−', '-')}` }];
        denk = 'Steht das Minus in der Klammer, wird die negative Zahl potenziert. Steht es davor (ohne Klammer), wird nur die Zahl potenziert und das Minus bleibt.';
      } else if (form === 'wurzel') {
        const r = z.ganzzahl(2, 25);
        w = Bruch.von(r);
        aufgabe = { text: `√${r * r}`, latex: `\\sqrt{${r * r}}` };
        fehler.push({ wert: Bruch.von(r * r, 2), fehlertyp: 'PO', rueckmeldung: `Die Wurzel ist nicht die Hälfte: Gesucht ist die Zahl, die mit sich selbst multipliziert ${r * r} ergibt.` });
        fehler.push({ wert: Bruch.von(r * r * r * r), fehlertyp: 'PO', rueckmeldung: 'Wurzelziehen ist die Umkehrung des Quadrierens – nicht quadrieren.' });
        weg = [{ text: `${r}·${r} = ${r * r}, also ${aufgabe.text} = ${r}`, latex: `${r} \\cdot ${r} = ${r * r} \\Rightarrow ${aufgabe.latex} = ${r}` }];
        denk = 'Welche (nicht negative) Zahl ergibt mit sich selbst multipliziert die Zahl unter der Wurzel?';
      } else if (form === 'bruchPotenz') {
        const zz = z.ganzzahl(1, 4);
        const nn = z.ganzzahl(2, 5);
        const b = Bruch.von(-zz, nn);
        if (b.istGanz() || b.zaehler !== BigInt(-zz)) continue;
        const n = z.ganzzahl(2, 3);
        w = b.hoch(n);
        aufgabe = { text: `(−${zz}/${nn})${HOCH[n]}`, latex: `\\left(-\\frac{${zz}}{${nn}}\\right)^{${n}}` };
        fehler.push({ wert: w.negiert(), fehlertyp: 'VZ', rueckmeldung: 'Gerade Hochzahl → positives Ergebnis, ungerade → negatives.' });
        fehler.push({ wert: Bruch.von(n % 2 ? -(zz ** n) : zz ** n, nn), fehlertyp: 'PO', rueckmeldung: 'Zähler UND Nenner werden potenziert.' });
        fehler.push({ wert: b.mal(n), fehlertyp: 'PO', rueckmeldung: 'Potenzieren heißt mehrfach multiplizieren.' });
        weg = [{ text: `${aufgabe.text} = ${Array(n).fill(`(−${zz}/${nn})`).join('·')}`, latex: aufgabe.latex }, { text: `= ${w.alsText()}`, latex: `= ${zahlFormel(w).latex}` }];
        denk = 'Potenziere Zähler und Nenner einzeln. Das Vorzeichen: gerade Hochzahl → plus, ungerade → minus.';
      } else if (form === 'wurzelTerm') {
        const r = z.ganzzahl(2, 15);
        const k = z.ganzzahl(1, 5);
        w = Bruch.von((r + k) * (r + k));
        aufgabe = { text: `(√${r * r} + ${k})²`, latex: `\\left(\\sqrt{${r * r}} + ${k}\\right)^{2}` };
        fehler.push({ wert: Bruch.von(r * r + k * k), fehlertyp: 'PO', rueckmeldung: 'Rechne zuerst die Klammer aus, dann quadrieren. (a + b)² ist nicht a² + b².' });
        fehler.push({ wert: Bruch.von(r * r + k * k + 2 * r * r * k), fehlertyp: 'PO', rueckmeldung: `√${r * r} ist ${r} – rechne zuerst die Wurzel aus.` });
        weg = [{ text: `${aufgabe.text} = (${r} + ${k})²`, latex: aufgabe.latex }, { text: `= ${r + k}²`, latex: `= ${r + k}^{2}` }, { text: `= ${w.alsText()}`, latex: `= ${w.alsText()}` }];
        denk = 'Rechne von innen nach außen: zuerst die Wurzel, dann die Klammer, zuletzt das Quadrat.';
      } else {
        const a = z.ganzzahl(2, 9);
        const r = z.ganzzahl(2, 12);
        w = Bruch.von(-(a * a) - r);
        aufgabe = { text: `−${a}² − √${r * r}`, latex: `-${a}^{2} - \\sqrt{${r * r}}` };
        fehler.push({ wert: Bruch.von(a * a - r), fehlertyp: 'VZ', rueckmeldung: `−${a}² heißt −(${a}·${a}) = −${a * a}.` });
        fehler.push({ wert: Bruch.von(-(a * a)).minus(Bruch.von(r * r, 2)), fehlertyp: 'PO', rueckmeldung: `√${r * r} = ${r}, denn ${r}·${r} = ${r * r}.` });
        fehler.push({ wert: Bruch.von(-2 * a - r), fehlertyp: 'PO', rueckmeldung: `${a}² heißt ${a}·${a}, nicht 2·${a}.` });
        weg = [{ text: `${aufgabe.text} = −${a * a} − ${r}`, latex: aufgabe.latex }, { text: `= ${w.alsText()}`, latex: `= ${w.alsText().replace('−', '-')}` }];
        denk = `Achtung: −${a}² bedeutet −(${a}²). Berechne zuerst Potenz und Wurzel, dann die Differenz.`;
      }
      const fl = bereinigeZahlen(w, fehler);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const loesung = zahlFormel(w);
      const letzte = weg[weg.length - 1]!;
      if (!letzte.text.endsWith(loesung.text)) weg.push({ text: `= ${loesung.text}`, latex: `= ${loesung.latex}` });
      const optionen = typ === 'auswahl' ? zahlOptionen(z, w, fl) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: 'Berechne ohne Taschenrechner.',
        aufgabe,
        loesung,
        hilfen: { denkanstoss: denk, ansatz: weg[0]!, loesungsweg: weg },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeZahl(antwort, w, fl)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
