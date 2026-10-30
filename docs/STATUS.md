# Status · SETPIECE

**Stand 30.10.2026, 19:02 UTC: technisch live und öffentlich verifiziert unter https://setpiece.performiq.ch/.**

## Aktueller Produktionsstand

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
