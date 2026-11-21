/**
 * Generator für Baustein t8-bruchgleichung
 * „Einfache Bruchgleichungen lösen“ (Gym Kl. 8, LB 1, AFB II/III).
 *
 * Formen:
 *  - AFB II:  a/x + b = c;   a/(x + p) = c/x
 *  - AFB III: a/(x + p) = c/(x + q);  (x + r)/(x − b) = (b + r)/(x − b)  → rechnerische Lösung ist
 *             ausgeschlossen, also L = { }
 *
 * Die ausgeschlossenen Werte (Nenner 0) MÜSSEN angegeben werden (SPEC 5.5).
 * Antwortformat z. B. „x ≠ 0, x ≠ 1; L = {−3/2}“ oder „D = ℚ \ {0; 1}, L = {−3/2}“.
 *
 * Fehlantworten: KL (beim Multiplizieren Klammer vergessen), UM, VZ; BR: ausgeschlossene
 * Zahl als Lösung angegeben bzw. ausgeschlossene Werte unvollständig.
 */
import { Bruch } from '../mathe/bruch';
import { gleicheMenge, leseLoesungsmenge, mengeFormel, type Loesungsmenge } from '../mathe/loesungsmenge';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { loesungsmenge, loesungsweg, zeilenAlsFormeln, type Gleichung } from './gleichung';
import { gleichungsFehler, type FalscheMenge } from './gleichung-hilfen';
import { g, glied, kl } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

interface Roh {
  aufgabe: Formel;
  /** lineare Gleichung nach dem Multiplizieren mit den Nennern */
  linear: Gleichung;
  /** Multiplikation, z. B. „· x·(x − 1)“ */
  op: Formel;
  ausgeschlossen: Bruch[];
}

const zahlLatex = (b: Bruch) => (b.istGanz() ? b.toString() : `${b.istNegativ() ? '-' : ''}\\frac{${b.betrag().zaehler}}{${b.betrag().nenner}}`);

function nennerFormel(v: string, p: number): Formel {
  if (p === 0) return { text: v, latex: v };
  const t = `${v} ${p < 0 ? '−' : '+'} ${Math.abs(p)}`;
  return { text: t, latex: t.replace('−', '-') };
}

function bruch(z: Formel, n: Formel, nennerKlammer: boolean): Formel {
  const nt = nennerKlammer ? `(${n.text})` : n.text;
  const zt = / [+−] /.test(z.text) ? `(${z.text})` : z.text;
  return { text: `${zt}/${nt}`, latex: `\\frac{${z.latex}}{${n.latex}}` };
}

/** Linearer Faktor a·(v + p) als Summand (bei p = 0: a·v). */
function faktorMal(a: number, v: string, p: number) {
  return p === 0 ? [g(a, { [v]: 1 })] : [kl(glied(a), [g(1, { [v]: 1 }), g(p)])];
}

function ziehe(z: Zufall, afb: AFB, v: string): Roh {
  const n = (min = 1, max = 9) => z.ganzzahl(min, max) * z.auswahl([1, -1]);
  const zahlF = (k: number): Formel => ({ text: Bruch.von(k).alsText(), latex: String(k) });
  if (afb === 'II') {
    if (z.mitWahrscheinlichkeit(0.5)) {
      const a = n(1, 12);
      const b = n(1, 6);
      const c = n(1, 9);
      const l = bruch(zahlF(a), { text: v, latex: v }, false);
      const bf = b < 0 ? ` − ${-b}` : ` + ${b}`;
      return {
        aufgabe: { text: `${l.text}${bf} = ${Bruch.von(c).alsText()}`, latex: `${l.latex}${bf.replace('−', '-')} = ${c}` },
        linear: { links: [g(a), g(b, { [v]: 1 })], rechts: [g(c, { [v]: 1 })], v },
        op: { text: `· ${v}`, latex: `\\cdot ${v}` },
        ausgeschlossen: [Bruch.NULL],
      };
    }
    const a = n(1, 9);
    const c = n(1, 9);
    const p = n(1, 6);
    const nl = nennerFormel(v, p);
    return {
      aufgabe: { text: `${bruch(zahlF(a), nl, true).text} = ${bruch(zahlF(c), { text: v, latex: v }, false).text}`, latex: `${bruch(zahlF(a), nl, true).latex} = ${bruch(zahlF(c), { text: v, latex: v }, false).latex}` },
      linear: { links: faktorMal(a, v, 0), rechts: faktorMal(c, v, p), v },
      op: { text: `· ${v}·(${nl.text})`, latex: `\\cdot ${v}\\left(${nl.latex}\\right)` },
      ausgeschlossen: [Bruch.NULL, Bruch.von(-p)],
    };
  }
  if (z.mitWahrscheinlichkeit(0.3)) {
    // rechnerische Lösung ist ausgeschlossen
    const b = n(1, 9);
    const r = n(1, 9);
    const nl = nennerFormel(v, -b);
    const zl = nennerFormel(v, r);
    const zr = zahlF(b + r);
    return {
      aufgabe: { text: `${bruch(zl, nl, true).text} = ${bruch(zr, nl, true).text}`, latex: `${bruch(zl, nl, true).latex} = ${bruch(zr, nl, true).latex}` },
      linear: { links: [g(1, { [v]: 1 }), g(r)], rechts: [g(b + r)], v },
      op: { text: `· (${nl.text})`, latex: `\\cdot \\left(${nl.latex}\\right)` },
      ausgeschlossen: [Bruch.von(b)],
    };
  }
  const a = n(1, 9);
  const c = n(1, 9);
  const p = n(1, 9);
  const q = n(1, 9);
  const nl = nennerFormel(v, p);
  const nr = nennerFormel(v, q);
  return {
    aufgabe: { text: `${bruch(zahlF(a), nl, true).text} = ${bruch(zahlF(c), nr, true).text}`, latex: `${bruch(zahlF(a), nl, true).latex} = ${bruch(zahlF(c), nr, true).latex}` },
    linear: { links: faktorMal(a, v, q), rechts: faktorMal(c, v, p), v },
    op: { text: `· (${nl.text})·(${nr.text})`, latex: `\\cdot \\left(${nl.latex}\\right)\\left(${nr.latex}\\right)` },
    ausgeschlossen: [Bruch.von(-p), Bruch.von(-q)],
  };
}

function dFormel(v: string, aus: readonly Bruch[]): Formel {
  const s = [...aus].sort((x, y) => x.vergleiche(y));
  return { text: s.map((x) => `${v} ≠ ${x.alsText()}`).join(', '), latex: s.map((x) => `${v} \\neq ${zahlLatex(x)}`).join(',\\ ') };
}

function antwortFormel(v: string, aus: readonly Bruch[], m: Loesungsmenge): Formel {
  const d = dFormel(v, aus);
  const l = mengeFormel(m);
  return { text: `${d.text}; ${l.text}`, latex: `${d.latex};\\quad ${l.latex}` };
}

/** Liest ausgeschlossene Werte und Lösungsmenge aus einer Antwort. */
export function leseBruchgleichungsAntwort(antwort: string, v: string): { ausgeschlossen: Bruch[] | null; menge: Loesungsmenge | null } {
  const s = antwort.replace(/[−–]/g, '-').replace(/!=|=\/=|\\neq/g, '≠');
  const aus: Bruch[] = [];
  let rest = s;
  for (const m of s.matchAll(new RegExp(`${v}\\s*≠\\s*(-?\\d+(?:[.,]\\d+)?(?:/\\d+)?)`, 'g'))) {
    const b = Bruch.parse(m[1]!);
    if (b) aus.push(b);
    rest = rest.replace(m[0], ' ');
  }
  const d = /D\s*=\s*(?:ℚ|Q|ℝ|R)?\s*(?:\\|ohne)\s*\{([^}]*)\}/i.exec(s);
  if (d) {
    for (const t of d[1]!.split(/\s*;\s*|,\s+/)) {
      const b = Bruch.parse(t);
      if (b) aus.push(b);
    }
    rest = rest.replace(d[0], ' ');
  }
  const lIndex = rest.search(/L\s*=/);
  const lText = lIndex >= 0 ? rest.slice(lIndex) : rest.replace(/^[\s;,]+|[\s;,]+$/g, '');
  return { ausgeschlossen: aus.length ? aus : null, menge: lText.trim() ? leseLoesungsmenge(lText.trim(), v) : null };
}

const gleicheZahlen = (a: readonly Bruch[], b: readonly Bruch[]) => {
  const s = (x: readonly Bruch[]) => [...new Set(x.map((y) => y.toString()))].sort().join();
  return s(a) === s(b);
};

export const bruchgleichung: Generator = {
  id: 't8-bruchgleichung',
  version: 1,
  baustein: 't8-bruchgleichung',
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
      const r = ziehe(z, afb, v);
      if (new Set(r.ausgeschlossen.map((x) => x.toString())).size !== r.ausgeschlossen.length) continue;
      const kandidat = loesungsmenge(r.linear);
      if (kandidat.art !== 'endlich') continue;
      const x = kandidat.werte[0]!;
      if (x.nenner > 6n || x.betrag().vergleiche(30) > 0) continue;
      const ausgeschlossen = r.ausgeschlossen.some((a) => a.gleich(x));
      const m: Loesungsmenge = ausgeschlossen ? { art: 'leer' } : kandidat;
      // Fehlantworten (nur die Lösungsmenge betreffend)
      const fehler: FalscheMenge[] = [];
      if (ausgeschlossen) fehler.push({ fehlertyp: 'BR', menge: kandidat, rueckmeldung: `${v} = ${x.alsText()} ist ausgeschlossen – dort wäre ein Nenner 0. Also gibt es keine Lösung.` });
      for (const f of gleichungsFehler(r.linear, kandidat, ['KL', 'VZ', 'UM'])) {
        if (!gleicheMenge(f.menge, m) && !fehler.some((y) => gleicheMenge(y.menge, f.menge))) fehler.push(f);
      }
      if (typ === 'auswahl' && fehler.length < 2) continue;

      const loesung = antwortFormel(v, r.ausgeschlossen, m);
      const d = dFormel(v, r.ausgeschlossen);
      const linearWeg = zeilenAlsFormeln(loesungsweg(r.linear).zeilen).slice(0, -1);
      const weg: Formel[] = [
        { text: `Ausgeschlossen: ${d.text} (dort wäre ein Nenner 0)`, latex: `\\text{Ausgeschlossen: } ${d.latex}` },
        { text: `${r.aufgabe.text}   | ${r.op.text}`, latex: `${r.aufgabe.latex} \\quad \\mid ${r.op.latex}` },
        ...linearWeg,
        ausgeschlossen
          ? { text: `${v} = ${x.alsText()} ist ausgeschlossen – also keine Lösung.`, latex: `\\text{${v} = ${x.alsText()} ist ausgeschlossen.}` }
          : { text: `Probe: ${v} = ${x.alsText()} ist nicht ausgeschlossen.`, latex: `\\text{${v} = ${x.alsText()} ist erlaubt.}` },
        loesung,
      ];
      let optionen: Auswahloption[] | undefined;
      if (typ === 'auswahl') {
        // falsche Lösungsmengen mit richtigen Ausschlüssen + richtige Lösung mit unvollständigen Ausschlüssen
        const opts: Auswahloption[] = fehler.slice(0, 2).map((f) => ({ formel: antwortFormel(v, r.ausgeschlossen, f.menge), richtig: false, fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung }));
        const falschD = r.ausgeschlossen.length > 1 ? r.ausgeschlossen.slice(0, 1) : [r.ausgeschlossen[0]!.negiert().istNull() ? Bruch.EINS : r.ausgeschlossen[0]!.negiert()];
        opts.push({ formel: antwortFormel(v, falschD, m), richtig: false, fehlertyp: 'BR', rueckmeldung: 'Prüfe die ausgeschlossenen Zahlen: Für welche Zahlen wird ein Nenner 0?' });
        optionen = z.gemischt([{ formel: loesung, richtig: true }, ...opts]);
      }
      const ausgeschlosseneWerte = r.ausgeschlossen;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'symbolisch',
        typ,
        ohneHilfsmittel: true,
        anweisung:
          typ === 'auswahl'
            ? `Welche Angabe ist vollständig richtig (ausgeschlossene Zahlen und Lösungsmenge, Variable ${v})?`
            : `Gib an, welche Zahlen für ${v} ausgeschlossen sind, und löse die Gleichung (Variable ${v}). Beispiel: „${v} ≠ 0; L = {2}“.`,
        aufgabe: r.aufgabe,
        loesung,
        hilfen: {
          denkanstoss: `Überlege zuerst, für welche Zahlen ein Nenner 0 wird – die sind ausgeschlossen. Multipliziere dann beide Seiten mit allen Nennern. Prüfe am Ende, ob deine Lösung erlaubt ist.`,
          ansatz: weg[0]!,
          loesungsweg: weg,
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          const a = leseBruchgleichungsAntwort(antwort, v);
          if (!a.menge) return { ergebnis: 'unlesbar', rueckmeldung: `Gib die ausgeschlossenen Zahlen und die Lösungsmenge an, z. B. „${v} ≠ 0; L = {2}“.` };
          if (gleicheMenge(a.menge, m)) {
            if (!a.ausgeschlossen) return { ergebnis: 'unvollstaendig', rueckmeldung: 'Die Lösungsmenge stimmt. Gib noch an, welche Zahlen ausgeschlossen sind (dort wäre ein Nenner 0).' };
            if (!gleicheZahlen(a.ausgeschlossen, ausgeschlosseneWerte)) return { ergebnis: 'falsch', fehlertyp: 'BR', rueckmeldung: 'Die Lösungsmenge stimmt, aber die ausgeschlossenen Zahlen nicht. Für welche Zahlen wird ein Nenner 0?' };
            return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
          }
          const f = fehler.find((y) => gleicheMenge(y.menge, a.menge!));
          if (f) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rueckmeldung };
          return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das stimmt noch nicht. Multipliziere mit allen Nennern und mach am Ende die Probe.' };
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

