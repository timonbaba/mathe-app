# CLAUDE.md – Mathe-Lern-App (Arbeitstitel)

Diese Datei ist die Arbeitsanleitung für Claude (und jeden, der am Code arbeitet).
Die fachliche Beschreibung steht in `SPEC.md`, der Plan in `ROADMAP.md`.

## Projektkontext

- **Wer:** Timon, Gründer und einziger Tutor einer Mathe-Nachhilfe in Leipzig (1:1, Klassen 5–12, online und in Präsenz). Timon ist **kein Profi-Entwickler**.
- **Was:** Lern-Web-App mit Spielelementen für Mathe, inhaltlich nach dem **sächsischen Lehrplan** (Gymnasium und Oberschule).
- **Wofür:** Ergänzung der Nachhilfe im Abo („Mathebegleitung“), **kein eigenständiges Produkt**. Die App ersetzt klassische Hausaufgaben („Mach diesen Abschnitt bis Donnerstag fertig“), bereitet auf Leistungskontrollen und Klassenarbeiten vor und zeigt dem Tutor, wo es hakt.
- **Nutzer:** Minderjährige Nachhilfeschüler. Konten legt der Tutor an. Keine Selbstregistrierung.
- **Pilot:** Gymnasium Klasse 8, Lernbereich „Terme und Gleichungen“, zwei Testschüler.

## Zusammenarbeit mit Timon

- Entscheidungen **kurz und verständlich erklären** (was, warum, welche Folgen). Kein Fachjargon ohne Erklärung.
- **Technische Standardentscheidungen selbst treffen** (Ordnerstruktur, Bibliotheken, Benennung, Tests …) und kurz begründen.
- **Nicht selbst festlegen, sondern Timon fragen** bei allem, was geschäftskritisch ist:
  - Datenschutz und rechtliche Fragen
  - laufende Kosten / neue Dienste oder Anbieter
  - Didaktik und Inhalte (Lehrplanzuordnung, Schwierigkeit, Bewertung, „gemeistert“-Kriterien)
  - alles, was Schüler oder Eltern als Bewertung oder Rückmeldung sehen
  - Änderungen an Festlegungen in `SPEC.md` (dann im Entscheidungsprotokoll, Abschnitt 14, vermerken)
- Bei Fragen: **immer eine Empfehlung mitliefern**.

## Arbeitsregeln

1. **Kleine Schritte.** Ein Schritt = eine überprüfbare Änderung. Nach jedem Schritt kurz berichten: was gemacht, wie geprüft, was als Nächstes.
2. **Mathematische Korrektheit hat oberste Priorität.** Lieber eine Aufgabe weniger als eine falsche.
   - Exakt rechnen: Brüche als rationale Zahlen (Zähler/Nenner), **niemals Gleitkommazahlen zum Prüfen von Lösungen**.
   - Jede generierte Aufgabe hat eine eindeutige, vollständige Lösung (bzw. Lösungsmenge, inkl. „keine Lösung“ / „unendlich viele Lösungen“, wo didaktisch gewollt).
   - Generatoren **verwerfen ungeeignete Zufallswerte** (z. B. Division durch 0, unbeabsichtigt triviale Aufgaben, unschöne Zahlen außerhalb des vorgesehenen Bereichs), statt sie durchzulassen.
   - Notation wie im sächsischen Schulunterricht: Dezimalkomma, Malpunkt `·` vor/zwischen Klammern (nicht innerhalb eines Glieds: `3xy`), Lösungsmenge `L = { … }`, Fachbegriffe wie im Lehrplan. Details und Sonderfälle: `SPEC.md` Abschnitt 5.5.
3. **Tests für jeden Aufgabengenerator** (Pflicht, ohne Tests kein Merge). Mindestens:
   - **Determinismus:** gleicher Seed → identische Aufgabe.
   - **Korrektheit:** Lösung wird unabhängig vom Generator geprüft (z. B. Einsetzen in die Gleichung; Termgleichheit durch exakte Auswertung an mehreren Stellen).
   - **Masse:** mindestens 1.000 Seeds ohne Fehler, Zahlenbereiche eingehalten, keine doppelten/trivialen Aufgaben über dem festgelegten Anteil.
   - **Diagnostische Antworten (Multiple Choice):** alle falschen Optionen ≠ richtige Lösung, untereinander verschieden, jeweils genau einem Fehlertyp zugeordnet und tatsächlich durch diesen Fehler erzeugt.
   - **Antwortprüfung:** gleichwertige Schreibweisen werden akzeptiert (sofern die Aufgabe keine bestimmte Form verlangt); typische Fehlantworten werden dem richtigen Fehlertyp zugeordnet.
   - **Hilfen:** alle drei Stufen vorhanden; der Lösungsweg endet beim korrekten Ergebnis.
   - **Beispiel-Ausgabe** zur Sichtprüfung durch Timon (z. B. 20 Aufgaben pro Generator).
4. **Sprache der App ist Deutsch.** Schüler werden geduzt, kurze Sätze, freundlich, sachlich, nicht kindisch. Im Code: Fachbegriffe der Domäne auf Deutsch (`Lernbereich`, `Baustein`, `Fehlertyp`), technische Begriffe auf Englisch; Kommentare auf Deutsch.
5. **Datenschutz ab der ersten Tabelle.** Nutzer sind Minderjährige.
   - Datensparsamkeit: Pseudonym statt Klarname, keine E-Mail des Kindes, keine Geburtsdaten, keine Fotos.
   - Jede neue Tabelle/Spalte: **Zweck, Löschfrist und Zugriffsregel** dokumentieren (in `SPEC.md`, Abschnitt Datenmodell).
   - Zugriff in der Datenbank über Zeilenrechte (Schüler sieht nur sich selbst, Tutor nur seine Schüler).
   - Hosting von Konten und Datenbank in der EU. Keine Tracking-/Analyse-Dienste Dritter, keine Schriften/Skripte von fremden CDNs zur Laufzeit, keine personenbezogenen Daten in Logs.
6. **Keine fremden Aufgaben, keine fremden Marken.** Keine Aufgaben aus Schulbüchern übernehmen. Grafiken selbst erstellen oder CC0; jede Fremd-Quelle in `ASSETS.md` eintragen. Nichts, was an bekannte Spiele, Lern-Apps oder Figuren erinnert.
7. **Spiel-Leitplanken:** Sterne für Genauigkeit, nicht Tempo. Belohnungen nur kosmetisch. Keine öffentlichen Ranglisten, kein Streak-Druck, keine Push-Nachrichten an Kinder, keine Zufalls-Belohnungskisten, keine Mechaniken, die zum Weiterspielen drängen.
8. **Mobile first.** Jede Ansicht zuerst fürs Handy (ab 360 px Breite) bauen und prüfen.
9. **Inhalte sind Daten, nicht Code-Wildwuchs.** Lernbereiche, Lernziele, Bausteine und Voraussetzungen liegen als versionierte Dateien im Repository; jeder Eintrag verweist auf die Lehrplan-Stelle.
10. **Keine stillen Annahmen.** Wenn der Lehrplan oder eine Anforderung unklar ist: nachfragen, nicht raten.

## Technik

Stack (Details und Begründung: `SPEC.md`, Abschnitt 12a):
- TypeScript, React + Vite als installierbare Web-App (PWA), mobile first
- Mathe-Kern und Generatoren als eigenes, backend-unabhängiges Modul mit exakter Bruchrechnung
- Tests mit Vitest; Formeldarstellung mit KaTeX
- Hosting der Oberfläche: Netlify (Deploy aus GitHub); Konten und Datenbank: Supabase, Region Frankfurt

Ordnerstruktur:
- `inhalte/` – Lehrplan-Inhalte als YAML (Lernbereiche, Level, Bausteine, Voraussetzungen, Fehlertypen); `inhalte/UEBERSICHT.md` wird erzeugt
- `src/mathe/` – Mathe-Kern (exakte Brüche, deterministischer Zufall, später Terme/Gleichungen); keine Abhängigkeit von Oberfläche oder Datenbank
- `src/generatoren/` – Aufgabengeneratoren, je Generator eine Testdatei daneben; neue Generatoren in `src/generatoren/index.ts` eintragen
- `beispiele/` – erzeugte Beispielaufgaben je Generator zur Sichtprüfung durch Timon
- `werkzeuge/` – Hilfsskripte (Inhalte prüfen, Übersicht erzeugen; vorerst Python)
- `.github/workflows/` – automatische Tests bei jedem Push

Befehle:
- `npm test` – alle Tests einmal ausführen
- `npm run test:watch` – Tests bei jeder Änderung neu ausführen
- `npm run typecheck` – TypeScript-Prüfung
- `npm run beispiele` – Beispielaufgaben in `beispiele/` neu erzeugen (nach jeder Generator-Änderung)
- `python3 werkzeuge/inhalte_pruefen.py` – Inhaltsdateien auf Konsistenz prüfen
- `python3 werkzeuge/uebersicht_erzeugen.py` – `inhalte/UEBERSICHT.md` neu erzeugen (nach jeder Inhaltsänderung)

Regeln für den Mathe-Kern:
- Zahlen in Lösungen immer als `Bruch` (src/mathe/bruch.ts), nie als `number`-Gleitkomma.
- Terme über `Polynom` (src/mathe/polynom.ts); Schülereingaben über `leseTerm`/`leseAlsPolynom` (src/mathe/term-parser.ts).
- Zufall nur über `Zufall` (src/mathe/zufall.ts) mit Seed. Der Algorithmus darf sich nicht ändern (Referenztest), sonst lassen sich alte Versuche nicht mehr rekonstruieren.
