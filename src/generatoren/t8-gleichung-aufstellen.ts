/**
 * Generator für Baustein t8-gleichung-aufstellen
 * „Gleichungen aus Sachaufgaben aufstellen und lösen“ (Gym Kl. 8, LB 1, AFB II/III).
 *
 * Eigene Textvorlagen (keine Schulbuchaufgaben) mit zufälligen Zahlen und Namen.
 *  - auswahl: Welche Gleichung passt? Fehloptionen sind typische Übersetzungsfehler (TV).
 *  - eingabe: Antwort als Zahl (mit oder ohne Einheit). Fehler: falsches Modell bzw.
 *             falsche Größe angegeben (TV), Rechenfehler beim Lösen (UM, VZ, KL).
 *
 *  - AFB II:  Zahlenrätsel, aufeinanderfolgende Zahlen
 *  - AFB III: Alter, Rechteckumfang, Preise, Winkel im Dreieck (zwei Größen in Beziehung)
 */
import { Bruch } from '../mathe/bruch';
import { Zufall } from '../mathe/zufall';
import { pruefeAuswahl } from './gemeinsam';
import { gleichungFormel, loesungsmenge, loesungsweg, zeilenAlsFormeln, type Gleichung } from './gleichung';
import { gleichungsFehler } from './gleichung-hilfen';
import { g, glied, kl } from './termbaum';
import { GeneratorFehler, type AFB, type Aufgabe, type Auswahloption, type Bewertung, type Formel, type Generator, type Wunsch } from './typen';

interface Modell {
  gleichung: Gleichung;
  rueckmeldung: string;
}

interface Vorlage {
  text: string;
  frage: string;
  variable: string;
  bedeutung: string;
  einheit: string;
  richtig: Gleichung;
  falscheModelle: Modell[];
  /** Antwort auf die Frage aus der Lösung x (z. B. Länge statt Breite ist eine falsche Größe) */
  antwort: (x: Bruch) => Bruch;
  /** andere Größe, die man versehentlich angibt */
  andereGroesse?: { wert: (x: Bruch) => Bruch; rueckmeldung: string };
}

const NAMEN = ['Mia', 'Ben', 'Lea', 'Jonas', 'Emma', 'Noah', 'Lina', 'Paul', 'Ida', 'Finn', 'Clara', 'Emil'];
const VIELFACHES: Record<number, string> = { 2: 'Doppelte', 3: 'Dreifache', 4: 'Vierfache', 5: 'Fünffache' };

function vorlage(z: Zufall, afb: AFB): Vorlage {
  const x = { x: 1 };
  if (afb === 'II') {
    if (z.mitWahrscheinlichkeit(0.5)) {
      const art = z.auswahl(['vermindert', 'vermehrt', 'klammer'] as const);
      const k = z.ganzzahl(2, 5);
      const loes = z.ganzzahl(2, 15);
      const d = z.ganzzahl(2, 12);
      if (art === 'klammer') {
        const e = k * (loes + d);
        return {
          text: `Addiert man zu einer Zahl ${d} und nimmt das Ergebnis mit ${k} mal, erhält man ${e}.`,
          frage: 'Wie heißt die Zahl?',
          variable: 'x', bedeutung: 'die gesuchte Zahl', einheit: '',
          richtig: { links: [kl(glied(k), [g(1, x), g(d)])], rechts: [g(e)], v: 'x' },
          falscheModelle: [
            { gleichung: { links: [g(k, x), g(d)], rechts: [g(e)], v: 'x' }, rueckmeldung: 'Erst wird addiert, DANN mit ' + k + ' multipliziert – die Summe gehört in Klammern.' },
            { gleichung: { links: [g(1, x), g(d * k)], rechts: [g(e)], v: 'x' }, rueckmeldung: `Mit ${k} mal genommen wird das ganze Ergebnis „Zahl + ${d}“, nicht nur die ${d}.` },
          ],
          antwort: (v) => v,
        };
      }
      const e = art === 'vermindert' ? Math.max(k * loes - d, 1) : k * loes + d; // Ergebnis nie 0 (unnatürlich); Lösung prüft der Generator
      return {
        text: `Wenn man das ${VIELFACHES[k]} einer Zahl um ${d} ${art === 'vermindert' ? 'vermindert' : 'vermehrt'}, erhält man ${e}.`,
        frage: 'Wie heißt die Zahl?',
        variable: 'x', bedeutung: 'die gesuchte Zahl', einheit: '',
        richtig: { links: [g(k, x), g(art === 'vermindert' ? -d : d)], rechts: [g(e)], v: 'x' },
        falscheModelle: [
          { gleichung: { links: [kl(glied(k), [g(1, x), g(art === 'vermindert' ? -d : d)])], rechts: [g(e)], v: 'x' }, rueckmeldung: `Nur das ${VIELFACHES[k]} wird ${art === 'vermindert' ? 'vermindert' : 'vermehrt'} – hier ist keine Klammer nötig.` },
          { gleichung: { links: [g(k, x), g(art === 'vermindert' ? d : -d)], rechts: [g(e)], v: 'x' }, rueckmeldung: `„${art === 'vermindert' ? 'vermindern' : 'vermehren'} um“ heißt ${art === 'vermindert' ? 'minus' : 'plus'}.` },
          ...(art === 'vermindert' ? [{ gleichung: { links: [g(d), g(-k, x)], rechts: [g(e)], v: 'x' }, rueckmeldung: 'Vermindert wird das Vielfache der Zahl – also steht es vorn: ' + k + 'x − ' + d + '.' }] : []),
        ],
        antwort: (v) => v,
      };
    }
    const n = z.auswahl([3, 3, 4]);
    const kleinste = z.ganzzahl(5, 60);
    const summe = n * kleinste + (n * (n - 1)) / 2;
    const groesste = z.mitWahrscheinlichkeit(0.3);
    return {
      text: `Die Summe von ${n === 3 ? 'drei' : 'vier'} aufeinanderfolgenden natürlichen Zahlen ist ${summe}.`,
      frage: groesste ? 'Wie heißt die größte der Zahlen?' : 'Wie heißt die kleinste der Zahlen?',
      variable: 'x', bedeutung: 'die kleinste der Zahlen', einheit: '',
      richtig: { links: Array.from({ length: n }, (_, i) => (i === 0 ? g(1, x) : kl(glied(1), [g(1, x), g(i)]))), rechts: [g(summe)], v: 'x' },
      falscheModelle: [
        { gleichung: { links: [g(n, x)], rechts: [g(summe)], v: 'x' }, rueckmeldung: 'Die Zahlen sind nicht gleich: Die nächste ist immer um 1 größer (x, x + 1, x + 2 …).' },
        { gleichung: { links: [g(1, x), g(n - 1)], rechts: [g(summe)], v: 'x' }, rueckmeldung: 'Addiere alle Zahlen: x + (x + 1) + (x + 2) …' },
      ],
      antwort: (v) => (groesste ? v.plus(n - 1) : v),
      andereGroesse: groesste ? { wert: (v) => v, rueckmeldung: 'Du hast die kleinste Zahl angegeben – gefragt ist die größte.' } : { wert: (v) => v.plus(n - 1), rueckmeldung: 'Du hast die größte Zahl angegeben – gefragt ist die kleinste.' },
    };
  }
  const art = z.auswahl(['alter', 'rechteck', 'preis', 'winkel'] as const);
  if (art === 'alter') {
    const [a, b] = z.gemischt(NAMEN).slice(0, 2);
    const diff = z.ganzzahl(2, 9);
    const jung = z.ganzzahl(3, 30);
    const summe = 2 * jung + diff;
    return {
      text: `${a} ist ${diff} Jahre älter als ${b}. Zusammen sind beide ${summe} Jahre alt.`,
      frage: `Wie alt ist ${b}?`,
      variable: 'x', bedeutung: `das Alter von ${b} in Jahren`, einheit: 'Jahre',
      richtig: { links: [g(1, x), kl(glied(1), [g(1, x), g(diff)])], rechts: [g(summe)], v: 'x' },
      falscheModelle: [
        { gleichung: { links: [g(1, x), g(diff)], rechts: [g(summe)], v: 'x' }, rueckmeldung: `„Zusammen“ heißt: Das Alter von ${b} UND das von ${a} werden addiert.` },
        { gleichung: { links: [g(1, x), kl(glied(1), [g(1, x), g(-diff)])], rechts: [g(summe)], v: 'x' }, rueckmeldung: `${a} ist älter – also hat ${a} ${diff} Jahre MEHR: x + ${diff}.` },
      ],
      antwort: (v) => v,
      andereGroesse: { wert: (v) => v.plus(diff), rueckmeldung: `Das ist das Alter von ${a}. Gefragt ist nach ${b}.` },
    };
  }
  if (art === 'rechteck') {
    const diff = z.ganzzahl(2, 12);
    const breite = z.ganzzahl(3, 25);
    const u = 2 * (2 * breite + diff);
    return {
      text: `Ein Rechteck ist ${diff} cm länger als breit. Sein Umfang beträgt ${u} cm.`,
      frage: 'Wie breit ist das Rechteck?',
      variable: 'x', bedeutung: 'die Breite in cm', einheit: 'cm',
      richtig: { links: [kl(glied(2), [g(1, x), kl(glied(1), [g(1, x), g(diff)])])], rechts: [g(u)], v: 'x' },
      falscheModelle: [
        { gleichung: { links: [g(1, x), kl(glied(1), [g(1, x), g(diff)])], rechts: [g(u)], v: 'x' }, rueckmeldung: 'Der Umfang besteht aus allen vier Seiten: 2·(Länge + Breite).' },
        { gleichung: { links: [kl(glied(2), [g(1, x), g(diff)])], rechts: [g(u)], v: 'x' }, rueckmeldung: 'Länge und Breite gehören beide in den Umfang: 2·(x + (x + ' + diff + ')).' },
      ],
      antwort: (v) => v,
      andereGroesse: { wert: (v) => v.plus(diff), rueckmeldung: 'Das ist die Länge. Gefragt ist die Breite.' },
    };
  }
  if (art === 'preis') {
    const anzahl = z.ganzzahl(2, 6);
    const mehr = z.ganzzahl(1, 5);
    const heft = z.ganzzahl(1, 6);
    const gesamt = anzahl * heft + heft + mehr;
    return {
      text: `${anzahl} Hefte und ein Block kosten zusammen ${gesamt} €. Ein Block kostet ${mehr} € mehr als ein Heft.`,
      frage: 'Wie viel kostet ein Heft?',
      variable: 'x', bedeutung: 'der Preis eines Hefts in €', einheit: '€',
      richtig: { links: [g(anzahl, x), kl(glied(1), [g(1, x), g(mehr)])], rechts: [g(gesamt)], v: 'x' },
      falscheModelle: [
        { gleichung: { links: [g(anzahl, x), g(mehr)], rechts: [g(gesamt)], v: 'x' }, rueckmeldung: 'Der Block kostet x + ' + mehr + ' € – also den Heftpreis PLUS ' + mehr + ' €.' },
        { gleichung: { links: [kl(glied(anzahl), [g(1, x), g(mehr)])], rechts: [g(gesamt)], v: 'x' }, rueckmeldung: 'Nur der Block kostet mehr – die Hefte kosten jeweils x.' },
      ],
      antwort: (v) => v,
      andereGroesse: { wert: (v) => v.plus(mehr), rueckmeldung: 'Das ist der Preis des Blocks. Gefragt ist ein Heft.' },
    };
  }
  const k = z.ganzzahl(2, 3);
  const plus = z.ganzzahl(1, 8) * 5;
  // erster Winkel = (180 − plus)/(k + 2); nicht ganzzahlige Fälle verwirft der Generator
  return {
    text: `In einem Dreieck ist der zweite Winkel ${k === 2 ? 'doppelt' : 'dreimal'} so groß wie der erste. Der dritte Winkel ist ${plus}° größer als der erste.`,
    frage: 'Wie groß ist der erste Winkel?',
    variable: 'x', bedeutung: 'der erste Winkel in Grad', einheit: '°',
    richtig: { links: [g(1, x), g(k, x), kl(glied(1), [g(1, x), g(plus)])], rechts: [g(180)], v: 'x' },
    falscheModelle: [
      { gleichung: { links: [g(1, x), g(k, x), kl(glied(1), [g(1, x), g(plus)])], rechts: [g(360)], v: 'x' }, rueckmeldung: 'Die Winkelsumme im Dreieck beträgt 180°, nicht 360°.' },
      { gleichung: { links: [g(1, x), g(k, x), g(plus)], rechts: [g(180)], v: 'x' }, rueckmeldung: 'Der dritte Winkel ist x + ' + plus + '° – das x gehört auch dazu.' },
    ],
    antwort: (v) => v,
    andereGroesse: { wert: (v) => v.mal(k), rueckmeldung: 'Das ist der zweite Winkel. Gefragt ist der erste.' },
  };
}

function leseZahl(antwort: string): Bruch | null {
  const s = antwort.replace(/(€|cm|°|Grad|Jahre|Jahr|Euro)/gi, '').replace(/^.*=/, '').trim();
  return Bruch.parse(s);
}

export const gleichungAufstellen: Generator = {
  id: 't8-gleichung-aufstellen',
  version: 1,
  baustein: 't8-gleichung-aufstellen',
  afb: ['II', 'III'],
  darstellungen: ['text'],
  typen: ['eingabe', 'auswahl'],
  ohneHilfsmittel: false,

  erzeuge(seed: number, wunsch: Wunsch = {}): Aufgabe {
    const z = new Zufall(seed);
    const afb: AFB = wunsch.afb ?? z.auswahl(['II', 'III'] as const);
    if (afb === 'I') throw new GeneratorFehler('AFB I wird von diesem Generator nicht angeboten');
    const typ = wunsch.typ ?? (z.mitWahrscheinlichkeit(0.5) ? 'eingabe' : 'auswahl');
    if (typ !== 'eingabe' && typ !== 'auswahl') throw new GeneratorFehler(`Aufgabentyp ${typ} nicht unterstützt`);

    for (let versuch = 0; versuch < 1000; versuch++) {
      const v = vorlage(z, afb);
      const m = loesungsmenge(v.richtig);
      if (m.art !== 'endlich') continue;
      const x = m.werte[0]!;
      if (!x.istGanz() || x.istNegativ() || x.istNull()) continue;
      const antwortWert = v.antwort(x);
      const richtigText = gleichungFormel(v.richtig).text;
      // nur Fehlmodelle, die wirklich zu einer anderen Lösung führen
      const modelle = v.falscheModelle.filter((f, i, a) => {
        if (gleichungFormel(f.gleichung).text === richtigText) return false;
        if (a.findIndex((y) => gleichungFormel(y.gleichung).text === gleichungFormel(f.gleichung).text) !== i) return false;
        const fm = loesungsmenge(f.gleichung);
        return !(fm.art === 'endlich' && fm.werte[0]!.gleich(x));
      });
      if (typ === 'auswahl' && modelle.length < 2) continue;

      // falsche Zahlenantworten (für die Eingabe)
      const falscheWerte: { wert: Bruch; fehlertyp: 'TV' | 'UM' | 'VZ' | 'KL'; rm: string }[] = [];
      const addWert = (w: Bruch | null, fehlertyp: 'TV' | 'UM' | 'VZ' | 'KL', rm: string) => {
        if (w && !w.gleich(antwortWert) && !falscheWerte.some((y) => y.wert.gleich(w))) falscheWerte.push({ wert: w, fehlertyp, rm });
      };
      if (v.andereGroesse) addWert(v.andereGroesse.wert(x), 'TV', v.andereGroesse.rueckmeldung);
      for (const f of modelle) {
        const fm = loesungsmenge(f.gleichung);
        if (fm.art === 'endlich') addWert(v.antwort(fm.werte[0]!), 'TV', f.rueckmeldung);
      }
      for (const f of gleichungsFehler(v.richtig, m, ['KL', 'VZ', 'UM'])) if (f.menge.art === 'endlich') addWert(v.antwort(f.menge.werte[0]!), f.fehlertyp as 'UM', f.rueckmeldung);

      const weg = zeilenAlsFormeln(loesungsweg(v.richtig).zeilen).filter((f) => !f.text.startsWith('L ='));
      const einheit = v.einheit ? ` ${v.einheit}` : '';
      const antwortsatz = `Antwort: ${v.frage.replace(/^Wie (heißt|alt ist|breit ist|viel kostet|groß ist)/, 'Gesucht: ')} → ${antwortWert.alsText()}${einheit}`;
      const gleichungF = gleichungFormel(v.richtig);
      const aufgabe: Formel = { text: `${v.text} ${v.frage}`, latex: `\\text{${v.text} ${v.frage}}` };
      const loesung: Formel = typ === 'auswahl' ? gleichungF : { text: `${antwortWert.alsText()}${einheit}`, latex: `${antwortWert.alsText().replace('−', '-')}\\text{${einheit}}` };
      const optionen: Auswahloption[] | undefined =
        typ === 'auswahl'
          ? z.gemischt([{ formel: gleichungF, richtig: true }, ...modelle.slice(0, 3).map((f) => ({ formel: gleichungFormel(f.gleichung), richtig: false, fehlertyp: 'TV' as const, rueckmeldung: f.rueckmeldung }))])
          : undefined;
      return {
        generator: this.id,
        version: this.version,
        seed,
        baustein: this.baustein,
        afb,
        darstellung: 'text',
        typ,
        ohneHilfsmittel: false,
        anweisung: typ === 'auswahl' ? `Welche Gleichung passt zur Aufgabe? (x ist ${v.bedeutung}.)` : 'Stelle eine Gleichung auf, löse sie und beantworte die Frage.',
        aufgabe,
        loesung,
        hilfen: {
          denkanstoss: 'Lege zuerst fest, wofür x steht. Drücke dann alle anderen Größen mit x aus und übersetze den Text Satz für Satz in eine Gleichung.',
          ansatz: { text: `x: ${v.bedeutung}. Gleichung: ${gleichungF.text}`, latex: `x: \\text{${v.bedeutung}};\\quad ${gleichungF.latex}` },
          loesungsweg: [...weg, { text: antwortsatz, latex: `\\text{${antwortsatz}}` }],
        },
        optionen,
        pruefe(antwort: string): Bewertung {
          if (typ === 'auswahl') return pruefeAuswahl(optionen!, antwort);
          const w = leseZahl(antwort);
          if (!w) return { ergebnis: 'unlesbar', rueckmeldung: 'Gib die Antwort als Zahl an, z. B. 12 oder 12 cm.' };
          if (w.gleich(antwortWert)) return { ergebnis: 'richtig', rueckmeldung: 'Richtig!' };
          const f = falscheWerte.find((y) => y.wert.gleich(w));
          if (f) return { ergebnis: 'falsch', fehlertyp: f.fehlertyp, rueckmeldung: f.rm };
          return { ergebnis: 'falsch', fehlertyp: 'UK', rueckmeldung: 'Das passt noch nicht. Mach die Probe am Text: Stimmen alle Angaben mit deiner Zahl?' };
        },
      };
    }
    throw new GeneratorFehler(`Keine geeignete Aufgabe für Seed ${seed} gefunden`);
  },
};

