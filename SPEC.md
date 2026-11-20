# SPEC – Mathe-Lern-App (Arbeitstitel)

Stand: 20.11.2026 · Version 1.1 (v1.0 freigegeben am 20.11.2026; Änderungen siehe Abschnitt 14)

Hinweise (Markierungen „[fest]“ kennzeichnen Vorgaben aus Timons ursprünglichem Projektbriefing):
- Alle Festlegungen in diesem Dokument sind freigegeben. Zahlenwerte bei Meisterung, Sternen, Fehlereinordnung und Test-Einschätzung sind **Startwerte** und werden nach dem Pilot anhand echter Daten überprüft (Abschnitt 14).
- Änderungen an dieser SPEC nur nach Rücksprache mit Timon; jede Änderung im Entscheidungsprotokoll (Abschnitt 14) vermerken.

---

## 1. Zweck und Leitprinzipien

Die App ist ein **ergänzendes Feature der 1:1-Nachhilfe** („Mathebegleitung“ im Abo), kein eigenständiges Produkt. [fest]

1. **Ersetzt Hausaufgaben:** Der Tutor weist Abschnitte mit Frist zu; die App übt gezielt und adaptiv.
2. **Bereitet auf Tests vor:** Leistungskontrollen und Klassenarbeiten im sächsischen Format.
3. **Macht Lücken sichtbar:** für den Tutor (Fehlertypen, Meisterung) und für den Schüler (verständliche Rückmeldung, Reparatur-Level).
4. **Lehrplantreu:** Inhalte vollständig nach sächsischem Lehrplan (Gymnasium, Oberschule).
5. **Mathematisch korrekt:** Alle Aufgaben aus geprüften Generatoren, keine übernommenen Schulbuchaufgaben.
6. **Fair und ruhig gestaltet:** Genauigkeit statt Tempo, nur kosmetische Belohnungen, kein Suchtdesign.
7. **Datensparsam:** Minderjährige Nutzer, Pseudonyme, EU-Hosting, Löschkonzept.

---

## 2. Begriffe (Glossar)

| Begriff | Bedeutung |
|---|---|
| **Klassenstufe** | 5–12; bestimmt zusammen mit Schulart den Lehrplan. |
| **Schulart / Bildungsgang** | Gymnasium; Oberschule (Kl. 5–6 ohne, ab Kl. 7 Hauptschul- oder Realschulbildungsgang); Gymnasiale Oberstufe (Kl. 11–12, Grund- oder Leistungskurs). |
| **Lernbereich (LB)** | Abschnitt des Lehrplans einer Klassenstufe. Im Spiel: eine **Welt**. |
| **Lernziel (LZ)** | Ziel innerhalb eines Lernbereichs genau wie im Lehrplan (z. B. „Beherrschen des Umgangs mit Variablen und Termen …“). Dient als Lehrplan-Bezug für Tutor und Berichte. |
| **Level** | Spielbare Einheit innerhalb einer Welt; gehört zu genau einem Lernziel und bündelt 1–4 Bausteine. Lernziele des Lehrplans sind oft zu groß für ein Level und werden daher in mehrere Level aufgeteilt. |
| **Baustein** | Kleinste übbare Kompetenz (z. B. „Summe mit Zahl multiplizieren“). Ein Level besteht aus einem oder mehreren Bausteinen. |
| **Voraussetzungs-Netz** | Gerichtete Verknüpfung „Baustein A wird für Baustein B gebraucht“, auch über Klassenstufen hinweg. |
| **Reparatur-Level** | Automatisch vorgeschlagene Übung zu einem Voraussetzungs-Baustein (oft aus früherer Klassenstufe), wenn eine Lücke erkannt wird. |
| **Geheimes Level** | Freischaltbares Zusatz-Level (Knobeln, AFB III, Vorgriff). Nie testrelevant. |
| **Generator** | Programm, das zu einem Baustein Aufgaben erzeugt: Vorlage + Zufallswerte + automatische Lösung + Hilfen + Fehlertyp-Zuordnung. |
| **Aufgabe (Instanz)** | Konkrete, aus Generator + Seed erzeugte Aufgabe. Wird nicht gespeichert, sondern bei Bedarf aus Generator-ID, Generator-Version und Seed exakt wiederhergestellt. |
| **Runde** | Eine Spieleinheit: 5–10 Aufgaben, ca. 3–5 Minuten. |
| **Versuch** | Eine Antwort eines Schülers auf eine Aufgabe (inkl. genutzter Hilfen und erkanntem Fehlertyp). |
| **Fehlertyp** | Kategorie aus der festen Fehlertyp-Systematik (z. B. Vorzeichen). |
| **AFB** | Anforderungsbereich I (Reproduzieren), II (Zusammenhänge herstellen), III (Verallgemeinern/Reflektieren), angelehnt an die Interpretationshilfen des SMK. |
| **Abschnitt** | Vom Tutor zugewiesene Auswahl an Leveln/Bausteinen mit Ziel und Frist (= neue „Hausaufgabe“). |
| **Testtermin** | Anstehende Leistungskontrolle (LK) oder Klassenarbeit (KA) mit Datum und Themen. |
| **Probe-Arbeit** | Simulierte Arbeit im sächsischen Format: Teil ohne Hilfsmittel + Teil mit Hilfsmitteln. |

---

## 3. Rollen und Rechte

| Rolle | Wer | Darf | Darf nicht |
|---|---|---|---|
| **Schüler** | Nachhilfeschüler (minderjährig) | Eigene Welten/Level spielen, aktuellen Lernbereich wählen, eigene Testtermine eintragen, eigenen Fortschritt sehen, Figur/Kosmetik wählen | Andere Schüler sehen, Konto selbst anlegen, Daten anderer ändern |
| **Tutor** | Timon (zugleich Administrator) | Schülerkonten anlegen/ändern/löschen, Passwort zurücksetzen, Abschnitte zuweisen, Testtermine eintragen, alle Daten **seiner** Schüler einsehen, Berichte erzeugen | – |
| **Eltern** *(später)* | Erziehungsberechtigte | Lesender Zugriff auf Bericht zum eigenen Kind; ggf. Konto für Kind anlegen lassen | Detail-Versuche einsehen (nur Zusammenfassung) |

- Rechtsgrundlage der Tutor-Einsicht: der Nachhilfevertrag. [fest]
- Keine freie Selbstregistrierung. [fest]
- Technisch so gebaut, dass später weitere Tutoren möglich wären (jeder Schüler gehört genau einem Tutor), aber im Pilot gibt es nur einen.

---

## 4. Inhaltsmodell

### 4.1 Struktur [fest]

```
Schulart/Bildungsgang + Klassenstufe
 └─ Lernbereich (Welt)
     └─ Lernziel (wie im Lehrplan)
         └─ Level (spielbare Einheit)
             └─ Baustein (kleinste übbare Einheit)
                 └─ Generator(en)
```

- Innerhalb einer Welt gehört jeder Baustein zu genau einem Level; über Welten hinweg kann derselbe Baustein mehrfach vorkommen (z. B. „Bruch kürzen“).
- Bausteine sind **schulart-übergreifend** nutzbar: Gymnasium und Oberschule teilen sich Bausteine, wo der Inhalt gleich ist; Lernbereiche/Lernziele sind dagegen pro Lehrplan eigen.
- Jeder Lernbereich und jedes Lernziel verweist auf die genaue Lehrplan-Stelle (Lehrplan, Fassung, Klassenstufe, Lernbereich-Nr.).

### 4.2 Voraussetzungs-Netz [fest]

- Gerichtete Kanten Baustein → Baustein („wird gebraucht für“), über Klassenstufen hinweg (z. B. Bruchrechnung Kl. 6 → Terme Kl. 8).
- Optionales Gewicht der Kante: **notwendig** oder **hilfreich**.
- Keine Zyklen (wird automatisch getestet).
- Verwendung:
  - **Reparatur-Level:** Bei wiederholtem (systematischem) Fehler in Baustein B, der zu einem Fehlertyp passt, der in Voraussetzung A geübt wird, schlägt die App A als Reparatur-Level vor.
  - **Tutor-Vorschlag** für die nächste Stunde.

### 4.3 Reihenfolge [fest]

- Den aktuellen Lernbereich wählen Schüler oder Tutor selbst. Keine erzwungene lineare Reihenfolge.
- Innerhalb eines Lernbereichs werden Level als empfohlene Reihenfolge angezeigt, sind aber alle zugänglich. Fehlen Voraussetzungen, gibt es einen Hinweis („Tipp: Erst X üben?“), keine Sperre.

### 4.4 Geheime Level [fest]

- Freischaltung: Level **ohne Hilfen** gemeistert (genaue Bedingung hängt an der Meisterungs-Definition, Abschnitt 6).
- Inhalt: Knobelaufgaben, AFB III, Vorgriff auf das nächste Thema.
- **Nichts darin ist testrelevant**; geheime Level fließen nicht in die Test-Einschätzung ein.

### 4.5 Ablage der Inhalte

- Lernbereiche, Lernziele, Bausteine, Voraussetzungen und Fehlertypen liegen als **versionierte Textdateien (YAML) im Repository**, nicht in der Datenbank.
  - Vorteil: nachvollziehbar (jede Änderung sichtbar), automatisch testbar, keine personenbezogenen Daten.
- Die Datenbank speichert nur **stabile IDs** (z. B. `gym8-terme.lz2`, `baustein.ausmultiplizieren-zahl-summe`).
- Eine automatisch erzeugte **Übersichtsseite** zeigt Timon den Inhaltsbaum, das Netz und Beispielaufgaben zur Durchsicht.

---

## 5. Aufgabenmodell

### 5.1 Drei Variations-Achsen [fest]

| Achse | Werte |
|---|---|
| **Schwierigkeit** | AFB I, AFB II, AFB III; zusätzlich Kennzeichen **„ohne Hilfsmittel“** (ja/nein) |
| **Darstellung** | symbolisch, grafisch, Tabelle, Text-/Sachaufgabe |
| **Aufgabentyp** | freie Eingabe, Multiple Choice (diagnostisch), Zuordnen, Schritte ordnen, „Finde den Fehler“, Schätzen, Graph |

Die Achsen sind unabhängig: Ein Generator deklariert, welche Kombinationen er liefern kann.

### 5.2 Generatoren [fest]

Jeder Generator besteht aus:

1. **Metadaten:** ID, Version, Baustein(e), AFB, Darstellung(en), Aufgabentyp(en), ohne Hilfsmittel ja/nein, Zahlenbereiche.
2. **Vorlage + Zufallswerte:** deterministisch aus einem **Seed** (gleicher Seed → gleiche Aufgabe).
3. **Gültigkeitsregeln:** verwirft ungeeignete Werte (Division durch 0, triviale Fälle, zu große Zahlen …).
4. **Automatische Lösung:** exakt berechnet.
5. **Antwortprüfung:** akzeptiert gleichwertige Schreibweisen; kann eine bestimmte Form verlangen (z. B. „vollständig vereinfacht“, „gekürzt“). Ob Form oder nur Wert geprüft wird, ist pro Generator festgelegt.
6. **Fehlerdiagnose:** bildet bekannte Fehlantworten auf Fehlertypen ab (z. B. `-(a-b)` → `-a-b` ⇒ Vorzeichen/Klammer). Bei Multiple Choice: jede falsche Option = ein Fehlertyp.
7. **Gestufte Hilfen** (Abschnitt 5.4).
8. **Tests** (siehe `CLAUDE.md`).

Keine Aufgaben aus Schulbüchern. [fest]

Generator-Versionen: Ändert sich ein Generator inhaltlich, steigt die Version; alte Versuche bleiben über (Generator-ID, Version, Seed) reproduzierbar.

### 5.3 Aufgabentypen im Detail

| Typ | Beschreibung | Auswertung |
|---|---|---|
| Freie Eingabe | Zahl, Term, Gleichung oder Lösungsmenge über eine **eigene Mathe-Tastatur** am Handy | Wert- und ggf. Formprüfung, Fehlerdiagnose über bekannte Fehlermuster |
| Multiple Choice (diagnostisch) | 3–4 Optionen, jede falsche entspricht einem Fehlertyp | Gewählte Option ⇒ Fehlertyp |
| Zuordnen | Paare bilden (z. B. Term ↔ vereinfachter Term, Graph ↔ Gleichung) | Pro Paar; falsche Paare ⇒ Fehlertyp der Paar-Vorlage |
| Schritte ordnen | Lösungsschritte in richtige Reihenfolge bringen | Erste falsche Position + Art des Fehlers |
| Finde den Fehler | Vorgerechnete Lösung mit genau einem Fehler; Schüler markiert die Zeile (und benennt optional den Fehler) | Richtige Zeile? Richtiger Fehlertyp? |
| Schätzen | Ergebnis überschlagen, Toleranzbereich | Innerhalb Toleranz = richtig |
| Graph | Punkt setzen, Gerade zeichnen, Wert ablesen | Toleranz auf Raster |

### 5.4 Gestufte Hilfen [fest]

| Stufe | Inhalt | Beispiel |
|---|---|---|
| 1 Denkanstoß | Frage/Hinweis ohne Rechnung | „Was passiert mit dem Vorzeichen, wenn vor der Klammer ein Minus steht?“ |
| 2 Ansatz | Erster Schritt vorgemacht | „−(3x − 5) = −3x + …“ |
| 3 Lösungsweg | Vollständige Lösung Schritt für Schritt | alle Schritte bis zum Ergebnis |

- Hilfen sind freiwillig und jederzeit abrufbar; die genutzte höchste Stufe wird im Versuch gespeichert.
- Hilfe-Nutzung fließt in die Bewertung ein (Gewichtung: Abschnitt 6).
- Nach einem falschen Versuch wird automatisch Stufe 1 angeboten, nicht aufgedrängt.
- Nach Stufe 3 folgt eine **ähnliche neue Aufgabe** (gleicher Generator, neuer Seed), damit der Schüler es selbst schafft.

### 5.5 Schreibweisen und Sonderregeln

- Lösungsmengen: `L = { … }`; keine Lösung: `L = { }` (Eingabe `∅` wird ebenfalls akzeptiert); unendlich viele Lösungen in Kl. 8: `L = ℚ`.
- **Bruchgleichungen:** Die Werte, für die ein Nenner null wird, müssen angegeben werden (z. B. „a ≠ 0, a ≠ 1“); sie gehören zur Bewertung.
- **Bruchterme:** Ausgeschlossene Werte werden als Hinweis gezeigt, aber nicht bewertet.
- **CAS:** Die App übt keine Bedienung eines bestimmten CAS, sondern das Lesen und Prüfen von CAS-Ergebnissen. Diese Aufgaben kommen nie im Teil ohne Hilfsmittel einer Probe-Arbeit vor.

---

## 6. Meisterung und Bewertung

Bewertung nach **Meisterung statt „bestanden“**. [fest] Die folgenden Kriterien gelten als Startwerte und werden nach dem Pilot überprüft:

### 6.1 Wertung eines Versuchs

| Ergebnis | Punkte |
|---|---|
| richtig, ohne Hilfe | 1,0 |
| richtig nach Denkanstoß | 0,75 |
| richtig nach Ansatz | 0,5 |
| richtig nach Lösungsweg / falsch | 0 |

### 6.2 Stufen pro Baustein

| Stufe | Bedingung |
|---|---|
| **neu** | noch keine Versuche |
| **in Arbeit** | Versuche vorhanden, Kriterien für „sicher“ nicht erfüllt |
| **sicher** | in den letzten 8 Versuchen ≥ 80 % der Punkte, darunter mind. 1 AFB-II-Aufgabe und mind. 2 verschiedene Darstellungen |
| **gemeistert** | „sicher“ **und** an einem späteren Tag (≥ 2 Tage Abstand) erneut 3 von 3 richtig ohne Hilfe |

- **Auffrischen:** Wird ein gemeisterter Baustein länger als ca. 4 Wochen nicht geübt oder treten neue systematische Fehler auf, fällt er auf „sicher“ zurück und wird in Wiederholungen eingeplant. (Kein Verlust von Sternen oder Belohnungen.)
- **Level gemeistert:** alle zugehörigen Bausteine gemeistert.
- **Lernziel gemeistert:** alle zugehörigen Level gemeistert.
- **Lernbereich (Welt) gemeistert:** alle Level gemeistert.
- **Geheimes Level frei:** Level gemeistert und die Bestätigungs-Runde ohne jede Hilfe.

### 6.3 Sterne pro Runde (Genauigkeit, nicht Tempo)

| Sterne | Bedingung |
|---|---|
| ★ | ≥ 60 % der Punkte |
| ★★ | ≥ 80 % der Punkte |
| ★★★ | 100 % der Punkte (alles richtig ohne Hilfe) |

Zeitmodus nur optional und ohne Einfluss auf Meisterung. [fest]

---

## 7. Fehleranalyse

### 7.1 Fehlertyp-Systematik

Version 1 – zwei getrennte Dimensionen:

**a) Inhaltlicher Fehlertyp** (was ist falsch?)

| Code | Fehlertyp | Beispiel |
|---|---|---|
| `VZ` | Vorzeichen | −3 · (−4) = −12 |
| `KL` | Klammer (Auflösen, Ausmultiplizieren, Minus vor Klammer) | 2(x + 3) = 2x + 3 |
| `ZF` | Zusammenfassen ungleichartiger Glieder | 3x + 2 = 5x |
| `VR` | Rechenregeln / Vorrang („Punkt vor Strich“, Potenzen) | 2 + 3 · 4 = 20 |
| `BR` | Bruch (Kürzen, Erweitern, Hauptnenner, Kehrwert) | 1/2 + 1/3 = 2/5 |
| `PO` | Potenzen / binomische Formeln | (a + b)² = a² + b² |
| `UM` | Äquivalenzumformung (nur eine Seite umgeformt, falsche Gegenoperation) | 2x = 6 ⇒ x = 4 |
| `EH` | Einheiten / Größen | 1 m² = 100 cm² |
| `DA` | Darstellung lesen/übertragen (Graph, Tabelle ablesen) | Achsen vertauscht |
| `TV` | Textverständnis / Modellierung (falscher Ansatz aus Sachtext) | falsche Größe als Variable |
| `RE` | Rechenfehler (reines Kopfrechnen/Einmaleins) | 7 · 8 = 54 |
| `UK` | Unklassifiziert | Antwort passt zu keinem bekannten Muster |

**b) Einordnung** (wie stabil ist der Fehler?)

| Einordnung | Regel |
|---|---|
| **Flüchtigkeit** | Fehlertyp tritt im betreffenden Baustein einmalig auf; die nächsten Aufgaben gleicher Art werden richtig gelöst. |
| **systematisch (Konzeptfehler)** | Gleicher Fehlertyp im gleichen Baustein **≥ 2-mal in den letzten 5 Versuchen** oder in **2 verschiedenen Runden**. |

Damit sind „Flüchtigkeit“ und „Konzeptfehler“ keine eigenen Fehlertypen, sondern eine Einordnung, die automatisch aus der Wiederholung berechnet wird. Die Schwellen sind Startwerte.

### 7.2 Verwendung

- Rückmeldung an den Schüler: kurzer, verständlicher Hinweis zum Fehlertyp („Achte auf das Minus vor der Klammer“).
- Systematische Fehler ⇒ Reparatur-Level-Vorschlag (über Voraussetzungs-Netz) und Eintrag in der Tutor-Übersicht.
- Flüchtigkeitsfehler werden gezählt, aber nicht als Lücke gewertet.

---

## 8. Spielablauf

### 8.1 Elemente [fest]

- **Weltkarte:** Lernbereiche der gewählten Klassenstufe als Welten; Fortschritt pro Welt sichtbar (Level-Stufen, Sterne).
- **Level** (Teil eines Lernziels, siehe Glossar); darin **Runden** à 5–10 Aufgaben, 3–5 Minuten.
- **Sterne für Genauigkeit**, Zeitmodus optional.
- **Belohnungen nur kosmetisch** (z. B. Farben, Accessoires für die eigene Figur, Karten-Deko).
- **Eigene Figur, eigene Optik**, nichts, was an bekannte Marken/Figuren erinnert; Grafiken selbst erstellt oder CC0.
- **Mobile first.**

### 8.2 Ausdrücklich nicht [fest]

- Keine öffentlichen Ranglisten, kein Vergleich mit anderen Schülern.
- Keine Mechaniken, die zum Weiterspielen drängen: keine Serien-/Streak-Strafen, keine Push-Nachrichten an Kinder, keine ablaufenden Belohnungen, keine Zufalls-Belohnungskisten, keine „Leben“, die verloren gehen.
- Keine Werbung, keine Käufe.

### 8.3 Aufbau einer Runde

1. Auswahl der Aufgaben durch die App (adaptiv): Mischung aus aktuellem Baustein, fälligen Wiederholungen und ggf. einem Reparatur-Baustein; Schwierigkeit steigt mit Meisterung (AFB I → II → III).
2. Aufgaben nacheinander, Hilfen jederzeit verfügbar.
3. Sofortige Rückmeldung nach jeder Aufgabe (richtig / Hinweis zum Fehler / Lösungsweg anschauen).
4. Rundenabschluss: Sterne, kurze Zusammenfassung („2 Vorzeichenfehler – willst du das kurz üben?“), ggf. Kosmetik-Belohnung.
5. Klarer Endpunkt: „Für heute geschafft“ – kein automatischer Start der nächsten Runde.

---

## 9. Zentrale Abläufe

### 9.1 Onboarding

**Durch den Tutor (am Rechner):**
1. Tutor legt Schülerkonto an: **Pseudonym** (Benutzername), Schulart, ggf. Bildungsgang (Oberschule ab Kl. 7) bzw. Kursart (Oberstufe: Grund-/Leistungskurs), Schule, Klassenstufe. [fest]
2. App erzeugt ein Start-Passwort bzw. einen Anmeldecode (als Ausdruck/QR für Schüler oder Eltern).
3. Optional: Tutor wählt den aktuellen Lernbereich und legt gleich eine erste Zuweisung an.

**Durch den Schüler (am Handy):**
1. Anmeldung mit Pseudonym + Code, eigenes Passwort festlegen.
2. Figur auswählen/gestalten.
3. Aktuellen Lernbereich bestätigen oder wählen.
4. Optional: kurzer **Einstiegs-Check** (ca. 5 Minuten) zu den Voraussetzungen des aktuellen Lernbereichs, um Startstände zu setzen. Der Check ist freiwillig und überspringbar.

Kein Klarname, keine E-Mail des Kindes. Passwort vergessen ⇒ Tutor setzt zurück.

### 9.2 Abschnitt zuweisen (Hausaufgabe)

1. Tutor wählt Schüler → Lernbereich → Level oder einzelne Bausteine (ggf. auch Reparatur-Bausteine aus früheren Klassen).
2. Tutor legt **Ziel** fest – Standard „Stufe *sicher* erreichen“, alternativ „N Runden mit mind. ★★“ – und eine **Frist** (Datum).
3. Optional: kurze Notiz an den Schüler („Schwerpunkt: Minus vor Klammer“).
4. Schüler sieht den Abschnitt auf der Startseite („Bis Do, 27.11.: Ausmultiplizieren“) mit Fortschrittsbalken.
5. Status: **offen → begonnen → erledigt** bzw. **überfällig** (Frist vorbei, nicht erledigt). Erledigt wird automatisch gesetzt, wenn das Ziel erreicht ist.
6. Tutor sieht Status aller Zuweisungen in der Übersicht.

### 9.3 Level spielen

1. Schüler öffnet Weltkarte → Welt → Level (oder direkt die Zuweisung auf der Startseite).
2. Runde wie in 8.3.
3. Jeder Versuch wird gespeichert (Abschnitt 10), Meisterung und Fehlereinordnung werden aktualisiert.
4. Bei systematischem Fehler: Vorschlag eines Reparatur-Levels (freiwillig, mit kurzer Erklärung, warum).
5. Bei Meisterung ohne Hilfen: Hinweis auf freigeschaltetes geheimes Level.

### 9.4 Testvorbereitung [fest]

1. **Termin eintragen** (Schüler oder Tutor): Art (Leistungskontrolle / Klassenarbeit), Datum, Themen (Lernbereiche → Level/Bausteine auswählen), erlaubte Hilfsmittel.
2. **Countdown-Plan:** Die App verteilt die Themen auf die verbleibenden Tage:
   - **Schwächen zuerst** (niedrigste Meisterung, systematische Fehler).
   - **Wiederholung in Abständen** (z. B. Baustein nach 1, 3 und 7 Tagen erneut, angepasst an die verbleibende Zeit).
   - Kurze Tageseinheiten (max. 1–2 Runden pro Tag); der Plan ist ein Angebot, keine Pflicht; keine Benachrichtigungen ans Kind.
3. **Probe-Arbeit** (2–3 Tage vor dem Termin): im sächsischen Format mit **Teil A ohne Hilfsmittel** und **Teil B mit Hilfsmitteln**, Mischung der AFB, Bearbeitungszeit als Orientierung (nicht als Druck).
4. **Einschätzung:** „bereit“ / „fast bereit“ / „Lücke bei X“ (mit Liste der Bausteine und direktem Link zur Übung). Kriterien (Startwerte):
   - **bereit:** alle Test-Bausteine mind. „sicher“ und Probe-Arbeit ≥ 80 %.
   - **fast bereit:** höchstens 2 Bausteine unter „sicher“ oder Probe-Arbeit 60–79 %.
   - **Lücke bei X:** sonst; X = Bausteine mit niedrigster Meisterung bzw. systematischen Fehlern.
5. Optional nach dem Test: Tutor kann die erreichte Note eintragen. Das Feld ist freiwillig und **nur für den Tutor sichtbar** (nicht für Schüler, nicht im Elternbericht).

### 9.5 Tutor-Übersicht [fest]

Pro Schüler:
- **Fortschrittskarte:** Lernbereiche/Level/Bausteine mit Meisterungs-Stufe, auch Voraussetzungs-Bausteine früherer Klassen.
- **Häufigste Fehlertypen** (getrennt nach systematisch / Flüchtigkeit, letzte 14 und 60 Tage).
- **Aktivität:** Übungstage, Runden, Aufgaben pro Woche (keine Uhrzeiten-Überwachung im Detail – nur Tage).
- **Anstehende Tests** mit Einschätzung.
- **Zuweisungen** mit Frist und Status.
- **Vorschlag für die nächste Stunde** (regelbasiert, nachvollziehbar), z. B.:
  1. systematischer Fehler mit höchster Priorität + passender Reparatur-Baustein,
  2. Test-Themen mit Lücke, wenn ein Test in ≤ 14 Tagen ansteht,
  3. überfällige Zuweisungen,
  4. nächstes sinnvolles Level im aktuellen Lernbereich.

Zusätzlich: Gesamtliste aller Schüler mit Ampel (Zuweisung überfällig, Test bald, systematischer Fehler neu).

**Später:** kurzer **Elternbericht** (z. B. monatlich, als PDF oder Ansicht): Übungsaktivität, gemeisterte Themen, Schwerpunkte, anstehende Tests – ohne Rohdaten.

### 9.6 Vertragsende und Löschung

1. Tutor markiert Schüler als „beendet“ ⇒ Konto wird gesperrt (Anmeldung nicht mehr möglich).
2. Nach Ablauf der Frist (30 Tage, damit ein Elternbericht/Export möglich bleibt) werden **alle personenbezogenen Daten endgültig gelöscht** (Konto, Versuche, Zuweisungen, Testtermine).
3. Optional bleiben nur **anonyme Zählwerte** pro Generator (z. B. „Aufgabe X wurde 120-mal bearbeitet, 30 % Vorzeichenfehler“) ohne Bezug zu einer Person – zur Verbesserung der Aufgaben.
4. Löschung auf Anfrage der Eltern jederzeit sofort möglich.

---

## 10. Datenmodell

Grundsätze:
- **Inhalte** (Lehrplan, Bausteine, Generatoren, Fehlertypen) liegen als Dateien im Repository und enthalten **keine personenbezogenen Daten**. In der Datenbank stehen nur ihre IDs.
- **Personenbezogene Daten** liegen ausschließlich in der EU-Datenbank, mit Zeilenrechten: Schüler sehen nur ihre eigenen Zeilen, der Tutor nur die seiner Schüler.
- Jede Tabelle hat **Zweck** und **Löschfrist**.

### 10.1 Inhalts-Daten (Dateien im Repository)

| Objekt | Felder (Auszug) |
|---|---|
| **Lehrplan** | id, Schulart, Bildungsgang/Kursart, Fassung/Jahr, Quelle (URL lplandb) |
| **Lernbereich** | id, Lehrplan-id, Klassenstufe, Nummer, Titel, Richtstunden, Wahlpflicht ja/nein, Lehrplan-Verweis |
| **Lernziel** | id, Lernbereich-id, Lehrplan-Formulierung, Niveau (Einblick / Kennen / Beherrschen / Anwenden), Unterpunkte |
| **Level** | id, Lernbereich-id, Lernziel-id, Reihenfolge, Titel (schülergerecht), Bausteine (Liste), Hinweis |
| **Baustein** | id, Titel, Beschreibung, Klassenstufe (erste Einführung), AFB-Spanne, Kennzeichen „ohne Hilfsmittel möglich“, Generatoren (Liste), typische Fehlertypen |
| **Voraussetzung** | von-Baustein, zu-Baustein, Art (notwendig/hilfreich) |
| **Generator** | id, Version, Baustein(e), AFB, Darstellungen, Aufgabentypen, ohne Hilfsmittel, Parameterbereiche, Code |
| **Fehlertyp** | Code, Name, Beschreibung, Schüler-Hinweistext |
| **Geheimes Level** | id, Level-id (Freischalt-Bedingung), Generatoren, Kennzeichen „nicht testrelevant“ |
| **Kosmetik-Gegenstand** | id, Name, Grafik, Freischalt-Bedingung |

### 10.2 Personen- und Nutzungsdaten (EU-Datenbank)

| Tabelle | Felder | Zweck | Löschfrist |
|---|---|---|---|
| **tutor** | id, Anzeigename, E-Mail (Login), erstellt_am | Anmeldung Tutor | solange Betrieb |
| **schule** | id, Name, Ort, Schulart | Zuordnung (Lehrplan, ggf. schulspezifische Abfolge) | Referenzdaten, kein Personenbezug |
| **schueler** | id, tutor_id, pseudonym (eindeutig), schulart, bildungsgang (null / Haupt / Real), kursart (null / GK / LK), schule_id, klassenstufe, aktueller_lernbereich_id, figur (JSON), status (aktiv / beendet), erstellt_am, beendet_am | Konto, Lehrplanzuordnung | 30 Tage nach Vertragsende |
| **schueler_login** | schueler_id, Anmelde-Kennung (intern), Passwort-Hash (vom Auth-Dienst verwaltet) | Anmeldung ohne E-Mail | mit Konto |
| **runde** | id, schueler_id, level_id, kontext (Übung / Zuweisung / Reparatur / Testplan / Probe-Arbeit / Geheim), zuweisung_id?, testtermin_id?, gestartet_am, beendet_am, sterne | Spielverlauf, Sterne | mit Konto |
| **versuch** | id, runde_id, schueler_id, baustein_id, generator_id, generator_version, seed, aufgabentyp, darstellung, afb, ohne_hilfsmittel, antwort (Text), korrekt, punkte, hilfe_stufe (0–3), fehlertyp_code?, dauer_s, zeitpunkt | Meisterung, Fehleranalyse | mit Konto (danach ggf. nur anonyme Zählwerte) |
| **fehlereinordnung** *(berechnet)* | schueler_id, baustein_id, fehlertyp_code, einordnung (flüchtig / systematisch), anzahl, zuletzt_am | Reparatur-Vorschläge, Tutor-Übersicht | mit Konto |
| **meisterung** | schueler_id, baustein_id, stufe (neu / in Arbeit / sicher / gemeistert), wert, gemeistert_am, letzte_uebung_am, naechste_wiederholung_am | Fortschritt, Wiederholungsplanung | mit Konto |
| **zuweisung** | id, schueler_id, tutor_id, titel, inhalte (Level-/Baustein-IDs), ziel (Art + Wert), frist, notiz, status, erstellt_am, erledigt_am | Hausaufgaben | mit Konto |
| **testtermin** | id, schueler_id, angelegt_von (Schüler/Tutor), art (LK / KA), datum, themen (IDs), hilfsmittel, einschaetzung, note? | Testvorbereitung | mit Konto; Note optional, nur für Tutor sichtbar |
| **testplan_eintrag** | id, testtermin_id, datum, bausteine, erledigt | Countdown-Plan | mit Testtermin |
| **probearbeit** | id, testtermin_id, runde_id_teil_a, runde_id_teil_b, ergebnis_prozent, erstellt_am | Probe-Arbeit | mit Testtermin |
| **kosmetik_besitz** | schueler_id, item_id, erhalten_am | Belohnungen | mit Konto |
| **eltern** *(später)* | id, Login, schueler_ids | Elternbericht | mit Vertrag |

**Bewusst nicht gespeichert:** Klarname, Geburtsdatum, E-Mail/Telefon des Kindes, Fotos, Standort, Geräte-Kennungen, Werbe-IDs, freie Chat-/Texteingaben über die Aufgabenantworten hinaus. Die Zuordnung Pseudonym ↔ echte Person kennt nur der Tutor (aus dem Nachhilfevertrag, außerhalb der App).

---

## 11. Datenschutz und Sicherheit

- **Hosting:** Datenbank und Konten in der EU (Rechenzentrum in Deutschland bevorzugt). Statisches Frontend über Netlify (siehe Abschnitt 12a); dort werden keine personenbezogenen Daten gespeichert, nur technisch notwendige Zugriffsprotokolle.
- **Auftragsverarbeitung:** Mit jedem Dienstleister, der personenbezogene Daten verarbeitet, einen AV-Vertrag abschließen.
- **Rechtsgrundlage:** Nachhilfevertrag mit den Eltern; Eltern werden in einer kurzen, verständlichen Datenschutz-Information über die App informiert (Ergänzung zum Vertrag). *Hinweis: Das ist keine Rechtsberatung; die Texte sollten vor dem Pilot einmal fachlich geprüft werden.*
- **Zugriffsschutz:** Zeilenrechte in der Datenbank; Tutor-Zugang mit starkem Passwort + Zwei-Faktor; Schülerpasswörter nur gehasht.
- **Keine Drittanbieter-Tracker,** keine externen Schriften/Skripte zur Laufzeit, keine Werbung.
- **Löschkonzept:** siehe 9.6; Löschung wird automatisch ausgeführt und protokolliert (ohne Personenbezug).
- **Export:** Tutor kann alle Daten eines Schülers exportieren (Auskunftsrecht).
- **Backups:** beim Datenbank-Anbieter in der EU; Löschfristen gelten auch für Backups im Rahmen der Aufbewahrungszeit des Anbieters.

---

## 12. Nicht-funktionale Anforderungen

- **Mobile first:** gut bedienbar ab 360 px Breite, große Tippflächen, eigene Mathe-Tastatur.
- **Als App installierbar** (Web-App mit „Zum Startbildschirm hinzufügen“), kein App-Store nötig.
- **Schnell** auch bei mäßigem Mobilfunk; Aufgaben werden im Gerät erzeugt (kein Server pro Aufgabe nötig).
- **Barrierearm:** ausreichende Kontraste, skalierbare Schrift, keine Information nur über Farbe.
- **Formel-Darstellung** sauber und schulüblich (Brüche, Exponenten, Lösungsmengen).
- **Kosten** im Pilot: möglichst 0–25 € pro Monat.
- **Wartbarkeit:** durch eine Person mit KI-Unterstützung; wenige, verbreitete Technologien; automatisierte Tests.

---

## 12a. Technischer Stack

Entschieden: **Option A** (managed, kein eigener Server).

| Teil | Wahl | Begründung |
|---|---|---|
| Sprache | TypeScript | Tippfehler und falsche Datentypen fallen schon beim Schreiben auf; sehr verbreitet |
| Oberfläche | React + Vite, als installierbare Web-App (PWA) | Standard, viele Beispiele, gut mit KI-Hilfe wartbar |
| Formeln | KaTeX (Anzeige), eigene Mathe-Tastatur (Eingabe) | schnell, schulübliche Darstellung, läuft ohne externe Server |
| Mathe-Kern & Generatoren | eigenes TypeScript-Modul, exakte Bruchrechnung, läuft im Browser | unabhängig vom Backend, vollständig testbar |
| Tests | Vitest | einfach, schnell, passt zu Vite |
| Hosting Oberfläche | Netlify (bestehend), Deploy aus GitHub | schon vorhanden; liefert nur statische Dateien, keine Schülerdaten |
| Konten & Datenbank | Supabase, Region Frankfurt (EU) | Postgres mit Login und Zeilenrechten eingebaut; Pilot kostenlos, Regelbetrieb ca. 25 $/Monat |
| Code & Automatisierung | GitHub (Repository, automatische Tests bei jedem Push) | bestehend |

Hinweise:
- Supabase ist ein US-Unternehmen; Daten liegen in Frankfurt. Vor dem Speichern echter Schülerdaten: Auftragsverarbeitungsvertrag (DPA) abschließen und in der Datenschutz-Information nennen.
- Schüler-Login ohne E-Mail: intern wird aus dem Pseudonym eine technische Anmeldekennung erzeugt, die nie angeschrieben wird; Passwort-Reset nur durch den Tutor.
- Kostenloser Supabase-Tarif pausiert Projekte nach längerer Inaktivität – für den Pilot akzeptabel, im Regelbetrieb auf den bezahlten Tarif wechseln.
- Ein Wechsel zu einem rein deutschen Backend (z. B. eigener Server) bleibt möglich, weil der Mathe-Kern backend-unabhängig ist.

---

## 13. Pilot-Umfang

**Enthalten:**
- Gymnasium Klasse 8, Lernbereich **„Terme und Gleichungen“ vollständig**: alle Lernziele, alle Bausteine, Generatoren für alle drei AFB, mehrere Darstellungen und Aufgabentypen, Fehlerdiagnose, Hilfen, Tests.
- Die dafür nötigen **Voraussetzungs-Bausteine aus Kl. 5–7** als Reparatur-Level (z. B. rationale Zahlen/Vorzeichen, Bruchrechnung, Vorrangregeln) – nur so weit, wie das Netz sie verlangt.
- 3 geheime Level (siehe `inhalte/UEBERSICHT.md`).
- Als **zweiter Lernbereich**: Kl. 8, LB 3 „Funktionen und lineare Gleichungssysteme“ (dort gehören laut Lehrplan die Gleichungssysteme hin).
- Tutor-Bereich: Schüler anlegen, Zuweisungen, Testtermine, Übersicht inkl. Vorschlag für die nächste Stunde.
- Testvorbereitung inkl. Probe-Arbeit.
- Weltkarte, Figur, Sterne, wenige kosmetische Belohnungen.
- Datenschutz-Grundausstattung: EU-Hosting, Zeilenrechte, Löschung, Export, Datenschutz-Information.

**Nicht enthalten (später):**
- Elternzugang und Elternbericht
- Weitere Klassenstufen, Oberschule, Oberstufe (Ausbau in Wellen: Gym 7–9 → Gym 5–10 → Oberschule → Oberstufe) [fest]
- Offline-Modus, mehrere Tutoren, Zeitmodus (kann früher kommen, falls einfach)

**Pilot-Nutzer:** 2 Schüler, Gymnasium Klasse 8. [fest]

---

## 14. Entscheidungsprotokoll

| Datum | Entscheidung |
|---|---|
| 20.11.2026 | SPEC v1.0 freigegeben. |
| 20.11.2026 | Meisterung: Stufen neu / in Arbeit / sicher / gemeistert wie in Abschnitt 6 (Startwerte). |
| 20.11.2026 | Fehlertypen V1: 12 inhaltliche Typen + Einordnung flüchtig/systematisch wie in Abschnitt 7 (Startwerte). |
| 20.11.2026 | Stack: Option A (React/TypeScript-PWA auf Netlify, Supabase Frankfurt), Abschnitt 12a. |
| 20.11.2026 | Lehrplaninhalte: Timon stellt PDFs bereit → Claude erstellt Lernbereich/Lernziele/Bausteine/Netz als Dateien mit Lehrplan-Verweis → Timon prüft fachlich (Meilenstein M1). |
| 20.11.2026 | Note nach Test: optional, nur für Tutor sichtbar. |
| 20.11.2026 | Löschung 30 Tage nach Vertragsende; danach nur anonyme Zählwerte pro Generator. |
| 20.11.2026 | Einstiegs-Check: ja, kurz und freiwillig. |
| 20.11.2026 | Standard-Ziel einer Zuweisung: Stufe „sicher“ erreichen. |

| 20.11.2026 | M1-Inhalte (Gym Kl. 8, LB 1) fachlich abgenommen. |
| 20.11.2026 | SPEC v1.1: Level ≠ Lernziel. Lernziele bleiben wie im Lehrplan; darunter kleinere, spielbare Level (Abschnitte 2, 4.1, 6.2, 10.1). |
| 20.11.2026 | CAS-Lernziel: Level „CAS-Ergebnisse lesen und prüfen“, ohne Gerätebedienung, nie im hilfsmittelfreien Teil (5.5). |
| 20.11.2026 | Bruchgleichungen: ausgeschlossene Werte müssen angegeben werden; bei Bruchtermen nur Hinweis (5.5). |
| 20.11.2026 | Notation Sonderfälle: `L = { }` (auch `∅` akzeptiert) und `L = ℚ` (5.5). |
| 20.11.2026 | Zweiter Pilot-Lernbereich: Kl. 8, LB 3 „Funktionen und lineare Gleichungssysteme“ (13). |

**Nach dem Pilot zu überprüfen:** alle Schwellenwerte (Meisterung, Sterne, systematische Fehler, Test-Einschätzung) anhand der echten Versuchsdaten.
