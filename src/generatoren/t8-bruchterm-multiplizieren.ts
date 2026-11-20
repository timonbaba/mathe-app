/**
 * Generator für Baustein t8-bruchterm-multiplizieren
 * „Bruchterme multiplizieren und kürzen“ (Gym Kl. 8, LB 1, AFB II), Typ 3/(8x) · x²/9.
 * Zusätzlich (ca. 30 %): Division durch einen Bruchterm (mit dem Kehrwert multiplizieren).
 *
 * Diagnostische Fehlantworten:
 *  - BR  über Kreuz multipliziert: a/b · c/d = (a·d)/(b·c)
 *  - BR  Kehrwert vergessen (bei Division) bzw. Zähler und Nenner vertauscht
 *  - PO  Hochzahlen beim Multiplizieren multipliziert statt addiert (x²·x³ = x⁶)
 *
 * Ausgeschlossene Werte (Nenner 0) werden nur als Hinweis gezeigt (SPEC 5.5).
 */
import { Bruch, ggT } from '../mathe/bruch';
import { formatGlied, type Glied, type Monom } from '../mathe/polynom';
import { leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { gliedMal, pruefeAuswahl, zufallsMonom } from './gemeinsam';
import { bereinigeBruchFehler, bruch, pruefeBruchterm, type FalscherBruchterm } from './bruchterm-hilfen';
import { ANZEIGE, GeneratorFehler, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

interface Bt {
  z: Glied;
  n: Glied;
}

const RM: Partial<Record<FehlertypCode, string>> = {
  BR: 'Zähler mal Zähler, Nenner mal Nenner – und beim Dividieren mit dem Kehrwert des zweiten Bruchs multiplizieren.',
  PO: 'Beim Multiplizieren gleicher Variablen werden die Hochzahlen addiert: x²·x³ = x⁵.',
};

const f = (g: Glied): Formel => ({ text: formatGlied(g, 'text', ANZEIGE), latex: formatGlied(g, 'latex', ANZEIGE) });

/** Kürzt Zahl und Variablen; Nenner positiv. */
function kuerze(b: Bt): Bt {
  let zk = b.z.koeffizient;
  let nk = b.n.koeffizient;
  if (nk.istNegativ()) {
    zk = zk.negiert();
    nk = nk.negiert();
  }
  const q = zk.durch(nk); // exakt gekürzte Zahl
  const zm: Record<string, number> = {};
  const nm: Record<string, number> = {};
  for (const v of new Set([...Object.keys(b.z.monom), ...Object.keys(b.n.monom)])) {
    const d = (b.z.monom[v] ?? 0) - (b.n.monom[v] ?? 0);
    if (d > 0) zm[v] = d;
    if (d < 0) nm[v] = -d;
  }
  return { z: { koeffizient: Bruch.von(q.zaehler), monom: zm }, n: { koeffizient: Bruch.von(q.nenner), monom: nm } };
}

function istGekuerzt(b: Bt): boolean {
  if (ggT(b.z.koeffizient.zaehler, b.n.koeffizient.zaehler) > 1n) return false;
  return !Object.keys(b.z.monom).some((v) => (b.n.monom[v] ?? 0) > 0);
}

function formelVon(b: Bt): Formel {
  if (b.n.koeffizient.gleich(1) && Object.keys(b.n.monom).length === 0) return f(b.z);
  return bruch(f(b.z), f(b.n));
}

/** Gesamtgrad (Zähler + Nenner) eines gekürzten Monom-Bruchs */
const gradVon = (b: Bt) => [...Object.values(b.z.monom), ...Object.values(b.n.monom)].reduce((s, e) => s + e, 0);

function monomMalHochzahlenMultipliziert(a: Monom, c: Monom): Monom {
  const m: Record<string, number> = { ...a };
  for (const [v, e] of Object.entries(c)) m[v] = m[v] ? m[v]! * e : e;
  return m;
}

function zieheBruch(z: Zufall, vars: readonly string[]): Bt {
  return {
    z: { koeffizient: Bruch.von(z.ganzzahl(1, 12) * (z.mitWahrscheinlichkeit(0.2) ? -1 : 1)), monom: zufallsMonom(z, vars, 3) },
    n: { koeffizient: Bruch.von(z.ganzzahl(1, 12)), monom: zufallsMonom(z, vars, 2) },
  };
}

export const bruchtermMultiplizieren: Generator = {
  id: 't8-bruchterm-multiplizieren',
  version: 1,
  baustein: 't8-bruchterm-multiplizieren',
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
      const vars = z.mitWahrscheinlichkeit(0.7) ? [z.auswahl(['x', 'a', 'y', 'b'])] : z.auswahl([['x', 'y'], ['a', 'b']]);
      const b1 = zieheBruch(z, vars);
      const b2 = zieheBruch(z, vars);
      const durch = z.mitWahrscheinlichkeit(0.3);
      // beide Brüche schon gekürzt, nicht trivial (Nenner ≠ 1), mindestens eine Variable im Nenner
      if (![b1, b2].every(istGekuerzt)) continue;
      if ([b1, b2].some((b) => b.n.koeffizient.gleich(1) && Object.keys(b.n.monom).length === 0)) continue;
      const zweiter: Bt = durch ? { z: b2.n, n: b2.z } : b2; // Kehrwert bei Division
      // echter Bruchterm: mindestens eine Variable in einem Nenner (auch im Divisor-Zähler bei „:“)
      const variablenImNenner = [...new Set([...Object.keys(b1.n.monom), ...Object.keys(b2.n.monom), ...(durch ? Object.keys(b2.z.monom) : [])])].sort();
      if (variablenImNenner.length === 0) continue;
      if (zweiter.n.koeffizient.istNegativ()) continue;
      const roh: Bt = { z: gliedMal(b1.z, zweiter.z), n: gliedMal(b1.n, zweiter.n) };
      const erg = kuerze(roh);
      // es muss etwas zu kürzen geben, Ergebnis überschaubar
      if (istGekuerzt(roh)) continue;
      if (erg.z.koeffizient.betrag().vergleiche(60) > 0 || erg.n.koeffizient.vergleiche(60) > 0) continue;
      if (gradVon(erg) > 4) continue;

      // Fehlantworten
      const roh2: FalscherBruchterm[] = [];
      if (!durch) roh2.push({ fehlertyp: 'BR', formel: formelVon(kuerze({ z: gliedMal(b1.z, b2.n), n: gliedMal(b1.n, b2.z) })), rueckmeldung: 'Nicht über Kreuz multiplizieren: Zähler mal Zähler, Nenner mal Nenner.' });
      else roh2.push({ fehlertyp: 'BR', formel: formelVon(kuerze({ z: gliedMal(b1.z, b2.z), n: gliedMal(b1.n, b2.n) })), rueckmeldung: 'Dividieren heißt: mit dem Kehrwert des zweiten Bruchs multiplizieren.' });
      roh2.push({ fehlertyp: 'BR', formel: formelVon(kuerze({ z: erg.n, n: erg.z })), rueckmeldung: 'Zähler und Nenner sind vertauscht.' });
      roh2.push({
        fehlertyp: 'PO',
        formel: formelVon(kuerze({ z: { koeffizient: roh.z.koeffizient, monom: monomMalHochzahlenMultipliziert(b1.z.monom, zweiter.z.monom) }, n: roh.n })),
      });
      const loesung = formelVon(erg);
      const loesungK = leseTerm(loesung.text);
      const fehler = bereinigeBruchFehler(loesungK, roh2.filter((x) => !/^0|\/0/.test(x.formel.text)));
      if (typ === 'auswahl' && fehler.length < 2) continue;

      const op = durch ? { text: ' : ', latex: ' : ' } : { text: ' · ', latex: ' \\cdot ' };
      const a1 = formelVon(b1);
      const a2 = formelVon(b2);
      // Im Text braucht der zweite Bruch bei „:“ Klammern (sonst von links gelesen); LaTeX zeigt echte Bruchstriche
      // negativer zweiter Faktor ebenfalls in Klammern: · (−11y/x²)
      const a2Text = (durch && a2.text.includes('/')) || a2.text.startsWith('−') ? `(${a2.text})` : a2.text;
      const a2Latex = a2.latex.startsWith('-') ? `\\left(${a2.latex}\\right)` : a2.latex;
      const aufgabe: Formel = { text: `${a1.text}${op.text}${a2Text}`, latex: `${a1.latex}${op.latex}${a2Latex}` };
      const zeilen: Formel[] = [];
      if (durch) {
        const k = formelVon(zweiter);
        zeilen.push({ text: `${a1.text} · ${k.text}`, latex: `${a1.latex} \\cdot ${k.latex}` });
      }
      const zusammen = bruch(
        { text: `${f(b1.z).text}·${f(zweiter.z).text}`, latex: `${f(b1.z).latex} \\cdot ${f(zweiter.z).latex}` },
        { text: `${f(b1.n).text}·${f(zweiter.n).text}`, latex: `${f(b1.n).latex} \\cdot ${f(zweiter.n).latex}` },
      );
      zeilen.push(zusammen, loesung);
      const ansatz: Formel = { text: `${aufgabe.text} = ${zeilen[0]!.text}`, latex: `${aufgabe.latex} = ${zeilen[0]!.latex}` };
      const loesungsweg: Formel[] = [ansatz, ...zeilen.slice(1).map((x) => ({ text: `= ${x.text}`, latex: `= ${x.latex}` }))];
      const hinweis = `Hinweis: Das gilt nur für ${variablenImNenner.map((v) => `${v} ≠ 0`).join(', ')} – durch 0 darf man nicht teilen.`;
      let optionen: Auswahloption[] | undefined;
      if (typ === 'auswahl') {
        optionen = z.gemischt([{ formel: loesung, richtig: true }, ...fehler.slice(0, 3).map((x) => ({ formel: x.formel, richtig: false, fehlertyp: x.fehlertyp, ...(x.rueckmeldung ? { rueckmeldung: x.rueckmeldung } : {}) }))]);
      }
      const erwartet = gradVon(erg);
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb: 'II',
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? 'Welcher Term entsteht? (vollständig gekürzt)' : `${durch ? 'Dividiere' : 'Multipliziere'} und kürze vollständig.`,
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: (durch ? 'Dividieren heißt: mit dem Kehrwert multiplizieren. ' : '') + 'Zähler mal Zähler, Nenner mal Nenner. Kürze dann gemeinsame Faktoren – Zahlen und Variablen.',
          ansatz,
          loesungsweg: [...loesungsweg, { text: hinweis, latex: `\\text{${hinweis}}` }],
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort, RM);
          return pruefeBruchterm(antwort, loesungK, erwartet, fehler, RM);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
