/**
 * Generator für Baustein t8-cas-ergebnisse
 * „CAS-Ergebnisse lesen und prüfen“ (Gym Kl. 8, LB 1, Lernziel „Kennen der Verwendung von CAS“).
 * Keine Bedienung eines bestimmten Geräts (Entscheidung 20.11.2026); nie im hilfsmittelfreien Teil.
 *
 *  - AFB I („lesen“):  CAS-Ausgabe wie x^2-x-6 oder (x+3)*(x-3) in übliche Schreibweise übersetzen.
 *    Fehloptionen (DA): Hochzahl als Faktor gelesen (x^2 → 2x), Vorzeichen falsch abgelesen,
 *    Klammern übersehen.
 *  - AFB II („prüfen“): Handrechnung und CAS-Ergebnis vergleichen – ist die Handrechnung falsch
 *    oder nur anders geschrieben? Prüfen durch Einsetzen.
 */
import { Bruch } from '../mathe/bruch';
import { type Glied } from '../mathe/polynom';
import { leseAlsPolynom } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { formel, pruefeAuswahl, summeAlsPolynom } from './gemeinsam';
import { einzelprodukte, ergebnisVon, produktFormel, type Produkt } from './t8-summe-mal-summe';
import { zusammenfassenSortiert } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

/** CAS-Schreibweise: 2*x^2-3*x+1 */
export function casText(glieder: readonly Glied[]): string {
  return glieder
    .map((g, i) => {
      const k = g.koeffizient;
      const vars = Object.entries(g.monom).filter(([, e]) => e > 0).map(([v, e]) => (e === 1 ? v : `${v}^${e}`));
      const betrag = k.betrag();
      const zahl = vars.length === 0 || !betrag.gleich(1) ? betrag.toString() : '';
      const teil = [zahl, ...vars].filter((t) => t !== '').join('*');
      return (k.istNegativ() ? '-' : i === 0 ? '' : '+') + teil;
    })
    .join('');
}

const casFaktor = (glieder: readonly Glied[]) => `(${casText(glieder)})`;
const tt = (s: string) => `\\texttt{${s.replace(/\^/g, '\\textasciicircum{}').replace(/\*/g, '\\ast{}')}}`;

function casZeile(eingabe: string, ausgabe: string): Formel {
  return { text: `${eingabe} ▸ ${ausgabe}`, latex: `${tt(eingabe)} \\;\\blacktriangleright\\; ${tt(ausgabe)}` };
}

function zufallsProdukt(z: Zufall, v: string): Produkt {
  const n = () => z.ganzzahlOhne(-9, 9, [0]);
  return { vorzeichen: 1, a: [gl(z.auswahl([1, 1, 2, 3]), { [v]: 1 }), gl(n())], b: [gl(z.auswahl([1, 1, 2]), { [v]: 1 }), gl(n())] };
}

export const casErgebnisse: Generator = {
  id: 't8-cas-ergebnisse',
  version: 1,
  baustein: 't8-cas-ergebnisse',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['auswahl'],
  ohneHilfsmittel: false,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II'] as const);
    if (afb === 'III') throw new GeneratorFehler('AFB III wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? 'auswahl';
    if (typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);
    const basis = { generator: this.id, version: this.version, seed, baustein: this.baustein, afb, darstellung: 'symbolisch' as const, typ: 'auswahl' as const, ohneHilfsmittel: false };

    for (let versuch = 0; versuch < 1000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      const p = zufallsProdukt(z, v);
      const erg = ergebnisVon(p);
      if (erg.length !== 3) continue;
      const pText = `${casFaktor(p.a)}*${casFaktor(p.b)}`;

      if (afb === 'I') {
        const faktorisieren = z.mitWahrscheinlichkeit(0.4);
        const zeile = faktorisieren ? casZeile(`factor(${casText(erg)})`, pText) : casZeile(`expand(${pText})`, casText(erg));
        const richtig = faktorisieren ? produktFormel(p) : formel(erg);
        const fehl: { f: Formel; rm: string }[] = [];
        if (!faktorisieren) {
          // ^ als Malzeichen gelesen: x^2 → 2x
          const hochAlsFaktor = erg.map((g) => (g.monom[v] === 2 ? { koeffizient: g.koeffizient.mal(2), monom: { [v]: 1 } } : g));
          fehl.push({ f: formel(hochAlsFaktor), rm: 'x^2 bedeutet x hoch 2, also x² – nicht 2x.' });
          fehl.push({ f: formel(erg.map((g, i) => (i === 1 ? { ...g, koeffizient: g.koeffizient.negiert() } : g))), rm: 'Lies die Vorzeichen genau ab: Jedes Minus und Plus gehört zum Glied dahinter.' });
          fehl.push({ f: formel([erg[0]!, erg[2]!]), rm: 'Lies die Ausgabe vollständig: Sie hat drei Glieder.' });
        } else {
          const a = formel(p.a);
          const b = formel(p.b);
          fehl.push({ f: { text: `(${a.text})·${b.text}`, latex: `\\left(${a.latex}\\right) \\cdot ${b.latex}` }, rm: 'Beide Klammern gehören zur Ausgabe: (…)*(…) ist ein Produkt zweier Klammern.' });
          const bNeg = formel([p.b[0]!, { ...p.b[1]!, koeffizient: p.b[1]!.koeffizient.negiert() }]);
          fehl.push({ f: { text: `(${a.text})·(${bNeg.text})`, latex: `\\left(${a.latex}\\right) \\cdot \\left(${bNeg.latex}\\right)` }, rm: 'Lies die Vorzeichen in den Klammern genau ab.' });
        }
        const richtigPoly = leseAlsPolynom(richtig.text)!;
        const opts = fehl.filter((x, i) => !leseAlsPolynom(x.f.text)!.gleich(richtigPoly) && fehl.findIndex((y) => y.f.text === x.f.text) === i);
        if (opts.length < 2) continue;
        const optionen: Auswahloption[] = z.gemischt([
          { formel: richtig, richtig: true },
          ...opts.slice(0, 3).map((x) => ({ formel: x.f, richtig: false, fehlertyp: 'DA' as const, rueckmeldung: x.rm })),
        ]);
        return {
          ...basis,
          anweisung: 'Ein CAS hat diese Ausgabe geliefert. Wie lautet sie in der üblichen Schreibweise?',
          aufgabe: zeile,
          loesung: richtig,
          hilfen: {
            denkanstoss: 'Im CAS steht * für „mal“ und ^ für „hoch“. Übersetze die Ausgabe Zeichen für Zeichen.',
            ansatz: { text: 'Beispiel: 3*x^2 bedeutet 3x², und 2*x bedeutet 2x.', latex: '\\texttt{3*x\\textasciicircum{}2} = 3x^{2}' },
            loesungsweg: [{ text: `Die Ausgabe bedeutet: ${richtig.text}`, latex: richtig.latex }],
          },
          optionen,
          pruefe: (antwort: string): Bewertung => pruefeAuswahl(optionen, antwort),
        };
      }

      // AFB II: Handrechnung prüfen – entweder typisch falsch oder richtig, aber anders geordnet
      const handFalsch = z.mitWahrscheinlichkeit(0.5);
      const hand: Glied[] = handFalsch
        ? z.mitWahrscheinlichkeit(0.5)
          ? zusammenfassenSortiert([einzelprodukte(p)[0]!, einzelprodukte(p)[3]!]) // gemischte Produkte vergessen
          : zusammenfassenSortiert(einzelprodukte(p, 'VZ')) // Minus mal Minus als Minus
        : [...erg].reverse(); // gleichwertig, nur andere Reihenfolge
      if (handFalsch && summeAlsPolynom(hand).gleich(summeAlsPolynom(erg))) continue;
      const handFormel = formel(hand);
      const term = produktFormel(p);
      const casAus = casText(erg);
      const casEin = `expand(${pText})`;
      const hp = summeAlsPolynom(hand);
      const cp = summeAlsPolynom(erg);
      const gleich = hp.gleich(cp);
      const w = Bruch.von(2);
      const wh = hp.auswerten({ [v]: w });
      const wc = cp.auswerten({ [v]: w });
      const richtigText = gleich ? 'Beide Ergebnisse sind gleichwertig – sie sind nur anders geschrieben.' : 'Die Handrechnung ist falsch, das CAS-Ergebnis stimmt.';
      const falsch = gleich
        ? ['Die Handrechnung ist falsch, das CAS-Ergebnis stimmt.', 'Das CAS hat sich verrechnet.']
        : ['Beide Ergebnisse sind gleichwertig – sie sind nur anders geschrieben.', 'Das CAS hat sich verrechnet.'];
      falsch.push('Ohne CAS kann man nicht entscheiden, welches Ergebnis stimmt.');
      const tf = (t: string): Formel => ({ text: t, latex: `\\text{${t}}` });
      const optionen: Auswahloption[] = z.gemischt([
        { formel: tf(richtigText), richtig: true },
        ...falsch.map((t) => ({
          formel: tf(t),
          richtig: false,
          fehlertyp: 'DA' as const,
          rueckmeldung: t.startsWith('Ohne') ? 'Du kannst selbst prüfen: Setze eine Zahl ein und vergleiche die Werte.' : 'Prüfe durch Einsetzen einer Zahl, ob beide Terme denselben Wert haben.',
        })),
      ]);
      const zeile = casZeile(casEin, casAus);
      return {
        ...basis,
        anweisung: `Jemand hat ${term.text} von Hand umgeformt und ${handFormel.text} erhalten. Ein CAS liefert die unten stehende Ausgabe. Was stimmt?`,
        aufgabe: zeile,
        loesung: tf(richtigText),
        hilfen: {
          denkanstoss: `Prüfe durch Einsetzen: Setze z. B. ${v} = 2 in die Handrechnung und in die CAS-Ausgabe ein. Gleiche Werte an mehreren Stellen sprechen für gleichwertige Terme, verschiedene Werte beweisen, dass sie nicht gleichwertig sind.`,
          ansatz: { text: `Für ${v} = 2: Handrechnung ergibt ${wh.alsText()}, CAS-Ausgabe ergibt ${wc.alsText()}.`, latex: `${v} = 2:\\; ${wh.alsText().replace('−', '-')} \\text{ und } ${wc.alsText().replace('−', '-')}` },
          loesungsweg: [tf(`Für ${v} = 2: Handrechnung ${wh.alsText()}, CAS ${wc.alsText()}.`), tf(richtigText)],
        },
        optionen,
        pruefe: (antwort: string): Bewertung => pruefeAuswahl(optionen, antwort),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

