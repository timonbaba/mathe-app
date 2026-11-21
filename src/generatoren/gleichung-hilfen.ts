/**
 * Gemeinsames für Gleichungs-Generatoren: Fehlantworten aus typischen Fehlern,
 * Antwortprüfung für Lösungsmengen, Auswahloptionen.
 */
import { gleicheMenge, leseLoesungsmenge, mengeFormel, type Loesungsmenge } from '../mathe/loesungsmenge';
import type { Zufall } from '../mathe/zufall';
import { loesungsweg, type Gleichung, type UmFehler } from './gleichung';
import type { Modus } from './termbaum';
import type { Auswahloption, Bewertung, FehlertypCode } from './typen';

export interface FalscheMenge {
  readonly fehlertyp: FehlertypCode;
  readonly menge: Loesungsmenge;
  readonly rueckmeldung: string;
}

const VARIANTEN: { modus: Modus; um: UmFehler; fehlertyp: FehlertypCode; rueckmeldung: string }[] = [
  { modus: 'KL', um: 'keiner', fehlertyp: 'KL', rueckmeldung: 'Beim Auflösen der Klammer muss jedes Glied mit dem Faktor davor multipliziert werden – auch bei einem Minus vor der Klammer.' },
  { modus: 'VZ', um: 'keiner', fehlertyp: 'VZ', rueckmeldung: 'Achte beim Auflösen der Klammern auf die Vorzeichen: Minus mal Minus ergibt Plus.' },
  { modus: 'richtig', um: 'rueberbringen', fehlertyp: 'UM', rueckmeldung: 'Bringst du eine Zahl auf die andere Seite, wendest du die Gegenoperation an: aus + 4 wird − 4.' },
  { modus: 'richtig', um: 'subtrahiert', fehlertyp: 'UM', rueckmeldung: 'Bei 3x = 12 steht „3 mal x“. Die Gegenoperation ist das Teilen durch 3, nicht das Subtrahieren.' },
  { modus: 'richtig', um: 'vorzeichenDivision', fehlertyp: 'VZ', rueckmeldung: 'Beim Teilen durch eine negative Zahl ändert sich das Vorzeichen des Ergebnisses.' },
  { modus: 'richtig', um: 'hauptnennerTeilweise', fehlertyp: 'BR', rueckmeldung: 'Multiplizierst du mit dem Hauptnenner, musst du JEDES Glied auf beiden Seiten multiplizieren – auch die Zahlen.' },
];

/** Fehlantworten aus allen typischen Fehlern, die zu einem anderen Ergebnis führen. */
export function gleichungsFehler(g: Gleichung, richtig: Loesungsmenge, erlaubt: readonly FehlertypCode[] = ['KL', 'VZ', 'UM', 'BR']): FalscheMenge[] {
  const liste: FalscheMenge[] = [];
  for (const f of VARIANTEN) {
    if (!erlaubt.includes(f.fehlertyp)) continue;
    const m = loesungsweg(g, f.modus, f.um).menge;
    if (gleicheMenge(m, richtig) || liste.some((x) => gleicheMenge(x.menge, m))) continue;
    liste.push({ fehlertyp: f.fehlertyp, menge: m, rueckmeldung: f.rueckmeldung });
  }
  return liste;
}

export function pruefeLoesungsmenge(antwort: string, v: string, richtig: Loesungsmenge, fehler: readonly FalscheMenge[]): Bewertung {
  const m = leseLoesungsmenge(antwort, v);
  if (!m) return { ergebnis: 'unlesbar', rueckmeldung: `Gib die Lösung an, z. B. „${v} = 3“ oder „L = {3}“.` };
  if (gleicheMenge(m, richtig)) return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
  const f = fehler.find((x) => gleicheMenge(x.menge, m));
  if (f) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung };
  return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das stimmt noch nicht. Mach die Probe: Setze deine Lösung in beide Seiten ein.' };
}

export function mengenOptionen(z: Zufall, richtig: Loesungsmenge, fehler: readonly FalscheMenge[]): Auswahloption[] {
  const ersteJeTyp = fehler.filter((f, i) => fehler.findIndex((g) => g.fehlertyp === f.fehlertyp) === i);
  const gewaehlt = [...ersteJeTyp, ...fehler.filter((f) => !ersteJeTyp.includes(f))].slice(0, 3);
  return z.gemischt([
    { formel: mengeFormel(richtig), richtig: true },
    ...gewaehlt.map((f) => ({ formel: mengeFormel(f.menge), richtig: false, fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung })),
  ]);
}
