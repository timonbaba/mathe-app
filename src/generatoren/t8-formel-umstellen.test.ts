import { describe, expect, it } from 'vitest';
import { variablenIn } from '../mathe/auswertung';
import { Bruch } from '../mathe/bruch';
import { leseTerm } from '../mathe/term-parser';
import { Zufall } from '../mathe/zufall';
import { formelUmstellen as gen, VORLAGEN } from './t8-formel-umstellen';
import { werteAus } from './test-hilfen';

const KOMB = [['I', 'eingabe'], ['I', 'auswahl'], ['II', 'eingabe'], ['II', 'auswahl'], ['III', 'eingabe'], ['III', 'auswahl']] as const;
const aufgaben = KOMB.flatMap(([afb, typ]) => Array.from({ length: 300 }, (_, s) => gen.erzeuge(s, { afb, typ })));

/** Belegt alle Größen außer dem Ziel zufällig (positiv), berechnet das Ziel aus `loesung`. */
function belegung(formel: string, ziel: string, loesung: string, z: Zufall): Record<string, Bruch> {
  const b: Record<string, Bruch> = {};
  // positive Werte ≠ 1 (bei 1 fallen manche Fehler wie „mal statt geteilt“ zufällig nicht auf)
  for (const v of 'ρπuabcmVvtAUIRFlEghsr') {
    if (v === ziel) continue;
    let w = Bruch.von(z.ganzzahl(2, 40), z.ganzzahl(1, 5));
    while (w.gleich(1)) w = Bruch.von(z.ganzzahl(2, 40), z.ganzzahl(1, 5));
    b[v] = w;
  }
  b[ziel] = werteAus(leseTerm(loesung), b);
  void formel;
  return b;
}
const gilt = (gleichung: string, b: Record<string, Bruch>) => {
  const [l, r] = gleichung.split(' = ');
  return werteAus(leseTerm(l!), b).gleich(werteAus(leseTerm(r!), b));
};

describe('t8-formel-umstellen', () => {
  it('Vorlagen: Lösung erfüllt die Formel, jeder Zwischenschritt gilt, Fehlantworten sind falsch (unabhängig, je 50 Belegungen)', () => {
    const z = new Zufall(1);
    for (const v of VORLAGEN) {
      for (let i = 0; i < 50; i++) {
        const b = belegung(v.formel, v.ziel, v.loesung, z);
        expect(gilt(v.formel, b), `${v.formel} nach ${v.ziel}`).toBe(true);
        for (const w of v.weg) expect(gilt(w, b), w).toBe(true);
      }
      for (const fl of v.fehler) {
        const b = belegung(v.formel, v.ziel, fl.term, z);
        expect(gilt(v.formel, b), `Fehlantwort ${fl.term} darf nicht stimmen`).toBe(false);
      }
      // die Zielgröße kommt in der Lösung nicht mehr vor
      expect(variablenIn(leseTerm(v.loesung)).has(v.ziel), v.loesung).toBe(false);
    }
  });

  it('jede AFB-Stufe hat mindestens 5 Formeln; alle Fehlertypen gültig', () => {
    for (const afb of ['I', 'II', 'III']) expect(VORLAGEN.filter((v) => v.afb === afb).length).toBeGreaterThanOrEqual(5);
    for (const v of VORLAGEN) {
      expect(v.fehler.length).toBeGreaterThanOrEqual(2);
      for (const fl of v.fehler) expect(['UM', 'KL', 'VZ']).toContain(fl.typ);
    }
  });

  it('Determinismus', () => {
    for (const [afb, typ] of KOMB) for (let s = 0; s < 30; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('alle Vorlagen kommen vor', () => {
    const vorkommend = new Set(aufgaben.map((a) => a.aufgabe.text + a.loesung.text));
    expect(vorkommend.size).toBe(VORLAGEN.length);
  });

  it('Eingabe: verschiedene Schreibweisen richtig; Ziel rechts → unvollständig; Fehlantworten typisiert', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'eingabe')) {
      const [ziel, term] = a.loesung.text.split(' = ');
      expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
      expect(a.pruefe(term!).ergebnis).toBe('richtig');
      expect(a.pruefe(`${term} = ${ziel}`).ergebnis).toBe('richtig');
      expect(a.pruefe(`${ziel} = ${ziel} + ${term} − ${ziel}`).ergebnis).toBe('unvollstaendig');
      expect(a.pruefe('= =').ergebnis).toBe('unlesbar');
      const v = VORLAGEN.find((x) => x.formel === a.aufgabe.text && `${x.ziel} = ${x.loesung}` === a.loesung.text)!;
      for (const fl of v.fehler) expect(a.pruefe(`${ziel} = ${fl.term}`).fehlertyp).toBe(fl.typ);
    }
  });

  it('Auswahl: genau eine richtig, Optionen verschieden', () => {
    for (const a of aufgaben.filter((x) => x.typ === 'auswahl')) {
      const o = a.optionen!;
      expect(o.length).toBeGreaterThanOrEqual(3);
      expect(o.filter((x) => x.richtig)).toHaveLength(1);
      expect(new Set(o.map((x) => x.formel.text)).size).toBe(o.length);
      o.forEach((x, i) => expect(a.pruefe(String(i)).ergebnis).toBe(x.richtig ? 'richtig' : 'falsch'));
    }
  });
});
