# SETPIECE-Mediathek in Google Cloud Storage

Stand 25.11.2026. Entscheid Vince: Videoszenen liegen in unserem eigenen Speicher statt auf YouTube. Damit gibt es keine Sperren durch YouTube, und die Mediathek (Clips plus Vorlagen) gehört uns. Weitere Quellen wie Wyscout oder InStat kommen über den gleichen Weg dazu.

## So funktioniert es

- Clips liegen als MP4 im Bucket `setpiece-mediathek` (Region Zürich, `europe-west6`).
- Jede Datei ist über ihren Link lesbar, der Bucket lässt sich aber nicht auflisten. Dateinamen enthalten einen Inhalts-Hash, Clips sind darum unveränderlich und dürfen lange im Cache liegen.
- Die App spielt die Dateien direkt im Browser ab, mit Start, Ende und Schleife. YouTube und Vimeo bleiben zusätzlich möglich.
- Hochladen macht das Schnittskript `scripts/clips/schneiden.mjs --upload gs://setpiece-mediathek/clips`. Es schreibt `media.json` mit den fertigen Einträgen für die Vorlagen.

## Einmalige Einrichtung (Vince, in der Google Cloud Shell)

In der Cloud Console oben rechts die Cloud Shell öffnen, Projekt wählen, dann:

```sh
PROJECT=$(gcloud config get-value project)
BUCKET=setpiece-mediathek   # falls vergeben: anderen Namen wählen und Claude mitteilen

# 1. Bucket in Zürich, einheitliche Rechte
gcloud storage buckets create gs://$BUCKET --location=europe-west6 --uniform-bucket-level-access --no-public-access-prevention

# 2. Lesen per Link für alle, ohne Auflisten (legacyObjectReader statt objectViewer)
gcloud storage buckets add-iam-policy-binding gs://$BUCKET --member=allUsers --role=roles/storage.legacyObjectReader

# 3. Eigenes Dienstkonto nur zum Hochladen in diesen Bucket
gcloud iam service-accounts create setpiece-clips --display-name="SETPIECE Clip-Upload"
gcloud storage buckets add-iam-policy-binding gs://$BUCKET \
  --member=serviceAccount:setpiece-clips@$PROJECT.iam.gserviceaccount.com --role=roles/storage.objectAdmin

# 4. Schlüssel erzeugen und als eine Zeile (base64) ausgeben
gcloud iam service-accounts keys create key.json --iam-account=setpiece-clips@$PROJECT.iam.gserviceaccount.com
base64 -w0 key.json; echo; rm key.json
```

Die ausgegebene Zeile **nicht in den Chat kopieren**. Sie gehört als Umgebungsvariable `GCS_CLIPS_KEY` in die Einstellungen der Claude-Code-Umgebung (Menü der Cloud-Umgebung in der Titelleiste der Sitzung, dann Bearbeiten). Eine neue Sitzung übernimmt sie.

Das Dienstkonto darf nur in diesen einen Bucket schreiben. Wer die Variable sieht, kann dort Dateien hochladen oder löschen, aber nichts anderes im Projekt.

## In der App (Replit)

Damit Trainer im Editor Links aus der Mediathek einfügen können, in der Replit-Umgebung des API-Servers setzen:

```
MEDIA_LIBRARY_BASE_URLS=https://storage.googleapis.com/setpiece-mediathek/
```

Für die Vorlagen der Bibliothek ist das nicht nötig, die kommen über `scripts/src/template-library.ts`.

## Vorlagen als Admin bearbeiten

Vince (und weitere Admins) zeichnen Vorlagen im normalen Editor und veröffentlichen sie für alle Teams:

1. In Replit für den API-Server (Deployment und Entwicklung) die Variable `PLATFORM_ADMIN_EMAILS` setzen, mehrere Adressen mit Komma, zum Beispiel `name@firma.ch`. Es zählt nur ein Konto mit **bestätigter** E-Mail; die Prüfung läuft auf dem Server. Ohne die Variable gibt es keine Admins.
2. In SETPIECE einen Standard aus der Bibliothek übernehmen und im Editor verbessern (Laufwege, Pässe, Gegner, Schritte, Videoszenen).
3. Im Editor oben auf **Vorlage** klicken, «Ersetzen: …» oder «Neue Vorlage anlegen» wählen, speichern. Alle Teams sehen die Vorlage sofort. Bereits angelegte Standards der Teams ändern sich nicht.
4. Eine so gespeicherte Vorlage trägt die Markierung `editedByAdminAt`. Das Bibliotheksskript (`template-library`) überspringt sie künftig und überschreibt sie nicht.

Wer das Original aus dem Code zurückhaben will, löscht die Markierung nicht von Hand, sondern fragt Claude.

Die Einschätzung einer Vorlage (Vor- und Nachteile, Niveau, «passt gegen», Quellen) liegt in der Spalte `profile` und kommt aus `scripts/src/library-profiles.ts`. «Ersetzen» im Editor lässt sie unberührt; eine neu angelegte Vorlage hat keine und erscheint dann nicht bei den Filtern auf Niveau, Gegner, Junioren und Kopfball. Eine Vorlage, die schon vor dem ersten `template-library --apply` mit der Spalte im Editor bearbeitet wurde, wird vom Skript übersprungen und bekommt die Einschätzung nicht.

## Anmelden in einer Sitzung

```sh
echo "$GCS_CLIPS_KEY" | base64 -d > "$SCRATCH/gcs-key.json"
gcloud auth activate-service-account --key-file="$SCRATCH/gcs-key.json"
rm "$SCRATCH/gcs-key.json"
```

In der Cloud-Umgebung setzt `CLOUDSDK_AUTH_ACCESS_TOKEN` die Anmeldung ausser Kraft (Fehler 401). Bei eigenen `gcloud`-Aufrufen `env -u CLOUDSDK_AUTH_ACCESS_TOKEN gcloud …` verwenden; das Schnittskript tut das selbst. Das Dienstkonto hat nur Objektrechte, `buckets describe` schlägt deshalb fehl; mit `gcloud storage ls` prüfen.

## Kosten

Speicher in Zürich etwa USD 0.02–0.03 pro GB und Monat; ein Clip hat 5–10 MB. Abrufe aus dem Internet kosten etwa USD 0.12 pro GB. 100 Clips, jeder 1000 Mal angesehen, sind rund 750 GB, also etwa USD 90 im Monat. Bei mehr Nutzung ein CDN davorschalten oder Clips kleiner rechnen.
