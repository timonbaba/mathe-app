/**
 * Generator für Baustein t8-gleichung-sonderfaelle
 * „Keine Lösung oder unendlich viele Lösungen“ (Gym Kl. 8, LB 1, AFB II/III).
 *
 * Beim Umformen fällt die Variable weg:
 *   0 = 0 bzw. 6 = 6  → wahre Aussage  → L = ℚ
 *   0 = 5             → falsche Aussage → L = { }
 *  - AFB II:  a·(x + b) = a·x + c
 *  - AFB III: a·(x + b) − c·x = d·(x + e) + f  bzw. mit Summe mal Summe
 *  (etwa jede vierte Aufgabe hat zur Kontrolle doch genau eine Lösung)
 *
 * Fehlantworten (UM): „0 = 0 ⇒ x = 0“, „0·x = 5 ⇒ x = 5“, Sonderfälle verwechselt.
 */
import { Bruch } from '../mathe/bruch';
import { endlich, mengeFormel, type Loesungsmenge } from '../mathe/loesungsmenge';
import { type Glied } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { gleichungFormel, loesungsmenge, loesungsweg, zeilenAlsFormeln, type Gleichung } from './gleichung';
import { gleichungsFehler, mengenOptionen, pruefeLoesungsmenge, type FalscheMenge } from './gleichung-hilfen';
import { g, glied, kl, produkt, wert } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type Generator, type Wunsch } from './typen';

const gl = (k: number, m: Record<string, number> = {}): Glied => ({ koeffizient: Bruch.von(k), monom: m });

function ziehe(z: Zufall, afb: AFB, v: string): Gleichung {
  const x = { [v]: 1 };
  const n = () => z.ganzzahlOhne(-9, 9, [0]);
  const a = z.ganzzahl(2, 6) * z.auswahl([1, -1]);
  const b = n();
  // Abweichung: 0 → unendlich viele Lösungen, sonst keine; selten echte Lösung (Steigung ändern)
  const abw = z.auswahl([0, 0, n()]);
  const steigung = z.mitWahrscheinlichkeit(0.25) ? z.auswahl([1, -1]) : 0;
  if (afb === 'II') {
    return { links: [kl(glied(a), [g(1, x), g(b)])], rechts: [g(a + steigung, x), g(a * b + abw)], v };
  }
  if (z.mitWahrscheinlichkeit(0.5)) {
    const c = z.ganzzahl(1, 4);
    const d = a - c;
    if (d === 0) return { links: [kl(glied(a), [g(1, x), g(b)])], rechts: [g(a, x), g(a * b + abw)], v };
    const e = n();
    // a(x + b) − c·x = d(x + e) + f  mit f so, dass die Zahlen (bis auf abw) übereinstimmen
    return { links: [kl(glied(a), [g(1, x), g(b)]), g(-c + steigung, x)], rechts: [kl(glied(d), [g(1, x), g(e)]), g(a * b - d * e + abw)], v };
  }
  const p = n();
  const q = n();
  // (x + p)(x + q) = x² + (p + q)x + pq
  return { links: [produkt([gl(1, x), gl(p)], [gl(1, x), gl(q)])], rechts: [g(1, { [v]: 2 }), g(p + q + steigung, x), g(p * q + abw)], v };
}

export const gleichungSonderfaelle: Generator = {
  id: 't8-gleichung-sonderfaelle',
  version: 1,
  baustein: 't8-gleichung-sonderfaelle',
  afb: ['II', 'III'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['II', 'III'] as const);
    if (afb === 'I') throw new GeneratorFehler('AFB I wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 3000; versuch++) {
      const v = z.auswahl(['x', 'x', 'a', 'y']);
      const glg = ziehe(z, afb, v);
      const m = loesungsmenge(glg);
      if (m.art === 'endlich' && (m.werte[0]!.nenner > 6n || m.werte[0]!.betrag().vergleiche(30) > 0)) continue;
      // typische Fehlvorstellungen bei Sonderfällen
      const fehler: FalscheMenge[] = [];
      const rest = wert(glg.links).minus(wert(glg.rechts)).alsKonstante();
      const add = (menge: Loesungsmenge, rm: string) => {
        const gleich = (x: Loesungsmenge, y: Loesungsmenge) => mengeFormel(x).text === mengeFormel(y).text;
        if (!gleich(menge, m) && !fehler.some((f) => gleich(f.menge, menge))) fehler.push({ fehlertyp: 'UM', menge, rueckmeldung: rm });
      };
      if (m.art === 'alle') {
        add(endlich(Bruch.NULL), 'Bei 0 = 0 ist die Variable verschwunden – die Aussage ist immer wahr. Jede Zahl ist eine Lösung: L = ℚ.');
        add({ art: 'leer' }, 'Eine wahre Aussage wie 0 = 0 bedeutet: Jede Zahl erfüllt die Gleichung, also L = ℚ – nicht die leere Menge.');
      } else if (m.art === 'leer') {
        if (rest) add(endlich(rest.negiert()), 'Bei 0·x = 5 gibt es keine Zahl, die passt – 0 mal irgendetwas ist immer 0. Also L = { }.');
        add(endlich(Bruch.NULL), 'Die Variable ist weggefallen, und es bleibt eine falsche Aussage. Dann hat die Gleichung keine Lösung: L = { }.');
        add({ art: 'alle' }, 'Eine falsche Aussage wie 0 = 5 bedeutet: Keine Zahl erfüllt die Gleichung, also L = { }.');
      } else {
        add({ art: 'leer' }, 'Hier bleibt die Variable erhalten – es gibt genau eine Lösung.');
        add({ art: 'alle' }, 'Hier bleibt die Variable erhalten – es gibt genau eine Lösung.');
      }
      for (const f of gleichungsFehler(glg, m, ['KL', 'VZ', 'UM'])) if (!fehler.some((x) => mengeFormel(x.menge).text === mengeFormel(f.menge).text)) fehler.push(f);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const weg = zeilenAlsFormeln(loesungsweg(glg).zeilen);
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fehler) : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung: typ === 'auswahl' ? `Welche Lösungsmenge hat die Gleichung (Variable ${v})? Achtung: Es kann auch keine oder unendlich viele Lösungen geben.` : `Löse die Gleichung nach ${v} auf und gib die Lösungsmenge an. Achtung: Es kann auch keine oder unendlich viele Lösungen geben.`,
        aufgabe: gleichungFormel(glg),
        loesung: mengeFormel(m),
        hilfen: {
          denkanstoss: `Forme wie gewohnt um. Fällt ${v} dabei ganz weg, schau dir die übrig gebliebene Aussage an: Ist sie wahr (z. B. 3 = 3), ist jede Zahl Lösung; ist sie falsch (z. B. 3 = 5), gibt es keine Lösung.`,
          ansatz: weg[1] ?? weg[0]!,
          loesungsweg: weg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          return pruefeLoesungsmenge(antwort, v, m, fehler);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
