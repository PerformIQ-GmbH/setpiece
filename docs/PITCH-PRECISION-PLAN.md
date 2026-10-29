# Plan: präzise Spielfeldlinien in allen SETPIECE-Ansichten

Stand: 29.10.2026. Prüfstand SETPIECE: `3158ff8`. Status: Korrektur im Arbeitsbranch implementiert und lokal geprüft; **noch kein neuer Live-Release**. Die ursprünglichen Befunde unten dokumentieren den Ausgangsstand.

## Auftrag und Entscheidung

Vince: „Das Spielfeld ist nicht perfekt. Kontrolliere es überall dass die Linien perfekt sind. Auf performiq github gibt es das trainingsstudio. Vielleicht kannst dort was übernehmen. Mache einen plan. Nutze auch die skills von performiq gmbh.“

Empfehlung: das vorhandene Geometriemodul korrigieren und sämtliche Verbraucher auf denselben Feld-/Viewport-Vertrag bringen. Keine neue Zeichenbibliothek und kein kompletter Import des Trainingsstudios. Ein Meter erhält auf beiden Achsen denselben Massstab. Das innere Spielfeld wird proportional eingepasst; freier Platz bleibt ausserhalb der Feldgrenzen. A4, Handycontainer und Präsentationsfenster bestimmen die verfügbare Fläche, nicht die Feldproportionen.

105 × 68 m bleibt der bestehende SETPIECE-Referenzplatz, keine Behauptung einer für alle Wettbewerbe zwingenden Feldgrösse. Markierungen nach [IFAB Law 1](https://www.theifab.com/laws/latest/the-field-of-play/): Strafraumtiefe16.5m, Torraum5.5m, Elfmeterpunkt11m, Mittelkreis/Strafraumbogen9.15m Radius, Eckbogen1m, Torbreite7.32m. Einheitliche sichtbare Linienstärke; keine zusätzliche Tortenstückkante oder ausgefüllte Bogenfläche. Darstellungsbedingte Mindeststrichstärke auf kleinen Displays separat vom metrischen Modell behandeln.

## Belegte Fehler

| Befund | Quelle | Auswirkung |
| --- | --- | --- |
| Unterschiedliche Längs-/Quer-Skalierung, aber Kreisradius nur aus Breite | `src/utils/pitchGeometry.ts:175–190,231–239` | Bogenanschluss stimmt nur bei passendem Innenfeldverhältnis. Direkt mit der aktuellen Funktion reproduziert:400×500px,10pxRand,Halbfeld: Strafraumkante y160.857, Bogenende y141.307; Differenz19.550px. Ganzfeld gleicher Grösse:5.592px. |
| Wechselnde Feldproportionen | `PlayerBoardViewer.tsx:87–98`, `offscreenPitchRenderer.ts:35–37`, `PresentationMode.tsx:38`, `DemoSetPieceViewer.tsx:75` | Spieleransicht4:5, PDF1400×990 und andere Editor-/Demorechtecke bilden denselben Standard unterschiedlich ab. |
| Einrastpunkte verwenden falsche feste Prozente | `editor/snapUtils.ts:9–30` | Strafstosspunkt y12 statt10.476 im Ganzfeld bzw.20.952 im Halbfeld; Pfosten x43.5/56.5 statt44.618/55.382; Strafraumkante x32/68 statt20.353/79.647. |
| Vorschau-Linien und Marker haben andere Innenränder | `components/Pitch.tsx:60–63,114–115` | Linien2..98, Marker0..100: ein Marker auf dem Eckpunkt liegt ausserhalb der Feldlinie. Zusätzlich `preserveAspectRatio="none"`. |
| Quiz benutzt ein eigenes Feld und eine unpassende Klickumrechnung | `pages/PlayerQuiz.tsx:252–267` | Quadratische viewBox im2:3Container wird mittig eingepasst, Antworten beziehen sich aber auf den ganzen Container. Darstellungs- und Antwortpunkt weichen voneinander ab. |
| Modusauswahl widerspricht sich | `GhostMode.tsx:207,219`, `MatchdayDetail.tsx:782` | Ghost sucht `freekick` statt `free_kick`; Spieltag erzwingt Halbformat. `attackDirection` ist nur im Geometriemodul vorhanden und kein durchgängiges Produktmerkmal. |

Pfade in dieser Tabelle relativ zu `artifacts/setpiece/`; für Komponenten und Utils gilt der Unterordner `src/`. Die Werte sind Quellcode-/Rechenbefunde. Keine erneute vollständige Browser-, PDF- oder Videoabnahme behauptet: der Browserzugriff war in dieser Prüfung nicht verfügbar. Die vorliegenden Screenshots ersetzen diese spätere Abnahme nicht.

## Was aus dem Trainingsstudio übernommen werden kann

Das Trainingsstudio ist ein Modul in **zinna10/performiq**, kein eigenes gefundenes Repo namens Trainingsstudio. Referenzstand `c903ab21dd670188a6cccf4d3f30c4be286d4c1a`.

| Quelle | Sinnvolle Übernahme | Grenze |
| --- | --- | --- |
| `shared/pitchGeometry.ts` | Gemeinsame metrische Konstanten und reine testbare Hilfsfunktionen | Enthält hauptsächlich Raster-/Sichtbarkeitslogik; ersetzt SETPIECE-Bögen und komplette Feldgeometrie nicht. |
| `client/src/features/training-studio/TrainingStudio.tsx:402–418,2281` | Gleicher Pixel-pro-Meter-Wert auf beiden Achsen; Feld und Objekte gemeinsam transformieren, Pointer invers abbilden | Die dortige Mindestskalierung2px/m nicht pauschal übernehmen: sehr kleine Flächen müssen vollständig passen. |
| `client/src/features/training-studio/sceneSvg.tsx:271–319,355–375` | SVG-viewBox in Metern, gemeinsamer Ausschnitt und Clipping für Markierungen/Objekte | Geprüfter Feldblock enthält keine vollständigen Strafraum-/Eckbögen; deshalb keine1:1-Übernahme als fertiges SETPIECE-Feld. |
| `server/services/exercisePdf.tsx:300–329,360–373` | PDF passt Feld proportional in den verfügbaren A4-Bereich ein | PDF-Seitenformat und Feldformat getrennt halten. |
| `server/__tests__/pitchGeometry.test.ts` | Numerische Tests für Symmetrie, echte Markierungen und Grenzen | Rastertests um Bogenanschlüsse, Darstellungsadapter und Klick-Roundtrips ergänzen. |

Referenz: [Trainingsstudio-Quellcode](https://github.com/zinna10/performiq/tree/c903ab21dd670188a6cccf4d3f30c4be286d4c1a/client/src/features/training-studio), [Geometrie](https://github.com/zinna10/performiq/blob/c903ab21dd670188a6cccf4d3f30c4be286d4c1a/shared/pitchGeometry.ts). Quellcode geprüft, Trainingsstudio nicht live visuell abgenommen.

## Umsetzung in vier Schritten

1. **Referenzfälle und Datenvertrag festhalten.** Je einen fiktiven Standard für Ganzfeld, Halb/Freistoss und Ecke mit Markern auf Eckpunkt, Pfosten, Elfmeterpunkt und Strafraumkante anlegen. Aktuelle0–100-Koordinaten bleiben gespeichert. Adapter dokumentieren, auf welches sichtbare Feld diese Werte je bestehendem Modus bezogen sind; keine automatische Umdeutung vorhandener Standards. Kategorie→Feldmodus zentral auflösen. Richtungsunterstützung nur konsistent weiterreichen, soweit tatsächlich vorhanden; keinen neuen Umschalter als Nebenarbeit bauen.
2. **Geometrie und Koordinaten gemeinsam korrigieren.** Metergeometrie mit analytisch berechneten offenen Bögen erzeugen; einheitlichen Fit-/Offset-Transform und inverse Umrechnung bereitstellen. Linien, Marker, Wege, Zonen, Raster und Snap-Anker verwenden denselben Innenfeldrahmen. Der Halbplatz ist ein Ausschnitt des Referenzfelds und kein gestrecktes Ganzfeld. Sichtbare Mittellinie/Kreisanteile aus dem Ausschnitt ableiten; Schnittkante nicht mit einer erfundenen Spielfeldmarkierung verwechseln. Torraum hinter der Torlinie reservieren und Linien nicht am Canvasrand abschneiden.
3. **Alle aktiven Oberflächen umstellen.** Zuerst Editor und Spieleransicht, dann Demo/Präsentation/Ghost/Miniaturen, anschliessend Quiz und Export. SVG und Canvas dürfen verschiedene Zeichenprimitive benutzen, aber keine eigenen Feldmasse oder Prozentformeln. PDF bleibt A4 und übernimmt das eingepasste Referenzfeld; Video übernimmt nur das bereits korrekt gerenderte Feld. Die Quizantwort wird aus der tatsächlichen Feldtransformation invers berechnet; Klicks ausserhalb des Felds ignorieren. Bestehende serverseitige Zielzonen-/Antwortsemantik mitprüfen.
4. **Mathematisch und visuell abnehmen.** Geometrietests, Koordinaten-Roundtrips, gezielte Quiz-Eingabeprüfung und eine Vergleichsmatrix aus Screenshots/Exporten. Danach Typecheck, vorhandene Regressionen, Build, unabhängiges Review und Replit-Vorschau. Erst nach belegter Abnahme Veröffentlichung im gesondert autorisierten Releaseablauf.

## Abnahmematrix „überall“

| Ansicht | Renderweg | Benötigter Nachweis |
| --- | --- | --- |
| Trainereditor | EditorCanvas→PremiumPitch/OffensiveCornerPitch | Ganz/Halb/Ecke; Referenzmarker, Snap, Zoom und Drag stimmen |
| Präsentation | EditorCanvas im Präsentationsrechteck | Vollbild und Fensterwechsel ohne Verziehen |
| Demoeditor | DemoSetPieceViewer→EditorCanvas | Gleiche Referenzgeometrie wie Trainereditor |
| Spieler/PWA und öffentliche Produktdemo | PlayerBoardViewer | Handy hoch/quer, keine verzogenen Bögen oder abgeschnittenen Tore |
| Ghost | Pitch-SVG | Gleicher Modus und identische Marker vor/nach Wechsel |
| Spieltag-Miniatur | Pitch-SVG | Kategoriebezogener Ausschnitt; Linien und Marker deckungsgleich |
| Spielerquiz | bisher eigenes SVG | Zielpunkt entspricht dargestelltem und gespeichertem Punkt, auch mit Innenrändern |
| PDF Editor und Spieltag | offscreenPitchRenderer | A4quer, vollständige Linien/Tore und gleiche Referenzpositionen |
| Video | Live-Canvas-Kopie | Geometrie wie im geprüften Editor, keine Verzerrung beim Export |

`KonvaPitch.tsx` enthält eine weitere alte Prozentgeometrie, aber im geprüften `src/` keine Aufrufstelle. Als ungenutzt dokumentieren; nicht unnötig als zusätzliche aktive Oberfläche umbauen.

Numerische Abnahme: Bogenenden treffen die Strafraumkante im Modell mit Toleranz1e-6; gleiche Meter-Skalierung beider Achsen; Spiegelung oben/unten stimmt. Prozent→Pixel→Prozent erhält synthetische Referenzpunkte innerhalb1e-6, ohne Rundung der gespeicherten Daten. Screenshotvergleich mit gleichem Referenzfall bei375,768 und1440px sowie Geräte-Pixelverhältnis1/2: keine sichtbare Lücke/Doppellinie, Kreis bleibt rund, Linienstärken wirken konsistent. Beim Export dürfen sich nur Ausgabegrösse und Lesbarkeitsanpassungen unterscheiden. Layoutfreie Ränder dürfen keine Spieler- oder Quizposition verschieben.

## Rollen, Skills und Grenzen

PerformIQ-Regeln gelesen: Company-OS AGENTS und AI_DELIVERY_WORKFLOW sowie Produkt-AGENTS. Auswahl nach dessen Routing: investigate für Ursache/Reproduktion; Impeccable für begrenzte technische Oberflächenprüfung; Ponytail für minimale spätere Korrektur. Bestehendes Modul und Tests zuerst. Kein Vollgraph ohne vorhandenen brauchbaren Graph, keine pauschale Skillinstallation. Die im Produkt-AGENTS genannten optionalen `.local/skills/performiq-*` sind im geprüften versionierten Baum und in den geprüften lokalen Codex-/Agents-Skillverzeichnissen nicht vorhanden; ihre Durchführung wird nicht behauptet.

Alex: Integration und Plan. Unabhängiger Fachreview: Renderwege/Koordinaten geprüft, obige Fehler bestätigt. Für die Umsetzung Mia: Geometrie und Verbraucher; Leo: numerische/visuelle Abnahme. Keine automatisch laufende Agentenkette.

Keine Produktcodeänderung, Datenmigration, Replit-Agentenausgabe, Veröffentlichung oder Änderung am PerformIQ-Trainingsstudio in diesem Planauftrag. Wichtigster Schutz: vorhandene Standards und gespeicherte Spielerpositionen müssen trotz neuer Darstellung fachlich an derselben Stelle bleiben. Falsche bisherige Snap-Punkte nicht rückwirkend automatisch verschieben.

**Nächster konkreter Schritt:** die drei synthetischen Referenzfälle und einen fehlschlagenden Regressionstest für den belegten Bogenanschluss erstellen; danach den gemeinsamen Fit-/Koordinatenadapter umsetzen.


## Umsetzungsbeleg · 29.10.2026

- Einheitlicher Fit/Koordinatenadapter, metrische Snap-Anker, echte Halbmittelkreise, offene Umrisse ohne doppelte Torlinie und konsistente Kategorien umgesetzt. Editor, Player, SVG, Quiz und Druckrenderer nutzen denselben Feldrahmen; Democanvas-Sonderverhältnis entfernt. Persistierte Prozentwerte nicht geändert.
- 65/65 Node-Regressionen grün: darunter13 Geometrietests,4 SVG-/Quiztests und2 Renderer-/Snaptests. Vorheriger19.55px-Bogenfehler wurde zunächst rot reproduziert. Unabhängiges Review fand reale Kategorievarianten als Blocker; Resolver korrigiert und sämtliche12 DB-Kategorien plus Demokategorie explizit getestet. Keine weiteren belegten Blocker im geprüften Diff.
- Workspace-Typecheck und Gesamtbuild grün; abschliessender Frontendbuild nach letzter Exportkorrektur ebenfalls Exit0. Bestehende Bundlegrössen-/Sourcemapwarnungen bleiben sichtbar; keine Warnungen unterdrückt. Ein bisheriger SW-Test war nach dem vorausgegangenen Logo-Cacheversionswechsel veraltet; Fixture prüft jetzt korrekt das Entfernen vonv3 und Bewahren vonv4.
- Browser: Referenzpositionen auf Editor/Player/SVG und tatsächlichem Druckbild verglichen; Ganzfeld und Ecke geprüft. SVG-Klick an25%/50% lieferte24.97/50.002 (Mauspixelrundung), Player-Zoom und Reset erfolgreich. Mobiler Demoeditor bei375px geprüft; Tablet768px und Desktop1440px in der Vergleichsrunde. Videoexport erzeugte80'411Bytes. Druckbild aus dem tatsächlichen Offscreen-PDF-Renderer geprüft; kein separater vollständiger Spieltag-PDF-Dokumentlauf behauptet.
- Neue manuelle Fixture `artifacts/setpiece/tests/pitch-proof.html`: Vite-Dev-URL `/tests/pitch-proof.html`, ausschliesslich fiktive Referenzpunkte; keine Backend-/Datenbankverbindung nötig. Diese zusätzliche HTML-Datei ist kein Production-Entrypoint. Referenz-Screenshots liegen im separaten Auditordner unter27–30.
- Delegierte Modelle: GPT-6.1 Sol mit high für Geometrie, Canvas und unabhängigen Review; medium für klar begrenzte SVG-/Quizarbeit. Keine Änderung der Root-Modelleinstellung behauptet. Keine kostenpflichtige Replit-Agentensitzung gestartet; bestehende Hosting-/Compute-Kosten sind damit nicht als null verifiziert. CHF80 bleiben die genehmigte Gesamtobergrenze.

Keine echten Mobilgeräte/Touch-Gesten oder realen Spieler-/Quizdaten für die Abnahme verwendet. Betrieb und Veröffentlichung bleiben getrennte Schritte.
