/** Eine Formel in zwei Formen: Text (Tests, Barrierefreiheit) und LaTeX (Anzeige mit KaTeX). */
export interface Formel {
  readonly text: string;
  readonly latex: string;
}
