# Vorlagen aus Trainings- und Spielclips (27.11.2026)

Zehn Vorlagen (Nr. 31 bis 40) und Ergänzungen an sieben bestehenden. Quelle sind acht vom Gründer bereitgestellte Clips, nur als Einzelbilder ausgewertet. Die Clips liegen nicht im Repo; Vereins- und Personennamen stehen hier nicht. Alle Abläufe sind Trainingsvorschläge, nicht vermessen. Einschätzung in `library-profiles.ts`: Basis «KI-Einschätzung», keine Quellen.

Koordinaten wie in `library-specs.ts` (Prozent der Spielfeldhälfte, x über 68 m, y ab Torlinie über 52,5 m). Einwurf- und Anstoss-Vorlagen liegen auf dem ganzen Feld (y über 105 m, Tor oben, Mittellinie bei y = 50).

| Nr. | slug | Kategorie | Clip |
|---|---|---|---|
| 31 | corner-man-free-run | Ecke rechts, Angriff | «Corner vs Manndeckung-2» (10 s) |
| 32 | corner-man-cross-run | Ecke links, Angriff | «Corner vs Manndeckung-5» (17 s) |
| 33 | corner-mixed-zone-gap | Ecke rechts, Angriff | «Corner vs Mischdeckung-1» (11 s) |
| 34 | corner-short-feint | Ecke links, Angriff | «Corner OFF-2 kurz Antäuschung» (17 s, Jubelszene am Anfang ausgenommen) |
| 35 | corner-def-mixed | Ecke links, Abwehr | «Corner vs Mischdeckung-1», Sicht der Verteidiger |
| 36 | freistoss-zwei-am-ball-fluegel | Direkter Freistoss rechts | «Out OFF Verlagerung Flügel 1v1 u Freistoss ESP» (118 s, Freistossszenen); Kurzpass nicht belegt |
| 37 | corner-edge-cluster | Ecke rechts, Angriff | «Straight off the Training Ground», Ecke bei ca. 3:28 bis 3:35; sehr unsicher |
| 38 | corner-short-edge-cross | Ecke rechts, Angriff | «Straight off the Training Ground», Ecke bei ca. 5:01 bis 5:08 |
| 39 | kickoff-outside-runner | Einwurf angreifend (Anstoss) | «Effective Kick off routine», 0:04 bis 0:20 (auch 0:44 bis 0:58, 1:00 bis 1:11) |
| 40 | kickoff-inside-run | Einwurf angreifend (Anstoss) | «Effective Kick off routine», 0:29 bis 0:41 |

Ergänzt (nur `coachingNote`: Gegnerbild und Rückmeldung nach dem Training): near-post-flick, back-post-bomb, sturmlauf-kurzer-pfosten, kurze-ecke-neuer-winkel, ecke-angetippt-dribbling, ecke-strafraumrand-volley, zonal-wall. Zusätzlich vier Gegnerpositionen so verschoben, dass die Mauer mindestens 9,15 m vom Ball steht: wall-buster, training-ground-special, quick-wide-play, freistoss-aussen-weglocken.

**Anstoss:** Das Datenmodell hat keine Anstoss-Kategorie (Enum in `lib/db`, Filter und Beschriftung nutzen sie). Beide Vorlagen liegen deshalb in `attacking_throw_in`, das einzige Feld mit ganzem Spielfeld, und erscheinen unter «Einwurf». Gegner stehen in ihrer Hälfte und mindestens 9,15 m vom Ball. Eine eigene Kategorie braucht Enum-Migration und Oberfläche.

**Nicht übernommen:** Nr. 4 (Welle zum ersten Pfosten) und Nr. 15 (Verlagerung und zweite Flanke) des alten Katalogs: Nr. 4 wurde auf sturmlauf-kurzer-pfosten abgebildet (Annahme), Nr. 15 hat kein Gegenstück in main.

Geprüft in `scripts/tests/library-data.test.mjs`: Abstände der Markierungen, Läufe ohne Umwege und mit Anschluss an den nächsten Schritt, Pässe ab Ballhalter bis Spieler oder Tor, Mauer, Anstoss-Regeln, eindeutige slugs und Titel.
