/**
 * Generator für Baustein t8-term-struktur
 * „Aufbau eines Terms erkennen“ (Gym Kl. 8, LB 1): Ist der Term eine Summe, Differenz,
 * ein Produkt, Quotient oder eine Potenz? Entscheidend ist die zuletzt ausgeführte Rechenart.
 *
 *  - AFB I:  ein Teil ist zusammengesetzt, z. B. 3·(x + 2), x + 4·y, (a − 4) : 2
 *  - AFB II: verschachtelt, z. B. (x + 1)·(x − 1) − 3, 12 : (3 + x)·2, (2·a + 1)²
 *
 * Fehlertyp der falschen Antworten: VR, wenn die gewählte Rechenart im Term vorkommt
 * (Rechenreihenfolge nicht beachtet), sonst UK.
 */
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { op, termart, termFormel, termText, vari, vorkommendeArten, zahl, type Baum, type Op, type Termart } from './rechenbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

const ARTEN: Termart[] = ['Summe', 'Differenz', 'Produkt', 'Quotient'];
const ARTIKEL: Record<Termart, string> = { Summe: 'eine Summe', Differenz: 'eine Differenz', Produkt: 'ein Produkt', Quotient: 'ein Quotient', Potenz: 'eine Potenz' };

function blatt(z: Zufall, vars: readonly string[]): Baum {
  return z.mitWahrscheinlichkeit(0.55) ? vari(z.auswahl(vars)) : zahl(z.ganzzahl(2, 12));
}

function baum(z: Zufall, tiefe: number, vars: readonly string[], potenzErlaubt: boolean): Baum {
  if (tiefe === 0) return blatt(z, vars);
  if (potenzErlaubt && z.mitWahrscheinlichkeit(0.12)) return { art: 'quadrat', k: baum(z, tiefe - 1, vars, false) };
  const o = z.auswahl(['+', '−', '·', ':'] as Op[]);
  const links = z.mitWahrscheinlichkeit(0.6) ? baum(z, tiefe - 1, vars, potenzErlaubt) : blatt(z, vars);
  const rechts = z.mitWahrscheinlichkeit(0.6) ? baum(z, tiefe - 1, vars, potenzErlaubt) : blatt(z, vars);
  return op(o, links, rechts);
}

const zusammengesetzt = (b: Baum) => b.art !== 'zahl' && b.art !== 'var';

function teile(b: Baum): Baum[] {
  if (b.art === 'op') return [b.l, b.r];
  if (b.art === 'quadrat' || b.art === 'vielfach' || b.art === 'haelfte') return [b.k];
  return [];
}

/** Rechenarten in Ausführungsreihenfolge (innen zuerst). */
function reihenfolge(b: Baum): string[] {
  const schritte: string[] = [];
  const besuche = (x: Baum): void => {
    teile(x).forEach(besuche);
    const t = termart(x);
    if (t) schritte.push(`${t}: ${termText(x)}`);
  };
  besuche(b);
  return schritte;
}

export const termStruktur: Generator = {
  id: 't8-term-struktur',
  version: 1,
  baustein: 't8-term-struktur',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II'] as const);
    if (afb === 'III') throw new GeneratorFehler('AFB III wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? 'auswahl';
    if (typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 1000; versuch++) {
      const vars = z.auswahl([['x'], ['a', 'b'], ['x', 'y']]);
      const b = baum(z, afb === 'I' ? 2 : 3, vars, afb === 'II');
      const art = termart(b);
      if (!art) continue;
      const innen = teile(b).filter(zusammengesetzt);
      // AFB I: genau ein Teil zusammengesetzt; AFB II: mindestens drei Rechenarten im Term
      if (afb === 'I' && innen.length !== 1) continue;
      if (afb === 'II' && reihenfolge(b).length < 3) continue;
      // die zuletzt ausgeführte Rechenart soll nicht die einzige im Term sein (sonst zu leicht)
      const vorkommend = vorkommendeArten(b);
      if (vorkommend.size < 2) continue;
      if (termText(b).length > 34) continue;

      // richtige Art + alle im Term vorkommenden anderen Arten (Fallen) + auffüllen; „Potenz“ nur, wenn sie vorkommt
      const andere = ([...ARTEN, 'Potenz'] as Termart[]).filter((a) => a !== art);
      const optArten = [art, ...andere.filter((a) => vorkommend.has(a)), ...andere.filter((a) => !vorkommend.has(a) && a !== 'Potenz')].slice(0, 4);
      const optionen: Auswahloption[] = z.gemischt(optArten).map((a) => ({
        formel: { text: a, latex: `\\text{${a}}` },
        richtig: a === art,
        ...(a === art ? {} : { fehlertyp: vorkommend.has(a) ? ('VR' as const) : ('UK' as const) }),
        ...(a !== art && vorkommend.has(a) ? { rueckmeldung: `Im Term kommt zwar auch ${ARTIKEL[a]} vor – aber nicht als letzte Rechnung. Klammern zuerst, dann Potenzen, dann Punkt vor Strich.` } : {}),
      }));
      const aufgabe = termFormel(b);
      const loesung: Formel = { text: art, latex: `\\text{${art}}` };
      const [l, r] = teile(b);
      const ansatz: Formel =
        teile(b).length === 2
          ? { text: `Der Term besteht aus zwei Teilen: ${termText(l!)} und ${termText(r!)}.`, latex: `\\text{Teile: } ${termText(l!, true)} \\text{ und } ${termText(r!, true)}` }
          : { text: `Der Term besteht aus dem Teil ${termText(l!)}, der dann noch weiterverrechnet wird.`, latex: `\\text{Teil: } ${termText(l!, true)}` };
      const schritte = reihenfolge(b);
      const loesungsweg: Formel[] = [
        ...schritte.map((s, i) => ({ text: `${i + 1}. ${s}`, latex: `\\text{${i + 1}. ${s.replace(/·/g, '\\cdot ')}}` })),
        { text: `Zuletzt wird die ${art} gebildet – der Term ist ${ARTIKEL[art]}.`, latex: `\\text{Der Term ist ${ARTIKEL[art]}.}` },
      ];
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ: 'auswahl',
        ohneHilfsmittel: true,
        anweisung: 'Welche Art von Term ist das?',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: 'Welche Rechnung würdest du ganz zum Schluss ausführen, wenn du Zahlen einsetzt? Diese Rechenart bestimmt die Art des Terms.',
          ansatz,
          loesungsweg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          return pruefeAuswahl(optionen, antwort);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
