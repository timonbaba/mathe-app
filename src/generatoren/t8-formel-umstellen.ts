/**
 * Generator für Baustein t8-formel-umstellen
 * „Formeln umstellen“ (Gym Kl. 8, LB 1; Interpretationshilfe Kl. 7/8).
 *
 * Grundlage sind feste Formeln aus Geometrie und Physik (sie sind Fachwissen, keine
 * Schulbuchaufgaben). Variiert werden Formel und gesuchte Größe; daher ist der
 * Aufgabenraum bewusst klein (ca. 25 Varianten) – Wiederholungen in einer Runde
 * verhindert die Aufgabenauswahl.
 *
 *  - AFB I:   ein Umformungsschritt (ρ = m/V nach m; s = v·t nach t)
 *  - AFB II:  zwei Schritte bzw. Bruch (u = 2·(a + b) nach b; R = ρ·l/A nach l)
 *  - AFB III: mehrere Schritte mit Klammer und Bruch (A = (a + c)/2·h nach c)
 *
 * Fehlantworten: UM (falsche Gegenoperation), KL (Klammer im Nenner vergessen), VZ.
 */
import { gleichwertigeTerme, variablenIn } from '../mathe/auswertung';
import { textZuLatex } from '../mathe/latex';
import { leseTerm, TermFehler, type Knoten } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type FehlertypCode, type Formel, type Generator, type Wunsch } from './typen';

interface Vorlage {
  afb: AFB;
  /** Bedeutung für den Aufgabentext */
  kontext: string;
  formel: string;
  ziel: string;
  /** rechte Seite der Lösung „ziel = …“ */
  loesung: string;
  /** Zwischenschritte als Gleichungen (Text), ohne Ausgangsformel und ohne Ergebnis */
  weg: string[];
  fehler: { typ: FehlertypCode; term: string; rm: string }[];
}

const RM_GEGEN = 'Wende die Gegenoperation an: Aus „mal“ wird „geteilt durch“, aus „plus“ wird „minus“ – und zwar auf beiden Seiten.';
const RM_KLAMMER = 'Teilst du durch ein Produkt, gehört das ganze Produkt in den Nenner (bzw. in Klammern).';

export const VORLAGEN: readonly Vorlage[] = [
  { afb: 'I', kontext: 'Umfang eines Dreiecks', formel: 'u = a + b + c', ziel: 'c', loesung: 'u − a − b', weg: ['u − a − b = c'], fehler: [{ typ: 'UM', term: 'u + a + b', rm: RM_GEGEN }, { typ: 'VZ', term: 'u − a + b', rm: 'Beide Glieder werden abgezogen: u − a − b.' }] },
  { afb: 'I', kontext: 'Dichte', formel: 'ρ = m/V', ziel: 'm', loesung: 'ρ·V', weg: [], fehler: [{ typ: 'UM', term: 'ρ/V', rm: RM_GEGEN }, { typ: 'UM', term: 'V/ρ', rm: RM_GEGEN }] },
  { afb: 'I', kontext: 'Weg bei gleichförmiger Bewegung', formel: 's = v·t', ziel: 't', loesung: 's/v', weg: [], fehler: [{ typ: 'UM', term: 's·v', rm: RM_GEGEN }, { typ: 'UM', term: 'v/s', rm: 'Teile durch v: Dann steht s im Zähler, v im Nenner.' }] },
  { afb: 'I', kontext: 'Flächeninhalt eines Rechtecks', formel: 'A = a·b', ziel: 'b', loesung: 'A/a', weg: [], fehler: [{ typ: 'UM', term: 'A·a', rm: RM_GEGEN }, { typ: 'UM', term: 'A − a', rm: RM_GEGEN }] },
  { afb: 'I', kontext: 'Ohmsches Gesetz', formel: 'U = R·I', ziel: 'I', loesung: 'U/R', weg: [], fehler: [{ typ: 'UM', term: 'U·R', rm: RM_GEGEN }, { typ: 'UM', term: 'R/U', rm: 'Teile durch R: Dann steht U im Zähler, R im Nenner.' }] },
  { afb: 'I', kontext: 'Kraft', formel: 'F = m·a', ziel: 'm', loesung: 'F/a', weg: [], fehler: [{ typ: 'UM', term: 'F·a', rm: RM_GEGEN }, { typ: 'UM', term: 'a/F', rm: 'Teile durch a: Dann steht F im Zähler, a im Nenner.' }] },
  { afb: 'I', kontext: 'Geschwindigkeit', formel: 'v = s/t', ziel: 's', loesung: 'v·t', weg: [], fehler: [{ typ: 'UM', term: 'v/t', rm: RM_GEGEN }, { typ: 'UM', term: 't/v', rm: RM_GEGEN }] },
  { afb: 'II', kontext: 'Umfang eines Rechtecks', formel: 'u = 2·(a + b)', ziel: 'b', loesung: 'u/2 − a', weg: ['u/2 = a + b'], fehler: [{ typ: 'KL', term: 'u − 2a', rm: 'Die 2 steht vor der Klammer und gilt für a UND b. Teile zuerst durch 2.' }, { typ: 'UM', term: '(u − a)/2', rm: 'Erst durch 2 teilen, dann a abziehen – oder 2a abziehen und dann durch 2 teilen.' }, { typ: 'UM', term: '2u − a', rm: RM_GEGEN }] },
  { afb: 'II', kontext: 'Umfang eines Rechtecks', formel: 'u = 2a + 2b', ziel: 'b', loesung: '(u − 2a)/2', weg: ['u − 2a = 2b'], fehler: [{ typ: 'UM', term: 'u − 2a', rm: 'Am Ende musst du noch durch 2 teilen.' }, { typ: 'VZ', term: '(u + 2a)/2', rm: 'Um 2a auf die andere Seite zu bringen, subtrahierst du 2a.' }, { typ: 'KL', term: 'u − 2a/2', rm: 'Die ganze Differenz u − 2a wird durch 2 geteilt – setze sie in Klammern.' }] },
  { afb: 'II', kontext: 'Dichte', formel: 'ρ = m/V', ziel: 'V', loesung: 'm/ρ', weg: ['ρ·V = m'], fehler: [{ typ: 'UM', term: 'ρ·m', rm: RM_GEGEN }, { typ: 'UM', term: 'ρ/m', rm: 'Multipliziere zuerst mit V, dann teile durch ρ.' }] },
  { afb: 'II', kontext: 'elektrischer Widerstand eines Drahts', formel: 'R = ρ·l/A', ziel: 'l', loesung: 'R·A/ρ', weg: ['R·A = ρ·l'], fehler: [{ typ: 'UM', term: 'R·ρ/A', rm: RM_GEGEN }, { typ: 'UM', term: 'R/(ρ·A)', rm: 'A steht im Nenner – multipliziere damit, statt zu teilen.' }] },
  { afb: 'II', kontext: 'elektrischer Widerstand eines Drahts', formel: 'R = ρ·l/A', ziel: 'A', loesung: 'ρ·l/R', weg: ['R·A = ρ·l'], fehler: [{ typ: 'UM', term: 'R·ρ·l', rm: RM_GEGEN }, { typ: 'UM', term: 'R/(ρ·l)', rm: 'Multipliziere zuerst mit A, dann teile durch R.' }] },
  { afb: 'II', kontext: 'Flächeninhalt eines Dreiecks', formel: 'A = 1/2·g·h', ziel: 'h', loesung: '2A/g', weg: ['2A = g·h'], fehler: [{ typ: 'UM', term: 'A/(2g)', rm: 'Mit 1/2 multipliziert heißt: Die Gegenoperation ist „mal 2“.' }, { typ: 'UM', term: '2A·g', rm: RM_GEGEN }] },
  { afb: 'II', kontext: 'Volumen eines Quaders', formel: 'V = a·b·c', ziel: 'c', loesung: 'V/(a·b)', weg: [], fehler: [{ typ: 'KL', term: 'V/a·b', rm: RM_KLAMMER }, { typ: 'UM', term: 'V·a·b', rm: RM_GEGEN }] },
  { afb: 'II', kontext: 'Lageenergie', formel: 'E = m·g·h', ziel: 'h', loesung: 'E/(m·g)', weg: [], fehler: [{ typ: 'KL', term: 'E/m·g', rm: RM_KLAMMER }, { typ: 'UM', term: 'E·m·g', rm: RM_GEGEN }] },
  { afb: 'II', kontext: 'Kreisumfang', formel: 'u = 2·π·r', ziel: 'r', loesung: 'u/(2π)', weg: [], fehler: [{ typ: 'KL', term: 'u/2·π', rm: RM_KLAMMER }, { typ: 'UM', term: 'u − 2π', rm: RM_GEGEN }] },
  { afb: 'II', kontext: 'Geschwindigkeit', formel: 'v = s/t', ziel: 't', loesung: 's/v', weg: ['v·t = s'], fehler: [{ typ: 'UM', term: 'v·s', rm: RM_GEGEN }, { typ: 'UM', term: 'v/s', rm: 'Multipliziere zuerst mit t, dann teile durch v.' }] },
  { afb: 'III', kontext: 'Flächeninhalt eines Trapezes', formel: 'A = (a + c)/2·h', ziel: 'c', loesung: '2A/h − a', weg: ['2A = (a + c)·h', '2A/h = a + c'], fehler: [{ typ: 'UM', term: '(2A − a)/h', rm: 'Teile zuerst durch h, dann ziehe a ab.' }, { typ: 'VZ', term: '2A/h + a', rm: 'a wird auf die andere Seite gebracht – also subtrahiert.' }, { typ: 'UM', term: 'A/(2h) − a', rm: 'Geteilt durch 2 heißt: Die Gegenoperation ist „mal 2“.' }] },
  { afb: 'III', kontext: 'Flächeninhalt eines Trapezes', formel: 'A = (a + c)/2·h', ziel: 'a', loesung: '2A/h − c', weg: ['2A = (a + c)·h', '2A/h = a + c'], fehler: [{ typ: 'UM', term: '(2A − c)/h', rm: 'Teile zuerst durch h, dann ziehe c ab.' }, { typ: 'VZ', term: '2A/h + c', rm: 'c wird auf die andere Seite gebracht – also subtrahiert.' }, { typ: 'UM', term: 'A/(2h) − c', rm: 'Geteilt durch 2 heißt: Die Gegenoperation ist „mal 2“.' }] },
  { afb: 'III', kontext: 'Flächeninhalt eines Trapezes', formel: 'A = (a + c)/2·h', ziel: 'h', loesung: '2A/(a + c)', weg: ['2A = (a + c)·h'], fehler: [{ typ: 'KL', term: '2A/a + c', rm: 'Du teilst durch die ganze Summe a + c – sie gehört in Klammern.' }, { typ: 'UM', term: 'A/(2·(a + c))', rm: 'Geteilt durch 2 heißt: Die Gegenoperation ist „mal 2“.' }, { typ: 'UM', term: '2A·(a + c)', rm: RM_GEGEN }] },
  { afb: 'III', kontext: 'Volumen einer Pyramide', formel: 'V = 1/3·a²·h', ziel: 'h', loesung: '3V/a²', weg: ['3V = a²·h'], fehler: [{ typ: 'UM', term: 'V/(3a²)', rm: 'Mit 1/3 multipliziert heißt: Die Gegenoperation ist „mal 3“.' }, { typ: 'UM', term: '3V − a²', rm: RM_GEGEN }] },
  { afb: 'III', kontext: 'Weg bei gleichmäßiger Beschleunigung', formel: 's = 1/2·a·t²', ziel: 'a', loesung: '2s/t²', weg: ['2s = a·t²'], fehler: [{ typ: 'UM', term: 's/(2t²)', rm: 'Mit 1/2 multipliziert heißt: Die Gegenoperation ist „mal 2“.' }, { typ: 'UM', term: '2s·t²', rm: RM_GEGEN }] },
  { afb: 'III', kontext: 'Umfang eines Rechtecks', formel: 'u = 2·(a + b)', ziel: 'a', loesung: 'u/2 − b', weg: ['u/2 = a + b'], fehler: [{ typ: 'KL', term: 'u − 2b', rm: 'Die 2 steht vor der Klammer und gilt für a UND b. Teile zuerst durch 2.' }, { typ: 'UM', term: '(u − b)/2', rm: 'Erst durch 2 teilen, dann b abziehen.' }, { typ: 'UM', term: '2u − b', rm: RM_GEGEN }] },
];

const f = (text: string): Formel => ({ text, latex: textZuLatex(text) });

/** Liest „c = …“, „… = c“ oder nur „…“ und liefert den Term für die Zielgröße. */
function leseAntwort(antwort: string, ziel: string): { term: Knoten | null; zielRechts: boolean } {
  const teile = antwort.split('=').map((t) => t.trim());
  let ausdruck = antwort;
  if (teile.length === 2) {
    if (teile[0] === ziel) ausdruck = teile[1]!;
    else if (teile[1] === ziel) ausdruck = teile[0]!;
    else return { term: null, zielRechts: false };
  } else if (teile.length > 2) return { term: null, zielRechts: false };
  try {
    const k = leseTerm(ausdruck);
    return { term: k, zielRechts: variablenIn(k).has(ziel) };
  } catch (e) {
    if (e instanceof TermFehler || e instanceof RangeError) return { term: null, zielRechts: false };
    throw e;
  }
}

/** Erzeugt einen Formel-Generator für einen Baustein (Kl. 8 und Reparatur-Baustein Kl. 7 teilen die Vorlagen). */
export function formelGenerator(id: string): Generator {
  return {
  id,
  version: 1,
  baustein: id,
  afb: ['I', 'II', 'III'],
  darstellungen: ['symbolisch', 'text'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['I', 'II', 'III'] as const);
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);
    const kandidaten = VORLAGEN.filter((v) => v.afb === afb);
    const v = z.auswahl(kandidaten);
    const loesungK = leseTerm(v.loesung);
    const loesung = f(`${v.ziel} = ${v.loesung}`);
    const weg = [f(v.formel), ...v.weg.map(f), loesung];
    const optionen: Auswahloption[] | undefined =
      typ === 'auswahl'
        ? z.gemischt([{ formel: loesung, richtig: true }, ...v.fehler.slice(0, 3).map((x) => ({ formel: f(`${v.ziel} = ${x.term}`), richtig: false, fehlertyp: x.typ, rueckmeldung: x.rm }))])
        : undefined;
    return {
      generator: this.id,
      version: this.version,
      seed,
      baustein: this.baustein,
      afb,
      darstellung: 'symbolisch',
      typ,
      ohneHilfsmittel: true,
      anweisung: `Formel für: ${v.kontext}. Stelle sie nach ${v.ziel} um.`,
      aufgabe: f(v.formel),
      loesung,
      hilfen: {
        denkanstoss: `Behandle die Formel wie eine Gleichung mit der Variablen ${v.ziel}: Wende auf beiden Seiten die Gegenoperationen an, bis ${v.ziel} allein steht. Was „am weitesten außen“ steht, wird zuerst rückgängig gemacht.`,
        ansatz: weg[1]!,
        loesungsweg: weg,
      },
      optionen,
      pruefe(antwort: string): Bewertung {
        if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
        const a = leseAntwort(antwort, v.ziel);
        if (!a.term) return { ergebnis: 'unlesbar', rueckmeldung: `Schreibe die umgestellte Formel, z. B. „${v.ziel} = …“.` };
        if (a.zielRechts) return { ergebnis: 'unvollstaendig', rueckmeldung: `${v.ziel} muss allein auf einer Seite stehen – auf der anderen Seite darf ${v.ziel} nicht mehr vorkommen.` };
        if (gleichwertigeTerme(a.term, loesungK)) return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
        const fehl = v.fehler.find((x) => gleichwertigeTerme(a.term!, leseTerm(x.term)));
        if (fehl) return { ergebnis: 'falsch', fehlertyp: fehl.typ, rueckmeldung: fehl.rm };
        return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das stimmt noch nicht. Mach die Probe: Setze Zahlen ein und prüfe, ob die Ausgangsformel stimmt.' };
      },
    };
  },
};
}

export const formelUmstellen = formelGenerator('t8-formel-umstellen');
