/**
 * Reparatur-Bausteine Bruchrechnung (Kl. 5/6):
 *  - v5-bruch-kuerzen          Kürzen und Erweitern (AFB I)
 *  - v6-bruch-addieren         Addieren/Subtrahieren, Hauptnenner (AFB I/II)
 *  - v6-bruch-multiplizieren   Multiplizieren/Dividieren (AFB I/II)
 * Ergebnisse müssen vollständig gekürzt sein (sonst „Wert stimmt, kürze noch“).
 *
 * Diagnostische Fehlantworten (BR, VZ, RE): Zähler+Zähler und Nenner+Nenner, über Kreuz
 * multipliziert, Kehrwert vergessen, nur Zähler gekürzt/erweitert …
 */
import { Bruch, kgV } from '../mathe/bruch';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { bereinigeZahlen, leseZahlantwort, pruefeZahl, zahlFormel, zahlOptionen, type FalscheZahl } from './zahlaufgabe';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

/** Roher (ungekürzter) Bruch als Formel. */
function roh(z: bigint | number, n: bigint | number): Formel {
  return { text: `${z}/${n}`.replace('-', '−'), latex: `\\frac{${z}}{${n}}` };
}
const verbinde = (teile: Formel[], op: string, opLatex: string): Formel => ({
  text: teile.map((t) => t.text).join(` ${op} `),
  latex: teile.map((t) => t.latex).join(` ${opLatex} `),
});
const gleich = (f: Formel): Formel => ({ text: `= ${f.text}`, latex: `= ${f.latex}` });

function basis(gen: Generator, seed: number, afb: AFB, typ: 'eingabe' | 'auswahl') {
  return { generator: gen.id, version: gen.version, seed, baustein: gen.baustein, afb, darstellung: 'symbolisch' as const, typ, ohneHilfsmittel: true };
}

function afbUndTyp(z: Zufall, gen: Generator, w: { afb?: AFB; typ?: string }): { afb: AFB; typ: 'eingabe' | 'auswahl' } {
  const afb: AFB = w.afb ?? z.auswahl([...gen.afb]);
  if (!gen.afb.includes(afb)) throw new GeneratorFehler(`AFB ${afb} wird von ${gen.id} nicht angeboten`);
  const typ = w.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
  if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);
  return { afb, typ };
}

// --- v5-bruch-kuerzen ----------------------------------------------------------------

export const bruchKuerzen: Generator = {
  id: 'v5-bruch-kuerzen',
  version: 1,
  baustein: 'v5-bruch-kuerzen',
  afb: ['I'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 1000; versuch++) {
      const q = z.ganzzahl(2, 12);
      const p = z.ganzzahl(1, q - 1);
      const e = Bruch.von(p, q);
      if (e.nenner !== BigInt(q)) continue; // p/q soll schon gekürzt sein
      const k = z.ganzzahl(2, 9);
      const fehler: FalscheZahl[] = [];
      if (z.mitWahrscheinlichkeit(0.6)) {
        // Kürzen: (k·p)/(k·q) → p/q
        const a = k * p;
        const b = k * q;
        fehler.push({ wert: Bruch.von(p, b), fehlertyp: 'BR', rueckmeldung: 'Beim Kürzen werden Zähler UND Nenner durch dieselbe Zahl geteilt.' });
        fehler.push({ wert: Bruch.von(a - (k - 1), b - (k - 1)), fehlertyp: 'BR', rueckmeldung: 'Kürzen heißt teilen, nicht subtrahieren.' });
        const fl = bereinigeZahlen(e, fehler).filter((f) => !f.wert.istNegativ() && !f.wert.istNull());
        if (typ === 'auswahl' && fl.length < 2) continue;
        const aufgabe = roh(a, b);
        const loesung = zahlFormel(e);
        const optionen = typ === 'auswahl' ? zahlOptionen(z, e, fl) : undefined;
        return {
          ...basis(this, seed, afb, typ),
          anweisung: 'Kürze den Bruch vollständig.',
          aufgabe,
          loesung,
          hilfen: {
            denkanstoss: 'Suche die größte Zahl, durch die Zähler und Nenner beide teilbar sind (größter gemeinsamer Teiler). Teile beide durch diese Zahl.',
            ansatz: { text: `Zähler und Nenner sind beide durch ${k} teilbar.`, latex: `\\text{Beide durch } ${k} \\text{ teilbar}` },
            loesungsweg: [{ text: `${aufgabe.text} = (${a} : ${k})/(${b} : ${k})`, latex: `${aufgabe.latex} = \\frac{${a} : ${k}}{${b} : ${k}}` }, gleich(loesung)],
          },
          optionen,
          pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeZahl(antwort, e, fl, { gekuerztVerlangt: true })),
        };
      }
      // Erweitern auf den Nenner k·q
      const n = k * q;
      fehler.push({ wert: Bruch.von(p, n), fehlertyp: 'BR', rueckmeldung: 'Beim Erweitern werden Zähler UND Nenner mit derselben Zahl multipliziert.' });
      fehler.push({ wert: Bruch.von(p + n - q, n), fehlertyp: 'BR', rueckmeldung: 'Erweitern heißt multiplizieren, nicht addieren.' });
      const fl = bereinigeZahlen(e, fehler);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const loesung = roh(p * k, n);
      let optionen: Auswahloption[] | undefined;
      if (typ === 'auswahl') {
        optionen = z.gemischt([
          { formel: loesung, richtig: true },
          ...fl.map((f) => ({ formel: roh(f.wert.mal(n).zaehler, n), richtig: false, fehlertyp: f.fehlertyp, ...(f.rueckmeldung ? { rueckmeldung: f.rueckmeldung } : {}) })),
        ]);
      }
      return {
        ...basis(this, seed, afb, typ),
        anweisung: `Erweitere den Bruch auf den Nenner ${n}.`,
        aufgabe: roh(p, q),
        loesung,
        hilfen: {
          denkanstoss: `Mit welcher Zahl musst du den Nenner ${q} multiplizieren, um ${n} zu erhalten? Mit derselben Zahl multiplizierst du auch den Zähler.`,
          ansatz: { text: `${q} · ${k} = ${n}`, latex: `${q} \\cdot ${k} = ${n}` },
          loesungsweg: [{ text: `${p}/${q} = (${p} · ${k})/(${q} · ${k})`, latex: `\\frac{${p}}{${q}} = \\frac{${p} \\cdot ${k}}{${q} \\cdot ${k}}` }, gleich(loesung)],
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          const a = leseZahlantwort(antwort);
          if (!a) return { ergebnis: 'unlesbar', rueckmeldung: `Gib einen Bruch mit dem Nenner ${n} ein, z. B. 3/${n}.` };
          if (a.wert.gleich(e)) {
            if (!a.roh || a.roh.nenner !== BigInt(n)) return { ergebnis: 'unvollstaendig', rueckmeldung: `Der Wert stimmt, aber der Nenner soll ${n} sein.` };
            return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
          }
          return pruefeZahl(antwort, e, fl);
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- v6-bruch-addieren -----------------------------------------------------------------

export const bruchAddieren: Generator = {
  id: 'v6-bruch-addieren',
  version: 1,
  baustein: 'v6-bruch-addieren',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 2000; versuch++) {
      const b = z.ganzzahl(2, 12);
      const d = afb === 'I' ? z.auswahl([b, b, b * 2, b * 3].filter((x) => x <= 20)) : z.ganzzahl(2, 15);
      const a = z.ganzzahl(1, 2 * b);
      const c = z.ganzzahl(1, 2 * d);
      const minus = z.mitWahrscheinlichkeit(0.4);
      const x = Bruch.von(a, b);
      const y = Bruch.von(c, d);
      if (x.zaehler !== BigInt(a) || y.zaehler !== BigInt(c)) continue; // Ausgangsbrüche gekürzt
      if (x.istGanz() || y.istGanz()) continue;
      const w = minus ? x.minus(y) : x.plus(y);
      if (w.istNegativ() || w.istNull()) continue;
      const hn = Number(kgV(BigInt(b), BigInt(d)));
      if (afb === 'II' && (b === d || hn === Math.max(b, d) || hn > 60)) continue;
      const op = minus ? '−' : '+';
      const fehler: FalscheZahl[] = [];
      // Zähler mit Zähler, Nenner mit Nenner verrechnet (nur wenn dabei kein Nenner ≤ 0 entsteht)
      if (!minus) fehler.push({ wert: Bruch.von(a + c, b + d), fehlertyp: 'BR', rueckmeldung: 'Zähler und Nenner werden nicht einfach addiert. Mache die Brüche zuerst gleichnamig.' });
      else if (b - d > 0) fehler.push({ wert: Bruch.von(a - c, b - d), fehlertyp: 'BR', rueckmeldung: 'Zähler und Nenner werden nicht einfach subtrahiert. Mache die Brüche zuerst gleichnamig.' });
      fehler.push(
        { wert: Bruch.von(minus ? a - c : a + c, hn), fehlertyp: 'BR', rueckmeldung: 'Beim Gleichnamig-Machen musst du auch die Zähler erweitern.' },
        { wert: minus ? x.plus(y) : x.minus(y), fehlertyp: 'VZ', rueckmeldung: `Achte auf das Rechenzeichen: Hier wird ${minus ? 'subtrahiert' : 'addiert'}.` },
      );
      const fl = bereinigeZahlen(w, fehler).filter((f) => !f.wert.istNegativ());
      if (typ === 'auswahl' && fl.length < 2) continue;
      const aufgabe = verbinde([roh(a, b), roh(c, d)], op, minus ? '-' : '+');
      const ka = hn / b;
      const kc = hn / d;
      const erweitert = verbinde([roh(a * ka, hn), roh(c * kc, hn)], op, minus ? '-' : '+');
      const zusammen = roh(minus ? a * ka - c * kc : a * ka + c * kc, hn);
      const loesung = zahlFormel(w);
      const weg: Formel[] = [{ text: `${aufgabe.text} = ${erweitert.text}`, latex: `${aufgabe.latex} = ${erweitert.latex}` }, gleich(zusammen)];
      if (zusammen.text !== loesung.text) weg.push(gleich(loesung));
      const optionen = typ === 'auswahl' ? zahlOptionen(z, w, fl) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: 'Berechne und kürze das Ergebnis vollständig.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: 'Brüche kann man nur addieren oder subtrahieren, wenn sie gleichnamig sind. Suche den Hauptnenner und erweitere beide Brüche. Dann rechnest du nur mit den Zählern.',
          ansatz: { text: `Hauptnenner: ${hn}`, latex: `\\text{Hauptnenner: } ${hn}` },
          loesungsweg: weg,
        },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeZahl(antwort, w, fl, { gekuerztVerlangt: true })),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- v6-bruch-multiplizieren ---------------------------------------------------------------

export const bruchMultiplizieren: Generator = {
  id: 'v6-bruch-multiplizieren',
  version: 1,
  baustein: 'v6-bruch-multiplizieren',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 2000; versuch++) {
      const b = z.ganzzahl(2, 12);
      const d = z.ganzzahl(2, 12);
      const a = z.ganzzahl(1, 12);
      const c = z.ganzzahl(1, 12);
      const x = Bruch.von(a, b);
      const y = Bruch.von(c, d);
      if (x.zaehler !== BigInt(a) || y.zaehler !== BigInt(c) || x.istGanz() || y.istGanz()) continue;
      const durch = z.mitWahrscheinlichkeit(0.45);
      const w = durch ? x.durch(y) : x.mal(y);
      // AFB I: ohne Kürzen über Kreuz nötig; AFB II: mit Kürzen
      const roheErgebnis = durch ? Bruch.von(a * d, b * c) : Bruch.von(a * c, b * d);
      const mussKuerzen = (durch ? BigInt(a * d) : BigInt(a * c)) !== roheErgebnis.zaehler;
      if ((afb === 'I') === mussKuerzen) continue;
      if (w.nenner > 60n || w.zaehler > 60n) continue;
      const fehler: FalscheZahl[] = durch
        ? [
            { wert: x.mal(y), fehlertyp: 'BR', rueckmeldung: 'Dividieren heißt: mit dem Kehrwert des zweiten Bruchs multiplizieren.' },
            { wert: x.kehrwert().mal(y), fehlertyp: 'BR', rueckmeldung: 'Der Kehrwert wird vom zweiten Bruch gebildet (dem Divisor), nicht vom ersten.' },
            { wert: x.kehrwert().mal(y.kehrwert()), fehlertyp: 'BR', rueckmeldung: 'Nur vom zweiten Bruch (dem Divisor) wird der Kehrwert gebildet.' },
          ]
        : [
            { wert: Bruch.von(a * d, b * c), fehlertyp: 'BR', rueckmeldung: 'Beim Multiplizieren: Zähler mal Zähler und Nenner mal Nenner – nicht über Kreuz.' },
            { wert: Bruch.von(a * c, kgV(BigInt(b), BigInt(d))), fehlertyp: 'BR', rueckmeldung: 'Beim Multiplizieren braucht man keinen Hauptnenner: Nenner mal Nenner.' },
            { wert: Bruch.von(a + c, b + d), fehlertyp: 'BR', rueckmeldung: 'Das wäre (falsches) Addieren. Beim Multiplizieren gilt: Zähler mal Zähler, Nenner mal Nenner.' },
          ];
      const fl = bereinigeZahlen(w, fehler);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const aufgabe = verbinde([roh(a, b), roh(c, d)], durch ? ':' : '·', durch ? ':' : '\\cdot');
      const weg: Formel[] = [];
      if (durch) weg.push({ text: `${aufgabe.text} = ${a}/${b} · ${d}/${c}`, latex: `${aufgabe.latex} = \\frac{${a}}{${b}} \\cdot \\frac{${d}}{${c}}` });
      const [zz, nn] = durch ? [a * d, b * c] : [a * c, b * d];
      const zusammen: Formel = { text: `(${durch ? `${a} · ${d}` : `${a} · ${c}`})/(${durch ? `${b} · ${c}` : `${b} · ${d}`})`, latex: `\\frac{${durch ? `${a} \\cdot ${d}` : `${a} \\cdot ${c}`}}{${durch ? `${b} \\cdot ${c}` : `${b} \\cdot ${d}`}}` };
      weg.push(weg.length ? gleich(zusammen) : { text: `${aufgabe.text} = ${zusammen.text}`, latex: `${aufgabe.latex} = ${zusammen.latex}` });
      const loesung = zahlFormel(w);
      if (roh(zz, nn).text !== loesung.text) weg.push(gleich(roh(zz, nn)));
      weg.push(gleich(loesung));
      const optionen = typ === 'auswahl' ? zahlOptionen(z, w, fl) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: 'Berechne und kürze das Ergebnis vollständig.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: durch
            ? 'Durch einen Bruch dividiert man, indem man mit seinem Kehrwert multipliziert. Dann: Zähler mal Zähler, Nenner mal Nenner – und kürzen.'
            : 'Zähler mal Zähler, Nenner mal Nenner. Tipp: Kürze schon vor dem Ausrechnen, das spart große Zahlen.',
          ansatz: weg[0]!,
          loesungsweg: weg,
        },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeZahl(antwort, w, fl, { gekuerztVerlangt: true })),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};
