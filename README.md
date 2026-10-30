# SETPIECE by PerformIQ

Standards vorbereiten, Rollen zuweisen und Spielern per QR oder Link vermitteln. Die Traineransicht zeigt die Rückmeldung zur zugewiesenen Quizaufgabe; sie belegt keine Spielleistung.

**Aktueller Arbeitsstand und offene Freigaben:** [STATUS](docs/STATUS.md). Für Agenten gelten [AGENTS.md](AGENTS.md) und der kurze [Arbeitsablauf](docs/WORKFLOW.md).

## Setup

Node **24.x** und **pnpm 11.25.0** verwenden; die Versionen stehen in `package.json`. Nach dem Klonen im Repo-Verzeichnis:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
```

Das Workspace enthält React/Vite unter `artifacts/setpiece`, Express unter `artifacts/api-server`, das Datenbankschema unter `lib/db` und die OpenAPI-Quelle unter `lib/api-spec`. Generierte API-Dateien aus der Spezifikation regenerieren:

```sh
pnpm --filter @workspace/api-spec codegen
```

## Prüfungen ohne externe Dienste

```sh
pnpm typecheck
node --test scripts/tests/*.test.mjs artifacts/api-server/tests/*.test.mjs
```

Die Regressionen verwenden synthetische Daten und Mocks; der Billingtest startet nur einen lokalen HTTP-Server. Sie benötigen weder PostgreSQL noch Stripe-Zugang. `pnpm test` führt dieselbe Testauswahl aus.

Production-Build unter Linux/macOS:

```sh
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
```

Unter PowerShell:

```powershell
$env:PORT = '5173'
$env:BASE_PATH = '/'
$env:NODE_ENV = 'production'
pnpm build
```

`pnpm build` enthält den Typecheck. Die [CI](.github/workflows/ci.yml) prüft Installation, Typecheck, Regressionen und Build auf Linux und Windows. Ein erfolgreicher Build bestätigt kein Deployment und keine Zahlungsabnahme.

## Entwicklung und Replit

Replit verwendet die Node-24-Konfiguration und den vorhandenen Projekt-Workflow aus `.replit`. Frontend und API müssen über die vorgesehene Replit-Routingkonfiguration zusammen erreichbar sein. Der Runtime-Port kommt aus der jeweiligen Umgebung; `5173` oben ist nur der Build-/Frontend-Prüfwert.

Für eine lokale Frontend-Vorschau nach dem Build `pnpm --filter @workspace/setpiece serve` mit `PORT` und `BASE_PATH` ausführen. Eine vollständige lokale App braucht zusätzlich API-Routing und eine **separate Entwicklungsdatenbank**. Der API-Start führt keine Schemaänderungen, Stripe-Einrichtung oder Seed-Schreibvorgänge aus. Schreibende Tests ausschliesslich gegen eine isolierte Testdatenbank ausführen.

Runtime-Variablen, Replit-Verbindungen, Backup und Releaseabnahme stehen in [DEPLOYMENT](docs/DEPLOYMENT.md). Secrets gehören in die geschützte Umgebung, niemals in Git oder `VITE_*`-Variablen. `ADMIN_SECRET` ist abgeschafft und darf in keiner Runtime weitergeführt werden.

Die bestehende Playwright-Suite unter `artifacts/setpiece/tests/e2e` schreibt Sessions und Fixtures in die konfigurierte Datenbank. Sie gehört **nicht** zur Standard-CI. Erst eine isolierte Testdatenbank und passende Test-App verbinden; niemals die Produktiv-App oder ihre Datenbank dafür verwenden.

## Betrieb und Zusammenarbeit

- [WORKFLOW](docs/WORKFLOW.md): Rollen und bedarfsweise Skill-Auswahl.
- [STATUS](docs/STATUS.md): implementiert, geprüft, gemergt, deployed und live verifiziert.
- [DEPLOYMENT](docs/DEPLOYMENT.md): Abnahme, Wiederherstellung und Replit-Budget.
- [DECISIONS](docs/DECISIONS.md) und [LEARNINGS](docs/LEARNINGS.md): kurze Entscheidungen und dauerhafte Fallstricke.
- [LAUNCH](docs/LAUNCH.md): Pilot, Positionierung und begrenzter Werbetest nach der Betriebsabnahme.

Die historische Architekturübersicht `replit.md` ersetzt diese aktuellen Betriebsregeln nicht. Das Repo liegt seit dem bestätigten Transfer vom 28.10.2026 unter [PerformIQ-GmbH/setpiece](https://github.com/PerformIQ-GmbH/setpiece). Alte Auditverweise auf `zinna10/setpiece` bezeichnen den damaligen Ausgangsstand. Integrations- und Deploymentbelege stehen in STATUS.
