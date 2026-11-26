# Entscheidungen

Nur dauerhafte Entscheidungen mit Grund und Reichweite festhalten. Testergebnisse und offene Arbeit stehen in [STATUS](STATUS.md).

| Datum      | Entscheidung                                                            | Grund / Reichweite                                                                                                 |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 28.10.2026 | Bestehendes Produkt absichern und den Kernablauf verständlich machen    | Auditumsetzung vor zusätzlichem Traffic; kein vollständiger Neubau                                                 |
| 28.10.2026 | Rollen aus Company OS lokal über AGENTS.md und WORKFLOW verankern       | Gezielte Fachaufträge, kurze Belege und ein Verantwortlicher je Datei; keine kopierte Agentenplattform             |
| 28.10.2026 | Repo nach `PerformIQ-GmbH/setpiece` übertragen                          | Von Vince autorisiert; Durchführung und Zielrechte separat belegen                                                 |
| 28.10.2026 | Node 24 und pnpm 11.25.0 mit unverändertem Lockfile prüfen              | Gleiche Grundlage für Replit, Linux und Windows; native Plattformpakete berücksichtigen                            |
| 28.10.2026 | Standard-CI ohne DB, Stripe oder echte Spielerfixtures                  | Schnelle Regressionen mit synthetischen Daten; schreibende E2E erst in isolierter Testumgebung                     |
| 28.10.2026 | ADMIN_SECRET und allein schlüsselbasierte Adminfreischaltung abschaffen | Öffentlicher Schlüssel ist kein Berechtigungsnachweis; alte Runtime-Werte ausdrücklich entfernen                   |
| 28.10.2026 | Replit-Arbeit auf insgesamt CHF 80 begrenzen                            | Gesamtgrenze für diesen Auftrag, keine automatische Aufladung oder zusätzliche Verpflichtung; Ledger in DEPLOYMENT |
| 24.11.2026 | Marktstart: Stripe live in Woche 1, Ads bis CHF 150/Monat durch Kai, UTM-Messung | Entscheid Vince; Plan im Company OS `ops/setpiece/WOCHENPLAN.md`. Ersetzt für Ads den Satz «kein Ads-Kauf» in AGENTS.md |
| 25.11.2026 | Videoszenen nur als YouTube-/Vimeo-Link mit Start/Ende; eigener SETPIECE-YouTube-Kanal, Videos «nicht gelistet» | Entscheid Vince. Keine eigene Videoablage. Laut Vince liegen die Rechte für das Referenzmaterial (auch Topligen) vor; Nachweis pro Quelle beim Hochladen auf den Kanal festhalten |
| 25.11.2026 | Bibliothek zuerst kuratiert; Community-Teilen später mit Prüfung vor Veröffentlichung | Entscheid Vince. Material kommt als YouTube-Link + Zeitstempel + Notizen; Claude baut die Variante in `scripts/src/template-library.ts` nach |
| 25.11.2026 | Videoszenen in eigener Mediathek (Google Cloud Storage, Zürich) statt YouTube; Quellen auch Wyscout/InStat | Entscheid Vince: keine YouTube-Sperren, Clips und Vorlagen gehören uns. Rechtefragen bewusst zurückgestellt, Vince behandelt das Material als eigenes. Ersetzt für die Ablage den YouTube-Kanal vom selben Tag; Einrichtung in [MEDIATHEK](MEDIATHEK.md) |

Quelle für Rollen und Routing: [PerformIQ Company OS](https://github.com/PerformIQ-GmbH/performiq-company-os/blob/main/ops/AI_DELIVERY_WORKFLOW.md). Daraus werden keine Freigaben anderer Produkte abgeleitet.
