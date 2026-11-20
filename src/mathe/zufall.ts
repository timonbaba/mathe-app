/**
 * Deterministischer Zufallsgenerator für Aufgaben.
 *
 * Gleicher Seed → gleiche Zahlenfolge → gleiche Aufgabe. Dadurch muss eine
 * Aufgabe nicht gespeichert werden: Generator-ID + Version + Seed genügen,
 * um sie exakt wiederherzustellen (SPEC 2, „Aufgabe (Instanz)“).
 *
 * Algorithmus: mulberry32 (klein, schnell, gut genug für Aufgabenwerte;
 * NICHT für Sicherheitszwecke geeignet).
 */
export class Zufall {
  private zustand: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new RangeError(`Seed muss eine ganze Zahl von 0 bis 2^32−1 sein: ${seed}`);
    }
    this.zustand = seed >>> 0;
  }

  /** Gleichverteilte Zahl in [0, 1). */
  naechste(): number {
    this.zustand = (this.zustand + 0x6d2b79f5) >>> 0;
    let t = this.zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganze Zahl von min bis max (beide einschließlich). */
  ganzzahl(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`Ungültiger Bereich: ${min}..${max}`);
    }
    return min + Math.floor(this.naechste() * (max - min + 1));
  }

  /** Ganze Zahl von min bis max ohne die ausgeschlossenen Werte (z. B. 0). */
  ganzzahlOhne(min: number, max: number, ohne: readonly number[]): number {
    const erlaubt: number[] = [];
    for (let i = min; i <= max; i++) if (!ohne.includes(i)) erlaubt.push(i);
    if (erlaubt.length === 0) throw new RangeError('Kein erlaubter Wert im Bereich');
    return this.auswahl(erlaubt);
  }

  /** Zufälliges Element einer nicht-leeren Liste. */
  auswahl<T>(liste: readonly T[]): T {
    if (liste.length === 0) throw new RangeError('Leere Liste');
    return liste[this.ganzzahl(0, liste.length - 1)]!;
  }

  /** Neue, gemischte Kopie der Liste (Fisher-Yates). */
  gemischt<T>(liste: readonly T[]): T[] {
    const a = [...liste];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.ganzzahl(0, i);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  /** true mit Wahrscheinlichkeit p. */
  mitWahrscheinlichkeit(p: number): boolean {
    return this.naechste() < p;
  }
}
