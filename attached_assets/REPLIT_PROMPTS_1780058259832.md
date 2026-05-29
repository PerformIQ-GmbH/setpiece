# SETPIECE — Replit-Prompts (finale Reihenfolge)

Basis: gstack-CEO-Review + finaler Entscheid. Reihenfolge bewusst optimiert für schnelle Marktreife.
Regel über allem: **NICHT neu bauen, was schon existiert** (Suitability-Engine, Readiness-Dashboard, Share-Modal sind fertig).

Reihenfolge:
1. Bugfixes + PDF + Fehlerfeedback
2. Playwright Smoke Tests
3. Pitch-Geometrie 105×68 + ein Renderer
4. Matchday-Pack-Status + kompakte Liste
5. Player Focus-View + Unsicher-Feedback
6. Later: Learning / AI / Mobile Quick-Edit

---

## Prompt 0 — Orientierung (einmal vorab einfügen)

```
Kontext: SETPIECE ist ein pnpm-Monorepo. Frontend: artifacts/setpiece (React 19, Vite, React-Konva, Zustand, wouter, Tailwind). Backend: artifacts/api-server (Express, Drizzle/Postgres). Shared: lib/db (Schema), lib/api-spec (OpenAPI + Orval).

Wichtige Regel für alle folgenden Tasks: NICHT neu bauen, was schon existiert. Bereits fertig und nur wiederzuverwenden:
- Rollen-Suitability-Engine: artifacts/api-server/src/lib/roleSuitability.ts (9 Rollenklassen, Scoring, Alternativen)
- MatchdayAssistant: artifacts/setpiece/src/components/MatchdayAssistant.tsx
- Readiness-Dashboard: artifacts/setpiece/src/pages/Readiness.tsx (Filter + PDF-Export)
- Share-Modal mit Team/Selected + Ablaufdaten: in artifacts/setpiece/src/pages/MatchdayDetail.tsx

Arbeite Phase für Phase, ich schicke die Tasks einzeln. Mach pro Task einen sauberen Commit.
```

---

## Prompt 1 — Bugfixes + PDF-Stabilität + Fehlerfeedback

```
Drei kleine, hochwirksame Fixes in artifacts/setpiece.

1) EDITOR-KLICK-SPRUNG-BUG
Datei: artifacts/setpiece/src/pages/SetPieceEditor.tsx, Funktion handlePitchClick (~Z. 302–317).
Problem: Im Select-Modus mit aktiver Rolle (activeTool === 'select' && activeRoleId) bewegt ein Klick auf das LEERE Feld die ausgewählte Rolle an die Klickposition.
Fix: Ein Klick aufs leere Feld im Select-Modus darf NUR die Auswahl aufheben, NIEMALS eine Rolle bewegen. Rollen werden ausschließlich per Drag-&-Drop verschoben (bestehende handleRoleDragEnd-Logik bleibt). Entferne den positions-verändernden updateRole-Call aus dem Select-Pfad.
Akzeptanz: Rolle auswählen → leeres Feld klicken → Marker bewegt sich nicht, Auswahl ist weg. Drag verschiebt weiterhin.

2) PDF-EXPORT IM SETPIECE-EDITOR ABSICHERN
Datei: artifacts/setpiece/src/pages/SetPieceEditor.tsx, handleExportPDF (~Z. 458–638).
Problem: kein try/catch, kein Loading-State, kein Fehler-Feedback → kann ohne Rückmeldung „hängen".
Fix: Übernimm exakt das Muster aus MatchdayDetail.tsx (handleExportMatchPack): ein exportingPDF-State, try/catch/finally, Button disabled während Export, Loader2-Spinner, Erfolgs-Toast („PDF wurde generiert"), Fehler-Toast bei catch.

3) GENERISCHES FEHLERFEEDBACK ERSETZEN
In SetPieceEditor.tsx setzen mehrere catch-Blöcke nur setSaveState('error') ohne sichtbare Meldung. Ergänze für die Nutzeraktionen (Step hinzufügen, Rolle speichern/verschieben) konkrete Toast-Meldungen statt stillem error-State bzw. statt des generischen „Something went wrong" der ErrorBoundary.
Akzeptanz: Jeder fehlschlagende Nutzer-Trigger zeigt eine konkrete, verständliche Meldung.

Nutze die im Projekt vorhandene Toast-Komponente. Keine neuen Libs.
```

---

## Prompt 2 — Playwright Smoke Tests

```
Es gibt aktuell KEINE automatisierten Tests. Richte Playwright in artifacts/setpiece ein (devDependency, playwright.config, npm-Script "test:e2e") und schreibe NUR Smoke-Tests (Happy Path), keine Edge-Cases.

Abzudeckende Flows:
1) Editor-Drag-Verhalten: Rolle auswählen, leeres Feld klicken → Position unverändert; Rolle draggen → Position ändert sich. (Regression zu Prompt 1, Bug 1)
2) PDF-Export: Im SetPiece-Editor und in der Matchday-Ansicht „Export PDF" klicken → Loading erscheint, kein Hänger, Download/Erfolgs-Feedback.
3) Share-Link: Matchday-Share-Modal öffnen, Team-Link generieren → QR + URL erscheinen.
4) Player-PWA: Share-Link/Player-Route öffnen → Aufgaben-/Set-Piece-Liste lädt, Detailansicht öffnet sich per Klick.

Wenn ein Login/Seed nötig ist, nutze vorhandene Dev-Seeds oder dokumentiere die nötigen Test-Fixtures. Ziel: grüne Smoke-Suite, die genau die fragilen Stellen absichert.
```

---

## Prompt 3 — Pitch-Geometrie 105×68 + EIN Renderer

```
Ziel: Eine einzige, maßstabsgetreue Pitch-Geometrie als Fundament. Aktuell wird der Platz an 4 Stellen mit abweichender, NICHT maßstabsgetreuer Mathematik gezeichnet:
- artifacts/setpiece/src/components/editor/PremiumPitch.tsx
- artifacts/setpiece/src/components/editor/OffensiveCornerPitch.tsx
- artifacts/setpiece/src/utils/offscreenPitchRenderer.ts (PDF/Print)
- artifacts/setpiece/src/components/Pitch.tsx (SVG-Thumbnail)

1) NEUE DATEI artifacts/setpiece/src/utils/pitchGeometry.ts
Definiere offizielle FIFA-Masse in Metern als Single Source of Truth:
- Feld 105 × 68
- Strafraum 16.5 tief × 40.32 breit
- Torraum 5.5 tief × 18.32 breit
- Torbreite 7.32, Elfmeterpunkt 11, Strafraumbogen-Radius 9.15
- Mittelkreis-Radius 9.15, Eckbogen 1
Exportiere eine Funktion, die Meter → Pixel mappt anhand von: Viewport-Größe, Orientierung (volles Feld / halbes Feld), Angriffsrichtung. Liefert berechnete Linien/Kreise/Punkte zurück (geometrie-only, keine Farben).

2) ALLE 4 RENDERER auf pitchGeometry.ts umstellen.
- Editor (Konva) und PDF (offscreen) und Thumbnail (SVG) konsumieren dieselbe Geometrie.
- Print-spezifische Farb-Tunings (PRINT_PITCH etc.) dürfen bleiben — aber NUR Farben, nicht die Geometrie.
- Korrigiere dabei die bisherige Strafraum-Tiefe (war ~18 % statt korrekt ~24 % der Feldbreite).

Akzeptanz: Dasselbe Set Piece sieht in Editor, PDF und Thumbnail mit identischen, maßstabsgetreuen Proportionen aus. Keine doppelte Geometrie-Mathematik mehr im Code. Playwright-Smoke (Prompt 2) bleibt grün.
```

---

## Prompt 4 — Matchday-Pack-Status + kompakte Liste

```
Datei: artifacts/setpiece/src/pages/MatchdayDetail.tsx. NICHT die vorhandene Suitability/Assistant-Logik oder das Share-Modal anfassen — nur Darstellung/Status.

1) COMPLETENESS-STATUS (oben auf der Seite):
Fortschrittsbalken über die 5 Schritte des Packs: Squad gewählt, Set Pieces hinzugefügt, Rollen zugewiesen, Player Pack geteilt, Readiness. Zeige Gesamt-Prozent + welche Schritte offen sind (z. B. „2 Rollen offen").

2) KOMPAKTE SET-PIECE-LISTE:
Ersetze die großen 16:9-Cards durch eine kompakte Listen-Zeile pro Set Piece mit: Name, Typ-Badge (Off/Def), zugewiesene Rollen als „8/10", Readiness-Indikator, Problem-Hinweis (z. B. „2 fehlen"). Kleines Pitch-Thumbnail (nutzt den Renderer aus Prompt 3) statt großem Platzhalter. Edit/Delete als kompakte Icon-Buttons.

Akzeptanz: Der Coach sieht auf einen Blick, wie weit das Pack ist und was noch fehlt — Ziel „10-Minuten-Matchday-Pack". Keine Doppelung bestehender Funktionen.
```

---

## Prompt 5 — Player Focus-View + „Unsicher?"-Feedback

```
Datei: artifacts/setpiece/src/pages/PlayerPWA.tsx. Vorhandene Screens (Identify → Overview → Detail), Acknowledge + Quiz + Progress bleiben.

1) „MEINE ROLLE FOKUSSIEREN":
In der Detail-/Pitch-Ansicht ein Button, der auf den eigenen Spieler-Marker + dessen Laufweg zoomt/pannt (Pinch-Zoom & Drag erhalten). Nutzt die Geometrie/Renderer aus Prompt 3.

2) „UNSICHER?"-FEEDBACK:
Neben „Verstanden/Acknowledge" ein „Unsicher?"-Button. Klick setzt den Readiness-Status des Spielers für dieses Set Piece auf needs_review (vorhandenes Enum in lib/db .../playerReadiness). Dieses Signal erscheint automatisch im bestehenden Readiness-Dashboard — dort NICHTS neu bauen.

Akzeptanz: Spieler kann seine Rolle isoliert betrachten und „unsicher" melden; der Coach sieht „needs_review" im vorhandenen Dashboard.
```

---

## Prompt 6 — Backlog (erst nach Marktreife)

```
Später, nachfrage-validiert — noch NICHT umsetzen:
- Coach-Learning: System merkt akzeptierte/abgelehnte Assistant-Vorschläge pro Spieler (erweitert die bestehende roleSuitability-Engine, ersetzt sie nicht).
- Mobile Quick-Edit für Coach (Rollen tauschen/Spieler ersetzen am Spieltag).
- i18n DE/EN, Set-Piece-Library-Filter/Suche, nativer CSV-Export, Club-Pitch-Settings.
Bewusst NICHT geplant: automatische Gegner-Analyse-AI.
```
