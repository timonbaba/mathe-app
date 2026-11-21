/**
 * Generator für Baustein t8-ungleichung
 * „Lineare Ungleichungen lösen (Einblick)“ (Gym Kl. 8, LB 1, Lernziel „Einblick gewinnen“).
 *
 *  - AFB I:  a·x + b < c       (in etwa der Hälfte der Fälle ist a negativ)
 *  - AFB II: a·x + b ≥ c·x + d bzw. a·(x + b) ≤ c
 *
 * Umformen wie bei Gleichungen; beim Multiplizieren/Dividieren mit einer negativen Zahl
 * (und beim Seitentausch) dreht sich das Relationszeichen um.
 *
 * Fehlantworten:
 *  - UM  Relationszeichen beim Teilen durch eine negative Zahl nicht umgedreht
 *  - UM  Zahl ohne Vorzeichenwechsel auf die andere Seite gebracht
 *  - UM  „<“ und „≤“ verwechselt (Grenze gehört (nicht) dazu)
 */
import { gleicheUngleichungsLoesung, leseUngleichungsLoesung, ungleichungFormel, type Relation, type UngleichungsLoesung } from '../mathe/loesungsmenge';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { loesungsmenge, loesungsweg, type Gleichung, type UmFehler } from './gleichung';
import { format, g, glied, kl } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

const UMKEHR: Record<Relation, Relation> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
const LATEX: Record<Relation, string> = { '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' };

/** Löst die Ungleichung über den Gleichungs-Lösungsweg; Relation wird bei negativen Divisoren/Seitentausch umgedreht. */
function loese(gl: Gleichung, rel: Relation, um: UmFehler = 'keiner', umdrehen = true): { zeilen: Formel[]; ergebnis: UngleichungsLoesung } {
  const { zeilen } = loesungsweg(gl, 'richtig', um);
  const formeln: Formel[] = [];
  let r = rel;
  for (const z of zeilen) {
    if (z.gleichung.text.startsWith('L =')) continue;
    const text = z.gleichung.text.replace(' = ', ` ${r} `);
    const latex = z.gleichung.latex.replace(' = ', ` ${LATEX[r]} `);
    let opText = z.op ? `   | ${z.op.text}` : '';
    let opLatex = z.op ? ` \\quad \\mid ${z.op.latex}` : '';
    const dreht = z.op && (z.op.text === 'Seiten tauschen' || (/^: \(−/.test(z.op.text) && umdrehen));
    if (dreht && z.op!.text !== 'Seiten tauschen') {
      opText += ' (Zeichen umdrehen!)';
      opLatex += ' \\;\\text{(Zeichen umdrehen!)}';
    }
    formeln.push({ text: text + opText, latex: latex + opLatex });
    if (z.op?.text === 'Seiten tauschen' || dreht) r = UMKEHR[r];
  }
  const m = loesungsweg(gl, 'richtig', um).menge;
  if (m.art !== 'endlich') throw new GeneratorFehler('Sonderfall bei Ungleichung');
  return { zeilen: formeln, ergebnis: { art: 'intervall', relation: r, grenze: m.werte[0]! } };
}

function ziehe(z: Zufall, afb: AFB, v: string): Gleichung {
  const x = { [v]: 1 };
  const n = () => z.ganzzahlOhne(-9, 9, [0]);
  if (afb === 'I') return { links: [g(z.ganzzahlOhne(-6, 6, [0, 1]), x), g(n())], rechts: [g(z.ganzzahlOhne(-20, 20, [0]))], v };
  return z.mitWahrscheinlichkeit(0.5)
    ? { links: [g(z.ganzzahlOhne(-6, 6, [0]), x), g(n())], rechts: [g(z.ganzzahlOhne(-6, 6, [0]), x), g(n())], v }
    : { links: [kl(glied(z.ganzzahlOhne(-5, 5, [0, 1])), [g(1, x), g(n())])], rechts: [g(z.ganzzahlOhne(-20, 20, [0]))], v };
}

export const ungleichung: Generator = {
  id: 't8-ungleichung',
  version: 1,
  baustein: 't8-ungleichung',
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

    for (let versuch = 0; versuch < 2000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      const gl = ziehe(z, afb, v);
      const m = loesungsmenge(gl);
      if (m.art !== 'endlich') continue;
      const w = m.werte[0]!;
      if (w.nenner > 6n || w.betrag().vergleiche(20) > 0) continue;
      const rel = z.auswahl(['<', '>', '≤', '≥'] as Relation[]);
      const { zeilen, ergebnis } = loese(gl, rel);
      // Fehlantworten
      const fehler: { fehlertyp: FehlertypCode; l: UngleichungsLoesung; rm: string }[] = [];
      const add = (l: UngleichungsLoesung, rm: string) => {
        if (!gleicheUngleichungsLoesung(l, ergebnis) && !fehler.some((f) => gleicheUngleichungsLoesung(f.l, l))) fehler.push({ fehlertyp: 'UM', l, rm });
      };
      add(loese(gl, rel, 'keiner', false).ergebnis, 'Teilst (oder multiplizierst) du durch eine negative Zahl, musst du das Relationszeichen umdrehen.');
      add(loese(gl, rel, 'rueberbringen').ergebnis, 'Bringst du eine Zahl auf die andere Seite, wendest du die Gegenoperation an: aus + 4 wird − 4.');
      if (ergebnis.art === 'intervall') {
        const ohneGleich: Record<Relation, Relation> = { '<': '≤', '≤': '<', '>': '≥', '≥': '>' };
        add({ ...ergebnis, relation: ohneGleich[ergebnis.relation] }, 'Achte darauf, ob die Grenze selbst dazugehört: „<“ heißt kleiner, „≤“ heißt kleiner oder gleich.');
      }
      const negativGeteilt = zeilen.some((x) => x.text.includes('Zeichen umdrehen'));
      if (typ === 'auswahl' && fehler.length < 2) continue;
      // in etwa der Hälfte der Aufgaben soll umgedreht werden müssen
      if (!negativGeteilt && z.mitWahrscheinlichkeit(0.4)) continue;

      const aufgabe: Formel = { text: `${format(gl.links, 'text')} ${rel} ${format(gl.rechts, 'text')}`, latex: `${format(gl.links, 'latex')} ${LATEX[rel]} ${format(gl.rechts, 'latex')}` };
      const loesung = ungleichungFormel(ergebnis, v);
      const optionen: Auswahloption[] | undefined =
        typ === 'auswahl' ? z.gemischt([{ formel: loesung, richtig: true }, ...fehler.slice(0, 3).map((f) => ({ formel: ungleichungFormel(f.l, v), richtig: false, fehlertyp: f.fehlertyp, rueckmeldung: f.rm }))]) : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? `Welche Zahlen erfüllen die Ungleichung (Variable ${v})?` : `Löse die Ungleichung nach ${v} auf (z. B. „${v} < 3“).`,
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: 'Forme um wie bei einer Gleichung. Aber Achtung: Multiplizierst oder dividierst du mit einer negativen Zahl, dreht sich das Relationszeichen um (aus < wird >).',
          ansatz: zeilen[0]!,
          loesungsweg: [...zeilen.slice(0, -1), loesung],
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          const l = leseUngleichungsLoesung(antwort, v);
          if (!l) return { ergebnis: 'unlesbar', rueckmeldung: `Gib die Lösung als Ungleichung an, z. B. „${v} < 3“ oder „${v} ≥ −2“.` };
          if (gleicheUngleichungsLoesung(l, ergebnis)) return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
          const f = fehler.find((x) => gleicheUngleichungsLoesung(x.l, l));
          if (f) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rm };
          return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das stimmt noch nicht. Prüfe mit einer Zahl, ob sie die Ungleichung wirklich erfüllt.' };
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

