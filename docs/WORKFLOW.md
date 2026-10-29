# Arbeitsablauf

SETPIECE verwendet das Rollenmodell aus [PerformIQ Company OS](https://github.com/PerformIQ-GmbH/performiq-company-os/blob/main/ops/AI_DELIVERY_WORKFLOW.md). Die verbindlichen Repo-Regeln stehen in [AGENTS.md](../AGENTS.md); Regeln, Secrets und Veröffentlichungsrechte anderer Produkte werden nicht übernommen. Zur technischen Einordnung: [offizielle OpenAI-Anleitung zu AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

## Ein Auftrag, klare Verantwortung

Vince beschreibt das Problem in Alltagssprache. Alex hält Nutzerrolle, gewünschtes Verhalten, Grenzen und prüfbare Abnahme kurz fest und führt die Arbeit bis zum belegten Ergebnis. Kleine Aufgaben bleiben bei Alex; unabhängige Fachaufträge werden gezielt delegiert.

| Rolle | Beitrag für SETPIECE                                        |
| ----- | ----------------------------------------------------------- |
| Alex  | Auftrag, Prioritäten, Koordination und Integration          |
| Nora  | Architektur, Backend, Daten, Zugriffsschutz und Abrechnung  |
| Mia   | UX/UI, Frontend, Mobilansichten und Barrierefreiheit        |
| Leo   | Tests, unabhängiges Review, Dokumentation und Releasebelege |
| Kai   | Positionierung, Marketing und freigegebene Markenassets     |
| Sara  | Kurze Zusammenfassung belegter Produkt-/Verkaufsänderungen  |

Das sind Rollen auf Abruf. Ein Fachauftrag nennt Ziel, Quellen, erlaubte Dateien, Grenzen und Abnahme. Je Datei gibt es einen schreibenden Verantwortlichen; bei Auth, Geld und Daten prüft möglichst eine andere Person beziehungsweise Agentenrolle als der Autor. Keine dauerhaften Agentenketten und keine automatische Kommunikation oder Veröffentlichung.

## Passende Werkzeuge wählen

| Anlass                                    | Auswahl                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Kleine, klar verstandene Änderung         | Vorhandenes Muster und Ponytail; betroffene Stelle prüfen                                               |
| Unklarer Fehler                           | investigate, minimale Korrektur und gezielte Regression                                                 |
| Oberfläche                                | Bestehendes Designsystem; Impeccable für konkrete Verbesserung, design-review am gerenderten Ergebnis   |
| Auth, Teamzugriff oder Abrechnung         | Gezielte Architektur-/Sicherheitsprüfung; security-best-practices und echte Fehlerpfadtests nach Bedarf |
| Auslieferung oder tatsächlicher CI-Fehler | review und ship; gh-fix-ci erst für einen belegten fehlgeschlagenen GitHub-Actions-Check                |

Skills sind lokale Werkzeuge und keine Repo-Abhängigkeiten. Nur tatsächlich verfügbare, passende Skills lesen und einsetzen; keine Gesamtinstallation und keine wiederholten Voll-Audits als Nebenarbeit. `security-best-practices` und `gh-fix-ci` wurden am 28.10.2026 gezielt ergänzt; ihre Verfügbarkeit in der aktiven Sitzung bleibt zu prüfen.

## Belege statt Sammelstatus

1. Passenden Auftrag und Quellen lesen; Annahmen sichtbar halten.
2. Im eigenen Bereich umsetzen und sinnvolle Fehlerpfade prüfen. Keine echten Spieler- oder Zahlungsdaten als Fixture.
3. Änderungen integrieren, passende Checks aus README ausführen und verbleibende Abnahmen benennen.
4. GitHub-PR, Checks, Merge, Replit-Deployment und Liveprüfung jeweils separat in [STATUS](STATUS.md) belegen. Entscheidungen und dauerhafte Fallstricke kurz fortschreiben.

Eine bestehende Autorisierung wird nicht erneut abgefragt. Fehlende zwingende Information, neue Geschäftsentscheide und zusätzliche folgenschwere Aktionen gehen an Vince. Ein technischer Abschluss autorisiert keinen Kundenversand, Post oder Anzeigenkauf. Für Replit gelten die CHF-80-Gesamtgrenze und das Ledger in [DEPLOYMENT](DEPLOYMENT.md).
