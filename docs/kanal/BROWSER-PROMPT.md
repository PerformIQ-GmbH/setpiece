# Browser-Prompt: Kanal einrichten und Clips hochladen

Für Claude in Chrome auf deinem Computer. Vorher den Ordner `setpiece-videos` (Zip entpacken) unter `Downloads` ablegen und in Chrome bei YouTube mit dem Google-Konto anmelden, dem der Kanal gehören soll. Den Text unten in Claude in Chrome einfügen.

---

```
Aufgabe: YouTube-Kanal für SETPIECE einrichten und 10 Videos NICHT GELISTET hochladen.
Alle Angaben stehen in ~/Downloads/setpiece-videos/: KANAL.md (Kanal), upload-liste.md (pro Video Titel, Beschreibung, Playlist), clips/ (Videos), kanal/ (Profilbild, Banner).

Regeln:
- Sichtbarkeit IMMER «Nicht gelistet». Nie «Öffentlich». Nie «Planen».
- «Nein, nicht speziell für Kinder» wählen.
- Keine anderen Kanaleinstellungen, keine Monetarisierung, keine Werbung, keine Zahlungen.
- Bei Anmeldung, Passwort, Zwei-Faktor, Telefonbestätigung oder Captcha: anhalten und mich machen lassen.
- Bei einem Urheberrechtshinweis, einer Sperre oder einem Content-ID-Anspruch in YouTube Studio: nichts anfechten, nur notieren.
- Wenn etwas anders aussieht als beschrieben: anhalten und fragen, nicht raten.

Schritt 1, Kanal:
1. Prüfe auf youtube.com, ob für dieses Konto schon ein Kanal «SETPIECE by PerformIQ» existiert. Wenn ja, diesen verwenden und weiter mit Schritt 2.
2. Sonst: Profilbild oben rechts > Kanal erstellen. Name «SETPIECE by PerformIQ». Handle: das erste freie aus KANAL.md.
3. YouTube Studio > Anpassung: Profilbild kanal/avatar.png, Banner kanal/banner.png, Beschreibung und Link aus KANAL.md. Veröffentlichen.

Schritt 2, Playlists:
Lege in YouTube Studio > Playlists die fünf Playlists aus KANAL.md an, jeweils «Nicht gelistet», mit der Beschreibung aus der Tabelle. Bereits vorhandene nicht doppelt anlegen.

Schritt 3, Uploads (einzeln, in der Reihenfolge von upload-liste.md):
Für jeden Abschnitt «## NN · datei.mp4»:
1. YouTube Studio > Erstellen > Videos hochladen > clips/datei.mp4.
2. Titel und Beschreibung exakt aus dem Abschnitt kopieren.
3. Playlist aus dem Abschnitt wählen.
4. «Nein, nicht speziell für Kinder».
5. Weiter bis «Sichtbarkeit»: «Nicht gelistet». Speichern.
6. Den Videolink notieren (https://youtu.be/…).

Schritt 4, Ergebnis:
Gib mir am Ende eine Tabelle: Nummer | Datei | YouTube-Link | Hinweise (z. B. Urheberrechtsprüfung, Sperre, Fehler). Diese Tabelle schicke ich an Claude Code, damit die Szenen an die SETPIECE-Vorlagen gehängt werden.
```

---

Danach: Die Tabelle an Claude (SETPIECE-Sitzung) schicken. Claude trägt die Links mit Start 0 in die Vorlagen ein (`scripts/src/template-library.ts`, Feld `media`).
