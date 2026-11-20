/** Verzeichnis aller Generatoren. Neue Generatoren hier eintragen. */
import { ausklammern } from './t8-ausklammern';
import { ausmultiplizierenMonom } from './t8-ausmultiplizieren-monom';
import { binomAusmultiplizieren } from './t8-binom-ausmultiplizieren';
import { binomErgaenzen } from './t8-binom-ergaenzen';
import { binomFaktorisieren } from './t8-binom-faktorisieren';
import { binomGeometrie } from './t8-binom-geometrie';
import { klammernVerschachtelt } from './t8-klammern-verschachtelt';
import { summeMalSumme } from './t8-summe-mal-summe';
import { termGleichwertig } from './t8-term-gleichwertig';
import { zusammenfassenGenerator } from './t8-zusammenfassen';
import type { Generator } from './typen';

export const GENERATOREN: readonly Generator[] = [zusammenfassenGenerator, ausmultiplizierenMonom, klammernVerschachtelt, summeMalSumme, termGleichwertig, ausklammern, binomGeometrie, binomAusmultiplizieren, binomErgaenzen, binomFaktorisieren];
