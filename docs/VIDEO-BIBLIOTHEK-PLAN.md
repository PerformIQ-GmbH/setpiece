# Plan: Videos zu Standards und kuratierte Vorlagen-Bibliothek

Stand 24.11.2026 · Auftrag Vince (Sprachnachricht) · Status: Plan, nichts umgesetzt

## Ziel

Ein Trainer, auch im Amateurbereich, findet eine funktionierende Eckballvariante, sieht sie als Animation **und** als echte Videoszene, übernimmt sie mit wenigen Klicks für sein Team und verteilt sie an die Spieler. Die Bibliothek ist der Hauptnutzen: Beispiele, die funktionieren, statt leeres Blatt.

## Ausgangslage im Code

- 10 Vorlagen in `artifacts/api-server/src/lib/seedTemplates.ts`, Texte auf Englisch.
- Tabelle `set_piece_templates`: Titel, Kategorie, Beschreibung, `boardData`, `defaultRoles`, `coachingNote`, `previewImageUrl`. Kein Feld für Videos.
- `seedTemplates()` schreibt nur, wenn die Tabelle **leer** ist. Neue Vorlagen erreichen die Produktion so nie. Das muss vor dem Ausbau der Bibliothek geändert werden (Upsert über stabilen Schlüssel).
- Es gibt **keinen Dateispeicher**. Vorschaubilder sind nur URLs. Der Editor kann die Animation bereits als Video exportieren (`videoExport.ts`, für WhatsApp).
- Rollenvorschläge (`roleSuitability.ts`) existieren und lassen sich für «Vorlage aufs eigene Team anwenden» nutzen.

## Phase 1: Videoszenen per Link (klein, kein Speicher)

Trainer und Bibliothek hängen Videos als **Link mit Start- und Endzeit** an (YouTube, Vimeo, eigener Link). Kein Upload, keine Speicherkosten, keine Datenschutzfrage zu gespeicherten Spieleraufnahmen.

- Datenmodell: neues Feld `media` (jsonb-Liste) auf `set_piece_templates` und `set_pieces`:
  `{ kind: "youtube" | "vimeo" | "link", url, startSec, endSec, title, source, rightsNote }`.
- Editor/Detailseite: Abschnitt «Videos» mit «Video hinzufügen» (URL einfügen, Start/Ende per «ab hier»/«bis hier» setzen). Mehrere Clips pro Standard, z. B. «Referenz Profi», «Unser Training», «Spiel vom 12.10.».
- Anzeige: Animation und Clip nebeneinander (Desktop) bzw. untereinander mit Umschalter (Handy). YouTube über `youtube-nocookie.com`, Clip läuft in Schleife von Start bis Ende.
- Spieleransicht (`PlayerBoardViewer`, QR-Link): Clip erscheint unter der Animation. Spieler verstehen den Laufweg schneller, wenn sie ihn einmal echt gesehen haben.
- Beim Übernehmen einer Vorlage werden ihre Clips mitkopiert; eigene kommen dazu.
- Validierung serverseitig: nur `https`, erlaubte Hosts, Zeiten ≥ 0 und Ende > Start, maximal z. B. 5 Clips.

Abnahme: Trainer fügt einen YouTube-Ausschnitt 0:42–0:55 an seine Variante, Spieler sieht über QR-Link genau diesen Ausschnitt in Schleife, auf 390 px Breite bedienbar. Regressionstest für Validierung und Teamzugriff.

## Phase 2: Vorlagen für Amateurtrainer sofort nutzbar

Die Vorlagen sind heute technisch, englisch und ohne Entscheidungshilfe. Vorschläge:

1. **Deutsch** (später IT/FR) für alle Vorlagentexte.
2. **Steckbrief pro Vorlage**: Niveau (einfach/mittel/anspruchsvoll), benötigte Spieler im Strafraum, «braucht einen starken Kopfballspieler: ja/nein», funktioniert gegen Raumdeckung / Manndeckung, Trainingszeit bis sitzt (z. B. 2 × 15 Min.).
3. **Filter und Assistent** auf der Vorlagenseite: «Mein Gegner verteidigt im Raum, ich habe keinen grossen Kopfballspieler» → passende Varianten zuerst.
4. **«Für mein Team übernehmen» in 3 Schritten**: Vorlage wählen → Rollen werden mit `roleSuitability` automatisch passenden Spielern vorgeschlagen → bestätigen und QR teilen.
5. **Warum es funktioniert / wann nicht**: zwei bis drei Sätze, plus häufigster Fehler («Läufer startet zu früh»).
6. **Trainingsübung zur Variante**: eine kurze Übungsform, wie man sie einschleift. Das fehlt Amateurtrainern am meisten.
7. **Codewort/Handzeichen** als Feld, damit Varianten im Spiel angesagt werden können.
8. **Sammlungen**: «Starter-Paket Eckball (3 Varianten)», «Gegen grosse Gegner», «Junioren C». Tabelle `setPieceCollections` gibt es schon.

Abnahme: Ein Testtrainer ohne Vorwissen hat in unter 3 Minuten eine Variante übernommen, Rollen zugewiesen und den Spielerlink geteilt (fiktive Daten).

## Phase 3: Bibliothek mit deinem Material füllen (Arbeitsablauf mit Claude)

So fütterst du die Bibliothek, ohne dass zuerst Software gebaut werden muss:

1. Du legst pro Variante einen Ordner an, z. B. `library-intake/eckball-kurz-rueckpass/` mit
   - Videoszene(n) oder Link + Zeitstempel,
   - ein paar Stichworten oder einer Sprachnotiz («Kurz ausgeführt, Rückpass an den Strafraumrand, zweiter Ball…»).
2. Ich schaue das Video an (Einzelbilder + Ton), baue die Variante nach: Startpositionen, Laufwege, Ballweg, Rollen mit Coaching-Punkten, Steckbrief, Trainingsübung.
3. Ergebnis ist eine Vorlagendatei im Repo (z. B. `library/corners/<schluessel>.json`), dazu ein Vorschaubild. Du prüfst in der Demo, gibst frei, dann geht sie per Upsert in die Produktion.

Wichtig: Die Videodateien selbst gehören **nicht** ins Git-Repo (Grösse, Rechte). Ordner `library-intake/` bleibt ausserhalb von Git oder in `.gitignore`; im Repo landet nur die nachgebaute Vorlage.

**Rechte**: TV-Bilder aus Bundesliga, Champions League usw. dürfen wir nicht selbst hosten oder als SETPIECE-Inhalt zeigen. Erlaubt sind: eigene Aufnahmen, Material mit Erlaubnis, oder ein Link auf die offizielle Quelle (z. B. Vereins-/Ligakanal auf YouTube) mit Zeitstempel. Die nachgebaute Animation ist unsere eigene Darstellung und unproblematisch. Bei Aufnahmen mit erkennbaren Amateur- oder Juniorenspielern braucht es deren Einverständnis.

## Phase 4: MCP-Server (wie bei PerformIQ)

Zwei verschiedene Nutzen, bewusst getrennt:

- **Für dich (Kuratieren):** Für den Start reicht Phase 3 mit mir in Claude Code. Ein eigener MCP-Server dafür wäre Aufwand plus Sicherheitsfläche (Schreibrechte auf die globale Bibliothek) für einen einzigen Nutzer. Empfehlung: erst bauen, wenn der Ablauf aus Phase 3 trägt und mehr als eine Person kuratiert.
- **Für Trainer (Produktfunktion):** «Claude, hier ist ein Clip, bau mir die Variante für mein Team» oder «Gib mir drei Eckballvarianten gegen Raumdeckung ohne grossen Kopfballspieler». Das ist ein echtes Verkaufsargument und folgt dem PerformIQ-Muster: OAuth mit PKCE, Freigabe pro Person und Team, Entwürfe erst nach Bestätigung des Trainers sichtbar, Trennen jederzeit.
  Werkzeuge: `search_templates`, `get_template`, `create_set_piece_draft`, `attach_video_clip`, `assign_roles`. Alle mit serverseitiger Team-/Rollenprüfung.

## Phase 5 (optional): eigene Video-Uploads

Erst wenn Links nicht reichen (z. B. Trainer filmt das eigene Training mit dem Handy). Braucht Objektspeicher (Replit Object Storage o. ä.), Grössenlimit, Ablauf/Löschung, Zugriff nur fürs eigene Team, Hinweis zur Einwilligung. Laufende Kosten → Entscheid Vince. Kopplung an Abo-Stufe denkbar (`entitlements.ts`).

## Reihenfolge und Grösse

| Schritt | Inhalt | Grösse |
|---|---|---|
| 0 | Seed auf Upsert umstellen, Vorlagen ins Deutsche | klein |
| 1 | Video-Links mit Start/Ende, Spieleransicht | mittel |
| 2 | Steckbrief, Filter, «Für mein Team übernehmen», Übung, Sammlungen | mittel |
| 3 | Intake-Ordner + erste 10–15 Varianten aus deinem Material | laufend |
| 4 | MCP für Trainer | gross |
| 5 | Eigene Uploads | gross, Kosten |

## Entscheide für Vince

1. Startet Phase 1 nur mit Links (Empfehlung) oder sofort mit Uploads?
2. Rechteregel für Bibliotheksvideos: nur eigenes Material und offizielle Links (Empfehlung)?
3. Dürfen Trainer später eigene Varianten mit der Community teilen (braucht Moderation)?
4. Wo legst du das Rohmaterial ab (Google Drive, lokaler Ordner, den du in die Sitzung lädst)?
