// Curated template library. Each entry is keyed by a stable slug; the sync
// updates existing rows by slug and inserts new ones, so edits here reach the
// production library without duplicates. Run only after the migration
// lib/db/migrations/20261125_template_library_media.sql:
//   pnpm --filter @workspace/scripts template-library            (dry run)
//   pnpm --filter @workspace/scripts template-library -- --apply (writes)
import { db, setPieceTemplatesTable, type InsertSetPieceTemplate } from "@workspace/db";

type Entry = Omit<InsertSetPieceTemplate, "slug"> & { slug: string };

export const LIBRARY: Entry[] = [
  {
    slug: "near-post-flick",
    title: "Verlängerung am kurzen Pfosten",
    category: "offensive_corner_left",
    description: "Scharfer Eckball an den kurzen Pfosten. Ein kopfballstarker Spieler verlängert den Ball in Richtung langer Pfosten, wo die Läufer ankommen.",
    coachingNote: "Die Hereingabe muss schnell und flach an den kurzen Pfosten kommen. Entscheidend ist das Timing der Läufe.",
    defaultRoles: [
      { name: "Schütze", description: "Tritt den Eckball", coachingPoint: "Schnell und flach an den kurzen Pfosten", startPosition: { x: 0, y: 0 } },
      { name: "Verlängerer", description: "Erster Kontakt am kurzen Pfosten", coachingPoint: "Ball mit dem Kopf streifen, Richtung langer Pfosten", startPosition: { x: 35, y: 25 } },
      { name: "Ziel langer Pfosten", description: "Kommt am langen Pfosten an", coachingPoint: "Lauf so timen, dass du mit der Verlängerung ankommst", startPosition: { x: 60, y: 15 } },
      { name: "Strafraumrand", description: "Besetzt den Strafraumrand", coachingPoint: "Auf Abpraller und zweite Bälle lauern", startPosition: { x: 40, y: 45 } },
      { name: "Kurze Option", description: "Bietet sich für die kurze Variante an", coachingPoint: "Nur auf Zeichen, sonst Ablenkung", startPosition: { x: 10, y: 5 } },
    ],
  },
  {
    slug: "back-post-bomb",
    title: "Hoch an den langen Pfosten",
    category: "offensive_corner_left",
    description: "Hohe Hereingabe an den langen Pfosten. Der grösste Angreifer startet aus der Tiefe, Ablenkungsläufer räumen den Raum frei.",
    coachingNote: "Der Ball MUSS an den langen Pfosten. Die Ablenkungsläufer ziehen im richtigen Moment weg.",
    defaultRoles: [
      { name: "Schütze", description: "Hoher Eckball an den langen Pfosten", coachingPoint: "Hoch und lang stehend an den langen Pfosten", startPosition: { x: 0, y: 0 } },
      { name: "Zielspieler", description: "Kopfball am langen Pfosten", coachingPoint: "Aus der Tiefe kommen, entschlossen köpfen", startPosition: { x: 65, y: 25 } },
      { name: "Ablenkung kurz", description: "Räumt den Raum frei", coachingPoint: "Gegenspieler früh wegziehen", startPosition: { x: 35, y: 20 } },
      { name: "Ablenkung Mitte", description: "Ablenkungslauf zentral", coachingPoint: "Anlaufen, dann abdrehen", startPosition: { x: 45, y: 22 } },
      { name: "Nachsetzer", description: "Geht auf den Abpraller", coachingPoint: "Richtung des Kopfballs vorausahnen", startPosition: { x: 50, y: 35 } },
    ],
  },
  {
    slug: "far-post-overload",
    title: "Überzahl am langen Pfosten",
    category: "offensive_corner_right",
    description: "Drei Angreifer laufen gestaffelt an den langen Pfosten. Das bringt Unruhe in die Abwehr.",
    coachingNote: "Läufe staffeln: Der erste zieht seinen Gegenspieler weg, der zweite greift den Raum an, der dritte sichert Abpraller.",
    defaultRoles: [
      { name: "Schütze", description: "Tritt den Eckball", coachingPoint: "Vom Tor wegdrehend in die Zone am langen Pfosten", startPosition: { x: 100, y: 0 } },
      { name: "Erster Läufer", description: "Führt den Lauf an den langen Pfosten", coachingPoint: "Gegenspieler mitziehen, Raum schaffen", startPosition: { x: 55, y: 30 } },
      { name: "Zweiter Läufer", description: "Greift den Raum an", coachingPoint: "In die Lücke stossen, die der erste Läufer öffnet", startPosition: { x: 50, y: 25 } },
      { name: "Dritter Läufer", description: "Sichert Abpraller", coachingPoint: "Spät ankommen und Abpraller verwerten", startPosition: { x: 45, y: 35 } },
      { name: "Blocker", description: "Steht vor dem Torhüter", coachingPoint: "Regelkonform stehen und Position halten", startPosition: { x: 40, y: 20 } },
    ],
  },
  {
    slug: "zonal-wall",
    title: "Raumdeckung",
    category: "defensive_corner_left",
    description: "Verteidigung im Raum: Spieler decken Zonen statt Gegenspieler. Reihenfolge: erster Kontakt, kurzer Pfosten, langer Pfosten, Strafraumrand.",
    coachingNote: "Deine Zone gehört dir. Kommt der Ball hinein, gehst du entschlossen hin.",
    defaultRoles: [
      { name: "Kurzer Pfosten", description: "Deckt die Zone am kurzen Pfosten", coachingPoint: "Am kurzen Pfosten kommt nichts vorbei", startPosition: { x: 30, y: 20 } },
      { name: "Zone Mitte 1", description: "Zentrale Abwehrzone", coachingPoint: "Entschlossen klären, hoch und breit köpfen", startPosition: { x: 40, y: 20 } },
      { name: "Zone Mitte 2", description: "Zweite zentrale Zone", coachingPoint: "Hinter Zone 1 absichern", startPosition: { x: 50, y: 20 } },
      { name: "Langer Pfosten", description: "Zone am langen Pfosten", coachingPoint: "Alles klären, was an den langen Pfosten kommt", startPosition: { x: 60, y: 20 } },
      { name: "Strafraumrand", description: "Klärt am Strafraumrand", coachingPoint: "Zweite Bälle klären, Schüsse verhindern", startPosition: { x: 45, y: 40 } },
    ],
  },
  {
    slug: "man-mark-press",
    title: "Manndeckung",
    category: "defensive_corner_right",
    description: "Verteidigung in Manndeckung: Jeder Spieler hat einen festen Gegenspieler. Der Torhüter beherrscht den Fünfmeterraum.",
    coachingNote: "Eng am Mann bleiben. Mit dem Gegenspieler gehen, nicht mit dem Ball. Im Fünfmeterraum ruft der Torhüter.",
    defaultRoles: [
      { name: "Manndecker 1", description: "Deckt den grössten Angreifer", coachingPoint: "Torseitig bleiben, Körper einsetzen", startPosition: { x: 35, y: 20 } },
      { name: "Manndecker 2", description: "Deckt das zweite Ziel", coachingPoint: "Eng bleiben, nicht abdrehen lassen", startPosition: { x: 45, y: 22 } },
      { name: "Manndecker 3", description: "Deckt den Läufer am Strafraumrand", coachingPoint: "Keinen freien Anlauf zulassen", startPosition: { x: 50, y: 35 } },
      { name: "Kurzer Pfosten", description: "Sichert den kurzen Pfosten", coachingPoint: "Am kurzen Pfosten alles wegköpfen", startPosition: { x: 30, y: 15 } },
      { name: "Konterspieler", description: "Startet nach der Klärung", coachingPoint: "Bei Klärung sofort lossprinten, Konter einleiten", startPosition: { x: 55, y: 50 } },
    ],
  },
  {
    slug: "wall-buster",
    title: "Direkt über die Mauer",
    category: "direct_free_kick_central",
    description: "Direkter Freistoss aus zentraler Position mit Schütze und Täuscher. Die Mauer wird gebunden, der Ball wird angeschnitten.",
    coachingNote: "Der Täuscher läuft über den Ball. Der Schütze zielt mit Effet auf den langen Pfosten.",
    defaultRoles: [
      { name: "Schütze", description: "Schiesst den Freistoss", coachingPoint: "Über oder um die Mauer drehen, langer Pfosten", startPosition: { x: 50, y: 60 } },
      { name: "Täuscher", description: "Läuft über den Ball", coachingPoint: "Glaubhaft anlaufen, als würdest du schiessen", startPosition: { x: 48, y: 60 } },
      { name: "Mauerläufer", description: "Stösst in die Lücke der Mauer", coachingPoint: "Lauf durch jede Lücke in der Mauer timen", startPosition: { x: 45, y: 45 } },
      { name: "Nachsetzer", description: "Geht auf Abpraller", coachingPoint: "Richtung der Parade vorausahnen", startPosition: { x: 55, y: 40 } },
      { name: "Absicherung Strafraumrand", description: "Wartet auf den Rückpass", coachingPoint: "Bereit für einen Rückpass bleiben", startPosition: { x: 40, y: 55 } },
    ],
  },
  {
    slug: "training-ground-special",
    title: "Einstudierter Trick",
    category: "direct_free_kick_central",
    description: "Einstudierte Variante mit verdecktem Pass in die Schussposition. Zwei Täuscher laufen über den Ball, der dritte legt ab.",
    coachingNote: "Das Timing muss im Training sitzen. Die Täuschung funktioniert nur, wenn die Täuscher sie glaubhaft verkaufen.",
    defaultRoles: [
      { name: "Passgeber", description: "Spielt den verdeckten Pass", coachingPoint: "Warten, bis die Täuscher laufen, dann nach rechts ablegen", startPosition: { x: 50, y: 58 } },
      { name: "Täuscher 1", description: "Läuft links über den Ball", coachingPoint: "Überzeugend vorbeisprinten", startPosition: { x: 48, y: 58 } },
      { name: "Täuscher 2", description: "Läuft rechts über den Ball", coachingPoint: "Mit vollem Tempo laufen", startPosition: { x: 52, y: 58 } },
      { name: "Schütze", description: "Nimmt an und schiesst", coachingPoint: "Direkt abschliessen, flach und hart", startPosition: { x: 58, y: 52 } },
      { name: "Nachsetzer", description: "Sichert Abpraller", coachingPoint: "Abpraller von beiden Seiten angreifen", startPosition: { x: 45, y: 40 } },
    ],
  },
  {
    slug: "quick-wide-play",
    title: "Schnell über aussen",
    category: "indirect_free_kick_wide",
    description: "Indirekter Freistoss von der Seite. Schnelles Zusammenspiel, um eine Flanke vorzubereiten.",
    coachingNote: "Tempo ist alles. Der erste Pass kommt sofort, die Flanke früh.",
    defaultRoles: [
      { name: "Ausführender", description: "Spielt den ersten Pass", coachingPoint: "Schneller kurzer Pass auf den Läufer", startPosition: { x: 15, y: 55 } },
      { name: "Flankengeber", description: "Nimmt an und flankt", coachingPoint: "Mit einem Kontakt früh flanken", startPosition: { x: 20, y: 50 } },
      { name: "Kurzer Pfosten", description: "Lauf an den kurzen Pfosten", coachingPoint: "An den kurzen Pfosten sprinten", startPosition: { x: 40, y: 30 } },
      { name: "Langer Pfosten", description: "Lauf an den langen Pfosten", coachingPoint: "Spät am langen Pfosten ankommen", startPosition: { x: 55, y: 25 } },
      { name: "Strafraumrand", description: "Besetzt den Strafraumrand", coachingPoint: "Auf den Rückpass lauern", startPosition: { x: 35, y: 45 } },
    ],
  },
  {
    slug: "long-throw-flick",
    title: "Weiter Einwurf mit Verlängerung",
    category: "attacking_throw_in",
    description: "Weiter Einwurf in den Strafraum, am kurzen Pfosten verlängert. Daraus entsteht ein zweiter Ball in gefährlicher Zone.",
    coachingNote: "Der Werfer zielt auf die Zone am kurzen Pfosten. Alle anderen reagieren auf die Verlängerung.",
    defaultRoles: [
      { name: "Werfer", description: "Führt den weiten Einwurf aus", coachingPoint: "Flache Flugbahn an den kurzen Pfosten", startPosition: { x: 0, y: 30 } },
      { name: "Verlängerer", description: "Verlängert am kurzen Pfosten", coachingPoint: "Ball mit dem Kopf Richtung Tor streifen", startPosition: { x: 25, y: 22 } },
      { name: "Abstauber", description: "Geht auf die Verlängerung", coachingPoint: "Als Erster reagieren", startPosition: { x: 35, y: 18 } },
      { name: "Langer Pfosten", description: "Sichert den langen Pfosten", coachingPoint: "Alles verwerten, was breit wird", startPosition: { x: 45, y: 15 } },
    ],
  },
  {
    slug: "safe-outlet",
    title: "Sicherer Einwurf",
    category: "defensive_throw_in",
    description: "Einwurf in der eigenen Hälfte, um den Ball sicher zu halten. Zwei kurze Anspielstationen und eine lange.",
    coachingNote: "Einfach halten. Zuerst den Ball sichern, dann nach vorne spielen.",
    defaultRoles: [
      { name: "Werfer", description: "Führt den Einwurf aus", coachingPoint: "Schnell auf den nächsten freien Mitspieler", startPosition: { x: 0, y: 70 } },
      { name: "Kurz 1", description: "Nahe Anspielstation", coachingPoint: "Anbieten, unter Druck zurückspielen", startPosition: { x: 10, y: 65 } },
      { name: "Kurz 2", description: "Zweite kurze Anspielstation", coachingPoint: "Bewegen und einen Winkel öffnen", startPosition: { x: 15, y: 72 } },
      { name: "Lang", description: "Ziel für den langen Einwurf", coachingPoint: "Den ersten Ball gewinnen, wenn er lang kommt", startPosition: { x: 30, y: 60 } },
    ],
  },
  // Referenz-Varianten (Analyse 25.11.2026, Quellen in docs/library/ECKBALL-ARSENAL-FREIBURG.md).
  // Koordinaten: Prozent der Spielfeldhälfte, x über 68 m Breite, y ab Torlinie über 52,5 m.
  // Pfosten x 44.6/55.4, Fünfmeterraum bis y 10.5, Elfmeterpunkt y 21, Strafraumgrenze y 31.4.
  {
    slug: "sturmlauf-kurzer-pfosten",
    title: "Sturmlauf auf den kurzen Pfosten",
    category: "offensive_corner_left",
    description: "Scharfer Eckball zum Tor drehend in den Fünfmeterraum. Mehrere Spieler starten am langen Pfosten und stürmen beim Schuss gemeinsam an den kurzen Pfosten, der Zielspieler kommt aus der Tiefe in die Lücke. Vorbild: Arsenal 2025/26 (Premier-League-Rekord mit 18 Eckballtoren). Passt gegen Raumdeckung im Fünfmeterraum. Niveau: mittel, braucht einen kopfballstarken Spieler mit Anlauf.",
    coachingNote: "Niemand startet aus dem Stand: Auslöser ist der Ballkontakt des Schützen. Wer vor dem Torhüter steht, bleibt regelkonform stehen: nicht halten, nicht stossen.",
    defaultRoles: [
      { name: "Schütze", description: "Rechtsfuss, tritt von links", coachingPoint: "Scharf zum Tor drehend an den kurzen Pfosten, Höhe Fünfmeterlinie", startPosition: { x: 0, y: 0 } },
      { name: "Stürmer 1", description: "Startet am langen Pfosten, stürmt an den kurzen Pfosten", coachingPoint: "Beim Ballkontakt los, Gegenspieler mitziehen", startPosition: { x: 58, y: 9 } },
      { name: "Stürmer 2", description: "Startet hinter Stürmer 1, greift die Mitte des Fünfers an", coachingPoint: "Gleiche Startzeit wie Stürmer 1, Zone vor dem Tor füllen", startPosition: { x: 64, y: 12 } },
      { name: "Zielspieler", description: "Kommt im Bogen aus der Tiefe in die Lücke zwischen kurzem Pfosten und Mitte", coachingPoint: "Spät starten, im Bogen laufen, mit Anlauf köpfen, Blick immer zum Ball", startPosition: { x: 58, y: 19 } },
      { name: "Torhüterposten", description: "Steht vor dem Torhüter", coachingPoint: "Position halten, dem Torhüter den Weg nach vorne erschweren, ohne Foul", startPosition: { x: 50, y: 3 } },
      { name: "Langer Pfosten", description: "Wartet auf Verlängerungen und Abpraller", coachingPoint: "Nicht mitlaufen, am langen Pfosten bleiben", startPosition: { x: 64, y: 3 } },
      { name: "Rückraum", description: "Strafraumrand, zweiter Ball und Absicherung", coachingPoint: "Abpraller sofort verwerten oder Ball sichern, Konter verhindern", startPosition: { x: 42, y: 33 } },
    ],
  },
  {
    slug: "drei-wellen",
    title: "Drei Wellen gegen gemischte Deckung",
    category: "offensive_corner_right",
    description: "Zum Tor drehender Eckball in den Fünfmeterraum. Welle 1 läuft als Ablenkung Richtung Schütze, Welle 2 greift die Fünfmeterlinie an und hält die Raumverteidiger fest, Welle 3 kommt spät in die freie Lücke. Vorbild: SC Freiburg 2025/26 gegen den 1. FC Köln (Tor Maximilian Eggestein). Passt gegen gemischte Deckung (Raum und Mann). Niveau: anspruchsvoll, braucht 7 Spieler im Strafraum und viel Timing-Training.",
    coachingNote: "Die Wellen starten nacheinander, nicht gleichzeitig. Welle 3 wartet, bis Welle 2 an der Fünfmeterlinie steht. Mit weniger Spielern: Welle 1 auf zwei Läufer kürzen.",
    defaultRoles: [
      { name: "Schütze", description: "Linksfuss, tritt von rechts", coachingPoint: "Zum Tor drehend in den Fünfmeterraum", startPosition: { x: 100, y: 0 } },
      { name: "Welle 1 A", description: "Startet hinter der Abwehrlinie, Ablenkungslauf Richtung Schütze", coachingPoint: "Beim Anlauf des Schützen lossprinten, Manndecker mitnehmen", startPosition: { x: 46, y: 7 } },
      { name: "Welle 1 B", description: "Ablenkungslauf Richtung Schütze", coachingPoint: "Zusammen mit A starten, Raum vor dem Tor leeren", startPosition: { x: 52, y: 8 } },
      { name: "Welle 1 C", description: "Ablenkungslauf Richtung kurzer Pfosten", coachingPoint: "Zusammen mit A und B starten", startPosition: { x: 58, y: 7 } },
      { name: "Welle 2 A", description: "Greift die Fünfmeterlinie an", coachingPoint: "Gegen den Raumverteidiger laufen und dort stehen bleiben", startPosition: { x: 42, y: 18 } },
      { name: "Welle 2 B", description: "Greift die Fünfmeterlinie an", coachingPoint: "Raumverteidiger zum Herausrücken zwingen, dann Position halten", startPosition: { x: 50, y: 19 } },
      { name: "Welle 2 C", description: "Greift die Fünfmeterlinie an", coachingPoint: "Verteidiger binden, regelkonform ohne Halten", startPosition: { x: 58, y: 18 } },
      { name: "Später Läufer", description: "Kommt als Letzter in die freie Lücke", coachingPoint: "Hinter den anderen starten, mit vollem Tempo in die Lücke köpfen", startPosition: { x: 50, y: 28 } },
    ],
  },
  {
    slug: "kurze-ecke-neuer-winkel",
    title: "Kurze Ecke, neuer Flankenwinkel",
    category: "offensive_corner_left",
    description: "Kurz ausgeführte Ecke: Doppelpass mit dem Anspieler, dann Flanke oder Schuss aus einem neuen Winkel. Lockt Verteidiger aus dem Fünfmeterraum und verändert die Ordnung. Vorbild: Arsenals Rekordtor durch Eberechi Eze nach kurzer Ecke (2025/26). Passt gegen tiefe Abwehr und Manndeckung. Niveau: einfach.",
    coachingNote: "Am besten als Überraschung, etwa beim ersten Eckball einer Halbzeit. Schnell ausführen, bevor sich die Abwehr umstellt.",
    defaultRoles: [
      { name: "Schütze", description: "Spielt kurz und bekommt den Ball zurück", coachingPoint: "Kurz passen, sofort nach innen starten", startPosition: { x: 0, y: 0 } },
      { name: "Anspieler", description: "Kommt kurz entgegen und legt zurück", coachingPoint: "Mit dem Rücken zum Tor annehmen, direkt in den Lauf des Schützen", startPosition: { x: 9, y: 6 } },
      { name: "Kurzer Pfosten", description: "Greift den kurzen Pfosten an", coachingPoint: "Erst starten, wenn die Flanke kommt", startPosition: { x: 45, y: 9 } },
      { name: "Langer Pfosten", description: "Greift den langen Pfosten an", coachingPoint: "Spät ankommen, auf die lange Flanke warten", startPosition: { x: 58, y: 10 } },
      { name: "Elfmeterpunkt", description: "Besetzt den Raum am Elfmeterpunkt", coachingPoint: "Auf Rückpass oder Abpraller lauern", startPosition: { x: 50, y: 21 } },
      { name: "Rückraum", description: "Strafraumrand und Absicherung", coachingPoint: "Zweiten Ball sichern, Konter verhindern", startPosition: { x: 36, y: 30 } },
    ],
  },
  // Referenzen aus Total/Tactical Football Analysis (Auswertung 25.11.2026, Quellen in
  // docs/library/SET-PIECE-QUELLEN-TFA.md). Wo die Quelle nur Zonen nennt, sind die Punkte
  // eine Annäherung und in der Beschreibung so markiert.
  {
    slug: "zug-langer-pfosten",
    title: "Reihe hinter dem langen Pfosten",
    category: "offensive_corner_right",
    description: "Vier Spieler stehen in einer Reihe hinter dem langen Pfosten und laufen im Bogen gestaffelt in den Fünfmeterraum: vordere Torhälfte, hintere Torhälfte, Abpraller. Einer stört den Torhüter, einer kommt vom Strafraumrand. Vorbild: U17 der Vereinigten Arabischen Emirate an der U17-WM 2025 (einziges Turniertor). Gut für Junioren, braucht keinen Kopfballriesen. Gegen Manndeckung. Niveau: einfach bis mittel. Startpunkte angenähert.",
    coachingNote: "Erste Bewegung immer im Bogen zum Ball hin, das schüttelt den Gegenspieler ab und erleichtert den Kopfball. Die Reihenfolge in der Reihe bleibt fest, jeder kennt seine Zone.",
    defaultRoles: [
      { name: "Schütze", description: "Rechtsfuss, tritt von rechts", coachingPoint: "Hoch an den langen Pfosten", startPosition: { x: 100, y: 0 } },
      { name: "Reihe 1 Blocker", description: "Vorderster der Reihe, Ablenkung", coachingPoint: "Gegenspieler binden, Weg zum Ziel freihalten", startPosition: { x: 39, y: 6 } },
      { name: "Reihe 2", description: "Läuft in die vordere Torhälfte im Fünfmeterraum", coachingPoint: "Im Bogen starten, vordere Hälfte besetzen", startPosition: { x: 37, y: 9 } },
      { name: "Reihe 3 Ziel", description: "Zielspieler, hintere Torhälfte", coachingPoint: "Spät im Bogen kommen, Kopfball aufs Tor", startPosition: { x: 35, y: 12 } },
      { name: "Reihe 4", description: "Abpraller und Bälle hinter den langen Pfosten", coachingPoint: "Breit bleiben, Verlängerungen verwerten", startPosition: { x: 33, y: 15 } },
      { name: "Torhüterposten", description: "Steht zwischen Torhüter und Zielraum", coachingPoint: "Torhüter verzögern, regelkonform ohne Halten", startPosition: { x: 47, y: 2 } },
      { name: "Strafraumrand", description: "Greift den Raum knapp vor dem Fünfmeterraum an", coachingPoint: "Spät starten, auf zu kurze Bälle reagieren", startPosition: { x: 50, y: 30 } },
    ],
  },
  {
    slug: "zug-mit-torhueterblock",
    title: "Zug mit Läufer am Torhüter",
    category: "offensive_corner_left",
    description: "Vier Spieler starten eng zusammen als Zug und lösen sich spät in verschiedene Zonen, zwei stehen nah am Torhüter: einer stört ihn, einer läuft an die kurze Seite des Fünfmeterraums und sichert den ersten Kontakt. Grundidee: Es gibt immer irgendwo ein 2-gegen-1. Vorbild: Mainz U19 2025/26 (etwa ein Tor pro zehn Ecken). Gegen Manndeckung. Niveau: mittel. Startpunkt des Zugs angenähert.",
    coachingNote: "Der Läufer bestimmt das Timing, der Blocker schaut nur auf seinen Gegenspieler. Blocks funktionieren gegen Manndecker; gegen Raumdeckung müssen Ort und Zeitpunkt exakt stimmen.",
    defaultRoles: [
      { name: "Schütze", description: "Tritt von links", coachingPoint: "In den Fünfmeterraum, nicht zu kurz", startPosition: { x: 0, y: 0 } },
      { name: "Zug 1", description: "Löst sich an den kurzen Pfosten", coachingPoint: "Als Erster raus, Gegenspieler mitnehmen", startPosition: { x: 52, y: 21 } },
      { name: "Zug 2", description: "Löst sich in die Mitte des Fünfers", coachingPoint: "Mit Anlauf aus der Tiefe kommen", startPosition: { x: 54, y: 22 } },
      { name: "Zug 3", description: "Löst sich an den langen Pfosten", coachingPoint: "Spät abdrehen, Raum am langen Pfosten", startPosition: { x: 56, y: 21 } },
      { name: "Zug 4", description: "Bleibt als Zusatzspieler frei", coachingPoint: "Dort hin, wo das 2-gegen-1 entsteht", startPosition: { x: 58, y: 22 } },
      { name: "Läufer am Torhüter", description: "Läuft an die kurze Seite des Fünfmeterraums", coachingPoint: "Ersten Kontakt sichern, auch bei zu kurzen Bällen", startPosition: { x: 48, y: 4 } },
      { name: "Torhüterposten", description: "Steht nah am Torhüter", coachingPoint: "Torhüter auf der Linie halten, ohne Foul", startPosition: { x: 52, y: 2 } },
      { name: "Rückraum", description: "Strafraumrand, zweiter Ball", coachingPoint: "Abpraller sichern, Konter verhindern", startPosition: { x: 40, y: 32 } },
    ],
  },
  {
    slug: "anker-vor-dem-manndecker",
    title: "Anker vor dem Manndecker",
    category: "offensive_corner_left",
    description: "Zwei Angreifer stellen sich beim Schuss zwischen Tor und Manndecker (Anker). Die Ecke fliegt über den vordersten Raumverteidiger auf ihren Kopf. Ist sie ungenau, verlängert der Anker an den langen Pfosten, wo ein Läufer aus der Tiefe ankommt. Vorbild: 1. FC Köln (Bundesliga, meiste Eckball-xG). Gegen Manndeckung. Niveau: mittel.",
    coachingNote: "Liegt der Ball frei im Fünfmeterraum, immer zuerst aufs Tor. Einer greift immer den langen Pfosten an. Die Ecke darf weder zu lang (geklärt) noch zu kurz (Anker steht im Weg) sein.",
    defaultRoles: [
      { name: "Schütze", description: "Tritt von links", coachingPoint: "Über den vordersten Raumverteidiger auf den Anker", startPosition: { x: 0, y: 0 } },
      { name: "Anker 1", description: "Stellt sich zwischen Tor und Manndecker", coachingPoint: "Beim Schuss Position einnehmen, Kopfball aufs Tor oder lang verlängern", startPosition: { x: 46, y: 9 } },
      { name: "Anker 2", description: "Zweiter Anker in der Mitte", coachingPoint: "Zwischen Ball und Gegenspieler stellen", startPosition: { x: 52, y: 10 } },
      { name: "Läufer aus dem Tor", description: "Startet auf der Torlinie, kommt hinter den Verteidigern hervor", coachingPoint: "Loslaufen, wenn der Ball den kurzen Pfosten erreicht", startPosition: { x: 54, y: 1 } },
      { name: "Tiefer Läufer", description: "Läuft aus der Tiefe an den langen Pfosten", coachingPoint: "Auf die Verlängerung spekulieren", startPosition: { x: 58, y: 22 } },
      { name: "Langer Pfosten", description: "Wartet am langen Pfosten", coachingPoint: "Lose Bälle verwerten", startPosition: { x: 61, y: 5 } },
      { name: "Rückraum", description: "Strafraumrand und Absicherung", coachingPoint: "Zweiten Ball sichern", startPosition: { x: 44, y: 32 } },
    ],
  },
  {
    slug: "taeuschung-kurz-angriff-lang",
    title: "Täuschung kurz, Angriff lang",
    category: "offensive_corner_left",
    description: "Zum Tor drehende Ecke an den langen Pfosten. Der Zielspieler täuscht vom Elfmeterpunkt einen Lauf an den kurzen Pfosten an und greift dann den langen an. Zwei Spieler aus der Gruppe hinter dem langen Pfosten kommen aus dem toten Winkel und stören die letzten Raumverteidiger, einer zieht seinen Gegenspieler an den kurzen Pfosten. Vier Spieler bleiben zur Absicherung draussen. Vorbild: Arsenal (Gabriel). Gegen Mann- und Raumdeckung. Niveau: anspruchsvoll.",
    coachingNote: "Die Absicherung gehört zur Variante: zwei am Strafraumrand, einer dahinter gegen den Konter. Wer stört, bleibt regelkonform: im Weg stehen, nicht halten.",
    defaultRoles: [
      { name: "Schütze", description: "Rechtsfuss von links, zum Tor drehend", coachingPoint: "Gezogen in den Fünfmeterraum am langen Pfosten", startPosition: { x: 0, y: 0 } },
      { name: "Zielspieler", description: "Täuscht kurz an, greift den langen Pfosten an", coachingPoint: "Zwei Schritte Richtung kurzer Pfosten, dann abdrehen", startPosition: { x: 50, y: 20 } },
      { name: "Lockvogel kurz", description: "Zieht seinen Gegenspieler an den kurzen Pfosten", coachingPoint: "Dort bleiben und den kurzen Pfosten besetzen", startPosition: { x: 42, y: 12 } },
      { name: "Torhüterposten", description: "Steht neben dem Torhüter", coachingPoint: "Torhüter verzögern, ohne Foul", startPosition: { x: 50, y: 2 } },
      { name: "Störer 1", description: "Kommt aus dem toten Winkel auf den vorletzten Raumverteidiger", coachingPoint: "Spät aus der Gruppe lösen, im Weg stehen", startPosition: { x: 62, y: 8 } },
      { name: "Störer 2", description: "Kommt aus dem toten Winkel auf den letzten Raumverteidiger", coachingPoint: "Gleiches Timing wie Störer 1", startPosition: { x: 65, y: 11 } },
      { name: "Flugbahn", description: "Besetzt die Flugbahn für Abpraller", coachingPoint: "Auf hohe Bälle reagieren", startPosition: { x: 58, y: 15 } },
      { name: "Rückraum links", description: "Strafraumrand, zweiter Ball", coachingPoint: "Abpraller direkt nehmen oder sichern", startPosition: { x: 38, y: 32 } },
      { name: "Rückraum rechts", description: "Strafraumrand, zweiter Ball", coachingPoint: "Mitschieben Richtung Ball", startPosition: { x: 60, y: 32 } },
      { name: "Absicherung", description: "Hinter dem Strafraumrand gegen den Konter", coachingPoint: "Bei Torhüterfang sofort zurück", startPosition: { x: 50, y: 45 } },
    ],
  },
  {
    slug: "gemischte-deckung-4-5",
    title: "Gemischte Deckung: 4 im Raum, 5 am Mann",
    category: "defensive_corner_left",
    description: "Vier Raumverteidiger (kurzer Pfosten, zwei auf der Fünfmeterlinie, einer am langen Pfosten), fünf Manndecker auf die stärksten Kopfballspieler, einer am Strafraumrand. Vorbild: VfB Stuttgart 2025/26 (ein Gegentor nach Standards, wenigste Gegner-xG der Bundesliga). Ähnlich Brentford mit einem zusätzlichen Raumspieler vor dem kurzen Pfosten. Niveau: mittel. Manndecker-Startpunkte angenähert.",
    coachingNote: "Raumspieler dürfen nach vorne aus ihrer Zone, um zu klären, und achten auf Blocks. Der Torhüter nimmt alles, was durch die Tormitte im Fünfer kommt. Kurze Ecke: der vorderste Raumspieler hilft draussen, der Strafraumrand darf dann nicht leer werden. Gegen Blocks am Torhüter: ein Manndecker stellt sich in den Laufweg des Blockers, nicht vor den Torhüter.",
    defaultRoles: [
      { name: "Torhüter", description: "Beherrscht den Fünfmeterraum", coachingPoint: "Alles durch die Tormitte nehmen, Blocker mit dem Arm auf Abstand halten", startPosition: { x: 51, y: 1 } },
      { name: "Raum kurzer Pfosten", description: "Erster Raumverteidiger", coachingPoint: "Verlängerungen vor dem kurzen Pfosten abfangen", startPosition: { x: 45, y: 5 } },
      { name: "Raum Mitte 1", description: "Auf der Fünfmeterlinie", coachingPoint: "Ball in deiner Zone aggressiv angreifen", startPosition: { x: 49, y: 10 } },
      { name: "Raum Mitte 2", description: "Auf der Fünfmeterlinie", coachingPoint: "Bei weit entfernten Läufern auf der Linie bleiben", startPosition: { x: 54, y: 10 } },
      { name: "Raum langer Pfosten", description: "Letzter Raumverteidiger, etwas tiefer", coachingPoint: "Läufer hinter dir im Blick behalten", startPosition: { x: 59, y: 7 } },
      { name: "Manndecker 1", description: "Stärkster Kopfballspieler des Gegners", coachingPoint: "Mit dem Mann gehen, nicht mit dem Ball", startPosition: { x: 46, y: 16 } },
      { name: "Manndecker 2", description: "Zweitstärkster", coachingPoint: "Torseitig bleiben", startPosition: { x: 51, y: 17 } },
      { name: "Manndecker 3", description: "Drittstärkster", coachingPoint: "Warten, bis sich der Gegner aus der Gruppe löst", startPosition: { x: 56, y: 16 } },
      { name: "Manndecker 4", description: "Viertstärkster", coachingPoint: "Blocks auf die Raumspieler verhindern", startPosition: { x: 61, y: 15 } },
      { name: "Manndecker 5", description: "Fünfter Gegner oder Strafraumrand", coachingPoint: "Bei Bedarf frei für Abpraller", startPosition: { x: 52, y: 22 } },
      { name: "Strafraumrand", description: "Abpraller und kurze Ecke", coachingPoint: "Kurze Option zustellen, sonst Rückraum", startPosition: { x: 40, y: 30 } },
    ],
  },
  {
    slug: "einwurf-verlaengern-einrahmen",
    title: "Weiter Einwurf: verlängern und Tor einrahmen",
    category: "attacking_throw_in",
    description: "Flacher weiter Einwurf an den kurzen Pfosten. Zwei Spieler kommen aus dem toten Winkel zum ersten Kontakt, drei Läufer rahmen das Tor ein, der letzte aus dem toten Winkel des letzten Verteidigers. Dahinter ein Dreieck am Strafraumrand und eine Absicherung. Tore fallen oft erst nach dem zweiten oder dritten Kontakt. Vorbild: Crystal Palace 2025/26. Niveau: mittel, braucht einen weiten Werfer.",
    coachingNote: "Flach und gerade werfen, nicht im hohen Bogen: Ein hoher Wurf ist zu lange in der Luft. Scheitert die erste Welle am kurzen Pfosten, kommt der zweite Ball an den langen.",
    defaultRoles: [
      { name: "Werfer", description: "Weiter Einwurf auf Höhe Strafraum", coachingPoint: "Flach an den kurzen Pfosten", startPosition: { x: 0, y: 22 } },
      { name: "Erster Kontakt 1", description: "Kommt aus dem toten Winkel an den kurzen Pfosten", coachingPoint: "Verlängern Richtung Tor", startPosition: { x: 34, y: 14 } },
      { name: "Erster Kontakt 2", description: "Kommt aus der anderen Richtung", coachingPoint: "Verteidiger vom Zielraum wegziehen", startPosition: { x: 26, y: 8 } },
      { name: "Läufer 1", description: "Rahmt den kurzen Pfosten ein", coachingPoint: "In die zweite Reihe stossen", startPosition: { x: 42, y: 18 } },
      { name: "Läufer 2", description: "Rahmt die Tormitte ein", coachingPoint: "Auf die Verlängerung spekulieren", startPosition: { x: 48, y: 20 } },
      { name: "Läufer 3", description: "Letzter Läufer, toter Winkel des letzten Verteidigers", coachingPoint: "Spät an den langen Pfosten", startPosition: { x: 56, y: 18 } },
      { name: "Dreieck links", description: "Strafraumrand", coachingPoint: "Abpraller", startPosition: { x: 34, y: 32 } },
      { name: "Dreieck rechts", description: "Strafraumrand", coachingPoint: "Abpraller", startPosition: { x: 52, y: 32 } },
      { name: "Dreieck Spitze", description: "Hinter dem Strafraumrand", coachingPoint: "Zweiten Ball sichern", startPosition: { x: 43, y: 38 } },
      { name: "Absicherung", description: "Gegen den Konter", coachingPoint: "Nicht nachrücken", startPosition: { x: 45, y: 50 } },
    ],
  },
  {
    slug: "schneller-einwurf-ueber-den-kopf",
    title: "Schneller Einwurf über den Kopf",
    category: "attacking_throw_in",
    description: "Einwurf sofort ausführen, bevor sich der Gegner ordnet. Der Zielspieler fordert den Ball kurz, der Wurf geht über seinen Kopf in den Raum, er dreht und läuft ein; ein dritter Spieler kommt aus dem toten Winkel für die Ablage. Beim Einwurf gibt es kein Abseits. Nach Thomas Grønnemark (Einwurftrainer, u. a. Wisła Kraków, Kolding IF). Niveau: einfach.",
    coachingNote: "Der Empfänger startet hinter seinem Gegenspieler und läuft genau dann los, wenn geworfen wird. Wurf in den Lauf, nicht zum Spieler.",
    defaultRoles: [
      { name: "Werfer", description: "Wirft sofort", coachingPoint: "Nicht warten, flach in den Lauf werfen", startPosition: { x: 0, y: 60 } },
      { name: "Zielspieler", description: "Fordert kurz, dreht dann in den Raum", coachingPoint: "Ball fordern, Wurf über den Kopf laufen lassen, aufdrehen", startPosition: { x: 8, y: 56 } },
      { name: "Raumläufer", description: "Startet hinter dem Gegenspieler", coachingPoint: "Mit dem Wurf in den Raum vor dir starten", startPosition: { x: 14, y: 50 } },
      { name: "Dritter Mann", description: "Kommt aus dem toten Winkel für die Ablage", coachingPoint: "Ablage direkt weiterspielen", startPosition: { x: 20, y: 62 } },
      { name: "Hoher Spieler", description: "Steht hoch, kein Abseits beim Einwurf", coachingPoint: "Bereit für den Ball in die Tiefe", startPosition: { x: 18, y: 38 } },
    ],
  },
  {
    slug: "freistoss-aussen-weglocken",
    title: "Freistoss aussen: weglocken und langer Pfosten",
    category: "indirect_free_kick_right",
    description: "Freistoss von rechts aussen. Ein Spieler läuft auf den Schützen zu und zieht den Abprallspieler des Gegners mit. Ein Blocker stellt sich in den Weg des Verteidigers, der Läufer am langen Pfosten kommt frei. Ein Spieler hält die Breite. Vorbild: Bayern München 2025/26 (meiste Standardtore der Bundesliga). Ohne die riskante Abseitsfalle aus dem Original. Niveau: mittel.",
    coachingNote: "Alle Läufe starten erst beim Anlauf. Wer blockt, bleibt stehen und hält nicht.",
    defaultRoles: [
      { name: "Schütze", description: "Linksfuss von rechts", coachingPoint: "Zum Tor drehend an den langen Pfosten", startPosition: { x: 85, y: 28 } },
      { name: "Weglocker", description: "Läuft auf den Schützen zu", coachingPoint: "Abprallspieler des Gegners mitziehen", startPosition: { x: 60, y: 30 } },
      { name: "Blocker", description: "Steht dem Verteidiger des Zielspielers im Weg", coachingPoint: "Position halten, kann selbst köpfen", startPosition: { x: 50, y: 22 } },
      { name: "Zielspieler", description: "Läuft an den langen Pfosten", coachingPoint: "Spät aus dem toten Winkel", startPosition: { x: 44, y: 24 } },
      { name: "Tor einrahmen", description: "Dreht um seinen Gegenspieler an den langen Pfosten", coachingPoint: "Abpraller am langen Pfosten", startPosition: { x: 55, y: 20 } },
      { name: "Breite", description: "Hält die Breite auf der ballfernen Seite", coachingPoint: "Für den Querpass bereit", startPosition: { x: 28, y: 24 } },
      { name: "Rückraum", description: "Strafraumrand", coachingPoint: "Zweiter Ball und Konter", startPosition: { x: 50, y: 40 } },
    ],
  },
];

async function sync(apply: boolean): Promise<void> {
  const slugs = new Set<string>();
  for (const e of LIBRARY) {
    if (slugs.has(e.slug)) throw new Error(`Duplicate slug ${e.slug}`);
    slugs.add(e.slug);
  }
  const existing = new Set((await db.select({ slug: setPieceTemplatesTable.slug }).from(setPieceTemplatesTable)).map((r) => r.slug));
  for (const e of LIBRARY) {
    console.log(`${existing.has(e.slug) ? "update" : "insert"} ${e.slug} – ${e.title}`);
    if (!apply) continue;
    // Board and clips only overwrite when the library entry has them, so older entries keep their DB values.
    const { slug, boardData, media, ...text } = e;
    const set = { ...text, ...(boardData ? { boardData } : {}), ...(media ? { media } : {}) };
    await db.insert(setPieceTemplatesTable).values(e).onConflictDoUpdate({ target: setPieceTemplatesTable.slug, set });
  }
  console.log(apply ? "Library synced." : "Dry run. Re-run with --apply to write.");
}

sync(process.argv.includes("--apply")).then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
