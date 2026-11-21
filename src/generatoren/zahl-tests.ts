/**
 * Pflichttests für Generatoren mit einer Zahl als Antwort. Nur in Tests verwenden.
 * `wertDerAufgabe` muss die Aufgabe UNABHÄNGIG vom Generator ausrechnen (z. B. durch Lesen
 * des Aufgabentexts); `null` heißt: diese Aufgabe kann so nicht nachgerechnet werden.
 */
import { expect, it } from 'vitest';
import { Bruch } from '../mathe/bruch';
import { leseZahlantwort } from './zahlaufgabe';
import type { AFB, Aufgabe, Aufgabentyp, FehlertypCode, Generator } from './typen';

export interface ZahlOptionen {
  readonly kombinationen: readonly (readonly [AFB, Aufgabentyp])[];
  readonly fehlertypen: readonly FehlertypCode[];
  readonly wertDerAufgabe: (a: Aufgabe) => Bruch | null;
  readonly mindestVerschieden: number;
  readonly gekuerztVerlangt?: boolean;
  /** false, wenn eine bestimmte Bruchform verlangt ist (z. B. „Erweitere auf den Nenner 20“) */
  readonly dezimalAkzeptiert?: (a: Aufgabe) => boolean;
}

export function pflichttestsZahl(gen: Generator, o: ZahlOptionen): Aufgabe[] {
  const aufgaben = o.kombinationen.flatMap(([afb, typ]) => Array.from({ length: 1000 }, (_, s) => gen.erzeuge(s, { afb, typ })));

  it('Determinismus', () => {
    for (const [afb, typ] of o.kombinationen) for (let s = 0; s < 50; s++) {
      expect(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 })).toBe(JSON.stringify({ ...gen.erzeuge(s, { afb, typ }), pruefe: 0 }));
    }
  });

  it('Masse, Metadaten und Korrektheit (unabhängig nachgerechnet)', () => {
    let geprueft = 0;
    for (const a of aufgaben) {
      expect(a.generator).toBe(gen.id);
      expect(gen.afb).toContain(a.afb);
      const w = o.wertDerAufgabe(a);
      if (w === null) continue;
      geprueft++;
      expect(leseZahlantwort(a.loesung.text)!.wert.gleich(w), `${a.aufgabe.text} → ${a.loesung.text}, erwartet ${w.alsText()}`).toBe(true);
    }
    expect(geprueft).toBeGreaterThan(aufgaben.length * 0.9);
  });

  it('Vielfalt', () => {
    for (const [afb, typ] of o.kombinationen) {
      const t = aufgaben.filter((a) => a.afb === afb && a.typ === typ).map((a) => a.aufgabe.text + (a.anweisung ?? ''));
      expect(new Set(t).size, `${afb}/${typ}`).toBeGreaterThanOrEqual(o.mindestVerschieden);
    }
  });

  const eingabe = aufgaben.filter((a) => a.typ === 'eingabe');
  if (eingabe.length) {
    it('Eingabe: Lösung (auch als Dezimalzahl/gemischte Zahl) richtig, Unsinn unlesbar, Fremdes UK', () => {
      for (const a of eingabe) {
        const w = leseZahlantwort(a.loesung.text)!.wert;
        expect(a.pruefe(a.loesung.text).ergebnis).toBe('richtig');
        const d = w.alsDezimal();
        if (d && (o.dezimalAkzeptiert?.(a) ?? true)) expect(a.pruefe(d).ergebnis).toBe('richtig');
        if (o.gekuerztVerlangt && !w.istGanz() && (o.dezimalAkzeptiert?.(a) ?? true)) expect(a.pruefe(`${w.zaehler * 2n}/${w.nenner * 2n}`).ergebnis).toBe('unvollstaendig');
        expect(a.pruefe('abc').ergebnis).toBe('unlesbar');
        expect(a.pruefe('987654').fehlertyp).toBe('UK');
      }
    });
  }

  const auswahl = aufgaben.filter((a) => a.typ === 'auswahl');
  if (auswahl.length) {
    it('Auswahl: 3–4 verschiedene Werte, genau einer richtig, Fehlertypen gesetzt', () => {
      for (const a of auswahl) {
        const opts = a.optionen!;
        expect(opts.length).toBeGreaterThanOrEqual(3);
        expect(opts.length).toBeLessThanOrEqual(4);
        const w = opts.map((x) => leseZahlantwort(x.formel.text)!.wert);
        const r = leseZahlantwort(a.loesung.text)!.wert;
        w.forEach((x, i) => {
          expect(x.gleich(r)).toBe(opts[i]!.richtig);
          for (let j = i + 1; j < w.length; j++) expect(x.gleich(w[j]!), a.aufgabe.text).toBe(false);
          if (!opts[i]!.richtig) expect(o.fehlertypen).toContain(opts[i]!.fehlertyp);
          expect(a.pruefe(String(i)).ergebnis).toBe(opts[i]!.richtig ? 'richtig' : 'falsch');
        });
      }
    });
  }

  it('Hilfen: drei Stufen, Lösungsweg endet mit der Lösung', () => {
    for (const a of aufgaben) {
      expect(a.hilfen.denkanstoss.length).toBeGreaterThan(20);
      expect(a.hilfen.ansatz.text.length).toBeGreaterThan(0);
      const letzte = a.hilfen.loesungsweg[a.hilfen.loesungsweg.length - 1]!.text;
      expect(letzte.endsWith(a.loesung.text), `${letzte} | ${a.loesung.text}`).toBe(true);
    }
  });

  return aufgaben;
}
