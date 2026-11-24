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
