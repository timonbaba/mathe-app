/** Verzeichnis aller Generatoren. Neue Generatoren hier eintragen. */
import { casErgebnisse } from './t8-cas-ergebnisse';
import { ausklammern } from './t8-ausklammern';
import { ausmultiplizierenMonom } from './t8-ausmultiplizieren-monom';
import { binomAusmultiplizieren } from './t8-binom-ausmultiplizieren';
import { binomErgaenzen } from './t8-binom-ergaenzen';
import { binomFaktorisieren } from './t8-binom-faktorisieren';
import { binomGeometrie } from './t8-binom-geometrie';
import { bruchgleichung } from './t8-bruchgleichung';
import { bruchtermFaktorisierenKuerzen } from './t8-bruchterm-faktorisieren-kuerzen';
import { bruchtermMultiplizieren } from './t8-bruchterm-multiplizieren';
import { formelUmstellen } from './t8-formel-umstellen';
import { gleichungAufstellen } from './t8-gleichung-aufstellen';
import { gleichungBrueche } from './t8-gleichung-brueche';
import { gleichungKlammern } from './t8-gleichung-klammern';
import { gleichungSonderfaelle } from './t8-gleichung-sonderfaelle';
import { gleichungSummeMalSumme } from './t8-gleichung-summe-mal-summe';
import { klammernVerschachtelt } from './t8-klammern-verschachtelt';
import { gleichungAusklammernNull, nullprodukt } from './t8-nullprodukt';
import { summeMalSumme } from './t8-summe-mal-summe';
import { termGleichwertig } from './t8-term-gleichwertig';
import { termStruktur } from './t8-term-struktur';
import { termTextGenerator } from './t8-term-text';
import { termwert } from './t8-termwert';
import { ungleichung } from './t8-ungleichung';
import { zusammenfassenGenerator } from './t8-zusammenfassen';
import type { Generator } from './typen';
import { bruchAddieren, bruchKuerzen, bruchMultiplizieren } from './v-brueche';
import { vorrang } from './v5-vorrang';
import { potenzWurzel, rationalAddieren, rationalMultiplizieren } from './v7-rationale-zahlen';
import { formelUmstellenKl7, gleichungInhaltlich, gleichungLinearKl7, gleichungVariableImNenner, termZusammenfassenKl7, zahlMalSumme } from './v7-terme-gleichungen';

/** Generatoren der Reparatur-Bausteine aus Kl. 5–7 */
export const REPARATUR_GENERATOREN: readonly Generator[] = [vorrang, bruchKuerzen, bruchAddieren, bruchMultiplizieren, rationalAddieren, rationalMultiplizieren, potenzWurzel,
  termZusammenfassenKl7, zahlMalSumme, gleichungInhaltlich, gleichungLinearKl7, gleichungVariableImNenner, formelUmstellenKl7];

/** Generatoren der Kl.-8-Bausteine */
export const GENERATOREN: readonly Generator[] = [
  termStruktur,
  termTextGenerator,
  termwert,
  zusammenfassenGenerator, ausmultiplizierenMonom, klammernVerschachtelt, summeMalSumme, termGleichwertig, ausklammern, binomGeometrie, binomAusmultiplizieren, binomErgaenzen, binomFaktorisieren, bruchtermMultiplizieren, bruchtermFaktorisierenKuerzen, gleichungKlammern, gleichungBrueche, gleichungSummeMalSumme, gleichungSonderfaelle, nullprodukt, gleichungAusklammernNull, bruchgleichung, formelUmstellen, ungleichung, gleichungAufstellen, casErgebnisse];
