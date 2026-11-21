import { describe, expect, it } from 'vitest';
import { fehlerEinordnen, meisterung, punkte, sterne, TAG, type BausteinMeta, type Versuch } from './bewertung';

const META: BausteinMeta = { afb: ['I', 'II'], darstellungen: ['symbolisch'] };
const T0 = Date.UTC(2026, 10, 1);

function v(i: number, teil: Partial<Versuch> = {}): Versuch {
  return {
    baustein: 'b', generator: 'g', version: 1, seed: i, afb: 'I', darstellung: 'symbolisch', typ: 'eingabe',
    richtig: true, hilfeStufe: 0, zeitpunkt: T0 + i * 60_000, rundeId: 'r1', ...teil,
  };
}

describe('Punkte und Sterne (SPEC 6.1, 6.3)', () => {
  it('Punkte nach Hilfestufe', () => {
    expect(punkte({ richtig: true, hilfeStufe: 0 })).toBe(1);
    expect(punkte({ richtig: true, hilfeStufe: 1 })).toBe(0.75);
    expect(punkte({ richtig: true, hilfeStufe: 2 })).toBe(0.5);
    expect(punkte({ richtig: true, hilfeStufe: 3 })).toBe(0);
    expect(punkte({ richtig: false, hilfeStufe: 0 })).toBe(0);
  });
  it('Sterne', () => {
    const r = (n: number, f: number) => [...Array(n).fill({ richtig: true, hilfeStufe: 0 }), ...Array(f).fill({ richtig: false, hilfeStufe: 0 })];
    expect(sterne(r(10, 0))).toBe(3);
    expect(sterne(r(9, 1))).toBe(2);
    expect(sterne(r(8, 2))).toBe(2);
    expect(sterne(r(7, 3))).toBe(1);
    expect(sterne(r(6, 4))).toBe(1);
    expect(sterne(r(5, 5))).toBe(0);
    expect(sterne([{ richtig: true, hilfeStufe: 1 }])).toBe(1); // 75 % → ★
    expect(sterne([])).toBe(0);
  });
});

describe('Meisterung (SPEC 6.2)', () => {
  it('neu ohne Versuche, in Arbeit mit wenigen', () => {
    expect(meisterung([], META, T0).stufe).toBe('neu');
    expect(meisterung([v(1), v(2)], META, T0).stufe).toBe('in Arbeit');
  });

  it('sicher erst mit 8 Versuchen ≥ 80 % und mindestens einer AFB-II-Aufgabe', () => {
    const acht = Array.from({ length: 8 }, (_, i) => v(i));
    expect(meisterung(acht, META, T0).stufe).toBe('in Arbeit'); // nur AFB I
    const mitII = acht.map((x, i) => (i === 3 ? { ...x, afb: 'II' as const } : x));
    expect(meisterung(mitII, META, T0).stufe).toBe('sicher');
    const zuSchlecht = mitII.map((x, i) => (i < 2 ? { ...x, richtig: false } : x)); // 75 %
    expect(meisterung(zuSchlecht, META, T0).stufe).toBe('in Arbeit');
  });

  it('zwei Darstellungen nötig, wenn der Baustein mehrere anbietet', () => {
    const meta: BausteinMeta = { afb: ['I', 'II'], darstellungen: ['symbolisch', 'tabelle'] };
    const acht = Array.from({ length: 8 }, (_, i) => v(i, { afb: i === 0 ? 'II' : 'I' }));
    expect(meisterung(acht, meta, T0).stufe).toBe('in Arbeit');
    expect(meisterung(acht.map((x, i) => (i === 5 ? { ...x, darstellung: 'tabelle' as const } : x)), meta, T0).stufe).toBe('sicher');
  });

  it('nur AFB I angeboten: dann genügt AFB I', () => {
    expect(meisterung(Array.from({ length: 8 }, (_, i) => v(i)), { afb: ['I'], darstellungen: ['symbolisch'] }, T0).stufe).toBe('sicher');
  });

  it('gemeistert erst nach Bestätigung an einem späteren Tag (≥ 2 Tage, 3 von 3 ohne Hilfe)', () => {
    const sicher = Array.from({ length: 8 }, (_, i) => v(i, { afb: i === 0 ? 'II' : 'I' }));
    // am selben Tag weitere richtige Versuche zählen nicht als Bestätigung
    const gleicherTag = [...sicher, v(20), v(21), v(22)];
    expect(meisterung(gleicherTag, META, T0 + TAG).stufe).toBe('sicher');
    const spaeter = (i: number, t: Partial<Versuch> = {}) => v(i, { zeitpunkt: T0 + 3 * TAG + i * 60_000, ...t });
    const bestaetigt = [...sicher, spaeter(30), spaeter(31), spaeter(32)];
    const m = meisterung(bestaetigt, META, T0 + 3 * TAG);
    expect(m.stufe).toBe('gemeistert');
    expect(m.gemeistertAm).toBe(T0 + 3 * TAG + 32 * 60_000);
    // mit Hilfe zählt nicht als Bestätigung
    const mitHilfe = [...sicher, spaeter(30), spaeter(31, { hilfeStufe: 1 }), spaeter(32)];
    expect(meisterung(mitHilfe, META, T0 + 3 * TAG).stufe).toBe('sicher');
  });

  it('Auffrischen nach 28 Tagen ohne Übung oder bei neuen systematischen Fehlern', () => {
    const sicher = Array.from({ length: 8 }, (_, i) => v(i, { afb: i === 0 ? 'II' : 'I' }));
    const best = [...sicher, ...[30, 31, 32].map((i) => v(i, { zeitpunkt: T0 + 3 * TAG + i }))];
    expect(meisterung(best, META, T0 + 40 * TAG)).toMatchObject({ stufe: 'sicher', auffrischen: true });
    expect(meisterung(best, META, T0 + 5 * TAG, T0 + 4 * TAG)).toMatchObject({ stufe: 'sicher', auffrischen: true });
    expect(meisterung(best, META, T0 + 5 * TAG)).toMatchObject({ stufe: 'gemeistert', auffrischen: false });
  });
});

describe('Fehlereinordnung (SPEC 7.1 b)', () => {
  it('einmaliger Fehler ist flüchtig, zweimal in den letzten 5 ist systematisch', () => {
    const f = (i: number, r = 'r1') => v(i, { richtig: false, fehlertyp: 'VZ', rundeId: r });
    expect(fehlerEinordnen([v(1), f(2), v(3)])[0]).toMatchObject({ fehlertyp: 'VZ', einordnung: 'flüchtig' });
    expect(fehlerEinordnen([f(1), v(2), f(3)])[0]).toMatchObject({ einordnung: 'systematisch', anzahl: 2 });
    // weit auseinander, aber in zwei verschiedenen Runden (innerhalb der letzten 10) → systematisch
    const lang = [f(1, 'r1'), v(2), v(3), v(4), v(5), v(6), f(7, 'r2'), v(8), v(9), v(10)];
    expect(fehlerEinordnen(lang)[0]!.einordnung).toBe('systematisch');
    // weit auseinander in derselben Runde → flüchtig
    expect(fehlerEinordnen(lang.map((x) => ({ ...x, rundeId: 'r1' })))[0]!.einordnung).toBe('flüchtig');
  });
  it('UK wird nie systematisch; verschiedene Bausteine getrennt', () => {
    const uk = [1, 2, 3].map((i) => v(i, { richtig: false, fehlertyp: 'UK' }));
    expect(fehlerEinordnen(uk)[0]!.einordnung).toBe('flüchtig');
    const zwei = [v(1, { richtig: false, fehlertyp: 'KL', baustein: 'a' }), v(2, { richtig: false, fehlertyp: 'KL', baustein: 'b' })];
    expect(fehlerEinordnen(zwei).every((x) => x.einordnung === 'flüchtig')).toBe(true);
  });
});
