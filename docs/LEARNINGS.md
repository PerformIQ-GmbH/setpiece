# Learnings

Dauerhafte technische Fallstricke kurz halten. Aktuelle Aufgaben gehören in STATUS, Geschäftsentscheide in DECISIONS.

- **28.10.2026 · Versionen:** Node 24 und die pnpm-Version aus package.json verwenden. Ein pnpm-Majorwechsel kann Workspace-Einstellungen, Peerauflösung und Lockfileverhalten verändern; Installation und Build gemeinsam prüfen.
- **28.10.2026 · Windows:** Native Buildpakete müssen für das Betriebssystem erlaubt sein. Ein Windows-Binaryfehler beweist keinen Fehler des Linux-/Replit-Builds; beide Zielsysteme separat prüfen.
- **28.10.2026 · Codegenerierung:** OpenAPI ist Quelle für generierte Clients und Zod-Schemas. Zusätzliche Schemaexporte nicht unter gleichem Namen über den Paketindex erneut exportieren.
- **28.10.2026 · Identität:** Eine Registrierung oder ein gecachter Loginstatus beweist keinen Kontobesitz. Bestehende Identitäten, aktuelle Sitzungen und Team-/Rollenbezug serverseitig prüfen.
- **28.10.2026 · Billing:** Webhook-Verarbeitung erst nach erfolgreicher App-Persistenz quittieren. Aktuellen Stripe-Zustand verwenden, damit Wiederholungen und verspätete Ereignisse konsistent bleiben.
- **28.10.2026 · Offline:** Auth-, Zahlungs- und private API-Antworten nicht im Serviceworker speichern. Logout und Nutzerwechsel müssen lokale private Daten beseitigen.
- **28.10.2026 · Testdaten:** Die bestehende Playwright-Einrichtung schreibt direkt in ihre Datenbank. Eine Development-Domain ist kein Nachweis einer isolierten Datenbank.
- **28.10.2026 · Release:** Build, Merge und Deployment sind verschiedene Belege. Auch ein Serverstart kann bestehende Migrationen und Seeding auslösen; vor Veröffentlichung Backup und Wiederherstellung prüfen.
