# ROADMAP – bis zum nutzbaren Pilot

Ziel: Zwei Schüler (Gymnasium Kl. 8) nutzen die App als Hausaufgabe für den Lernbereich „Terme und Gleichungen“, inklusive Zuweisungen, Testvorbereitung und Tutor-Übersicht.

Grundsatz: **Erst ein Lernbereich vollständig und korrekt, dann in die Breite.** Jeder Meilenstein endet mit einer Abnahme durch Timon.

Zeitangaben sind grobe Schätzungen bei einigen Stunden Arbeit pro Woche.

---

## M0 – Spezifikation und Grundsatzentscheidungen *(erledigt)*
- [x] `CLAUDE.md`, `SPEC.md`, `ROADMAP.md` angelegt
- [x] Timon prüft und gibt die SPEC frei (20.11.2026)
- [x] Entscheidungen: Stack, Meisterungs-Kriterien (Startwerte), Fehlertypen V1, Vorgehen Lehrplan-Inhalte
- [x] GitHub-Repository anlegen, Dateien einchecken (timonbaba/mathe-app)

**Abnahme:** SPEC freigegeben, offene Punkte entschieden oder bewusst vertagt.

## M1 – Inhaltsgerüst des Pilot-Lernbereichs *(erledigt, abgenommen 20.11.2026)*

Ergebnis: `inhalte/`, Übersicht in `inhalte/UEBERSICHT.md`.

- Lehrplan-PDF Gym Kl. 8 (und Kl. 5–7 für Voraussetzungen) auswerten
- Lernbereich „Terme und Gleichungen“ als Datei: Lernziele mit Lehrplan-Verweis
- Zerlegung in Bausteine, je mit AFB-Spanne, Darstellungen, typischen Fehlertypen
- Voraussetzungs-Netz zu Bausteinen aus Kl. 5–7
- Fehlertyp-Systematik V1 als Datei
- Lesbare Übersichtsseite (Baum + Netz) zur Durchsicht

**Abnahme:** Timon bestätigt Bausteine und Netz fachlich („So würde ich das auch zerlegen“).

## M2 – Mathe-Kern und Generatoren *(in Arbeit, ca. 3–4 Wochen, größter Block)*

Stand:
- [x] Projektgerüst, automatische Tests (GitHub Actions)
- [x] Exakte Bruchrechnung, deterministischer Zufall
- [x] Terme (Polynome), Einlesen von Schülereingaben, Formprüfung
- [x] Generator-Schnittstelle, Beispielausgabe
- [x] Gemeinsame Bausteine: Termbaum (Lösungswege, Fehler nachbilden), Pflichttests für Term-Generatoren
- [x] Level 2 „Zusammenfassen und Klammern auflösen“ komplett (3 Generatoren, warten auf Sichtprüfung durch Timon):
  `t8-zusammenfassen`, `t8-ausmultiplizieren-monom`, `t8-klammern-verschachtelt`
- [x] Level 3 „Summe mal Summe“ komplett (warten auf Sichtprüfung): `t8-summe-mal-summe`, `t8-term-gleichwertig` (neue Aufgabentypen „Finde den Fehler“ und „Gegenbeispiel“)
- [ ] Level 4 „Ausklammern“ (`t8-ausklammern`)
- [ ] weitere Level (insgesamt 26 Kl.-8-Bausteine + 13 Reparatur-Bausteine)
- Technisches Grundgerüst (Projekt, Testumgebung, automatische Tests bei jedem Push)
- Mathe-Kern: exakte Bruchrechnung, Term-Darstellung, Term-Vergleich, Formel-Anzeige
- Generator-Schnittstelle (Seed, Lösung, Antwortprüfung, Fehlerdiagnose, Hilfen)
- Generatoren für **alle** Bausteine des Pilot-Lernbereichs + Reparatur-Bausteine, mit Tests nach `CLAUDE.md`
- Vorschauseite: pro Generator Beispielaufgaben mit Lösung, Hilfen und Fehleroptionen

**Abnahme:** Timon sichtet Stichproben jeder Generator-Art; alle Tests grün; keine mathematischen Fehler gefunden.

## M3 – Konten, Datenbank, Datenschutz-Basis *(ca. 1–2 Wochen)*
- EU-Datenbank mit Tabellen aus SPEC Abschnitt 10, Zeilenrechte
- Tutor-Login (mit Zwei-Faktor), Schülerkonten durch Tutor (Pseudonym + Code)
- Löschung, Export, automatische Löschfristen
- Auftragsverarbeitungsverträge abschließen; Entwurf Datenschutz-Information für Eltern
- Deployment über Netlify

**Abnahme:** Timon legt ein Testkonto an, meldet sich am Handy an, löscht es wieder; Zeilenrechte getestet (Schüler A sieht nichts von Schüler B).

## M4 – Spielbarer Kern am Handy *(ca. 2–3 Wochen)*
- Weltkarte (eine Welt), Level, Runden mit adaptiver Aufgabenauswahl
- Alle Aufgabentypen, die der Pilot-Lernbereich braucht; Mathe-Tastatur
- Hilfen, Feedback, Sterne, Speicherung der Versuche
- Meisterungs-Berechnung und Fehlereinordnung (Flüchtigkeit / systematisch)
- Reparatur-Level-Vorschläge
- Eigene Figur (erste Version), Grundoptik

**Abnahme:** Timon spielt den Lernbereich selbst am Handy durch; Rückmeldungen und Meisterung wirken plausibel.

## M5 – Tutor-Bereich und Zuweisungen *(ca. 1–2 Wochen)*
- Abschnitt zuweisen mit Ziel und Frist; Anzeige beim Schüler
- Tutor-Übersicht: Fortschrittskarte, Fehlertypen, Aktivität, Zuweisungsstatus
- Regelbasierter Vorschlag für die nächste Stunde

**Abnahme:** Timon bereitet mit der Übersicht eine (Test-)Stunde vor und findet sie hilfreich.

## M6 – Testvorbereitung *(ca. 1–2 Wochen)*
- Testtermin eintragen (Schüler und Tutor)
- Countdown-Plan mit Wiederholung in Abständen, Schwächen zuerst
- Probe-Arbeit (Teil ohne / mit Hilfsmitteln)
- Einschätzung „bereit / fast bereit / Lücke bei X“

**Abnahme:** Durchspielen mit einem fiktiven Testtermin in 10 Tagen.

## M7 – Feinschliff und Pilotstart *(ca. 1 Woche + 4 Wochen Pilot)*
- Geheime Level, kosmetische Belohnungen
- Gestaltung, Texte, Barrierearmut, Test auf echten Handys der Schüler
- Datenschutz-Information an Eltern, Einverständnis über Vertrag geklärt
- **Pilotstart** mit 2 Schülern; wöchentliche kurze Rückmeldung (was nervt, was hilft, welche Aufgaben waren falsch/unklar)
- Fehlerbehebung laufend

**Abnahme / Pilot-Ziel:** Über 4 Wochen ersetzt die App die Hausaufgaben im Lernbereich; keine mathematischen Fehler offen; Timon nutzt die Übersicht zur Stundenplanung.

## M8 – Auswertung und zweiter Lernbereich
- Auswertung des Pilots: Meisterungs-Kriterien und Fehlertypen nachschärfen
- Zweiter Lernbereich Kl. 8, LB 3 „Funktionen und lineare Gleichungssysteme“ nach gleichem Muster (M1 → M2 → Einbindung)
- Entscheidung über Welle 1 (Gym Kl. 7–9)

---

## Danach (Ausbau in Wellen)
1. Gymnasium Kl. 7–9
2. Gymnasium Kl. 5–10
3. Oberschule (Haupt- und Realschulbildungsgang)
4. Oberstufe (Grund- und Leistungskurs)
5. Elternbericht / Elternzugang
