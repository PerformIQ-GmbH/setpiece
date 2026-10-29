# Deployment und Betriebsabnahme

Ein Release braucht einen zugeordneten Git-Commit, grüne Checks und die nachfolgenden Betriebsbelege. Der tatsächliche Stand steht in [STATUS](STATUS.md); diese Checkliste behauptet keine bereits erledigte Prüfung.

## Umgebung und Secrets

| Konfiguration                                                      | Verwendung und Prüfung                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node 24, pnpm 11.25.0                                              | Vor Frozen-Install und Build bestätigen                                                                                                                      |
| `PORT`, `BASE_PATH`                                                | Vite benötigt beides bereits beim Build; `BASE_PATH=/` für die Hauptdomain. API erhält ihren eigenen Runtime-Port                                            |
| `NODE_ENV=production`                                              | Für Release-Build und API-Runtime setzen                                                                                                                     |
| `DATABASE_URL`                                                     | Geschützt konfigurieren; Entwicklungs-, Test- und Produktivdatenbank eindeutig trennen                                                                       |
| `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY` / `WEB_REPL_RENEWAL` | Von Replit bereitgestellte Identität für Stripe/Resend; Werte nie in Logs oder Git kopieren                                                                  |
| `REPLIT_DEPLOYMENT`                                                | Der Stripeclient wählt bei `1` die Connector-Umgebung `production`, sonst `development`. Das ersetzt keine Prüfung des tatsächlichen Stripe-Test-/Live-Modus |
| `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, `ALLOWED_ORIGINS`           | Routing, Webhookziel und erlaubte Browserursprünge kontrollieren; keine ungeprüfte fremde Domain aufnehmen                                                   |
| `APP_DOMAIN`, optional `APP_BASE_PATH`                             | Stripe-Rückkehr-/Portal-URL mit der tatsächlichen Domain und dem Mount-Pfad abgleichen                                                                       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                         | OAuth-Client und erlaubte Callback-URLs für die jeweilige Umgebung bestätigen                                                                                |

Stripe und Resend werden über die bestehenden Replit-Verbindungen geladen. Für Resend den freigegebenen Absender und tatsächliche Zustellung prüfen. Keine zusätzlichen frei erfundenen API-Key-Variablen einführen.

`ADMIN_SECRET` ist abgeschafft. Den veröffentlichten Wert in **Development, Deployment, gemeinsam genutzten Variablen und alten Secrets** entfernen; eine mögliche anderweitige Wiederverwendung rotieren. Entfernen aus `.replit` allein genügt nicht. Die frühere Adminroute darf keine Teamfreischaltung mehr ermöglichen; die Regression erwartet `404`. Den alten Wert weder hier noch in Belegen wiederholen.

## Build, Daten und Wiederherstellung

1. Finalen Branch/Commit festhalten und die README-Checks mit Frozen-Install ausführen. CI startet keine App und verbindet keine Datenbank. Schreibende Playwright-Tests erst nach Einrichtung einer eigenen Test-App mit isolierter Testdatenbank ausführen.
2. Vor der Veröffentlichung Datenbankziel und vorhandene Start-Schreibvorgänge prüfen: `src/index.ts` des API-Servers initialisiert derzeit Stripe-Schema, Enumwerte und Vorlagen. Diese Auditumsetzung autorisiert keine zusätzliche Schemaänderung und keinen pauschalen `drizzle-kit push --force`.
3. Vor jedem Release, der Daten oder Startlogik betrifft, einen konsistenten PostgreSQL-Backupstand erzeugen und verschlüsselt ausserhalb des Repo ablegen. Zeitpunkt, Quellumgebung, Werkzeugversion, Speicherortreferenz und Dateiprüfsumme dokumentieren; keine Verbindungszeichenfolge oder Dateninhalte in Git.
4. Den Backupstand in eine **neue isolierte Wiederherstellungsdatenbank** einspielen. Tabellen, Zeilenanzahlen und Beziehungen der Kernobjekte vergleichen und den Trainer-/Spielerablauf dort prüfen. Restore-Ziel vor jedem schreibenden Befehl nachweisen. Erst ein erfolgreicher Restore bestätigt die Wiederherstellbarkeit.
5. Replit-Deployment mit Commit und Deployment-ID zuordnen. Bei Fehlern vorherigen kompatiblen Build wiederherstellen; eine Produktionsdatenbank nicht beiläufig zurücksetzen. Datenrestore braucht einen geprüften Verlustzeitraum und die dafür nötige Freigabe.

Für den Backup-/Restorelauf können PostgreSQLs `pg_dump --format=custom` und `pg_restore --exit-on-error --no-owner` mit geschützten Verbindungsparametern verwendet werden. Toolausgabe auf Fehler prüfen. Backupdateien und Playwright-Sitzungen niemals als öffentliches CI-Artefakt hochladen.

Der pauschale Datenbankschema-Push wurde aus `scripts/post-merge.sh` entfernt; der Hook führt nur noch den Frozen-Install aus. Automatischer Merge oder erfolgreicher Build darf kein ungeprüftes Schema-Push auslösen. Die vorhandenen Schreibvorgänge beim API-Start bleiben separat zu beachten. Bei einer später geplanten Migration gehören genaue SQL-/Schemaänderung, Test auf Kopie, Backup und Rückweg in denselben Releaseauftrag.

## Stripe im Testmodus und in Produktion

| Abnahme                 | Konkreter Nachweis                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zuordnung               | Konto/Organisation, Connector-Umgebung, Test-/Live-Modus, SETPIECE-Produkte und Preise dokumentieren; andere PerformIQ-Angebote unberührt lassen               |
| Erstkauf                | Im Testmodus Checkout, Rückkehr und tatsächliche Teamfreischaltung prüfen; ein Redirect allein ist kein Erfolg                                                 |
| Fehler und Wiederholung | DB-Schreibfehler provozieren: Webhook meldet Fehler, Wiederholung stellt den Zustand her. Doppelte/verspätete Ereignisse und parallele Checkoutversuche prüfen |
| Aboänderungen           | Fehlgeschlagene Rechnung, Kündigung und Reaktivierung mit dem aktuellen Stripezustand abgleichen; falsches Team/falscher Preis darf keinen Zugriff erhalten    |
| Livekonfiguration       | Webhookdomain, Ereignisse, Signaturprüfung und zugehörige Livepreise kontrollieren. Keine echte Livezahlung allein zur Prüfung durchführen                     |

Synthetische Regressionen ergänzen diese Abnahme, ersetzen aber keine Prüfung der verbundenen Dienste. Eine Runtime, die nach fehlgeschlagener Stripe-Initialisierung weiterläuft, gilt nicht automatisch als funktionsfähige Bezahlumgebung.

## Release und Liveabnahme

- PR, Head-SHA und grüne Linux-/Windows-Checks dokumentieren; Reviewer bestätigt Auth-, Zugriffs- und Zahlungsänderungen.
- Der Transfer nach `PerformIQ-GmbH/setpiece` ist bestätigt. Vor Release Teamrechte, GitHub-Checks und Replit-Repo-Verbindung mit dem neuen Repo abgleichen. GitHub-Transfer ist kein Deploymentbeleg.
- Öffentliche Demo, Preise, Kontakt/Datenschutz und Mailzustellung prüfen; fiktiver Trainer → Team → Standard → Rollen → QR/Link → Spieleraufgabe → korrekte Trainer-Rückmeldung auf Mobilgeräten durchlaufen.
- Logout, Nutzerwechsel, Offlinezustand, falsche Rolle und fremdes Team prüfen; keine private Antwort darf beim anderen Nutzer erscheinen.
- Merge-SHA, Replit-Deployment und Liveprüfung mit Zeitpunkt getrennt eintragen. Betreuten Pilot erst nach geschlossenen technischen und betrieblichen Blockern starten; Werbung braucht ihre eigene Geschäftsfreigabe.

## Replit-Budget für diesen Auftrag

**Gesamtobergrenze CHF 80.** Tatsächlichen Verbrauch vor kostenpflichtiger Replit-Arbeit und an Phasengrenzen aus der Abrechnung ablesen. Bei anderer Abrechnungswährung Quelle, Kurs und Zeitpunkt festhalten. Keine automatische Aufladung oder zusätzliche Verpflichtung aus dieser Grenze ableiten.

| Datum      | Arbeit / Beleg                                                                    | Neu bestätigte Kosten CHF | Kumuliert CHF |
| ---------- | --------------------------------------------------------------------------------- | ------------------------: | ------------: |
| 28.10.2026 | Ausgangsstand dieses Auftrags; noch keine zusätzliche Replit-Ausgabe dokumentiert |                      0.00 |          0.00 |

Die Startzeile bestätigt keinen abgelesenen Replit-Kontostand. Aktuelle Abrechnungsansicht, bestehende Nutzung und Restbetrag sind vor kostenpflichtigen Aktionen zu prüfen; unbekannte Kosten nicht als null verbuchen. Das Ledger fortführen und vor Überschreitung stoppen. Vorgeschlagene Werbebudgets aus dem Audit gehören nicht zu diesem Replit-Budget.
