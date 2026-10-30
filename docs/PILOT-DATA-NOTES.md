# Echtspieler-Pilot: geprüfter Stand und Abschluss

Stand 30.10.2026. Vince verlangt echte Spielerdaten im Pilot, nicht nur Pseudonyme. Die technische Veröffentlichung allein ist dafür keine vollständige Betriebsfreigabe.

## Belegt

- Replit-Konto: Pro 100, USD 100/Monat, automatische Aufladung aus. Vorhandener Tarif, kein neues Abo abgeschlossen. Guthaben am 30.10.: USD 85.22; Gesamtverbrauch der laufenden Periode USD 14.87 über alle Projekte, nicht diesem Auftrag zuordenbar.
- Die [Replit-Nutzungsbedingungen](https://replit.com/terms-of-service) ordnen Pro dem Commercial Agreement zu. Das veröffentlichte [DPA](https://replit.com/dpa) ist Teil dieses Vertrags und enthält Standardvertragsklauseln. Vertragspartner des konkreten Kontos und schweizerische Ergänzungen/Transferbewertung sind gesondert festzuhalten; öffentliches DPA ist kein Beleg einer individuellen Prüfung.
- Produktionsdatenbank PostgreSQL 16.15 in AWS us-east-1, USA. Replit-Deployment: North America. Entwicklung und Produktion getrennt. 18 öffentliche Tabellen vor Pilotmigration.
- Produktionssicherung am 30.10.: pg_dump 16.10, Custom-Format, AES-256-CBC/PBKDF2, ausserhalb Git im geschützten Replit-Home. SHA-256 des verschlüsselten Archivs: `5fe86c3f61cabfa6bc6588ff49af719bc22efa513a380dc78d6f41ac26ada8b8`.
- Rücksicherung in eigene PostgreSQL-16.10-Instanz über privaten Unix-Socket erfolgreich, ein Benutzer/ein Team erhalten. Keine Produktionsrücksicherung. Automatische Replit-Wiederherstellung: letzte sieben Tage; geplante zusätzliche Backups waren aus.
- Resend-DPA nennt DSG und Schweizer Ergänzungen zu Standardvertragsklauseln: [DPA](https://resend.com/legal/dpa). Kontobestätigungs-/Resetmails enthalten Traineradresse und Sicherheitslink. Keine Spielermails im Kernablauf.
- Keine neuen Werbetracker eingebaut; Schriften lokal. Spielerzugriff per Besitz des Links, keine Identitätsprüfung durch die Spielerauswahl. Links können widerrufen werden.

## Vor Einladen echter Spieler abschliessen

1. Verein, berechtigten Vereinsvertreter und Information der Spieler/gegebenenfalls Eltern dokumentieren. Trainerwahl allein belegt keinen Auftrag des Vereins. Grundlage: [EDÖB zu Vereinen](https://www.edoeb.admin.ch/de/datenschutz-in-vereinen).
2. Vertragszuordnung von Replit und Resend zu PerformIQ festhalten; Replit-DPA und Auslandgarantien einschliesslich Schweizer Anforderungen prüfen. [EDÖB Auslandübermittlung](https://www.edoeb.admin.ch/de/bekanntgabe-von-personendaten-ins-ausland).
3. Entwurf unter `docs/pilot/VEREINBARUNG-ENTWURF.md` mit Fristen und Ansprechpartnern vervollständigen und durch PerformIQ/Verein abschliessen. Die dort vorgeschlagenen Fristen sind noch keine aktive Löschanweisung.
4. Auskunft/Export/Löschung über contact@performiq.ch mit Identitäts- und Teamprüfung betreuen. Vollständige Konto-/Teamlöschung und Gesamtexport sind derzeit keine Selbstbedienungsfunktionen. Einen konkreten Erledigungsbeleg führen; keine zugesicherte Automatik behaupten.
5. Öffentliche Datenschutzseite nach bestätigten Verträgen und Fristen aktualisieren. Namen, Trikotnummern und notwendige Rollen-/Quizdaten begrenzen; keine Gesundheits-, Verletzungs- oder privaten Kontaktdaten im Pilot.

## Technischer Pilot

Fünf zufällige 128-Bit-Codes; nur SHA-256-Hashes in PostgreSQL, Klartext ausserhalb Git. Ein Code je Konto und Team; 720 Stunden ab Einlösung. Wiederholung verlängert nicht. Der bezahlte Teamtarif bleibt unverändert, Entitlements verwenden den zeitlich wirksamen Pilot. Kostenpflichtiger Checkout ist bei aktivem Pilotmodus gesperrt.

Tests: synthetische Suite ohne Dienste; zusätzlicher echter PostgreSQL-Test mit Eigentümerprüfung, Konkurrenz und Wiederholung in `setpiece_pilot_test`. `scripts/pilot-smoke.mjs` verlangt ausschliesslich eine frische Datenbank namens `setpiece_flow_test` und eine API unter 127.0.0.1. Niemals mit Produktionsverbindung ausführen.

## Bestätigung durch Vince am 30.10.2026

Replit Pro wird geschäftlich für PerformIQ GmbH genutzt. Für nicht weitergeführte Pilot-Teams: Export anbieten, Team-/Spielerdaten innerhalb von 30 Tagen nach dem 30-tägigen Pilot löschen. Zusätzliche manuelle Pilot-Sicherungen maximal 30 Tage. Operativ als betreuter Vorgang über contact@performiq.ch führen; keine automatische Löschfunktion vorhanden. Schweizer Ergänzungen zum Replit-DPA bleiben vor Echtgeld-/Echtspielerfreigabe zu klären.
