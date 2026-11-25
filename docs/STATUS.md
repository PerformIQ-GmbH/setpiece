# Status · SETPIECE

**Stand 07.11.2026: Varianten, Suche und Playbook-Sammlungen sind live unter https://setpiece.performiq.ch/.**

## Neue Editor-Tour 25.11.2026 (implementiert, nicht gemergt, nicht deployed)

Branch `ccr-7804b1ac-m73f52`. Anlass (Vince): Die Tour mit den Tooltips erschien nicht zuverlässig, war englisch und erklärte zu wenig. Befund im Code: `shouldShowTutorial()` wurde nirgends aufgerufen, die Tour startete also nie von selbst (nur über das Menü «Tutorial»); der Anker `bottombar` existierte nicht; auf dem Handy waren Werkzeugleiste und Rollen-Seitenleiste nicht sichtbar, die Karte sprang in die Mitte und verwies auf unsichtbare Elemente. Neu: 8 deutsche Schritte mit Nutzen-Zeile (Willkommen, Spielfeld, Werkzeuge, Rollen und Spieler mit Passvorschlag, Phasen und Ablauf, Varianten mit Gegnererkennung und Teamsignal, Veröffentlichen, Abschluss mit Checkliste und Konfetti); Desktop und Handy zeigen je eigene Ziele und Texte (Handy: Werkzeug- und Rollen-Knopf unten, Menü oben rechts). Startet beim ersten Besuch eines Standards einmal automatisch (neuer Speicherschlüssel `setpiece-tour-v2`: wer die alte Tour weggeklickt hat, sieht die neue einmal), danach nur über das Menü. Karte bleibt immer im Fenster und dockt bei Vollbild-Zielen gegenüber an, ein Tipp daneben beendet die Tour nicht mehr, Esc und Pfeiltasten, Fokus, 44-px-Knöpfe, reduzierte Bewegung respektiert. Keine Tour ausserhalb des Editors (Spielerliste, Spieltag, Aushang): offen.

Geprüft: Typprüfung grün; Standardsuite 137 Tests, 135 bestanden, 2 ohne Datenbank übersprungen; neue Regression für die Kartenposition. Browser (Chromium, echter Editor, fiktive API-Antworten) bei 1366 und 390 px: Auto-Start, alle 8 Schritte ohne Überlauf, Abschluss gespeichert, kein Neustart nach Abschluss, keine Seitenfehler. Nicht geprüft: echtes Handy, Tablet-Breite, Bildschirmleser.

## Fehlermeldung bei erreichter Plangrenze 25.11.2026 (implementiert, nicht gemergt, nicht deployed)

Branch `ccr-7804b1ac-m73f52-limit`. Meldung (Vince): «Blank Set Piece» reagiert nicht, Duplizieren und «Use Template» schlagen fehl. Ursache aus dem Code und dem Screenshot (5 von 5 Standards): Der Gratis-Plan erlaubt höchstens 5 Standards (`lib/entitlements.ts`); der Server antwortet mit 403 «Plan limit reached». Die Seite zeigte das als allgemeines «Failed to duplicate» (Duplizieren), bei «Blank» und «Use Template» gar nichts (nicht abgefangene Fehler). Jetzt erscheint bei allen drei Wegen «Limit deines Plans erreicht» mit Hinweis (Entwurf löschen oder Plan wechseln), andere Fehler als deutsche Meldung; das Titelfeld im Blank-Dialog ist mit seinem Label verknüpft. Die Limits selbst sind unverändert (Entscheid offen). Ob das Team des Kunden tatsächlich im Gratis-Plan ist, ist aus dem Screenshot geschlossen, nicht in der Datenbank geprüft. Geprüft: Typprüfung und Standardsuite grün; Browser (fiktive 403-Antworten, 390 px): alle drei Wege zeigen die Meldung ohne Seitenfehler.

## Garderoben-Aushang mit Variante-Kacheln 25.11.2026 (implementiert, nicht gemergt, nicht deployed)

Branch `ccr-7804b1ac-m73f52`. Anlass (Vince): Das «Match Pack» war für Garderobe und Bank zu textlastig. Neu auf der Spieltagsseite unter «Drucken»: «Garderobe · A4» (bis 6 Varianten, Raster 3 × 2) und «A3» (bis 12, Raster 4 × 3); weniger Varianten erhalten ein kleineres Raster mit grösseren Bildern, mehr gehen auf ein nummeriertes zweites Blatt. Eine Kachel pro Variante (Kürzel 1A/1B): Auge-Symbol **WENN** (Gegner erkennen, sonst «immer»), Hand-Symbol **SIGNAL** (sonst «kein Signal»), grosses Startbild mit Trikotnummern und Laufwegen, darunter «dann 2 › 3» als kleine Phasenleiste. Keine Rollenliste, kein Fliesstext, keine Namensschilder (Entscheid Vince: Bilder statt Text; dasselbe Blatt doppelt gedruckt dient als Bankkarte für Wechsel). Ergänzt (Entscheide Vince 25.11.): Angriff zuerst, Abwehr danach; jede Kachel trägt ein Etikett «Angriff» (grün, Pfeil) oder «Abwehr» (dunkel, Schild), Abwehr beginnt in neuer Zeile, wenn das weder Blatt noch Zeile kostet. Schützen für Elfmeter und Freistoss direkt (je bis 3, in Reihenfolge) werden in der Spieltags-Aufstellung gewählt, im bestehenden JSON-Feld `squad.takers` gespeichert (keine Migration) und erscheinen gross im Kopf des Aushangs. Der Aushang zeigt nur den für Spieler freigegebenen Stand wie die Spieler-App; nicht freigegebene Standards erscheinen als Kachel «Noch nicht für Spieler freigegeben». Die bisherige «Detailmappe (mehrseitig)» bleibt wählbar. Ältere Spielbretter ohne Varianten werden einmal migriert und als eine Kachel gedruckt (zuvor «Unbekannte Variante»).

Geprüft: `pnpm typecheck` grün; Standardsuite 134 Tests, 132 bestanden, 2 ohne Datenbank übersprungen; Layout-Regression (Kürzel, WENN/SIGNAL, Bilder innerhalb der Ränder, zweites Blatt, kleineres Raster, Sortierung, Etiketten, Schützen, Freigabehinweis); Schützenwahl im Browser gespeichert (PATCH enthält `squad.takers`). Browser (Chromium, API mit fiktiven Antworten): Klickweg «Drucken → Garderobe A4» lädt ein einseitiges PDF ohne Konsolenfehler; Probedrucke A4 (6 Kacheln) und A3 (11 Kacheln) als Bild geprüft. Nicht geprüft: Ausdruck auf Papier, echte Teamdaten, Speichern der Schützen gegen eine echte Datenbank.

## Standard-Profil beim Beitritt und Rollenvorschläge 25.11.2026 (implementiert, nicht gemergt, nicht deployed)

Branch `ccr-7804b1ac-m73f52`. Anlass (Vince): Viele Spieler zeigten in den Rollenvorschlägen dieselbe Zahl. Ursache belegt: Der Beitritt per QR/Link fragte nur Name, Nummer und Fuss (Fuss mit «rechts» vorausgewählt). Die Bewertung startet ohne Profildaten bei 55. Rollen wurden nur über englische Begriffe erkannt (deutsche Rollennamen = «allgemein» = 55). Die Trainer-Merkmale `strong_header` und `set_piece_specialist` wurden nicht gezählt.

- **Beitritt (Entscheid Vince 25.11.: alles Pflicht):** zweiter Schritt «Dein Standard-Profil» mit Grösse, starkem Fuss (ohne Vorauswahl), Kopfball und Tempo 1-5 (gespeichert als 2-10) sowie Katalog «Was machst du bei Standards gern?» (9 Rollen, mindestens eine). Der Server prüft alle Felder und nimmt nur Katalogmerkmale an; Selbstangaben erhalten das Merkmal `self_reported` («Selbstangabe»).
- **Bewertung:** deutsche Rollenbegriffe, Katalogmerkmale und alte Trainer-Merkmale zählen; Begründungen auf Deutsch. Ohne Profildaten zeigen Editor und Spieltags-Assistent «Profil unvollständig» statt einer Zahl.
- **Spielerliste:** Fuss, Grösse, Kopfball und Tempo direkt in der Zeile änderbar. Speichert der Trainer (Zeile oder Dialog), entfällt «Selbstangabe» (Entscheid Vince: Selbstangaben zählen sofort, markiert).
- Keine Datenbankmigration nötig (bestehende Spalten).

Geprüft (Node 22.23.5, pnpm 10.28.0, da Node 24 hier fehlt): `pnpm typecheck` grün; Standardsuite 130 Tests, 128 bestanden, 2 ohne Datenbank übersprungen; neue Regressionen für Bewertung und Beitrittsprüfung. Browser (Chromium, API durch fiktive Antworten ersetzt): Beitritt bei 390 px ohne horizontales Scrollen, gesendete Daten korrekt; Spielerliste bei 1366 und 390 px, Zeilenänderung entfernt `self_reported`. Nicht geprüft: echte Datenbank, Node 24/pnpm 11.25.0, physisches Handy. Bestehende Spieler behalten ihre Werte; ohne Profildaten erscheinen sie jetzt als «Profil unvollständig».

## Demo: Eckball «Kurz in den Rückraum» 25.11.2026 (implementiert, nicht deployed)

Branch `ccr-781f8f5c-1b6s2n`. Die öffentliche Demo enthält neben «Ecke · Erster Pfosten» den zweiten Standard «Ecke · Kurz in den Rückraum» (Marketing-Reel): drei Phasen, acht Rollen, fiktive Gegner (Positionen nach dem Reel `cover-b8.js`, Pfostenverteidiger damit die Sichtblocker beim Pass der 10 nicht im Abseits stehen), Spieleraufgabe und Quiz für Spieler 8 («Wann startest du aus dem Rückraum?»). Das Produktbeispiel auf Startseite und Demo-Übersicht wechselt zwischen beiden Standards, Liste, Editoransicht, Spielfeld, Quiz und Trainer-Rückmeldung zeigen beide. Die Legende der Spielertafel ist deutsch (Du, Mitspieler, Gegner, Dein Laufweg, Ball), ebenso die Legende der Demo-Editoransicht, die zuvor ausserhalb des sichtbaren Bereichs lag. Geprüft: `pnpm typecheck` grün, Standardsuite 126 Tests, 124 bestanden, 2 ohne Datenbank übersprungen (Node 22.23.5 und pnpm 10.28.0, da Node 24 in dieser Umgebung fehlt); Browser (Chromium) bei 390 und 1366 px gegen lokalen Production-Build. Nicht geprüft: Node 24/pnpm 11.25.0, echtes Touchgerät. Weiterhin englisch: Spieleransicht `PlayerPWA` und `PlayerQuiz` (echte, datenbankgestützte Links).

## Marktstart-Vorbereitung 24.11.2026 (implementiert, nicht gemergt, nicht deployed)

Branch `ccr-781f8f5c-1b6s2n`. Anmeldeherkunft: `utm_source`/`utm_medium`/`utm_campaign` und fremder Referrer-Host werden beim ersten Aufruf im Tab im `sessionStorage` gehalten und bei E-Mail- oder Google-Registrierung serverseitig validiert (max. 100 bzw. 253 Zeichen, sonst `null`) in vier neuen nullbaren `users`-Spalten gespeichert. Additive Migration `lib/db/migrations/20261124_signup_attribution.sql` ist **in keiner Replit-Datenbank angewandt**; vor dem Deployment nach Backup in Entwicklung und Produktion gezielt anwenden, sonst scheitern Registrierung und Anmeldung (Drizzle liest alle `users`-Spalten). Auswertung als SQL in [LAUNCH](LAUNCH.md). Datenschutzseite um die Herkunftsspeicherung ergänzt. Checkout erlaubt Stripe-Promotion-Codes (`allow_promotion_codes`); keine Gutscheine angelegt, keine Preise geändert, Pilotmodus unverändert aktiv.

Stripe-Einrichtung (Entscheid Vince 24.11.): idempotentes Skript `scripts/src/stripe-setup.ts` für Schema, Webhook, Produkte/Preise und Startrabatt (erster Monat gratis für Solo Coach und Team, Code nur für Erstkunden bis 31.01.2027 23:59:59 Europe/Zurich); ersetzt `seed-stripe-products.ts`. Ablauf Test → Live in [DEPLOYMENT](DEPLOYMENT.md#stripe-einrichtung-per-skript-einmal-test-einmal-live). Nur mit Mocks getestet; in keinem Stripe-Modus ausgeführt.

Geprüft lokal (Node 24.22.3, pnpm 11.25.0): `pnpm typecheck` grün; Standardsuite 119 Tests, 117 bestanden, 0 fehlgeschlagen, 2 ohne Datenbank übersprungen; beide DB-Tests separat gegen isolierte lokale PostgreSQL-16-Datenbanken bestanden (Herkunft 2/2, Pilot 3/3); Production-Build erfolgreich. Nicht im Browser geprüft. Stripe-Testabnahme nicht durchgeführt: in der Agentenumgebung besteht kein Stripe- oder Replit-Connector-Zugang.

## Veröffentlichung der Varianten und Sammlungen

[PR #7](https://github.com/PerformIQ-GmbH/setpiece/pull/7) ist als `cafea862b725b0d5037a459baf62600c1370013b` in `main` gemergt. Die [CI](https://github.com/PerformIQ-GmbH/setpiece/actions/runs/42408841110) war auf Linux und Windows erfolgreich. Der Replit-Arbeitscommit `f1c1dc3` hatte vor dem Publish einen identischen Dateibaum. Replit bestätigte den Live-Status und die öffentliche Domain lieferte anschliessend das neue Bundle mit der Sammlungsoberfläche aus.

Die additive Sammlungsmigration wurde getrennt in Entwicklung und Produktion angewandt und Tabelle und Index wurden in beiden Umgebungen bestätigt. Das Produktionsbackup vom 07.11.2026 um 21:06 Uhr (Europe/Zurich) wurde mit PostgreSQL 16.15 erstellt und verschlüsselt ausserhalb des Repository gesichert. Wiederherstellung, Inventar und Anzahl der Kernzeilen sowie die Migration wurden in einem separaten lokalen PostgreSQL geprüft. Der vollständige fiktive Trainer- und Spielerablauf mit Sammlungszugriff lief zusätzlich gegen eine isolierte Datenbank mit dem wiederhergestellten Schema.

Öffentliche Abnahme: Health-Endpunkt 200, geschützter Sammlungsendpunkt ohne Sitzung 401 mit `no-store`, fiktive Demoantwort erscheint in der Trainer-Rückmeldung. Authentifizierte Schreibvorgänge wurden im isolierten Test durchgeführt.

## Aktueller Produktionsstand

Das erste Editorupdate verbessert das Ziehen von Linien und Endpunkten, das Zeichnen ab Spieler und Ball, den Kontrast, die Tastaturhilfe sowie die Laufwegzuordnung in Editor, Spieleransicht und Export. [Lieferstatus, Modelle und Abnahme](EDITOR-DELIVERY.md).

Am 04.11. bestanden 89 Tests und der Produktionsbuild. Ein PostgreSQL-Test wurde ohne separate Testdatenbank übersprungen. Desktop und 390 px wurden im Browser geprüft, einschliesslich Passziehen ab Ball am 05.11. Ein physisches Touchgerät wurde dafür noch nicht eingesetzt.

Am 05.11. wurde [PR #6](https://github.com/PerformIQ-GmbH/setpiece/pull/6) nach grüner [CI auf Linux und Windows](https://github.com/PerformIQ-GmbH/setpiece/actions/runs/41906378360) als `6f734842e823889ec596aa447875230deee9148d` gemergt. Replit veröffentlichte am 07.11. den Arbeitsstand `e89ff8bcf9035d734bf4313e07afffbce786f17c` mit identischem Dateibaum. Das JavaScript-Bundle wechselte, der Gesundheitsendpunkt antwortete mit HTTP 200 und die fiktive Demo verarbeitete die Spielerantwort bis zur Rückmeldung. Die früheren Pilotbelege unten beschreiben den Release vom 30.10.

PR #7 liefert eigene Gegnerpositionen und Spieleraufträge pro Variante, einen getrennten Entwurf mit ausdrücklicher Spielerfreigabe sowie Quiz und Rückmeldung je Aufgabe. Der Trainerablauf mit Variantenkopie, Phase, Pfeiltaste und Rollenauftrag wurde lokal geprüft.

Im Trainer-Playbook können eigene Standards nach Titel und vorhandener Kategorie gefiltert werden. Trefferzahl, kombinierte Filter und Zurücksetzen wurden mit fiktiven Daten bei 390 und 1366 px im Browser geprüft. Die Vorlagen haben ihren eigenen Filter.

Trainer können pro Team benannte Sammlungen anlegen, bearbeiten und löschen und die Auswahl beim Hinzufügen von Standards zu einem Spieltag filtern. API-Regressionen prüfen Teamtrennung und Trainerrechte.

Editor-Audit vom 31.10.2026: Originaleditor lokal mit ausschliesslich fiktiven In-Memory-Daten bei Desktop- und Smartphonebreite bedient. Linienkörper-Drag, Einstieg am Spieler, Farbauswahl und phasenübergreifende Gegnerpositionen als konkrete Probleme bestätigt. [Audit und priorisierter Plan](EDITOR-AUDIT-2026-10-31.md). Entwicklungseinstieg unter tests/editor-audit.html; keine Änderungen am Produktionseditor, kein neuer Release.

| Schritt | Beleg |
| --- | --- |
| Implementiert | Auditkorrekturen, bereitgestellte blaue Marke, metrische Spielfeldgeometrie, fünf persönliche 30-Tage-Piloten und Replit-Konfiguration |
| Geprüft | 74 synthetische Regressionen; zusätzlicher echter PostgreSQL-Test für Einlösung/Parallelität; vollständiger isolierter Trainer-/Spielerablauf |
| Gemergt | PR #4 und #5 in PerformIQ-GmbH/setpiece |
| Deployed | Runtime-Commit cb54521825a6a35824b4964ab2683ecdf8a8fc0a; Replit bestätigte «Congratulations! Your project is live» am 30.10.2026; öffentliche Abnahme bis 19:02 UTC |
| Live verifiziert | Neue deutsche Startseite mit bereitgestelltem Logo, öffentliche Demo, Smartphonebreite 390 px, Quizantwort → fiktive Trainer-Rückmeldung, korrigierte Spielfeldlinien |

GitHub-Prüfung für PR #5, Head eb71c585ecb57575fa94bd9df2afc0af2c3ec4df: [CI 41109559149](https://github.com/PerformIQ-GmbH/setpiece/actions/runs/41109559149), Linux und Windows erfolgreich. PR #4: [CI 41106476564](https://github.com/PerformIQ-GmbH/setpiece/actions/runs/41106476564) erfolgreich. Die späteren Dokumentationsänderungen sind kein weiterer App-Release.

## Liveprüfungen ohne schreibende Testfixtures

- /api/healthz: 200, JSON; /api/auth/user: 200; privater Teamendpunkt ohne Sitzung: 401. Private API-Antworten tragen no-store.
- /api/templates: 200 mit zehn Vorlagen. Damit ist auch ein tatsächlicher Datenbanklesezugriff in der Produktions-App bestätigt.
- /api/pricing: 200, keine buchbaren Stripe-Preis-IDs im Pilotmodus.
- Alter Admin-Tarifendpunkt: 404; bezahlter Checkout: 503 im Pilotmodus. Keine Livezahlung durchgeführt.
- /demo, /login, lokale Schriftdateien und absolute Schrift-/Iconpfade bei tiefen Links erfolgreich erreichbar.
- Öffentliche Demo mit fiktiven Daten: Antwort für Spieler 9 erhöht die passende Trainer-Rückmeldung von eins auf zwei. Keine Demoantwort wird serverseitig gespeichert.
- Smartphoneansicht und Spielfeld geprüft; keine physische iPhone-/Android-Abnahme in diesem Lauf.

Belege ausserhalb Git im Arbeitsordner audit-2026-10-28: 32-pilot-smoke.png, 33-replit-live-confirmation.png, 35-live-mobile.jpg, 36-live-mobile-demo.jpg, 37-live-home.jpg, 38-live-mobile-pitch.jpg.

## Fünf Testtrainer

Vince organisiert fünf Trainer. Jeder erhält einen eigenen zufälligen Einladungscode. Solo Coach gilt für ein kostenloses Team während 720 Stunden ab Einlösung; keine Zahlungsangaben und kein automatisches kostenpflichtiges Abo. Wiederholung verlängert nicht, bezahlte Tarife werden nicht verändert. Fünf Hashes wurden in Produktion eingerichtet; vor Veröffentlichung waren alle fünf Plätze unbenutzt. Klartextcodes und die Startanleitung liegen privat ausserhalb Git.

Der vollständige HTTP-Abnahmelauf nutzte eine frische isolierte Datenbank: Registrierung zweier fiktiver Trainer → Eigentümerprüfung des Pilotcodes → Teamtrennung → Standard → Rolle/Zuweisung → Freigabe → beschränkter Spielerlink → Quiz → korrektes Trainerergebnis → Linkwiderruf → gesperrter Checkout → Logout mit Sessionwiderruf. Mailversand war dort deaktiviert.

## Sicherung und Betrieb

Produktionssicherung im PostgreSQL-Custom-Format erstellt und in eine separate PostgreSQL-Instanz erfolgreich zurückgespielt. Dauerhafte private lokale Kopie mit Windows-DPAPI geschützt; Entschlüsselungsprobe und Archiv-Hash stimmen überein. Replit-Wiederherstellung umfasst derzeit sieben Tage. Details und Fristen: [PILOT-DATA-NOTES](PILOT-DATA-NOTES.md).

Replits erster Veröffentlichungsversuch schlug automatisch die Löschung der neuen Pilot-Tabelle vor, weil sie in der Entwicklung fehlte. Dieser Vorgang wurde abgebrochen, nicht bestätigt. Anschliessend dieselbe additive Tabelle auch in der getrennten Entwicklungsdatenbank angelegt; keine Produktionsdaten durch Entwicklungsdaten ersetzt. Die kopierten Testdaten/Sicherungszwischenstände wurden vor Deployment aus dem Projekt entfernt.

Replits interner pnpm-10.26.1-Installer brauchte confirmModulesPurge=false für den nicht-interaktiven Austausch generierter Abhängigkeiten. Exakter Frozen-Install ohne Terminal auf Replit erfolgreich (13.8 Sekunden), danach Production-Build erfolgreich. CI und Artefakt-Builds verwenden pnpm 11.25.0. Die zusätzliche Produktionsvariable CI=true allein erreichte den automatischen Installationsschritt nicht.

Die bestehende Resend-Verbindung ist vorhanden, konfigurierter Absender setpiece@performiq.ch. Tatsächliche Zustellung einer Bestätigungs-/Resetmail wurde nicht durch Versand an einen realen Empfänger getestet.

## Vor Nutzung mit echten Spielerdaten und vor bezahltem Angebot offen

1. Vince verlangt echte Spielerdaten. Vereinsvertretung, Information von Spielern/gegebenenfalls Eltern und [Pilotvereinbarung](pilot/VEREINBARUNG-ENTWURF.md) vor deren Eingabe abschliessen. Keine Gesundheits-/Verletzungsdaten im Pilot.
2. Replit Pro wird laut Vince geschäftlich für PerformIQ GmbH genutzt. Schweizer Auslandgarantien/Ergänzungen zu den Anbieterbedingungen noch bestätigen lassen. Eine konkrete Anfrage ist vorbereitet; kein Versand ohne ausdrückliche Freigabe. Das öffentliche DPA allein ist keine individuelle Prüfung.
3. Bestätigte Aufbewahrung: bei Nichtweiterführung Export anbieten und Team-/Spielerdaten innerhalb weiterer 30 Tage nach Pilotende betreut löschen; zusätzliche manuelle Pilot-Sicherungen maximal 30 Tage. Keine automatische Löschfunktion oder abgeschlossene Kontolöschung behaupten.
4. Erste tatsächliche Mailzustellung und Nutzung auf den realen Geräten der Trainer abnehmen. Vollständiger Selbstbedienungs-Export und Konto-/Teamlöschung stehen nicht zur Verfügung; Berechtigungsprüfung und betreute Bearbeitung über contact@performiq.ch.
5. Stripe-Verbindung, Kontozuordnung, Testmodus, Webhook-Retry/Kündigung und Livepreise vor Aktivieren bezahlter Abschlüsse separat abnehmen. Im Pilot ist Checkout ausdrücklich gesperrt.
6. Alter gemeinsamer Adminschlüssel ist im Code abgeschafft, der Live-Endpunkt entfernt. Entfernung alter gespeicherter Secret-Kopien bleibt betrieblich zu bestätigen.

Kein Ads-Kauf und kein neuer kostenpflichtiger Replit-Agentauftrag erfolgt. Letzter abgelesener Kontostand: USD 85.22 Restguthaben und USD 14.87 periodenweiter Verbrauch über alle Projekte, Auto-reload aus. Infrastrukturverbrauch dieses Laufs nicht einzeln zugeordnet und nicht als null verbucht.

## Verlauf

- 28.10.: Auditbasis main 6b238c59267efbf285359c0a80dbf7ac824d9403; Organisationstransfer nach PerformIQ-GmbH bestätigt.
- 29.10.: bereitgestelltes Logo und Spielfeldkorrekturen integriert; Geometrie-, SVG-, Export- und Browserbelege im Auditordner.
- 30.10.: 30-Tage-Pilot, Sicherung/Restore, Gesamtabnahme, PR #4/#5 und Replit-Deployment. Alte abweichende Replit-main-Stände in Backup-Branches erhalten; kein Force-Push.
