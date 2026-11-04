# Manueller Editor-Audit

`editor-audit.html` lädt den echten `SetPieceEditor` mit den normalen Providern und einer fiktiven API im Arbeitsspeicher. Es gibt keinen Datenbankzugriff. Reload setzt sämtliche Änderungen zurück. Unbekannte API-Endpunkte liefern bewusst HTTP 501 statt reale Daten nachzuladen. Rollenempfehlungen sind leer; Freigabe, Authentifizierung und Export sind mit dieser Fixture nicht abgenommen.

Den normalen Vite-Entwicklungsserver mit `PORT=5175`, `BASE_PATH=/` und Host `127.0.0.1` starten, dann `/tests/editor-audit.html` öffnen. Der Einstieg wird von `index.html` nicht importiert und gehört nicht zum normalen Produktionsbuild. Der Server des Audits vom 31.10.2026 wurde anschliessend beendet.

Das kleine Audit-Detailfeld zeigt lokale Zeichnungsdaten zur manuellen Gegenprüfung. Es ist kein Bestandteil des Produkts. Bei Quelländerungen vollständig neu laden, um veraltete Provider/Fixtures durch Hot Reload auszuschliessen.

Reproduktion und Plan: `docs/EDITOR-AUDIT-2026-10-31.md` im Repository.
