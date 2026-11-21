/**
 * Reparatur-Bausteine Terme und Gleichungen (Kl. 7, LB 2; Interpretationshilfe Kl. 7):
 *  - v7-term-zusammenfassen            gleichartige Glieder mit einer Variablen (AFB I/II)
 *  - v7-zahl-mal-summe                 Zahl · Summe, Minus vor der Klammer (AFB I/II)
 *  - v7-gleichung-inhaltlich           einfache Gleichungen im Kopf, Produkt = 0, Betrag (AFB I/II)
 *  - v7-gleichung-linear               lineare Gleichungen in wenigen Schritten (AFB I/II)
 *  - v7-gleichung-variable-im-nenner   3/b + 4 = 14; 20/a = 100/11 (AFB II)
 *  - v7-formel-umstellen               einfache Formeln (Vorlagen wie Kl. 8)
 */
import { Bruch } from '../mathe/bruch';
import { endlich, gleicheMenge, mengeFormel, type Loesungsmenge } from '../mathe/loesungsmenge';
import { type Glied } from '../mathe/polynom';
import { Zufall } from '../mathe/zufall';
import { auswahlOptionen, bereinigeFehlantworten, formel, pruefeAuswahl, pruefeTermEingabe, summeAlsPolynom, type Fehlantwort } from './gemeinsam';
import { gleichungFormel, loesungsmenge, loesungsweg, zeilenAlsFormeln, type Gleichung } from './gleichung';
import { gleichungsFehler, mengenOptionen, pruefeLoesungsmenge, type FalscheMenge } from './gleichung-hilfen';
import { formelGenerator } from './t8-formel-umstellen';
import { ergebnis, formelVon, g, glied, kl, loese, zusammenfassenSortiert, type Summe } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

function afbUndTyp(z: Zufall, gen: Generator, w: Wunsch): { afb: AFB; typ: 'eingabe' | 'auswahl' } {
  const afb: AFB = w.afb ?? z.auswahl([...gen.afb]);
  if (!gen.afb.includes(afb)) throw new GeneratorFehler(`AFB ${afb} wird von ${gen.id} nicht angeboten`);
  const typ = w.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
  if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);
  return { afb, typ };
}
function basis(gen: Generator, seed: number, afb: AFB, typ: 'eingabe' | 'auswahl') {
  return { generator: gen.id, version: gen.version, seed, baustein: gen.baustein, afb, darstellung: 'symbolisch' as const, typ, ohneHilfsmittel: true };
}
const gl = (k: number | Bruch, m: Record<string, number> = {}): Glied => ({ koeffizient: k instanceof Bruch ? k : Bruch.von(k), monom: m });

// --- v7-term-zusammenfassen ------------------------------------------------------------

export const termZusammenfassenKl7: Generator = {
  id: 'v7-term-zusammenfassen',
  version: 1,
  baustein: 'v7-term-zusammenfassen',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 2000; versuch++) {
      const v = z.auswahl(['x', 'a', 'y', 'b']);
      const monome: Record<string, number>[] = afb === 'I' ? [{ [v]: 1 }, {}] : [{ [v]: 2 }, { [v]: 1 }, {}];
      const glieder: Glied[] = [];
      for (const m of monome) for (let i = 0, n = z.ganzzahl(1, 2); i < n; i++) glieder.push(gl(z.mitWahrscheinlichkeit(0.2) ? z.auswahl([1, -1]) : z.ganzzahlOhne(-12, 12, [0]), m));
      const aufgabeGlieder = z.gemischt(glieder);
      if (aufgabeGlieder.length < 3 || aufgabeGlieder[0]!.koeffizient.istNegativ()) continue;
      const end = zusammenfassenSortiert(aufgabeGlieder);
      if (end.length === 0 || end.length === aufgabeGlieder.length) continue;
      // Fehler: ZF (Variable und Zahl zusammengefasst bzw. x² und x), VZ (ein Minus übersehen)
      const ohneVar = (gs: Glied[], ziel: string) => gs.map((x) => (Object.keys(x.monom).length === 0 || (afb === 'II' && x.monom[v] === 1) ? { ...x, monom: ziel === 'x' ? { [v]: afb === 'II' ? 2 : 1 } : x.monom } : x));
      const fehler: Fehlantwort[] = [
        { fehlertyp: 'ZF', glieder: zusammenfassenSortiert(ohneVar(aufgabeGlieder, 'x')), rueckmeldung: afb === 'I' ? 'Glieder mit Variable und reine Zahlen sind ungleichartig – sie werden nicht zusammengefasst.' : `${v}² und ${v} sind ungleichartig – sie werden nicht zusammengefasst.` },
      ];
      const neg = aufgabeGlieder.findIndex((x) => x.koeffizient.istNegativ());
      if (neg >= 0) fehler.push({ fehlertyp: 'VZ', glieder: zusammenfassenSortiert(aufgabeGlieder.map((x, i) => (i === neg ? { ...x, koeffizient: x.koeffizient.negiert() } : x))), rueckmeldung: 'Das Minus gehört zum Glied dahinter.' });
      const fl = bereinigeFehlantworten(summeAlsPolynom(end), fehler);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const aufgabe = formel(aufgabeGlieder);
      // gleichartige Glieder nebeneinander (höchste Hochzahl zuerst, Reihenfolge sonst beibehalten)
      const sortiert = formel([...aufgabeGlieder].sort((p, q) => (q.monom[v] ?? 0) - (p.monom[v] ?? 0)));
      const loesung = formel(end);
      const weg: Formel[] = [{ text: `${aufgabe.text} = ${sortiert.text}`, latex: `${aufgabe.latex} = ${sortiert.latex}` }, { text: `= ${loesung.text}`, latex: `= ${loesung.latex}` }];
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fl) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: 'Fasse zusammen.',
        aufgabe,
        loesung,
        hilfen: { denkanstoss: 'Ordne zuerst: gleichartige Glieder (gleiche Variable mit gleicher Hochzahl, bzw. reine Zahlen) nebeneinander. Dann addierst du ihre Zahlen.', ansatz: weg[0]!, loesungsweg: weg },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeTermEingabe(antwort, summeAlsPolynom(end), fl)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- v7-zahl-mal-summe ----------------------------------------------------------------------

export const zahlMalSumme: Generator = {
  id: 'v7-zahl-mal-summe',
  version: 1,
  baustein: 'v7-zahl-mal-summe',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 2000; versuch++) {
      const v = z.auswahl(['x', 'a', 'y']);
      const x = { [v]: 1 };
      const innen = [g(z.ganzzahl(1, 9), x), g(z.ganzzahlOhne(-9, 9, [0]))];
      let t: Summe;
      if (afb === 'I') t = [kl(glied(z.ganzzahlOhne(-9, 9, [0, 1])), innen)];
      else {
        const art = z.auswahl(['minus', 'zahlMinus', 'bruch'] as const);
        if (art === 'minus') t = [g(z.ganzzahl(2, 20)), kl(glied(-1), innen)];
        else if (art === 'zahlMinus') t = [g(z.ganzzahl(2, 9), x), kl(glied(-z.ganzzahl(2, 6)), innen)];
        else {
          const nn = z.ganzzahl(2, 4);
          const zz = z.ganzzahl(1, nn - 1);
          t = [kl({ koeffizient: Bruch.von(zz, nn), monom: {} }, [g(nn * z.ganzzahl(1, 4), x), g(Bruch.von(z.ganzzahl(1, 5), z.ganzzahl(2, 5)))])];
        }
      }
      const end = ergebnis(t);
      if (end.length === 0) continue;
      const fehler = bereinigeFehlantworten(summeAlsPolynom(end), (['KL', 'VZ'] as const).map((m) => ({ fehlertyp: m, glieder: ergebnis(t, m) })));
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const aufgabe = formelVon(t);
      const schritte = loese(t).map(formelVon);
      const loesung = formel(end);
      schritte[schritte.length - 1] = loesung;
      const weg: Formel[] = [{ text: `${aufgabe.text} = ${schritte[0]!.text}`, latex: `${aufgabe.latex} = ${schritte[0]!.latex}` }, ...schritte.slice(1).map((s) => ({ text: `= ${s.text}`, latex: `= ${s.latex}` }))];
      if (weg.length < 2) weg.push({ text: `= ${loesung.text}`, latex: `= ${loesung.latex}` });
      const optionen = typ === 'auswahl' ? auswahlOptionen(z, loesung, fehler) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: 'Löse die Klammer auf und fasse zusammen.',
        aufgabe,
        loesung,
        hilfen: { denkanstoss: 'Multipliziere die Zahl vor der Klammer mit JEDEM Glied in der Klammer. Ein Minus vor der Klammer ändert alle Vorzeichen in der Klammer.', ansatz: weg[0]!, loesungsweg: weg },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeTermEingabe(antwort, summeAlsPolynom(end), fehler)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- v7-gleichung-inhaltlich ---------------------------------------------------------------

export const gleichungInhaltlich: Generator = {
  id: 'v7-gleichung-inhaltlich',
  version: 1,
  baustein: 'v7-gleichung-inhaltlich',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 1000; versuch++) {
      const v = z.auswahl(['x', 'a', 'y']);
      const form = afb === 'I' ? z.auswahl(['linear', 'produkt', 'betrag'] as const) : z.auswahl(['betragVerschoben', 'produktKoeff', 'linear'] as const);
      let aufgabe: Formel;
      let m: Loesungsmenge;
      const fehler: FalscheMenge[] = [];
      let weg: Formel[];
      let denk: string;
      if (form === 'linear') {
        const a = z.ganzzahl(2, afb === 'I' ? 5 : 9);
        const x = z.ganzzahlOhne(-10, 12, [0]);
        const b = z.ganzzahlOhne(-12, 12, [0]);
        const c = a * x + b;
        aufgabe = { text: `${a}${v} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${Bruch.von(c).alsText()}`, latex: `${a}${v} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}` };
        m = endlich(Bruch.von(x));
        fehler.push({ fehlertyp: 'UM', menge: endlich(Bruch.von(c + b, a)), rueckmeldung: `Gegenoperation: Aus ${b < 0 ? '−' : '+'} ${Math.abs(b)} wird ${b < 0 ? '+' : '−'} ${Math.abs(b)}.` });
        fehler.push({ fehlertyp: 'UM', menge: endlich(Bruch.von(c - b - a)), rueckmeldung: `${a}${v} heißt ${a} mal ${v} – teile durch ${a}.` });
        weg = [{ text: `${a}${v} = ${c - b}`, latex: `${a}${v} = ${c - b}` }, { text: `${v} = ${x}`, latex: `${v} = ${x}` }];
        denk = `Welche Zahl musst du für ${v} einsetzen? Rechne rückwärts: Was war vor „${b < 0 ? '−' : '+'} ${Math.abs(b)}“, was vor „· ${a}“?`;
      } else if (form === 'produkt' || form === 'produktKoeff') {
        const p = z.ganzzahlOhne(-9, 9, [0]);
        const q = z.ganzzahlOhne(-9, 9, [0]);
        const k = form === 'produktKoeff' ? z.ganzzahl(2, 5) : 1;
        if (p === -q * k) continue; // beide Faktoren hätten dieselbe Nullstelle
        const f1 = { text: `${k === 1 ? '' : k}${v} ${p < 0 ? '+' : '−'} ${Math.abs(p)}`, latex: '' };
        const f2 = { text: `${v} ${q < 0 ? '−' : '+'} ${Math.abs(q)}`, latex: '' };
        // (k·v − p)(v + q) = 0  ⇒  v = p/k oder v = −q
        aufgabe = { text: `(${f1.text})·(${f2.text}) = 0`, latex: `\\left(${f1.text.replace('−', '-')}\\right) \\cdot \\left(${f2.text.replace('−', '-')}\\right) = 0` };
        const n1 = Bruch.von(p, k); // Nullstelle von k·v − p
        m = endlich(n1, Bruch.von(-q));
        fehler.push({ fehlertyp: 'VZ', menge: endlich(n1.negiert(), Bruch.von(q)), rueckmeldung: `Aus ${v} + 4 = 0 folgt ${v} = −4 – das Vorzeichen dreht sich.` });
        fehler.push({ fehlertyp: 'UM', menge: endlich(Bruch.von(-q)), rueckmeldung: 'Ein Produkt ist 0, wenn EINER der Faktoren 0 ist – es gibt zwei Lösungen.' });
        weg = [{ text: `${f1.text} = 0 oder ${f2.text} = 0`, latex: '' }, { text: `${v} = ${n1.alsText()} oder ${v} = ${Bruch.von(-q).alsText()}`, latex: '' }];
        denk = 'Ein Produkt ist 0, wenn einer der Faktoren 0 ist. Für welche Zahlen wird die erste, für welche die zweite Klammer 0?';
      } else {
        const c = z.ganzzahl(1, 15);
        const p = form === 'betragVerschoben' ? z.ganzzahlOhne(-9, 9, [0]) : 0;
        const innen = p === 0 ? v : `${v} ${p < 0 ? '+' : '−'} ${Math.abs(p)}`;
        aufgabe = { text: `|${innen}| = ${c}`, latex: `\\left|${innen.replace('−', '-')}\\right| = ${c}` };
        m = endlich(Bruch.von(p - c), Bruch.von(p + c));
        fehler.push({ fehlertyp: 'UM', menge: endlich(Bruch.von(p + c)), rueckmeldung: 'Auch eine negative Zahl hat den Betrag ' + c + ' – es gibt zwei Lösungen.' });
        if (p !== 0) fehler.push({ fehlertyp: 'VZ', menge: endlich(Bruch.von(-p - c), Bruch.von(-p + c)), rueckmeldung: `Der Abstand wird von ${p} aus gemessen: ${v} = ${p} − ${c} oder ${v} = ${p} + ${c}.` });
        else fehler.push({ fehlertyp: 'UM', menge: { art: 'leer' }, rueckmeldung: 'Der Betrag ist der Abstand zur 0 – zwei Zahlen haben den Abstand ' + c + '.' });
        weg = [{ text: `${innen} = ${c} oder ${innen} = −${c}`, latex: '' }, { text: `${v} = ${p + c} oder ${v} = ${p - c}`, latex: '' }];
        denk = p === 0 ? `Welche Zahlen haben den Abstand ${c} von 0?` : `Der Betrag |${innen}| ist der Abstand von ${v} zur Zahl ${p}. Welche Zahlen haben von ${p} den Abstand ${c}?`;
      }
      const fl = fehler.filter((f, i) => !gleicheMenge(f.menge, m) && fehler.findIndex((g2) => gleicheMenge(g2.menge, f.menge)) === i);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const loesung = mengeFormel(m);
      const wegF = [...weg.map((w) => ({ text: w.text, latex: w.latex || w.text.replace(/−/g, '-') })), loesung];
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fl) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: `Löse die Gleichung im Kopf (Variable ${v}) und gib die Lösungsmenge an.`,
        aufgabe,
        loesung,
        hilfen: { denkanstoss: denk, ansatz: wegF[0]!, loesungsweg: wegF },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeLoesungsmenge(antwort, v, m, fl)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- v7-gleichung-linear -----------------------------------------------------------------------

export const gleichungLinearKl7: Generator = {
  id: 'v7-gleichung-linear',
  version: 1,
  baustein: 'v7-gleichung-linear',
  afb: ['I', 'II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 3000; versuch++) {
      const v = z.auswahl(['x', 'a', 'y']);
      const x = { [v]: 1 };
      const n = (max = 9) => z.ganzzahlOhne(-max, max, [0]);
      let glg: Gleichung;
      if (afb === 'I') glg = { links: [g(z.ganzzahl(2, 9), x), g(n())], rechts: [g(z.ganzzahl(1, 8), x), g(n(15))], v };
      else
        glg = z.mitWahrscheinlichkeit(0.5)
          ? { links: [kl(glied(n(5)), [g(1, x), g(n())])], rechts: [g(n(30))], v }
          : { links: [g(z.ganzzahl(2, 9), x), g(n(20)), g(-z.ganzzahl(1, 5), x)], rechts: [g(z.ganzzahl(1, 6), x), g(n())], v };
      const m = loesungsmenge(glg);
      if (m.art !== 'endlich' || !m.werte[0]!.istGanz() || m.werte[0]!.betrag().vergleiche(20) > 0) continue;
      const fehler = gleichungsFehler(glg, m, ['KL', 'VZ', 'UM']);
      if (typ === 'auswahl' && fehler.length < 2) continue;
      const weg = zeilenAlsFormeln(loesungsweg(glg).zeilen);
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fehler) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: `Löse die Gleichung nach ${v} auf und gib die Lösungsmenge an.`,
        aufgabe: gleichungFormel(glg),
        loesung: mengeFormel(m),
        hilfen: { denkanstoss: 'Fasse jede Seite zusammen, bringe die Glieder mit Variable auf eine Seite und die Zahlen auf die andere. Teile am Ende durch die Zahl vor der Variablen.', ansatz: weg[1] ?? weg[0]!, loesungsweg: weg },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeLoesungsmenge(antwort, v, m, fehler)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- v7-gleichung-variable-im-nenner ----------------------------------------------------------------

export const gleichungVariableImNenner: Generator = {
  id: 'v7-gleichung-variable-im-nenner',
  version: 1,
  baustein: 'v7-gleichung-variable-im-nenner',
  afb: ['II'],
  darstellungen: ['symbolisch'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: true,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const { afb, typ } = afbUndTyp(z, this, wunsch);
    for (let versuch = 0; versuch < 1000; versuch++) {
      const v = z.auswahl(['b', 'a', 'x']);
      const zaehler = z.ganzzahl(2, 20);
      let aufgabe: Formel;
      let m: Loesungsmenge;
      const fehler: FalscheMenge[] = [];
      let weg: Formel[];
      if (z.mitWahrscheinlichkeit(0.5)) {
        // zaehler/v + d = e
        const d = z.ganzzahlOhne(-9, 9, [0]);
        const e = z.ganzzahlOhne(-15, 20, [d]);
        const q = Bruch.von(e - d);
        const x = Bruch.von(zaehler).durch(q);
        aufgabe = { text: `${zaehler}/${v} ${d < 0 ? '−' : '+'} ${Math.abs(d)} = ${Bruch.von(e).alsText()}`, latex: `\\frac{${zaehler}}{${v}} ${d < 0 ? '-' : '+'} ${Math.abs(d)} = ${e}` };
        m = endlich(x);
        fehler.push({ fehlertyp: 'UM', menge: endlich(q.mal(zaehler)), rueckmeldung: `Aus ${zaehler}/${v} = ${q.alsText()} folgt ${zaehler} = ${q.alsText()}·${v}. Teile dann durch ${q.alsText()}.` });
        if (e + d !== 0) fehler.push({ fehlertyp: 'UM', menge: endlich(Bruch.von(zaehler).durch(Bruch.von(e + d))), rueckmeldung: `Gegenoperation: Aus ${d < 0 ? '−' : '+'} ${Math.abs(d)} wird ${d < 0 ? '+' : '−'} ${Math.abs(d)}.` });
        weg = [
          { text: `${zaehler}/${v} = ${q.alsText()}`, latex: `\\frac{${zaehler}}{${v}} = ${q.alsText().replace('−', '-')}` },
          { text: `${zaehler} = ${q.alsText()}·${v}`, latex: `${zaehler} = ${q.alsText().replace('−', '-')} \\cdot ${v}` },
          { text: `${v} = ${x.alsText()}`, latex: `${v} = ${x.alsText().replace('−', '-')}` },
        ];
      } else {
        // zaehler/v = p/q  ⇒  v = zaehler·q/p
        const p = z.ganzzahl(2, 120);
        const q = z.ganzzahl(2, 20);
        const x = Bruch.von(zaehler * q, p);
        aufgabe = { text: `${zaehler}/${v} = ${p}/${q}`, latex: `\\frac{${zaehler}}{${v}} = \\frac{${p}}{${q}}` };
        m = endlich(x);
        fehler.push({ fehlertyp: 'BR', menge: endlich(Bruch.von(p, zaehler * q)), rueckmeldung: `Gesucht ist ${v} im Nenner: Aus ${zaehler}·${q} = ${p}·${v} folgt ${v} = ${zaehler}·${q} : ${p}.` });
        fehler.push({ fehlertyp: 'BR', menge: endlich(Bruch.von(zaehler * p, q)), rueckmeldung: 'Multipliziere über Kreuz: Zähler links mal Nenner rechts = Zähler rechts mal Nenner links.' });
        weg = [
          { text: `${zaehler}·${q} = ${p}·${v}`, latex: `${zaehler} \\cdot ${q} = ${p} \\cdot ${v}` },
          { text: `${v} = ${zaehler * q}/${p}`, latex: `${v} = \\frac{${zaehler * q}}{${p}}` },
        ];
      }
      if (m.art !== 'endlich' || m.werte[0]!.nenner > 20n || m.werte[0]!.istNull()) continue;
      const fl = fehler.filter((f, i) => !gleicheMenge(f.menge, m) && fehler.findIndex((g2) => gleicheMenge(g2.menge, f.menge)) === i);
      if (typ === 'auswahl' && fl.length < 2) continue;
      const loesung = mengeFormel(m);
      const wegF = [...weg, loesung];
      const optionen = typ === 'auswahl' ? mengenOptionen(z, m, fl) : undefined;
      return {
        ...basis(this, seed, afb, typ),
        anweisung: `Löse die Gleichung nach ${v} auf und gib die Lösungsmenge an.`,
        aufgabe,
        loesung,
        hilfen: { denkanstoss: `Bringe zuerst alles andere weg, sodass der Bruch mit ${v} allein steht. Multipliziere dann mit ${v} – so kommt ${v} aus dem Nenner.`, ansatz: wegF[0]!, loesungsweg: wegF },
        optionen,
        pruefe: (antwort: string): Bewertung => (typ === 'auswahl' ? pruefeAuswahl(optionen!, antwort) : pruefeLoesungsmenge(antwort, v, m, fl)),
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

// --- v7-formel-umstellen --------------------------------------------------------------------------

export const formelUmstellenKl7 = formelGenerator('v7-formel-umstellen');

