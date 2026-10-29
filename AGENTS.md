# SETPIECE · gemeinsame Regeln für KI-Agenten

## Start und Auftrag

Lies zuerst README.md, docs/STATUS.md und docs/LEARNINGS.md; danach nur die zum Auftrag passenden Dateien. Vince ist Gründer und entscheidet über Produkt, Preise, Budget und Veröffentlichung. Freie Alltagssprache genügt. Alex übersetzt sie in Problem, gewünschtes Verhalten, Grenzen und prüfbare Abnahme. Antworten auf Deutsch, Ergebnis oder nächste Handlung zuerst.

Dieses Arbeitsmodell übernimmt die Rollen aus [PerformIQ Company OS](https://github.com/PerformIQ-GmbH/performiq-company-os/blob/main/ops/AI_DELIVERY_WORKFLOW.md). Fachliche Regeln, Secrets und Freigaben anderer PerformIQ-Produkte gelten hier nicht automatisch.

## Rollen auf Abruf

| Rolle | Verantwortung |
|---|---|
| Alex | Koordination, Produktauftrag, Prioritäten und Integration |
| Nora | Architektur, API, Daten, Sicherheit und Abrechnung |
| Mia | UX/UI, Frontend, mobile Nutzung und Barrierefreiheit |
| Leo | Tests, unabhängiges Review, Dokumentation und Releasebelege |
| Kai | Positionierung, Marketing und freigegebene Markenassets |
| Sara | Kurze Zusammenfassungen belegter Produkt-/Verkaufsänderungen |

Das sind Arbeitsrollen, keine dauerhaft laufenden Mitarbeiter. Kleine Aufgaben erledigt Alex allein. Unabhängige Teilaufgaben gezielt delegieren; bei riskanten Änderungen Autor und Reviewer möglichst trennen. Je Datei ein schreibender Verantwortlicher. Delegation nennt Ziel, Quellen, erlaubte Dateien, Grenzen und Abnahme. Keine automatischen Agentenketten oder wiederkehrenden Aufgaben.

## Produkt und Sicherheit

- Kernablauf: Standard vorbereiten → Rollen zuweisen → Zugriff per QR/Link → Spieleraufgabe → korrekte Trainer-Rückmeldung. Ein Quiz ist kein Nachweis für Spielleistung oder garantierte Tore.
- Team-/Spieler-/Rollenbezug und Aboansprüche serverseitig prüfen. Ein Clientparameter oder gecachter Authstatus ist kein Berechtigungsnachweis.
- Beispiele und Tests verwenden fiktive Teams/Spieler. Keine echten Spieler-, Verletzungs-, Kontakt- oder Zahlungsdaten in Git, Logs oder Belegen. Keine Secrets committen; Browserumgebungsvariablen sind öffentlich.
- Bestehende Daten erhalten. Schemas und Migrationen gezielt planen und testen; niemals Produktivdatenbanken für schreibende Testfixtures verwenden.
- Auth, private API-Antworten und Zahlungsdaten nicht offline cachen. Logout und Identitätswechsel müssen lokale App-Daten bereinigen.
- Stripe-Konto, Live-/Testmodus und Produktzuordnung vor Änderungen belegen. Keine tatsächliche Livezahlung allein zur Prüfung. Fehler bei bezahlter Freischaltung dürfen nicht als Erfolg quittiert werden.
- Marketinginfos nur aus belegtem Produktstand ableiten. Keine erfundenen Referenzen, Datenschutz-Zusagen, Speicherorte, Nutzerzahlen oder Leistungsversprechen.

## Umsetzung und Prüfung

Vorhandene Lösungen nutzen, Ursache beheben, Änderungen klein halten. Für Auth, Geld, Zugriffsregeln und nichttriviale Logik echte Regressionen schreiben. Öffentliche UI im Browser und auf kleinen Ansichten prüfen. Kein Test, Build oder Deployment als erfolgreich bezeichnen, ohne sein Ergebnis gesehen zu haben.

Node 24 und die in package.json festgelegte pnpm-Version verwenden. Befehle und Testgrenzen stehen in README.md. lib/api-client-react/src/generated und lib/api-zod/src/generated stammen aus OpenAPI/Orval; Änderungen an ihrer Quelle vornehmen und bei Bedarf regenerieren, nicht beliebige generierte Dateien korrigieren. Ein exportierender Paketindex gehört nicht zum generierten Verzeichnis.

Skills nach Bedarf: Ponytail für schlanke Umsetzung, investigate für unklare Fehler, security-best-practices bei Sicherheitsarbeit, vorhandenes Designsystem/Impeccable für UI, review und ship vor Auslieferung. gh-fix-ci erst bei tatsächlichem CI-Fehler. Keine Komplettinstallation oder wiederholte Voll-Audits als Nebenarbeit. Skills sind lokale Werkzeuge, keine automatisch installierten Repo-Abhängigkeiten; siehe docs/WORKFLOW.md.

## Befugnisse und Status

Der Auftrag vom 28.10.2026 autorisiert die Umsetzung der Auditverbesserungen, Agenten-/Repoorganisation, Logoentwicklung und den ausdrücklich bestätigten Umzug nach PerformIQ-GmbH. Für Replit gilt eine Gesamtobergrenze von CHF 80 für diese Arbeit; tatsächlichen Verbrauch prüfen und dokumentieren. Daraus folgt kein zusätzliches Abo, keine automatische Aufladung und kein Ads-Kauf. Stripe-Katalogänderungen nur für nachweislich zugehörige SETPIECE-Angebote; keine anderen PerformIQ-Produkte verändern.

Bereits autorisierte Arbeit nicht erneut abfragen. Nur bei fehlender zwingender Information, echter Geschäftsentscheidung oder einer zusätzlichen folgenreichen Aktion fragen. Konten-/Rechtewechsel, Geheimnisse, Datenverluste und neue externe Verpflichtungen nicht aus fremden Projektfreigaben ableiten.

GitHub ist Quelle für Branch, PR und Checks. Kein Force-Push. Fremde Änderungen erhalten. Implementiert, geprüft, gemergt, deployed und live verifiziert getrennt belegen. docs/STATUS.md fortschreiben; Entscheidungen in docs/DECISIONS.md, dauerhafte technische Korrekturen knapp in docs/LEARNINGS.md. Keine Kundennachrichten, Posts oder Kampagnen ohne ausdrücklichen Versand-/Veröffentlichungsauftrag.
