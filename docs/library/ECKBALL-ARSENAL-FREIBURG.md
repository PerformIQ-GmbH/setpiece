# Eckball-Referenzen Arsenal und Freiburg: Quellenprüfung und Analyse

Stand 25.11.2026. Grundlage: Gemini-Report «Taktische Detailanalyse: Moderne Eckball-Systeme (2025/26)» von Vince. Jede Zahl wurde gegen den Originalartikel geprüft. Nur geprüfte Aussagen dürfen in Vorlagen, Reels oder Ads.

## Quellenprüfung

| Aussage im Report | Ergebnis | Beleg |
|---|---|---|
| Arsenal: Rekord bei Eckballtoren in einer Premier-League-Saison | **Bestätigt.** 17 Tore (Stand 25.04.2026, alter Rekord 16), 18 Tore (Stand 20.05.2026) | [The Analyst, O. Hopkins, 25.04.2026](https://theanalyst.com/articles/arsenal-most-goals-from-corners-premier-league-season-record); [Premier League, A. Clarke, 20.05.2026](https://www.premierleague.com/en/news/4662597/arsenal) |
| Arsenal: 24 Tore aus ruhenden Bällen, Liga-Bestwert; 14 Eckballtore zum 1:0 | **Bestätigt** | Premier League, 20.05.2026 |
| Arsenal: Schützen Rice (8 Tore nach seinen Inswingern) und Saka (6 Tore) | **Bestätigt** | Premier League, 20.05.2026 |
| Arsenal: viele Spieler laufen vom langen an den kurzen Pfosten («near-post rush») | **Bestätigt** | Premier League, 20.05.2026: «several players running from the back post towards the front» |
| Arsenal: Eze-Tor nach kurzer Ecke | **Bestätigt** | The Analyst, 25.04.2026 |
| Arsenal: Torschützen nach Ecken Timber (3), Gabriel, Merino, Zubimendi (je 2) | **Bestätigt** (Stand April) | The Analyst |
| Arsenal: «Goalkeeper-Pinning», «Chaos Zone», «Dead-Ball Pressing», Edge-of-Box-Invasion, Basketball-Screens | **Nicht belegt.** In den geprüften Artikeln nicht gefunden; Guardian-/Coach-Board-Quellen im Report ohne Link | – |
| Arsenal: Nicolas Jover als Standardtrainer 2025/26 | **Nicht geprüft** für 2025/26 (in den gelesenen Artikeln nicht genannt) | – |
| Freiburg: 84 % zum Tor drehende Ecken, Bundesliga-Höchstwert | **Bestätigt**, aber «etwa 7 % vor dem nächsten Bundesligisten», nicht «7 Punkte über Liga-Schnitt» | [Tactical Football Analysis, O. Phillips, 17.05.2026](https://tacticalfootballanalysis.com/julian-schuster-tactics-freiburg-2025-2026-set-piece-analysis/) |
| Freiburg: 0,72 xG pro 10 Ecken, bester Wert der Top-5-Ligen | **Bestätigt** (zweiter: Crystal Palace 0,63) | Tactical Football Analysis |
| Freiburg: Schützen Grifo (links), Günter und Beste (rechts) | **Bestätigt** | Tactical Football Analysis |
| Freiburg: Ablenkung, dann zweite Gruppe an die Fünfmeterlinie, dann später Läufer Eggestein, gegen Köln, Tor | **Bestätigt** (xG des Kopfballs 0,15). Der Begriff «3-Wellen-Prinzip» stammt aus dem Report, nicht aus der Quelle | Tactical Football Analysis (Rest hinter Bezahlschranke) |
| Freiburg: Flick-On an den langen Pfosten als eigene Routine | **Teilweise.** Quelle sagt nur, viele Schüsse kämen am langen Pfosten aus Verlängerungen | Tactical Football Analysis |

Die Seite arsenal.com «27 great stats» war nicht erreichbar (503) und ist nicht ausgewertet.

## Übernommene Vorlagen

In `scripts/src/template-library.ts`, jeweils mit Vorbild und Steckbrief in der Beschreibung:

| Schlüssel | Titel | Herkunft | Niveau | Gegen |
|---|---|---|---|---|
| `sturmlauf-kurzer-pfosten` | Sturmlauf auf den kurzen Pfosten | Arsenal (belegter near-post rush, Rice-Inswinger) | mittel | Raumdeckung |
| `drei-wellen` | Drei Wellen gegen gemischte Deckung | Freiburg gegen Köln (belegt) | anspruchsvoll | gemischte Deckung |
| `kurze-ecke-neuer-winkel` | Kurze Ecke, neuer Flankenwinkel | Arsenal (Eze-Tor nach kurzer Ecke) | einfach | tiefe Abwehr, Manndeckung |

Der Spieler vor dem Torhüter ist im Sturmlauf als allgemein übliche Rolle enthalten, nicht als belegtes Arsenal-Detail. Alle Blockrollen tragen den Hinweis «regelkonform, ohne Halten».

Nicht als eigene Vorlage übernommen:
- **Edge-of-Box-Invasion** und **Basketball-Screens:** im Original nicht belegt. Wieder aufnehmen, sobald ein Video die Abläufe zeigt.
- **Inswinger mit Verlängerung an den langen Pfosten (Freiburg):** deckt sich mit der bestehenden Vorlage «Verlängerung am kurzen Pfosten». Bei Bedarf dort die Freiburg-Szene anhängen.

## Analyse für Amateurtrainer

- **Am leichtesten übertragbar** ist die kurze Ecke: wenig Spieler, kein Kopfballspezialist, wirkt durch Überraschung.
- **Der Sturmlauf** braucht einen Schützen, der scharf zum Tor dreht, und einen Spieler mit Kopfballstärke. Für Junioren oft zu hoch; dann flacher an den kurzen Pfosten spielen.
- **Die drei Wellen** sind die stärkste Idee gegen gemischte Deckung und brauchen keine überlegene Physis, aber 7 Spieler im Strafraum und mehrere Trainingseinheiten für das Timing. Für Amateure mit zwei statt drei Ablenkungsläufern starten.
- **Gemeinsamer Kern beider Vorbilder:** zum Tor drehende Hereingaben in den Fünfmeterraum, Läufe mit Anlauf statt aus dem Stand, ein Spieler sichert den Rückraum. Das gehört als Grundregel in jede Eckball-Vorlage.
- **Lücken der Bibliothek:** Es gibt keine Abwehrvariante gegen genau diese Muster (Sturmlauf an den kurzen Pfosten, Wellen). Ebenso fehlen Varianten für den Kinderfussball mit kleinem Feld.

## Was Vince noch liefern kann

Pro Vorlage ein Clip vom SETPIECE-Kanal (nicht gelistet), mit Start- und Endzeit:
1. Sturmlauf: eine Rice-Ecke mit Lauf vom langen an den kurzen Pfosten.
2. Drei Wellen: Freiburg gegen Köln, Kopfballtor Eggestein.
3. Kurze Ecke: Eze-Tor nach kurzer Ecke.

Der YouTube-Short aus dem Report (`youtube.com/shorts/O7zhMjEQ5iM`) ist ein fremdes Analysevideo, dessen Inhalt nicht geprüft ist. Er ist nicht als Szene hinterlegt.
