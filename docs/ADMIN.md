# Admin-Bereich

Kennzahlen-Dashboard und Benutzerverwaltung für Plattform-Admins. Stand: implementiert und mit gemockter API im Browser geprüft; nicht gemergt, nicht deployed, nicht gegen eine echte Datenbank geprüft.

## Wo finde ich den Admin-Bereich?

Unter `/admin` (zum Beispiel `https://setpiece.performiq.ch/admin`). Im Menü erscheint der Punkt «Admin» (Schild-Symbol, unter «Einstellungen»; auf dem Handy im Menü oben rechts). Er wird nur Admins angezeigt. Die Berechtigung prüft der Server bei jeder Anfrage selbst; das Menü ist nur eine Anzeige.

Der Bereich erscheint nur, wenn **alle** Bedingungen erfüllt sind:

1. Anmeldung mit dem Konto `admin@performiq.ch`.
2. Die E-Mail-Adresse dieses Kontos ist bestätigt.
3. In Replit steht für den API-Server (Deployment und Entwicklung) die Variable `PLATFORM_ADMIN_EMAILS` mit dieser Adresse (mehrere Adressen mit Komma getrennt). Ohne Variable gibt es keine Admins und alle Adminrouten antworten 403.
4. Die App ist nach dem Setzen der Variable neu deployt.
5. Die Migration `lib/db/migrations/20261127_complimentary_access.sql` ist angewandt (nach Backup, siehe DEPLOYMENT). Ohne sie funktionieren Kennzahlen und Teamabfragen weiter, aber Benutzersuche und Gratiszugang melden Fehler.

Antwort bei fehlender Berechtigung: nicht angemeldet 401, sonst 403.

## Kennzahlen (Tab «Kennzahlen»)

Alle Werte sind reine Zahlen aus der Datenbank, ohne Namen, E-Mail-Adressen oder Codes. Bereiche, die nicht berechnet werden können, zeigen einen Hinweis; der Rest bleibt sichtbar.

| Kennzahl | Bedeutung |
|---|---|
| Benutzer gesamt / E-Mail bestätigt | Zeilen in `users`; bestätigt = `email_verified` |
| Neu, 7 / 30 Tage | `users.created_at` in den letzten 7 / 30 Tagen |
| Neue Benutzer pro Woche | Letzte 12 Wochen, Woche ab Montag (UTC), leere Wochen = 0 |
| Teams gesamt | Zeilen in `teams` |
| Tarif «Abo» | Gespeicherter Tarif (`teams.tier`: free, solo_coach, team) |
| Tarif «Wirksam» | Was das Team nutzen darf: Abo, bei freien Teams aktiver Pilot (Solo Coach), dazu ein aktiver Gratiszugang, sofern höher |
| Aktiv, 30 Tage | Teams mit bearbeitetem Standard, bearbeitetem Spieltag, Ereignis im Audit-Protokoll oder abgeschlossenem/angelegtem Quiz-Versuch in 30 Tagen (`updated_at` / `created_at`) |
| Bezahlte Abos | Teams mit `stripe_subscription_status` aktiv oder trialing. Das ist der in der App gespeicherte Stand, keine Abfrage bei Stripe |
| Pilot / Gratis aktiv | Teams mit aktivem Pilotzugang / aktivem Gratiszugang |
| Spieler | Zeilen in `players` |
| Standards | Gesamt; veröffentlicht = Status `ready` oder `active_matchday`; ausserdem Entwurf und archiviert |
| Spieltage | Gesamt und neu in 30 Tagen |
| Quiz-Antworten, 30 Tage | Abgeschlossene Quiz-Versuche (`completed_at`), davon bestanden, Zahl verschiedener Spieler, sowie gesamt |
| Pilotcodes eingelöst / offen | Aus `pilot_access` (fünf Plätze) |
| Offene Einladungen | `team_invites` nicht widerrufen, nicht abgelaufen, Nutzungsgrenze nicht erreicht |

Bewusst weggelassen:

- **MRR / Umsatz:** nicht belegbar ohne verlässliche Preiszuordnung; die Stripe-Tabellen werden nicht abgefragt.
- **Teams mit Gratis-Solo über `SETPIECE_COMPLIMENTARY_SOLO_EMAILS`:** zählen im wirksamen Tarif nicht mit, da dafür die Besitzer-E-Mails verknüpft werden müssten.
- **Aktive Benutzer:** es gibt keinen Zeitstempel der letzten Anmeldung.

## Benutzerverwaltung (Tab «Benutzer»)

- Suche nach Name oder E-Mail (20 Treffer pro Seite). Die Benutzerliste ist nur hier und nur nach Suche sichtbar.
- Je Benutzer: Teams, Rolle, regulärer und wirksamer Tarif, Pilot, Gratiszugang.
- Gratiszugang vergeben, ändern oder widerrufen (Solo Coach oder Team; 30, 90, 365 Tage oder unbefristet; Grund Pflicht, 3 bis 500 Zeichen). Ein Gratiszugang hebt nur über den regulären Tarif, senkt nie einen bezahlten.
- Jede Änderung wird mit Admin, Team, Tarif, Ablauf, Grund und Zeit in `complimentary_access_events` protokolliert, in derselben Transaktion wie die Änderung. In der Oberfläche wird das Protokoll noch nicht angezeigt (Abfrage per SQL).
