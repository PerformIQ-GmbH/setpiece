# Videoszenen: Zuordnung zu Vorlagen

Stand 25.11.2026. Ausgewertet Bild für Bild (1–2 Bilder pro Sekunde), ohne Ton. Vereine, Spiele und Daten stammen aus den Einblendungen im Video; wo keine Einblendung war, steht «laut Bild».

Zum Hochladen auf den SETPIECE-Kanal (nicht gelistet): Den Ausschnitt mit den Zeitstempeln schneiden, hochladen, Link mit Start und Ende an Claude schicken. Der Clip wird dann an die Vorlage gehängt.

## Short «Top 5 Set Piece Drills That Paid Off Perfectly» (Osman Footy, 55 s)

| Zeit | Szene | Vorlage |
|---|---|---|
| 0:00–0:09 | AFC Bournemouth bei Newcastle: kurze Ecke, Flanke vom Strafraumeck, Kopfball (gleiche Szene wie Premier League Nr. 7) | `kurze-ecke-neuer-winkel` |
| 0:10–0:22 | VfL Bochum bei Dynamo Dresden (laut Bild): fünf Spieler eingehakt in einer Kette, lösen sich beim Anlauf, Tor am langen Pfosten | `kette-loest-sich-auf` (neu) |
| 0:23–0:35 | Everton gegen Southampton: Freistoss flach in den Lauf, flache Hereingabe, Tor | `freistoss-flach-in-den-lauf` (neu) |
| 0:36–0:48 | Niederlande gegen Argentinien, WM 2022: Pass ans Ende der Mauer, Weghorst trifft zum 2:2 | `mauer-ende-anspiel` (neu) |
| 0:48–0:55 | AFC Bournemouth bei Aston Villa: angetippte Ecke (gleiche Szene wie Premier League Nr. 1) | `ecke-angetippt-dribbling` (neu) |

## Premier League «Ten of the Best» (offizielles Video, 4:53)

| Nr. | Zeit | Szene (laut Einblendung) | Vorlage |
|---|---|---|---|
| 10 | 0:24–0:47 | Trent Alexander-Arnold, Liverpool bei Chelsea, 22.09.2019: Salah legt seitlich ab, direkter Freistoss | `seitlich-anlegen-direkt` (neu) |
| 9 | 0:50–1:20 | Raúl Jiménez, Wolverhampton bei AFC Bournemouth, 23.11.2019: schnell ausgeführter Freistoss | `schneller-freistoss` (neu) |
| 8 | 1:24–1:48 | Marcus Rashford, Manchester United gegen Leicester, 24.09.2016 | nicht übernommen: Ablauf im Video nicht eindeutig erkennbar |
| 7 | 1:52–2:12 | Harry Wilson, AFC Bournemouth bei Newcastle, 09.11.2019: kurze Ecke | `kurze-ecke-neuer-winkel` |
| 6 | 2:14–2:38 | Paul Scholes, Manchester United bei Bradford City, 25.03.2000: Ecke an den Strafraumrand, Volley | `ecke-strafraumrand-volley` (neu) |
| 5 | 2:40–2:59 | Anthony Martial, Manchester United gegen Manchester City, 08.03.2020: Chip hinter die hohe Linie | `chip-hinter-die-linie` (neu) |
| 4 | 3:06–3:27 | David Jones, Wolverhampton gegen Stoke, 14.08.2010: Anspiel an die Mauer, Schuss | `mauer-ende-anspiel` (zweites Vorbild) |
| 3 | 3:28–3:52 | Theo Walcott, Everton gegen Southampton, 18.08.2018 (gleiche Szene wie im Short) | `freistoss-flach-in-den-lauf` |
| 2 | 3:56–4:08 | Matthew Le Tissier, Southampton gegen Wimbledon, 26.02.1994 | nicht übernommen: Einzelkönnen (Ball hochgespielt und volley), keine Teamvariante |
| 1 | 4:12–4:45 | Steve Cook, AFC Bournemouth bei Aston Villa, 09.04.2016: angetippte Ecke, Dribbling an der Torlinie | `ecke-angetippt-dribbling` |

## Hinweise

- Positionen in den neuen Vorlagen sind aus dem Bild geschätzt, nicht vermessen. In der App nachjustieren, falls nötig.
- Rechte: Das Premier-League-Video und der Osman-Footy-Short gehören Dritten. Laut Vince liegen Rechte für die Nutzung vor; vor dem Hochladen pro Szene festhalten, für welche Nutzung (App, organische Posts, bezahlte Werbung).

## Mediathek-Links (hochgeladen 26.11.2026)

10 fertig geschnittene Clips ohne Ton, `gs://setpiece-mediathek/clips/`, Link ohne Anmeldung abrufbar (200, video/mp4). In `scripts/src/template-library.ts` als `media` eingetragen; in die App kommen sie erst mit dem Bibliotheksskript.

| Vorlage | Szene | Link |
|---|---|---|
| `seitlich-anlegen-direkt` | Liverpool bei Chelsea · 22.09.2019 | https://storage.googleapis.com/setpiece-mediathek/clips/01-seitlich-anlegen-direkt-d60554f080.mp4 |
| `schneller-freistoss` | Wolverhampton bei Bournemouth · 23.11.2019 | https://storage.googleapis.com/setpiece-mediathek/clips/02-schneller-freistoss-e586ceb647.mp4 |
| `kurze-ecke-neuer-winkel` | Bournemouth bei Newcastle · 09.11.2019 | https://storage.googleapis.com/setpiece-mediathek/clips/03-kurze-ecke-neuer-winkel-92ed56ddfc.mp4 |
| `ecke-strafraumrand-volley` | Bradford City gegen Manchester United · 25.03.2000 | https://storage.googleapis.com/setpiece-mediathek/clips/04-ecke-strafraumrand-volley-d6835d584a.mp4 |
| `chip-hinter-die-linie` | Manchester United gegen Manchester City · 08.03.2020 | https://storage.googleapis.com/setpiece-mediathek/clips/05-chip-hinter-die-linie-2cf2082885.mp4 |
| `mauer-ende-anspiel` | Wolverhampton gegen Stoke · 14.08.2010 | https://storage.googleapis.com/setpiece-mediathek/clips/06-mauer-ende-anspiel-96257e7108.mp4 |
| `mauer-ende-anspiel` | Niederlande gegen Argentinien · WM 2022 | https://storage.googleapis.com/setpiece-mediathek/clips/10-mauer-ende-anspiel-70a2351239.mp4 |
| `freistoss-flach-in-den-lauf` | Everton gegen Southampton · 18.08.2018 | https://storage.googleapis.com/setpiece-mediathek/clips/07-freistoss-flach-in-den-lauf-56817b8bf6.mp4 |
| `ecke-angetippt-dribbling` | Aston Villa gegen Bournemouth · 09.04.2016 | https://storage.googleapis.com/setpiece-mediathek/clips/08-ecke-angetippt-dribbling-1687798d1b.mp4 |
| `kette-loest-sich-auf` | Dynamo Dresden gegen VfL Bochum | https://storage.googleapis.com/setpiece-mediathek/clips/09-kette-loest-sich-auf-3b1bca0b70.mp4 |
