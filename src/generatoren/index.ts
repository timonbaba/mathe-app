/** Verzeichnis aller Generatoren. Neue Generatoren hier eintragen. */
import { ausklammern } from './t8-ausklammern';
import { ausmultiplizierenMonom } from './t8-ausmultiplizieren-monom';
import { binomAusmultiplizieren } from './t8-binom-ausmultiplizieren';
import { binomErgaenzen } from './t8-binom-ergaenzen';
import { binomFaktorisieren } from './t8-binom-faktorisieren';
import { binomGeometrie } from './t8-binom-geometrie';
import { bruchtermFaktorisierenKuerzen } from './t8-bruchterm-faktorisieren-kuerzen';
import { bruchtermMultiplizieren } from './t8-bruchterm-multiplizieren';
import { gleichungBrueche } from './t8-gleichung-brueche';
import { gleichungKlammern } from './t8-gleichung-klammern';
import { gleichungSonderfaelle } from './t8-gleichung-sonderfaelle';
import { gleichungSummeMalSumme } from './t8-gleichung-summe-mal-summe';
import { klammernVerschachtelt } from './t8-klammern-verschachtelt';
import { summeMalSumme } from './t8-summe-mal-summe';
import { termGleichwertig } from './t8-term-gleichwertig';
import { termStruktur } from './t8-term-struktur';
import { termTextGenerator } from './t8-term-text';
import { termwert } from './t8-termwert';
import { zusammenfassenGenerator } from './t8-zusammenfassen';
import type { Generator } from './typen';

export const GENERATOREN: readonly Generator[] = [
  termStruktur,
  termTextGenerator,
  termwert,
  zusammenfassenGenerator, ausmultiplizierenMonom, klammernVerschachtelt, summeMalSumme, termGleichwertig, ausklammern, binomGeometrie, binomAusmultiplizieren, binomErgaenzen, binomFaktorisieren, bruchtermMultiplizieren, bruchtermFaktorisierenKuerzen, gleichungKlammern, gleichungBrueche, gleichungSummeMalSumme, gleichungSonderfaelle];
