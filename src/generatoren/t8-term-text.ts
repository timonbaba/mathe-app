/**
 * Generator für Baustein t8-term-text
 * „Terme in Worte fassen und aus Worten aufstellen“ (Gym Kl. 8, LB 1).
 *
 * Richtungen:
 *  - eingabe:  Text → Term („Schreibe als Term: das Dreifache der Summe aus x und 5“);
 *              jede gleichwertige Schreibweise zählt.
 *  - auswahl:  Text → Term oder Term → Text (zufällig)
 *
 *  - AFB I:  eine Verknüpfung mit einem zusammengesetzten Teil
 *  - AFB II: verschachtelt (zwei zusammengesetzte Teile bzw. drei Ebenen)
 *
 * Diagnostische Fehlantworten (alle TV – Textverständnis/Modellierung):
 *  - Struktur verwechselt (Klammer vergessen): „das Dreifache der Summe aus x und 5“ → 3·x + 5
 *  - Reihenfolge bei Differenz/Quotient vertauscht: „die Differenz aus x und 7“ → 7 − x
 *  - Vielfaches als Summe: „das Dreifache von x“ → 3 + x
 *  - Quadrat als Doppeltes: „das Quadrat von x“ → 2·x
 */
import { gleichwertigeTerme } from '../mathe/auswertung';
import { leseTerm, TermFehler, type Knoten } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { op, satz, termart, termFormel, termText, text, vari, zahl, type Baum, type Op } from './rechenbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

interface Fehlbaum {
  baum: Baum;
  rueckmeldung: string;
}

function blatt(z: Zufall, v: string): Baum {
  return z.mitWahrscheinlichkeit(0.5) ? vari(v) : zahl(z.ganzzahl(2, 12));
}

function knoten(z: Zufall, kinder: [Baum, Baum] | [Baum]): Baum {
  if (kinder.length === 1) {
    const art = z.auswahl(['vielfach', 'vielfach', 'quadrat', 'haelfte'] as const);
    if (art === 'vielfach') return { art: 'vielfach', faktor: z.auswahl([2, 3, 4, 5, 10]), k: kinder[0] };
    if (art === 'quadrat') return { art: 'quadrat', k: kinder[0] };
    return { art: 'haelfte', k: kinder[0] };
  }
  return op(z.auswahl(['+', '−', '·', ':'] as Op[]), kinder[0], kinder[1]);
}

function ziehe(z: Zufall, afb: AFB): Baum {
  const v = z.auswahl(['x', 'a', 'n', 'y']);
  const einfach = (): Baum => {
    const l = vari(v);
    const r = zahl(z.ganzzahl(2, 12));
    return z.mitWahrscheinlichkeit(0.3) ? knoten(z, [l]) : z.mitWahrscheinlichkeit(0.5) ? knoten(z, [l, r]) : knoten(z, [r, l]);
  };
  if (afb === 'I') {
    const innen = einfach();
    if (z.mitWahrscheinlichkeit(0.4)) return knoten(z, [innen]);
    return z.mitWahrscheinlichkeit(0.5) ? knoten(z, [innen, blatt(z, v)]) : knoten(z, [blatt(z, v), innen]);
  }
  const a = einfach();
  const b = z.mitWahrscheinlichkeit(0.5) ? einfach() : blatt(z, v);
  return z.mitWahrscheinlichkeit(0.3) ? knoten(z, [knoten(z, [a, b])]) : knoten(z, [a, b]);
}

const zusammengesetzt = (b: Baum) => b.art !== 'zahl' && b.art !== 'var';

/** Fehlvorstellungen als veränderte Bäume. */
function fehlbaeume(b: Baum): Fehlbaum[] {
  const liste: Fehlbaum[] = [];
  // Struktur verwechselt: oberste Verknüpfung mit einem zusammengesetzten Teil „umklammern“
  if (b.art === 'op' && b.r.art === 'op') liste.push({ baum: op(b.r.op, op(b.op, b.l, b.r.l), b.r.r), rueckmeldung: 'Achte auf die Struktur: Was ist der äußerste Teil des Satzes? Er bestimmt, welche Rechnung zuletzt kommt – der Rest gehört in Klammern.' });
  if (b.art === 'op' && b.l.art === 'op') liste.push({ baum: op(b.l.op, b.l.l, op(b.op, b.l.r, b.r)), rueckmeldung: 'Achte auf die Struktur: Der zusammengesetzte Teil gehört in Klammern.' });
  if ((b.art === 'vielfach' || b.art === 'quadrat' || b.art === 'haelfte') && b.k.art === 'op') {
    const innen = b.k;
    const aussen = (k: Baum): Baum => ({ ...b, k }) as Baum;
    liste.push({ baum: op(innen.op, aussen(innen.l), innen.r), rueckmeldung: 'Das Vielfache, die Hälfte bzw. das Quadrat bezieht sich auf den ganzen Ausdruck dahinter – setze ihn in Klammern.' });
  }
  // Reihenfolge vertauscht (Differenz, Quotient) – auf oberster oder zweiter Ebene
  const tauschen = (x: Baum): Baum | null => {
    if (x.art === 'op' && (x.op === '−' || x.op === ':')) return op(x.op, x.r, x.l);
    if (x.art === 'op') {
      const l = tauschen(x.l);
      if (l) return op(x.op, l, x.r);
      const r = tauschen(x.r);
      if (r) return op(x.op, x.l, r);
    }
    if (x.art === 'vielfach' || x.art === 'quadrat' || x.art === 'haelfte') {
      const k = tauschen(x.k);
      if (k) return { ...x, k } as Baum;
    }
    return null;
  };
  const t = tauschen(b);
  if (t) liste.push({ baum: t, rueckmeldung: 'Bei Differenz und Quotient kommt es auf die Reihenfolge an: „die Differenz aus a und b“ ist a − b.' });
  // Vielfaches als Summe, Quadrat als Doppeltes (oberste passende Stelle)
  const ersetze = (x: Baum): Baum | null => {
    if (x.art === 'vielfach') return op('+', zahl(x.faktor), x.k);
    if (x.art === 'quadrat') return { art: 'vielfach', faktor: 2, k: x.k };
    if (x.art === 'op') {
      const l = ersetze(x.l);
      if (l) return op(x.op, l, x.r);
      const r = ersetze(x.r);
      if (r) return op(x.op, x.l, r);
    }
    if (x.art === 'haelfte') {
      const k = ersetze(x.k);
      if (k) return { ...x, k };
    }
    return null;
  };
  const e = ersetze(b);
  if (e) liste.push({ baum: e, rueckmeldung: '„Das Dreifache“ heißt mal 3, „das Quadrat“ heißt hoch 2.' });
  return liste;
}

function knotenVon(b: Baum): Knoten {
  return leseTerm(termText(b));
}

export const termTextGenerator: Generator = {
  id: 't8-term-text',
  version: 1,
  baustein: 't8-term-text',
  afb: ['I', 'II'],
  darstellungen: ['text', 'symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II'] as const);
    if (afb === 'III') throw new GeneratorFehler('AFB III wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 1000; versuch++) {
      const b = ziehe(z, afb);
      if (!termart(b)) continue;
      const k = knotenVon(b);
      // nur echte, voneinander verschiedene Fehlvorstellungen
      const gesehen: Knoten[] = [k];
      const fehler = fehlbaeume(b).filter((f) => {
        const fk = knotenVon(f.baum);
        if (gesehen.some((g) => gleichwertigeTerme(g, fk))) return false;
        gesehen.push(fk);
        return true;
      });
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const richtung = typ === 'eingabe' ? 'textZuTerm' : z.auswahl(['textZuTerm', 'termZuText'] as const);
      const beschreibung = satz(b);
      const term = termFormel(b);
      const tf = (t: string): Formel => ({ text: t, latex: `\\text{${t}}` });

      let aufgabe: Formel;
      let loesung: Formel;
      let optionen: Auswahloption[] | undefined;
      let anweisung: string;
      if (richtung === 'textZuTerm') {
        aufgabe = tf(beschreibung);
        loesung = term;
        anweisung = typ === 'eingabe' ? 'Schreibe als Term.' : 'Welcher Term passt zur Beschreibung?';
        if (typ === 'auswahl') optionen = z.gemischt([{ formel: term, richtig: true }, ...fehler.slice(0, 3).map((f) => ({ formel: termFormel(f.baum), richtig: false, fehlertyp: 'TV' as const, rueckmeldung: f.rueckmeldung }))]);
      } else {
        aufgabe = term;
        loesung = tf(beschreibung);
        anweisung = 'Welche Beschreibung passt zum Term?';
        optionen = z.gemischt([{ formel: loesung, richtig: true }, ...fehler.slice(0, 3).map((f) => ({ formel: tf(satz(f.baum)), richtig: false, fehlertyp: 'TV' as const, rueckmeldung: f.rueckmeldung }))]);
      }

      const art = termart(b)!;
      const teile = b.art === 'op' ? [b.l, b.r] : b.art === 'vielfach' || b.art === 'quadrat' || b.art === 'haelfte' ? [b.k] : [];
      const ansatz = tf(`Außen steht ${text(b, 'nom').split(' ').slice(0, 2).join(' ')}: Der Term ist ${art === 'Summe' || art === 'Differenz' || art === 'Potenz' ? 'eine' : 'ein'} ${art}.`);
      const loesungsweg: Formel[] = [
        ...teile.filter(zusammengesetzt).map((t) => tf(`${satz(t)}: ${termText(t)}`)),
        tf(`${beschreibung}: ${termText(b)}`),
      ];
      const fehlerBaeume = fehler;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'text',
        typ,
        ohneHilfsmittel: true,
        anweisung,
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: 'Lies von außen nach innen: Das erste Wort („die Summe“, „das Produkt“, „das Doppelte“ …) sagt dir, welche Rechnung ganz zum Schluss kommt. Zusammengesetzte Teile kommen in Klammern.',
          ansatz,
          loesungsweg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          let a: Knoten;
          try {
            a = leseTerm(antwort);
          } catch (e) {
            if (e instanceof TermFehler || e instanceof RangeError) return { ergebnis: 'unlesbar', rueckmeldung: 'Das kann ich nicht als Term lesen. Prüfe Klammern und Rechenzeichen.' };
            throw e;
          }
          if (gleichwertigeTerme(a, k)) return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
          for (const f of fehlerBaeume) if (gleichwertigeTerme(a, knotenVon(f.baum))) return { ergebnis: 'falsch', fehlertyp: 'TV', rueckmeldung: f.rueckmeldung };
          return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das passt noch nicht. Übersetze die Beschreibung Stück für Stück, von außen nach innen.' };
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
