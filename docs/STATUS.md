# Status · SETPIECE

**Stand 28.10.2026: Auditverbesserungen sind implementiert und lokal geprüft; abschliessende Routenoptimierung wird integriert. Es liegt noch kein belegter neuer Produktionsrelease vor.**

Ausgangsstand des Audits: Commit `6b238c59267efbf285359c0a80dbf7ac824d9403` auf `main`. Arbeitsbranch: `codex/setpiece-launch-readiness`. Der Detailaudit vom 28.10.2026 liegt im separaten Arbeitsordner `audit-2026-10-28`; er enthält interne Befunde und Sitzungsbelege.

## Implementiert beziehungsweise in Integration

| Bereich                                  | Aktueller Beleg und Grenze                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Auth und Identität                       | Lokale Änderungen und synthetische Regressionen vorhanden; vollständige Freigabe des integrierten Standes folgt         |
| Billing und Webhooks                     | Lokale Änderungen und Billingtests vorhanden; echte Stripe-Testmodusabnahme offen                                       |
| Quiz und Bereitschaft                    | Lokale Prüfungen von Team-/Rollenbezug und erwarteten Aufgaben vorhanden; finaler Kerndurchlauf offen                   |
| Offline, Demo und öffentliche Oberfläche | Lokale Änderungen vorhanden; Browser-/Geräteprüfung wird separat ergänzt                                                |
| Zusammenarbeit und Betrieb               | AGENTS.md, README, Workflow-, Entscheidungs-, Lern- und Deploymentdokumentation sowie CI hinzugefügt; GitHub-Lauf offen |

## Tatsächlich geprüft

| Prüfung                                          | Ergebnis                                      | Nachweisgrenze                                                                 |
| ------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------ |
| Lokale Runtime                                   | Node `24.22.1`, pnpm `11.25.0`                | Versionsabfrage am 28.10.2026 durch Leo                                        |
| Bibliotheks-Typecheck                            | `tsc --build` grün                            | Von Alex am 28.10.2026 gemeldet; kein vollständiger Workspace-/Buildnachweis   |
| Windows-Installation                             | Native Pakete mit pnpm 11.25 installierbar    | Von Alex am 28.10.2026 gemeldet; endgültiger Frozen-Install-/CI-Nachweis folgt |
| Gesamt-Typecheck, Regressionen, Production-Build | Gesamtbuild Exit 0 und 46/46 Regressionen grün | Lokal am 28.10.2026; abschliessender Frontendbuild nach Routenaufteilung separat ergänzen |
| Browser und kleine Ansichten | Landing und Registrierung bei 375 × 812 ohne seitlichen Überlauf; Demoquiz aktualisiert Trainerübersicht und Readiness | Desktop-Browser mit Viewportprüfung; keine echte Geräte-/Produktionsdatenabnahme |

## Auslieferung und Repo-Umzug

Dokumentationsprüfung durch Leo am 28.10.2026: alle sechs Markdowndateien und der CI-Workflow mit dem vorhandenen Prettier verarbeitet; lokale Dokumentlinks erfolgreich aufgelöst. Die beiden verwendeten Actions-Referenzen wurden am offiziellen Git-Remote geprüft und auf ihre Commits festgelegt. Das ist noch kein ausgeführter GitHub-Actions-Lauf.

| Schritt          | Status                              | Erforderlicher Beleg                                                                                                                                    |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub-Transfer  | Erfolgreich bestätigt am 28.10.2026 | [PerformIQ-GmbH/setpiece](https://github.com/PerformIQ-GmbH/setpiece); Alex hat UI-Owner, Connector-Adminrechte sowie Remotewechsel und Fetch bestätigt |
| PR und CI        | Noch nicht belegt                   | PR-URL, Head-SHA und grüner Linux-/Windows-Lauf                                                                                                         |
| Gemergt          | Noch nicht belegt                   | Merge-SHA und Zeitpunkt                                                                                                                                 |
| Deployed         | Noch nicht belegt                   | Replit-Deployment-ID/URL und zugeordneter Commit                                                                                                        |
| Live verifiziert | Noch nicht belegt                   | Öffentliche Domain, Zeitpunkt und geprüfte Abläufe                                                                                                      |

Auch der Replit-Remote wurde erfolgreich auf das Organisationsrepo umgestellt. Replit war unverändert und hatte nur den leeren Publish-Commit `7a55712` vor `origin/main`; dieser wurde im lokalen Replit-Branch `backup/replit-published-2026-10-28` gesichert. Kein neuer Code wurde zu diesem Zeitpunkt deployed.

`origin` wurde auf `https://github.com/PerformIQ-GmbH/setpiece.git` umgestellt und erfolgreich abgerufen. Alte Verweise auf `zinna10/setpiece` sind historische Auditquellen. Die öffentliche Domain ist `https://setpiece.performiq.ch/`; ihre Erreichbarkeit beweist nicht, dass diese lokalen Änderungen veröffentlicht sind.

## Offene Abnahme

- Vollständigen Kernablauf und Team-/Rollenisolation mit fiktiven Konten auf kleinen Ansichten und echten Mobilgeräten prüfen.
- Logout, Identitätswechsel und Offlinezustand auf einem gemeinsam verwendeten Gerät abnehmen.
- Stripe-Testmodus inklusive DB-Fehler, Retry, doppelter/verspäteter Ereignisse und Kündigung durchlaufen; Test-/Live-Zuordnung belegen.
- Veröffentlichten Adminschlüssel in allen Runtime-Umgebungen entfernen beziehungsweise rotieren; Backup, Restore und Mailzustellung nachweisen.
- Kontakt, Datenschutz, Löschung und Messung fachlich bestätigen; erst danach betreuten Pilot und gegebenenfalls separat freigegebene Werbung starten.

## Pilotmessung mit vorhandenen Daten

Gezielte Quellcodeprüfung durch Leo am 28.10.2026; keine Produktivdaten abgefragt und kein neues Tracking eingebaut. Ein betreuter Pilot kann vorhandene Teamereignisse, Quizdaten und den tatsächlichen Stripe-Zustand zusammenführen:

| Schritt                    | Vorhandenes Signal                                                                                 | Aussagegrenze                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Erster Standard und Teilen | `set_piece_created` sowie `share_link_generated` in `audit_events`, jeweils mit Team und Zeitpunkt | Kein eigenes Erstereignis; frühesten Eintrag je Pilotteam bestimmen. Auch Duplikate erzeugen `set_piece_created`                                                                                                  |
| Spielerzugriff und Quiz    | `share_links.last_accessed_at`, `readiness_changed`, `quiz_submitted` und `quiz_attempts`          | Linkzeitpunkt wird bei jedem gültigen Share-API-Aufruf überschrieben. `view_count` steigt beim expliziten Rückmeldungs-POST; kein vollständiger Verlauf reiner Ansichten und kein Beweis einer eindeutigen Person |
| Trainer sieht Rückmeldung  | Aktuelle Readiness im Teamdashboard                                                                | Kein Ereignis für das Öffnen des Trainerergebnisses; im betreuten Durchlauf beobachten und bestätigen                                                                                                             |
| Zahlung / Abo              | Aktueller Team-Tarif, Stripe-Kunden-/Abo-ID und Abo-Status; Stripe-Ereignisse und Rechnungen       | Kein Subscription-Auditereignis. Bezahlten Tarif oder `past_due` nicht als Beweis einer erfolgreich bezahlten Rechnung zählen                                                                                     |
| Nutzung in weiterer Woche  | Neue Standards, Rollenänderungen oder Quizabgaben anhand ihrer Zeitpunkte                          | Wiederholtes reines Lesen wird damit nicht vollständig sichtbar; beim Pilot nachfassen                                                                                                                            |

Der Team-Auditendpunkt liefert höchstens 200 neueste Einträge je Anfrage und hat keine Pagination; er ist kein vollständiger Kohortenexport. Für reine Registrierungen existiert `users.created_at`, aber kein Registration-Auditereignis. Kanal-/UTM-Zuordnung und Besuchsereignisse wurden im geprüften Anwendungscode nicht gefunden. Damit ist ein beobachteter Produktpilot möglich; eine automatische Kanal→Aktivierung→bezahlte Rechnung-Auswertung ist noch nicht belegt.

Quellen: [Auditmodell](../lib/db/src/schema/auditEvents.ts), [Auditendpunkt](../artifacts/api-server/src/routes/audit.ts), [Standards](../artifacts/api-server/src/routes/setPieces.ts), [Sharing](../artifacts/api-server/src/routes/sharing.ts), [Quiz](../artifacts/api-server/src/routes/quiz.ts), [Webhookabgleich](../artifacts/api-server/src/lib/webhookHandlers.ts).

## Offene Anbieter-, Aufbewahrungs- und Datenabläufe

Die öffentliche SETPIECE-Seite unter `/datenschutz` nennt die vollständige Erklärung ausdrücklich als ausstehend. Die Firmenwebsite ist keine Bestätigung der SETPIECE-Infrastruktur: Angaben zu GCP/Schweiz dürfen nicht auf das Replit-Produkt übertragen werden.

| Offener Punkt                 | Konkreter Abschlussbeleg                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verantwortlichkeiten          | Zuständigkeit zwischen PerformIQ und Verein, Informationsweg zu Spielern/Junioren sowie zuständige Kontaktperson bestätigen; die daraus abgeleitete SETPIECE-Erklärung fachlich freigeben                                                                                                                                                                                           |
| Hosting und Datenbank         | Tatsächliche Replit-Deployment- und PostgreSQL-Anbieter/Regionen, Backupziel, Zugriffsberechtigte und zugehörige Verträge/Unterauftragnehmer nachweisen; keine ungeprüfte Speicherortzusage                                                                                                                                                                                         |
| Weitere Dienste               | Tatsächlich verbundene Stripe- und Resend-Konten, Google OAuth sowie deren verarbeitete Daten und Aufbewahrung dokumentieren. Google Fonts ist in HTML/CSS extern eingebunden und gehört ebenfalls in die bestätigte Anbieterliste                                                                                                                                                  |
| Fristen und Bereinigung       | Fristen und zuständigen Bereinigungsablauf für Konten, Teams/Spieler, Quizantworten, Auditdaten/Logs, Sessions/Tokens und Backups festlegen und testen. Eine Ablaufzeit ist kein Nachweis einer vollständigen Datenbereinigung; ein zentraler Retention-/Purge-Ablauf wurde im Anwendungscode nicht gefunden                                                                        |
| Auskunft, Export und Löschung | Identitätsprüfung, zuständigen Support, vollständige Lösch-/Exportprüfung mit Testkonto und Umgang mit Backups sowie Stripe/Resend belegen. Der vorhandene Spieler-DELETE entfernt verknüpfte Quiz-/Readinessdatensätze per Cascade; Spieler-IDs in Audit-JSON-Metadaten werden dadurch nicht automatisch entfernt. Ein vollständiger Konto-/Team-Löschablauf ist noch nicht belegt |

Quellen: [Produktinformationen](../artifacts/setpiece/src/pages/PublicInfo.tsx), [Spielerlöschung](../artifacts/api-server/src/routes/players.ts), [Quizschema](../lib/db/src/schema/quizAttempts.ts), [Readinessschema](../lib/db/src/schema/playerReadiness.ts), [Sitzungen und Tokens](../lib/db/src/schema/auth.ts). Dies dokumentiert offene Arbeit und setzt keine neuen Speicherfristen oder Datenprozesse fest.

Abnahmekriterien und Kostenbelege: [DEPLOYMENT](DEPLOYMENT.md). Ein offener Punkt wird erst mit tatsächlichem Nachweis geschlossen.

## Replit- und Stripe-Abgleich · 28.10.2026

Replit zeigt getrennte Development- und Production-Datenbanken und für das bestehende Deployment die Region North America. Datenbankregion und Backupziel sind damit noch nicht bestätigt. In der App-Integrationsansicht ist Resend aktiv; eine aktive Stripe-Verbindung fehlt. Vince hat das aktive Stripe-Konto **performIQ** für SETPIECE bestätigt; das eingeschränkte Konto PerformIQ GmbH und Momgenda sind nicht zu verwenden. Keine Zahlung und kein Produktkauf wurden ausgeführt. Keine kostenpflichtige Replit-Agentenarbeit wurde gestartet; das CHF-80-Limit ist kein verifizierter Kontostand.


## Auslieferungsbeleg · 29.10.2026

Drei Commits wurden ohne Force-Push auf codex/setpiece-launch-readiness veröffentlicht; Head 66e6101. Entwurf: https://github.com/PerformIQ-GmbH/setpiece/pull/4. GitHub CI-Lauf 40848480789 wurde gestartet. Die Replit-Arbeitskopie wurde bei sauberem Ausgangszustand auf denselben Branch/Commit umgestellt. Frozen-Installation, Regressionen und Build wurden dort gestartet; Ergebnis noch offen. Kein Republish und kein Merge.

Die abschliessende Routenaufteilung besteht Frontend-Typecheck und Production-Build: Haupt-JS 565.19 kB (gzip178.69), vorher1318.31 kB (gzip387.70). Landing inklusive benötigter Konva-Chunks920.24 kB (gzip289.09); bestehende Grössenwarnung bleibt sichtbar. Unabhängiges Frontend-/Betriebsreview meldete keine blockierenden Befunde.


Nachtrag29.10.: GitHub-Lauf40848480789 besteht alle Schritte auf ubuntu-latest und windows-latest für66e6101. In Replit bestehen Frozen-Install,46/46Regressionen und Production-Build ebenfalls für66e6101. Die Anwendung wurde nicht neu veröffentlicht; Datenbank-/Stripe-E2E bleibt offen. Beleg im separaten Auditordner: screenshots/24-replit-tests-build-passed.png.


## Logoübernahme ·29.10.2026
Das von Vince gelieferte blaue Logo ersetzt den grünen Entwurf in der gemeinsamen BrandLogo-Komponente für öffentliche Seiten, Traineransicht und Demo. Favicon, Apple-Touch-Icon, PWA-Icons und Open-Graph-Bild stammen aus dem gelieferten Paket; keine Neuzeichnung. Prüfung und Replit-Abgleich werden für diesen Änderungsstand separat bestätigt.

Logo-Prüfung: Frontend-Production-Build Exit0. Browser bei375px: beide Original-SVGs geladen, kein horizontaler Überlauf (Dokument367px). Screenshot25-supplied-logo-mobile.png im separaten Auditordner. Keine Funktionsänderung und keine Neuzeichnung der gelieferten Assets.


## Spielfeldkorrektur ·29.10.2026

Implementiert: gemeinsame metrische Geometrie, Fit-/Inverse-Abbildung, Snap und aktive Renderwege inklusive Quiz und Druck. 65/65 Regressionen, Workspace-Typecheck/Gesamtbuild und abschliessender Frontendbuild grün. Browservergleich mit fiktiven Daten, mobile Demo sowie erfolgreicher Videoexport. Unabhängiger Review durchgeführt; Kategorienblocker korrigiert. Details, Grenzen und Replit-/Modellbudget: [PITCH-PRECISION-PLAN](PITCH-PRECISION-PLAN.md). Noch kein Merge/Republish dieses Standes.

Abschlussbeleg Spielfeld: Codecommit90d3974; GitHub CI40922494396 besteht Installation, Typecheck,65Regressionen und Build auf Linux und Windows. Derselbe Codecommit ist in Replit übernommen; dort65/65Tests und Frontendbuild grün (7.46s). Screenshot31-pitch-replit-tests-build.png im separaten Auditordner. Replit-Vorschaubereich zeigte beim abschliessenden Öffnen weiterhin 'Your app is starting'; daher keine zusätzliche Behauptung einer laufenden integrierten Replit-App oder eines Produktionsdeployments. Lokaler Browsernachweis ist separat belegt.

