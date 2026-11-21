/**
 * Generator für Reparatur-Baustein v5-vorrang „Rechenreihenfolge beachten“ (Kl. 5, LB 1).
 *
 *  - AFB I:  zwei Rechenzeichen, Punkt vor Strich bzw. Klammer (z. B. 3 + 4·5; (12 − 4) : 2)
 *  - AFB II: drei bis vier Rechenzeichen, auch Quadrate (z. B. 2·(3 + 5)² − 7·4)
 * Alle Zwischenergebnisse sind natürliche Zahlen (Kl. 5).
 *
 * Diagnostische Fehlantworten (VR):
 *  - stur von links nach rechts gerechnet (Punkt vor Strich missachtet)
 *  - Klammern übersehen
 */
import { Bruch } from '../mathe/bruch';
import { leseTerm } from '../mathe/term-parser';
import { werteTermAus } from '../mathe/auswertung';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { op, termFormel, termText, zahl, type Baum, type Op } from './rechenbaum';
import { bereinigeZahlen, pruefeZahl, zahlFormel, zahlOptionen, type FalscheZahl } from './zahlaufgabe';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

function wert(b: Baum): Bruch | null {
  switch (b.art) {
    case 'zahl': return Bruch.von(b.wert);
    case 'quadrat': {
      const k = wert(b.k);
      return k && k.mal(k);
    }
    case 'op': {
      const l = wert(b.l);
      const r = wert(b.r);
      if (!l || !r) return null;
      if (b.op === '+') return l.plus(r);
      if (b.op === '−') return l.minus(r);
      if (b.op === '·') return l.mal(r);
      return r.istNull() ? null : l.durch(r);
    }
    default: return null;
  }
}

/** Alle Zwischenergebnisse natürliche Zahlen? */
function natuerlich(b: Baum): boolean {
  const w = wert(b);
  if (!w || !w.istGanz() || w.istNegativ()) return false;
  if (b.art === 'op') return natuerlich(b.l) && natuerlich(b.r);
  if (b.art === 'quadrat') return natuerlich(b.k);
  return true;
}

/** Ein Rechenschritt: den ersten Knoten, dessen Teile schon Zahlen sind, ausrechnen. */
function schritt(b: Baum): Baum | null {
  if (b.art === 'zahl') return null;
  if (b.art === 'quadrat') {
    if (b.k.art === 'zahl') return zahl(b.k.wert * b.k.wert);
    return { art: 'quadrat', k: schritt(b.k)! };
  }
  if (b.art === 'op') {
    if (b.l.art === 'zahl' && b.r.art === 'zahl') return zahl(Number(wert(b)!.zaehler));
    if (b.l.art !== 'zahl') return op(b.op, schritt(b.l)!, b.r);
    return op(b.op, b.l, schritt(b.r)!);
  }
  return null;
}

/** Fehler: stur von links nach rechts (Klammern werden aber zuerst ausgerechnet). */
function linksNachRechts(text: string): Bruch | null {
  const tokens = text.replace(/\s+/g, '').match(/\d+|[+−·:()²]/g) ?? [];
  let i = 0;
  const operand = (): Bruch | null => {
    let w: Bruch | null;
    if (tokens[i] === '(') {
      i++;
      w = folge();
      i++; // ')'
    } else w = Bruch.von(Number(tokens[i++]));
    while (w && tokens[i] === '²') {
      i++;
      w = w.mal(w);
    }
    return w;
  };
  const folge = (): Bruch | null => {
    let w = operand();
    while (w && i < tokens.length && tokens[i] !== ')') {
      const o = tokens[i++];
      const r = operand();
      if (!r) return null;
      if (o === '+') w = w.plus(r);
      else if (o === '−') w = w.minus(r);
      else if (o === '·') w = w.mal(r);
      else if (r.istNull()) return null;
      else w = w.durch(r);
    }
    return w;
  };
  return folge();
}

function ohneKlammern(text: string): Bruch | null {
  if (!text.includes('(')) return null;
  try {
    return werteTermAus(leseTerm(text.replace(/[()]/g, '')), {});
  } catch {
    return null;
  }
}

function ziehe(z: Zufall, afb: AFB): Baum {
  const n = () => zahl(z.ganzzahl(2, afb === 'I' ? 12 : 9));
  const ops: Op[] = ['+', '−', '·', ':'];
  const knoten = (tiefe: number): Baum => {
    if (tiefe === 0) return n();
    if (afb === 'II' && z.mitWahrscheinlichkeit(0.15)) return { art: 'quadrat', k: z.mitWahrscheinlichkeit(0.5) ? n() : knoten(tiefe - 1) };
    return op(z.auswahl(ops), z.mitWahrscheinlichkeit(0.5) ? knoten(tiefe - 1) : n(), z.mitWahrscheinlichkeit(0.5) ? knoten(tiefe - 1) : n());
  };
  return knoten(afb === 'I' ? 2 : 3);
}

function anzahlOps(b: Baum): number {
  if (b.art === 'op') return 1 + anzahlOps(b.l) + anzahlOps(b.r);
  if (b.art === 'quadrat') return 1 + anzahlOps(b.k);
  return 0;
}

export const vorrang: Generator = {
  id: 'v5-vorrang',
  version: 1,
  baustein: 'v5-vorrang',
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

    for (let versuch = 0; versuch < 3000; versuch++) {
      const b = ziehe(z, afb);
      const k = anzahlOps(b);
      if (afb === 'I' ? k !== 2 : k < 3 || k > 4) continue;
      if (!natuerlich(b)) continue;
      const w = wert(b)!;
      if (w.vergleiche(500) > 0) continue;
      const text = termText(b);
      const fehler: FalscheZahl[] = [];
      const lr = linksNachRechts(text);
      if (lr && lr.istGanz()) fehler.push({ wert: lr, fehlertyp: 'VR', rueckmeldung: 'Punktrechnung (· und :) geht vor Strichrechnung (+ und −) – du hast einfach von links nach rechts gerechnet.' });
      const ok = ohneKlammern(text);
      if (ok && ok.istGanz()) fehler.push({ wert: ok, fehlertyp: 'VR', rueckmeldung: 'Was in Klammern steht, wird zuerst ausgerechnet.' });
      let fl = bereinigeZahlen(w, fehler).filter((f) => !f.wert.istNegativ());
      // Die Aufgabe soll eine Falle enthalten
      if (fl.length === 0) continue;
      // Auswahl braucht mindestens zwei Fehloptionen: ggf. Rechenfehler ergänzen (erster freier Wert)
      for (const d of [10, 1, -1, 2]) {
        if (typ !== 'auswahl' || fl.length >= 2) break;
        const kandidat = w.plus(d);
        if (!kandidat.istNegativ()) fl = bereinigeZahlen(w, [...fl, { wert: kandidat, fehlertyp: 'RE', rueckmeldung: 'Da hat sich ein Rechenfehler eingeschlichen. Rechne jeden Schritt noch einmal nach.' }]);
      }
      if (typ === 'auswahl' && fl.length < 2) continue;
      // Lösungsweg
      const weg: Formel[] = [termFormel(b)];
      for (let s: Baum | null = schritt(b); s; s = schritt(s)) weg.push({ text: `= ${termText(s)}`, latex: `= ${termText(s, true)}` });
      const loesung = zahlFormel(w);
      const optionen = typ === 'auswahl' ? zahlOptionen(z, w, fl) : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: 'Berechne. Achte auf die Rechenreihenfolge.',
        aufgabe: termFormel(b),
        loesung,
        hilfen: {
          denkanstoss: 'Reihenfolge: zuerst Klammern, dann Potenzen, dann Punktrechnung (· und :), zuletzt Strichrechnung (+ und −). Bei Gleichrangigem von links nach rechts.',
          ansatz: weg[1] ? { text: `${weg[0]!.text} ${weg[1].text}`, latex: `${weg[0]!.latex} ${weg[1].latex}` } : weg[0]!,
          loesungsweg: weg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          return pruefeZahl(antwort, w, fl);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
