/**
 * Einfache, selbst erzeugte SVG-Grafiken für Aufgaben.
 * Farben über CSS-Variablen mit Rückfallwerten, damit die Oberfläche später helles und
 * dunkles Design steuern kann. Keine externen Ressourcen.
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface Seite {
  /** Beschriftung, z. B. „x“ oder „3“ */
  readonly beschriftung: string;
  /** Zeichenlänge in px (nicht maßstäblich zur Variablen) */
  readonly laenge: number;
}

/**
 * Rechteck aus zwei Breiten- und zwei Höhenabschnitten, zerlegt in vier Teilflächen.
 * Beschriftung oben (Breiten) und links (Höhen).
 */
export function zerlegtesRechteck(breiten: readonly [Seite, Seite], hoehen: readonly [Seite, Seite], titel: string): string {
  const rand = 28;
  const w = breiten[0].laenge + breiten[1].laenge;
  const h = hoehen[0].laenge + hoehen[1].laenge;
  const fuellung = [
    ['var(--flaeche-1, #c9dcf5)', 'var(--flaeche-2, #e8d6a8)'],
    ['var(--flaeche-2, #e8d6a8)', 'var(--flaeche-3, #c7e6c7)'],
  ];
  const teile: string[] = [];
  let y = rand;
  hoehen.forEach((hs, i) => {
    let x = rand;
    breiten.forEach((bs, j) => {
      teile.push(`<rect x="${x}" y="${y}" width="${bs.laenge}" height="${hs.laenge}" fill="${fuellung[i]![j]}" stroke="var(--linie, #333)" stroke-width="1.5"/>`);
      x += bs.laenge;
    });
    y += hs.laenge;
  });
  // Variablen kursiv, Zahlen aufrecht (übliche mathematische Schreibweise)
  const text = (x: number, y: number, t: string) =>
    `<text x="${x}" y="${y}" font-size="16" font-family="sans-serif"${/[a-zA-Z]/.test(t) ? ' font-style="italic"' : ''} text-anchor="middle" dominant-baseline="middle" fill="var(--text, #222)">${esc(t)}</text>`;
  let x = rand;
  for (const b of breiten) {
    teile.push(text(x + b.laenge / 2, rand / 2, b.beschriftung));
    x += b.laenge;
  }
  y = rand;
  for (const hs of hoehen) {
    teile.push(text(rand / 2, y + hs.laenge / 2, hs.beschriftung));
    y += hs.laenge;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w + rand + 8} ${h + rand + 8}" role="img" aria-label="${esc(titel)}">` +
    `<title>${esc(titel)}</title>${teile.join('')}</svg>`
  );
}
