// Zeichnungen der Vorlagen: wer läuft wohin, wohin fliegt der Ball, wo stehen die Gegner.
// Koordinaten in Prozent der Spielfeldhälfte (x über 68 m, y ab Torlinie über 52,5 m):
// Pfosten x 44.6 und 55.4, Fünfmeterraum bis y 10.5 und x 36.5–63.5, Elfmeterpunkt (50, 21),
// Strafraumrand y 31.4. Linke Ecke (0, 0), rechte Ecke (100, 0).
// Einwürfe liegen auf dem GANZEN Feld: y über 105 m (Strafraumrand 15.7, Mitte 50).
// Die Läufe sind aus Videoszenen und Artikeln abgeleitet, nicht vermessen.
import type { BoardSpec } from "./library-board";

const GK: [number, number] = [50, 1.5];
const TOR: [number, number] = [50, 0.5]; // Mitte des Tors, für Schüsse und Kopfbälle

export const SPECS: Record<string, BoardSpec> = {
  // ─── Ecken Angriff ───
  "near-post-flick": {
    steps: ["Aufstellung", "Hereingabe und Lauf zum kurzen Pfosten", "Verlängerung"],
    start: { "Verlängerer": [38, 14], "Ziel langer Pfosten": [62, 16], "Strafraumrand": [46, 34], "Kurze Option": [9, 5] },
    ball: [1, 1], gk: GK, opponents: [[46, 5], [52, 7], [58, 5], [44, 14], [54, 15]],
    passes: [{ step: 1, to: [[45, 7]], label: "flach und scharf" }, { step: 2, to: [[56, 6]], label: "verlängert" }],
    runs: [
      { role: "Verlängerer", step: 1, to: [[45, 7]] },
      { role: "Ziel langer Pfosten", step: 1, to: [[60, 11]] },
      { role: "Ziel langer Pfosten", step: 2, to: [[56, 6]] },
    ],
  },
  "back-post-bomb": {
    steps: ["Aufstellung", "Ablenkung und hohe Hereingabe", "Kopfball am langen Pfosten"],
    start: { "Zielspieler": [66, 26], "Ablenkung kurz": [38, 16], "Ablenkung Mitte": [46, 18], "Nachsetzer": [50, 34] },
    ball: [1, 1], gk: GK, opponents: [[46, 5], [51, 8], [57, 6], [47, 15], [56, 16]],
    passes: [{ step: 1, to: [[32, 9], [59, 5]], curved: true, label: "hoch an den langen Pfosten" }, { step: 2, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Ablenkung kurz", step: 1, to: [[45, 8]] },
      { role: "Ablenkung Mitte", step: 1, to: [[50, 9]] },
      { role: "Zielspieler", step: 1, to: [[63, 12]] },
      { role: "Zielspieler", step: 2, to: [[59, 5]] },
      { role: "Nachsetzer", step: 2, to: [[53, 16]] },
    ],
  },
  "far-post-overload": {
    steps: ["Aufstellung", "Erster Läufer zieht weg", "Zweiter greift den Raum an", "Dritter sichert Abpraller"],
    start: { "Erster Läufer": [58, 26], "Zweiter Läufer": [56, 30], "Dritter Läufer": [52, 34], "Blocker": [54, 12] },
    ball: [99, 1], gk: GK, opponents: [[53, 5], [48, 8], [44, 6], [54, 14], [47, 16]],
    passes: [{ step: 2, to: [[72, 9], [46, 6]], curved: true, label: "zum langen Pfosten" }, { step: 3, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Erster Läufer", step: 1, to: [[48, 9]] },
      { role: "Blocker", step: 1, to: [[52, 3]] },
      { role: "Zweiter Läufer", step: 2, to: [[46, 6]] },
      { role: "Dritter Läufer", step: 2, to: [[50, 16]] },
    ],
  },
  "sturmlauf-kurzer-pfosten": {
    steps: ["Aufstellung", "Sturmlauf an den kurzen Pfosten", "Kopfball"],
    ball: [1, 1], gk: GK, opponents: [[47, 4], [52, 8], [57, 5], [48, 13], [56, 14]],
    passes: [{ step: 1, to: [[30, 8], [48, 7]], curved: true, label: "zum Tor drehend" }, { step: 2, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Stürmer 1", step: 1, to: [[48, 6]] },
      { role: "Stürmer 2", step: 1, to: [[51, 10]] },
      { role: "Zielspieler", step: 1, to: [[61, 13], [49, 7]], curved: true },
    ],
  },
  "drei-wellen": {
    steps: ["Aufstellung", "Welle 1: Ablenkung", "Welle 2: Fünfmeterlinie", "Ecke und später Läufer", "Kopfball"],
    ball: [99, 1], gk: GK, opponents: [[43, 9], [49, 9], [55, 9], [61, 9], [47, 15], [53, 15]],
    opponentMoves: [{ opponent: 1, step: 2, to: [43, 11] }, { opponent: 2, step: 2, to: [49, 11] }, { opponent: 3, step: 2, to: [55, 11] }],
    passes: [{ step: 3, to: [[74, 10], [50, 7]], curved: true, label: "Ecke" }, { step: 4, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Welle 1 A", step: 1, to: [[60, 6]] },
      { role: "Welle 1 B", step: 1, to: [[63, 8]] },
      { role: "Welle 1 C", step: 1, to: [[66, 6]] },
      { role: "Welle 2 A", step: 2, to: [[42, 12]] },
      { role: "Welle 2 B", step: 2, to: [[50, 12]] },
      { role: "Welle 2 C", step: 2, to: [[58, 12]] },
      { role: "Später Läufer", step: 3, to: [[50, 7]] },
    ],
  },
  "kurze-ecke-neuer-winkel": {
    steps: ["Aufstellung", "Kurz spielen", "Zurücklegen", "Flanke aus neuem Winkel", "Kopfball"],
    ball: [1, 1], gk: GK, opponents: [[7, 9], [46, 6], [52, 8], [57, 6], [50, 14]],
    opponentMoves: [{ opponent: 1, step: 1, to: [9, 8] }],
    passes: [
      { step: 1, to: [[9, 6]], label: "kurz" },
      { step: 2, to: [[13, 14]], label: "zurück" },
      { step: 3, to: [[34, 10], [52, 8]], curved: true, label: "Flanke" },
      { step: 4, to: [TOR], label: "Kopfball" },
    ],
    runs: [
      { role: "Schütze", step: 1, to: [[13, 14]] },
      { role: "Kurzer Pfosten", step: 3, to: [[46, 6]] },
      { role: "Langer Pfosten", step: 3, to: [[56, 6]] },
      { role: "Elfmeterpunkt", step: 3, to: [[51, 13]] },
    ],
  },
  "zug-langer-pfosten": {
    steps: ["Aufstellung: Reihe hinter dem langen Pfosten", "Läufe im Bogen", "Kopfball"],
    ball: [99, 1], gk: GK, opponents: [[40, 7], [43, 10], [51, 6], [47, 14]],
    passes: [{ step: 1, to: [[72, 11], [46, 6]], curved: true, label: "hoch an den langen Pfosten" }, { step: 2, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Reihe 1 Blocker", step: 1, to: [[43, 7]] },
      { role: "Reihe 2", step: 1, to: [[41, 11], [52, 5]], curved: true },
      { role: "Reihe 3 Ziel", step: 1, to: [[38, 11], [46, 6]], curved: true },
      { role: "Reihe 4", step: 1, to: [[42, 5]] },
      { role: "Strafraumrand", step: 2, to: [[50, 14]] },
    ],
  },
  "zug-mit-torhueterblock": {
    steps: ["Aufstellung: Zug steht zusammen", "Zug löst sich", "Abschluss"],
    ball: [1, 1], gk: GK, opponents: [[53, 19], [55, 21], [57, 20], [59, 21], [49, 5], [53, 3]],
    opponentMoves: [{ opponent: 1, step: 1, to: [47, 9] }, { opponent: 2, step: 1, to: [51, 9] }, { opponent: 3, step: 1, to: [55, 9] }, { opponent: 4, step: 1, to: [57, 11] }],
    passes: [{ step: 1, to: [[28, 9], [50, 8]], curved: true, label: "in den Fünfmeterraum" }, { step: 2, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Zug 1", step: 1, to: [[46, 7]] },
      { role: "Zug 2", step: 1, to: [[50, 8]] },
      { role: "Zug 3", step: 1, to: [[56, 7]] },
      { role: "Zug 4", step: 1, to: [[53, 13]] },
      { role: "Läufer am Torhüter", step: 1, to: [[45, 6]] },
    ],
  },
  "anker-vor-dem-manndecker": {
    steps: ["Aufstellung", "Anker stellen sich", "Ecke auf den Anker, Verlängerung", "Abschluss"],
    ball: [1, 1], gk: GK, opponents: [[46, 6], [50, 9], [53, 8], [57, 12]],
    passes: [
      { step: 2, to: [[26, 8], [47, 8]], curved: true, label: "über den ersten Raumverteidiger" },
      { step: 3, to: [[55, 6]], label: "verlängert" },
      { step: 4, to: [TOR], label: "Abschluss" },
    ],
    runs: [
      { role: "Anker 1", step: 1, to: [[48, 7]] },
      { role: "Anker 2", step: 1, to: [[51, 8]] },
      { role: "Tiefer Läufer", step: 1, to: [[60, 14]] },
      { role: "Tiefer Läufer", step: 2, to: [[55, 6]] },
      { role: "Läufer aus dem Tor", step: 2, to: [[49, 4]] },
    ],
  },
  "taeuschung-kurz-angriff-lang": {
    steps: ["Aufstellung", "Täuschung zum kurzen Pfosten", "Angriff am langen Pfosten", "Kopfball"],
    ball: [1, 1], gk: GK, opponents: [[46, 6], [51, 8], [56, 8], [61, 7], [47, 15]],
    passes: [{ step: 2, to: [[30, 9], [56, 7]], curved: true, label: "zum langen Pfosten" }, { step: 3, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Zielspieler", step: 1, to: [[47, 12]] },
      { role: "Lockvogel kurz", step: 1, to: [[45, 7]] },
      { role: "Zielspieler", step: 2, to: [[56, 8]] },
      { role: "Störer 1", step: 2, to: [[58, 7]] },
      { role: "Störer 2", step: 2, to: [[61, 9]] },
      { role: "Flugbahn", step: 2, to: [[53, 11]] },
    ],
  },
  "ecke-angetippt-dribbling": {
    steps: ["Aufstellung", "Antippen, Schütze geht weg", "Dribbling an der Torlinie", "Flach quer", "Abschluss"],
    start: { "Dribbler": [95, 4] },
    ball: [99, 1], gk: GK, opponents: [[56, 5], [51, 8], [46, 6], [54, 13], [48, 15], [88, 5]],
    opponentMoves: [{ opponent: 6, step: 2, to: [80, 4] }],
    passes: [
      { step: 1, to: [[97, 2.5]], label: "antippen" },
      { step: 2, to: [[80, 2]], label: "Dribbling" },
      { step: 3, to: [[57, 6]], label: "flach quer" },
      { step: 4, to: [TOR], label: "Abschluss" },
    ],
    runs: [
      { role: "Schütze", step: 1, to: [[92, 12]] },
      { role: "Dribbler", step: 2, to: [[80, 2]] },
      { role: "Elfmeterpunkt", step: 3, to: [[52, 12]] },
    ],
  },
  "ecke-strafraumrand-volley": {
    steps: ["Aufstellung", "Ecke an den Strafraumrand", "Volley"],
    ball: [1, 1], gk: GK, opponents: [[44, 6], [50, 9], [56, 8], [61, 10], [46, 16], [55, 17]],
    passes: [{ step: 1, to: [[16, 24], [30, 32]], curved: true, label: "an den Strafraumrand" }, { step: 2, to: [[42, 12], [49, 0.5]], curved: true, label: "Volley" }],
    runs: [
      { role: "Abschluss", step: 1, to: [[30, 33]] },
      { role: "Strafraum 1", step: 1, to: [[46, 7]] },
      { role: "Strafraum 2", step: 1, to: [[50, 6]] },
      { role: "Strafraum 3", step: 1, to: [[56, 7]] },
    ],
  },

  // ─── Ecken Abwehr (unsere Spieler sind die Rollen, die Angreifer die Gegner) ───
  "zonal-wall": {
    steps: ["Aufstellung: jeder hat seine Zone", "Ecke kommt, Zone angreifen", "Klären"],
    start: { "Kurzer Pfosten": [46, 5], "Zone Mitte 1": [49, 10], "Zone Mitte 2": [54, 10], "Langer Pfosten": [60, 7], "Strafraumrand": [45, 33] },
    ball: [1, 1], gk: GK, opponents: [[44, 16], [50, 18], [56, 16], [62, 14], [48, 26]],
    passes: [{ step: 1, to: [[30, 9], [50, 8]], curved: true, label: "Ecke" }, { step: 2, to: [[36, 34]], label: "hoch und weit geklärt" }],
    runs: [
      { role: "Zone Mitte 1", step: 1, to: [[50, 8]] },
      { role: "Zone Mitte 2", step: 1, to: [[54, 8]] },
      { role: "Strafraumrand", step: 2, to: [[42, 30]] },
    ],
  },
  "man-mark-press": {
    steps: ["Aufstellung: jeder hat seinen Mann", "Ecke: mit dem Mann gehen", "Klärung und Konter"],
    start: { "Manndecker 1": [50, 10], "Manndecker 2": [56, 13], "Manndecker 3": [53, 24], "Kurzer Pfosten": [55, 4], "Konterspieler": [50, 45] },
    ball: [99, 1], gk: GK, opponents: [[50, 12], [56, 15], [46, 18], [52, 26], [58, 22]],
    opponentMoves: [{ opponent: 1, step: 1, to: [50, 8] }, { opponent: 2, step: 1, to: [55, 9] }, { opponent: 4, step: 1, to: [52, 20] }],
    passes: [{ step: 1, to: [[72, 9], [51, 8]], curved: true, label: "Ecke" }, { step: 2, to: [[48, 32]], label: "geklärt" }],
    runs: [
      { role: "Manndecker 1", step: 1, to: [[50, 8]] },
      { role: "Manndecker 2", step: 1, to: [[56, 9]] },
      { role: "Manndecker 3", step: 1, to: [[52, 21]] },
      { role: "Konterspieler", step: 2, to: [[52, 34]] },
    ],
  },
  "gemischte-deckung-4-5": {
    steps: ["Aufstellung: 4 im Raum, 5 am Mann", "Ecke kommt", "Klären und Rückraum"],
    ball: [1, 1], opponents: [[44, 15], [49, 14], [54, 14], [59, 13], [64, 15], [52, 22]],
    passes: [{ step: 1, to: [[30, 9], [50, 8]], curved: true, label: "Ecke" }, { step: 2, to: [[40, 34]], label: "geklärt" }],
    runs: [
      { role: "Raum Mitte 1", step: 1, to: [[50, 8]] },
      { role: "Raum Mitte 2", step: 1, to: [[54, 8]] },
      { role: "Strafraumrand", step: 2, to: [[42, 30]] },
    ],
  },

  // ─── Freistösse ───
  "wall-buster": {
    steps: ["Aufstellung", "Täuscher läuft über den Ball", "Schuss um die Mauer"],
    start: { "Schütze": [47, 64], "Täuscher": [53, 64], "Mauerläufer": [41, 41], "Nachsetzer": [55, 40] },
    ball: [50, 60], gk: GK, opponents: [[46, 42], [49, 42], [52, 42], [55, 42]],
    passes: [{ step: 2, to: [[40, 42], [45, 16], [53, 0.5]], curved: true, label: "mit Effet um die Mauer" }],
    runs: [
      { role: "Täuscher", step: 1, to: [[44, 58]] },
      { role: "Schütze", step: 1, to: [[50, 62]] },
      { role: "Mauerläufer", step: 2, to: [[45, 34]] },
      { role: "Nachsetzer", step: 2, to: [[53, 22]] },
    ],
  },
  "training-ground-special": {
    steps: ["Aufstellung", "Täuscher laufen über den Ball", "Verdeckter Pass", "Schuss"],
    start: { "Passgeber": [50, 60] },
    ball: [50, 58], gk: GK, opponents: [[46, 40], [49, 40], [52, 40], [55, 40]],
    passes: [{ step: 2, to: [[58, 52]], label: "verdeckt" }, { step: 3, to: [TOR], label: "flach und hart" }],
    runs: [
      { role: "Täuscher 1", step: 1, to: [[53, 55]] },
      { role: "Täuscher 2", step: 1, to: [[47, 55]] },
      { role: "Nachsetzer", step: 3, to: [[50, 24]] },
    ],
  },
  "quick-wide-play": {
    steps: ["Aufstellung", "Schneller Pass", "Frühe Flanke", "Abschluss"],
    ball: [15, 55], gk: GK, opponents: [[44, 6], [50, 8], [56, 6], [46, 14], [53, 15], [30, 48]],
    passes: [{ step: 1, to: [[20, 50]], label: "sofort" }, { step: 2, to: [[34, 22], [48, 9]], curved: true, label: "früh flanken" }, { step: 3, to: [TOR], label: "Kopfball" }],
    runs: [
      { role: "Flankengeber", step: 2, to: [[24, 43]] },
      { role: "Kurzer Pfosten", step: 2, to: [[46, 8]] },
      { role: "Langer Pfosten", step: 2, to: [[56, 7]] },
      { role: "Strafraumrand", step: 2, to: [[38, 35]] },
    ],
  },
  "freistoss-aussen-weglocken": {
    steps: ["Aufstellung", "Weglocken und Blocken", "Hereingabe an den langen Pfosten", "Abschluss"],
    ball: [85, 28], gk: GK, opponents: [[50, 6], [46, 9], [54, 10], [44, 16], [58, 17], [70, 28]],
    opponentMoves: [{ opponent: 6, step: 1, to: [71, 27] }],
    passes: [{ step: 2, to: [[66, 14], [45, 8]], curved: true, label: "an den langen Pfosten" }, { step: 3, to: [TOR], label: "Abschluss" }],
    runs: [
      { role: "Weglocker", step: 1, to: [[78, 27]] },
      { role: "Blocker", step: 1, to: [[47, 18]] },
      { role: "Zielspieler", step: 2, to: [[45, 8]] },
      { role: "Tor einrahmen", step: 2, to: [[48, 12]] },
    ],
  },
  "kette-loest-sich-auf": {
    steps: ["Aufstellung: Kette eingehakt", "Kette löst sich beim Anlauf", "Hereingabe", "Abschluss"],
    start: { "Kette 1": [46, 26], "Kette 2": [50, 26], "Kette 3": [54, 26], "Kette 4": [58, 26], "Kette 5": [62, 26] },
    ball: [88, 24], gk: GK, opponents: [[46, 17], [50, 17], [54, 17], [58, 17], [62, 17]],
    opponentMoves: [{ opponent: 1, step: 1, to: [43, 11] }, { opponent: 3, step: 1, to: [50, 12] }, { opponent: 5, step: 1, to: [58, 9] }],
    passes: [{ step: 2, to: [[66, 14], [45, 7]], curved: true, label: "an den langen Pfosten" }, { step: 3, to: [TOR], label: "Tor" }],
    runs: [
      { role: "Kette 1", step: 1, to: [[41, 9]] },
      { role: "Kette 2", step: 1, to: [[45, 7]] },
      { role: "Kette 3", step: 1, to: [[50, 10]] },
      { role: "Kette 4", step: 1, to: [[53, 22]] },
      { role: "Kette 5", step: 1, to: [[56, 7]] },
    ],
  },
  "freistoss-flach-in-den-lauf": {
    steps: ["Aufstellung: alle erwarten die Flanke", "Flach in den Lauf", "Flach quer", "Abschluss"],
    ball: [82, 40], gk: GK, opponents: [[54, 10], [49, 10], [44, 12], [60, 14], [56, 20]],
    passes: [
      { step: 1, to: [[66, 24]], label: "flach in den Lauf" },
      { step: 2, to: [[47, 6]], label: "flach quer" },
      { step: 3, to: [TOR], label: "eingeschoben" },
    ],
    runs: [
      { role: "Läufer aus der Tiefe", step: 1, to: [[66, 24]] },
      { role: "Lockvogel 1", step: 1, to: [[55, 12]] },
      { role: "Lockvogel 2", step: 1, to: [[50, 14]] },
      { role: "Vollstrecker", step: 2, to: [[46, 6]] },
    ],
  },
  "mauer-ende-anspiel": {
    steps: ["Aufstellung", "Täuscher läuft an", "Pass ans Mauerende", "Aufdrehen und Schuss"],
    ball: [48, 37], gk: GK, opponents: [[44, 19], [47, 19], [50, 19], [53, 19]],
    passes: [{ step: 2, to: [[56, 20]], label: "flach ans Mauerende" }, { step: 3, to: [TOR], label: "Schuss" }],
    runs: [
      { role: "Täuscher", step: 1, to: [[49, 35]] },
      { role: "Mauerende", step: 3, to: [[53, 16]] },
    ],
  },
  "schneller-freistoss": {
    steps: ["Aufstellung", "Sofort lang in den Lauf", "Flanke von der Grundlinie", "Abschluss"],
    ball: [78, 62], gk: GK, opponents: [[58, 10], [52, 8], [46, 9], [62, 18], [50, 16]],
    passes: [{ step: 1, to: [[88, 32]], label: "sofort lang" }, { step: 2, to: [[74, 14], [55, 8]], curved: true, label: "Flanke" }, { step: 3, to: [TOR], label: "Abschluss" }],
    runs: [
      { role: "Flügelläufer", step: 1, to: [[88, 32]] },
      { role: "Stürmer", step: 2, to: [[56, 9]] },
      { role: "Zweiter Stürmer", step: 2, to: [[47, 8]] },
      { role: "Nachrücker", step: 2, to: [[56, 28]] },
    ],
  },
  "chip-hinter-die-linie": {
    steps: ["Aufstellung: Gegner stellt die Linie hoch", "Schneller Chip hinter die Linie", "Abschluss"],
    start: { "Stürmer": [41, 31] },
    ball: [18, 46], gk: [50, 3], opponents: [[34, 30], [40, 30], [46, 30], [52, 30], [58, 30], [64, 30]],
    passes: [{ step: 1, to: [[28, 34], [41, 21]], curved: true, label: "Chip" }, { step: 2, to: [TOR], label: "Abschluss" }],
    runs: [
      { role: "Stürmer", step: 1, to: [[41, 21]] },
      { role: "Läufer Mitte", step: 1, to: [[50, 25]] },
      { role: "Läufer lang", step: 1, to: [[58, 24]] },
    ],
  },
  "seitlich-anlegen-direkt": {
    steps: ["Aufstellung", "Ball seitlich anlegen", "Direkt schiessen"],
    ball: [60, 46], gk: GK, opponents: [[52, 30], [54.5, 29], [57, 28.5], [59.5, 28]],
    passes: [{ step: 1, to: [[62, 47]], label: "anlegen" }, { step: 2, to: [[58, 24], [54, 10], [46, 0.5]], curved: true, label: "direkt" }],
    runs: [
      { role: "Anleger", step: 1, to: [[58, 44]] },
      { role: "Schütze", step: 1, to: [[62, 48]] },
    ],
  },

  // ─── Einwürfe (ganzes Feld, Tor oben) ───
  "long-throw-flick": {
    steps: ["Aufstellung", "Einwurf an den kurzen Pfosten", "Verlängerung", "Abschluss"],
    start: { "Werfer": [0, 14], "Verlängerer": [38, 9], "Abstauber": [44, 12], "Langer Pfosten": [58, 8] },
    ball: [0.5, 14], gk: [50, 1.5], opponents: [[42, 5], [48, 7], [54, 5], [46, 12]],
    passes: [{ step: 1, to: [[40, 8]], label: "flach" }, { step: 2, to: [[50, 5]], label: "verlängert" }, { step: 3, to: [[50, 0.5]], label: "Abschluss" }],
    runs: [
      { role: "Verlängerer", step: 1, to: [[40, 8]] },
      { role: "Abstauber", step: 2, to: [[50, 5]] },
      { role: "Langer Pfosten", step: 2, to: [[56, 4]] },
    ],
  },
  "einwurf-verlaengern-einrahmen": {
    steps: ["Aufstellung", "Flacher Einwurf, erste Kontakte", "Verlängerung, Läufer rahmen das Tor ein", "Abschluss"],
    start: {
      "Werfer": [0, 15], "Erster Kontakt 1": [38, 8], "Erster Kontakt 2": [30, 6], "Läufer 1": [44, 10], "Läufer 2": [50, 11], "Läufer 3": [58, 10],
      "Dreieck links": [36, 17], "Dreieck rechts": [54, 17], "Dreieck Spitze": [44, 21], "Absicherung": [46, 30],
    },
    ball: [0.5, 15], gk: [50, 1.5], opponents: [[44, 5], [50, 6], [56, 5], [46, 10], [53, 11]],
    passes: [{ step: 1, to: [[40, 8]], label: "flach und weit" }, { step: 2, to: [[52, 6]], label: "verlängert" }, { step: 3, to: [[50, 0.5]], label: "Abschluss" }],
    runs: [
      { role: "Erster Kontakt 1", step: 1, to: [[40, 8]] },
      { role: "Erster Kontakt 2", step: 1, to: [[36, 5]] },
      { role: "Läufer 1", step: 2, to: [[46, 5]] },
      { role: "Läufer 2", step: 2, to: [[52, 6]] },
      { role: "Läufer 3", step: 2, to: [[58, 8], [55, 4]], curved: true },
    ],
  },
  "schneller-einwurf-ueber-den-kopf": {
    steps: ["Aufstellung", "Wurf über den Kopf in den Raum", "Ablage", "Pass in die Tiefe"],
    start: { "Werfer": [0, 34], "Zielspieler": [8, 32], "Raumläufer": [14, 28], "Dritter Mann": [20, 36], "Hoher Spieler": [18, 20] },
    ball: [0.5, 34], opponents: [[4, 31], [10, 36], [16, 24], [24, 30]],
    passes: [{ step: 1, to: [[13, 28]], label: "über den Kopf" }, { step: 2, to: [[20, 36]], label: "Ablage" }, { step: 3, to: [[22, 17]], label: "in die Tiefe" }],
    runs: [
      { role: "Zielspieler", step: 1, to: [[13, 28]] },
      { role: "Raumläufer", step: 1, to: [[16, 26]] },
      { role: "Hoher Spieler", step: 3, to: [[22, 16]] },
    ],
  },
  "safe-outlet": {
    steps: ["Aufstellung", "Kurz zum freien Mann", "Weiterspielen"],
    start: { "Werfer": [0, 62], "Kurz 1": [9, 60], "Kurz 2": [14, 66], "Lang": [30, 52] },
    ball: [0.5, 62], opponents: [[8, 57], [16, 63]],
    passes: [{ step: 1, to: [[9, 60]], label: "kurz" }, { step: 2, to: [[16, 56]], label: "weiter" }],
    runs: [
      { role: "Kurz 2", step: 1, to: [[16, 56]] },
      { role: "Lang", step: 2, to: [[34, 46]] },
    ],
  },

  // ─── Aus Trainings- und Spielclips (27.11.2026), Ablauf geschätzt ───
  "corner-man-free-run": {
    steps: ["Aufstellung", "Läufer kreuzen vor der Ausführung", "Flanke in die frei gewordene Zone", "Direkter Abschluss"],
    ball: [99, 1], gk: GK, opponents: [[42.6, 20.2], [56.2, 19], [48.8, 26.3], [59.1, 3.8], [45.3, 4.2]],
    opponentMoves: [{ opponent: 1, step: 1, to: [57.4, 8.8] }, { opponent: 2, step: 1, to: [44.1, 9.3] }, { opponent: 3, step: 2, to: [49.9, 18.1] }],
    cue: "Jeder Verteidiger bleibt eng am eigenen Mann und folgt jedem Lauf.", signal: "Zwei Finger am Ohr",
    passes: [{ step: 2, to: [[76.5, 19], [53.7, 9.5]], curved: true, label: "in die frei gewordene Zone" }, { step: 3, to: [[50, 0.6]], label: "Abschluss" }],
    runs: [
      { role: "Lockläufer", step: 1, to: [[58.8, 12.4]] },
      { role: "Kreuzläufer", step: 1, to: [[44.9, 13.3]] },
      { role: "Zielspieler", step: 2, to: [[53.7, 9.5]] },
    ],
  },
  "corner-man-cross-run": {
    steps: ["Aufstellung", "Läufer kreuzen", "Flanke in den Lauf am ersten Pfosten", "Verlängerung ins Tor"],
    ball: [1, 1], gk: GK, opponents: [[44, 18.3], [56, 18.3], [50.3, 21.7], [44.4, 3.4], [55.3, 2.7]],
    opponentMoves: [{ opponent: 1, step: 1, to: [54.7, 6.9] }, { opponent: 2, step: 1, to: [49.7, 10.7] }],
    cue: "Die Gegner stehen im Tor- und Fünfmeterraum, jeder eng an einem Angreifer.", signal: "Handfläche kreisen",
    passes: [{ step: 2, to: [[22.1, 19], [45.6, 10.5]], curved: true, label: "scharf an den ersten Pfosten" }, { step: 3, to: [[50, 0.6]], label: "Verlängerung" }],
    runs: [
      { role: "Naher Läufer", step: 1, to: [[56.6, 10.5]] },
      { role: "Ferner Läufer", step: 1, to: [[45.6, 10.5]] },
    ],
  },
  "corner-mixed-zone-gap": {
    steps: ["Aufstellung", "Lockläufer bindet die Zone", "Flanke vor die Zonenlinie", "Abschluss"],
    ball: [99, 1], gk: GK, opponents: [[55.3, 4.2], [45, 4.2], [50, 8.8], [57.1, 13.7], [41.5, 23.6], [51.8, 25.3]],
    opponentMoves: [{ opponent: 1, step: 1, to: [56.6, 6.1] }, { opponent: 4, step: 1, to: [56.2, 12.2] }],
    cue: "Zwei bis drei Gegner stehen als Zone an den Pfosten und vor dem Tor, die übrigen decken Mann.", signal: "Hand an den Gürtel",
    passes: [{ step: 2, to: [[73.5, 21], [52.9, 13.3]], curved: true, label: "vor die Zonenlinie" }, { step: 3, to: [[52.2, 0.6]], label: "Abschluss" }],
    runs: [
      { role: "Lockläufer", step: 1, to: [[58.8, 9.9]] },
      { role: "Anlaufspieler", step: 2, to: [[52.9, 13.3]] },
    ],
  },
  "corner-short-feint": {
    steps: ["Aufstellung", "Anlauf andeuten, Täuschspieler kommt zum Ball", "Flach auf den dritten Spieler", "Frühe Flanke", "Abschluss"],
    ball: [1, 1], gk: GK, opponents: [[16.9, 11.4], [42.6, 7.6], [55.3, 6.9], [56.8, 12.2], [48.5, 21.7], [59.6, 23.8]],
    opponentMoves: [{ opponent: 1, step: 1, to: [12.5, 8.8] }],
    cue: "Nur ein Gegner reagiert auf die kurze Ecke und rückt zum nahen Spieler heraus.", signal: "Blickkontakt",
    passes: [{ step: 2, to: [[23.5, 32.4]], label: "flach auf den Dritten" }, { step: 3, to: [[33.8, 17.1], [48.5, 13.3]], curved: true, label: "frühe Flanke" }, { step: 4, to: [[53.7, 0.6]], label: "Abschluss" }],
    runs: [
      { role: "Täuschspieler", step: 1, to: [[6.6, 8.6]] },
      { role: "Täuschspieler", step: 2, to: [[14, 15.2]] },
      { role: "Naher Läufer", step: 3, to: [[48.5, 13.3]] },
      { role: "Ferner Läufer", step: 3, to: [[60.3, 11.4]] },
    ],
  },
  "corner-def-mixed": {
    steps: ["Aufstellung: Zuordnung klar", "Ecke kommt, Manndecker gehen mit", "Hereingabe in die Zone, vorn klärt", "Seitlich klären"],
    ball: [1, 1], gk: GK, opponents: [[44.9, 26.7], [56.6, 26.7], [51.5, 30.1], [39.7, 21]],
    opponentMoves: [{ opponent: 1, step: 1, to: [44.6, 19.8] }, { opponent: 2, step: 1, to: [56.9, 19.8] }],
    cue: "Der Gegner stellt mehrere Läufer vor das Tor und variiert den Zielspieler.", signal: "Zuordnung",
    passes: [{ step: 2, to: [[30.9, 8], [50, 10.5]], curved: true, label: "in die Zone" }, { step: 3, to: [[44.1, 40]], label: "geklärt" }],
    runs: [
      { role: "Manndecker links", step: 1, to: [[43.8, 15]] },
      { role: "Manndecker rechts", step: 1, to: [[56.2, 15]] },
      { role: "Sammler", step: 3, to: [[44.1, 40]] },
    ],
  },
  "freistoss-zwei-am-ball-fluegel": {
    steps: ["Aufstellung: zwei am Ball", "Zweiter läuft über den Ball", "Kurz auf den Flügel", "1v1 aussen", "Flanke vor die Linie", "Abschluss"],
    ball: [73.5, 51.4], gk: GK, opponents: [[62.5, 38.7], [65, 36.8], [67.6, 34.7], [70.1, 32.8], [81.8, 29.5], [52.2, 22.9], [46.3, 22.9]],
    cue: "Zwei Spieler stehen am Ball, die Mauer deckt das Zentrum, auf dem Flügel hat der Aussenverteidiger viel Raum.", signal: "Zwei am Ball",
    passes: [{ step: 2, to: [[88.2, 36.2]], label: "kurz auf den Flügel" }, { step: 3, to: [[85, 21.9]], label: "Dribbling" }, { step: 4, to: [[69.1, 17.1], [55.9, 11.4]], curved: true, label: "Flanke vor die Linie" }, { step: 5, to: [[50, 0.6]], label: "Abschluss" }],
    runs: [
      { role: "Zweiter am Ball", step: 1, to: [[68.4, 48.6]] },
      { role: "Flügelspieler", step: 2, to: [[88.2, 36.2]] },
      { role: "Flügelspieler", step: 3, to: [[85, 21.9]] },
      { role: "Naher Boxspieler", step: 3, to: [[58.8, 17.1]] },
      { role: "Ferner Boxspieler", step: 3, to: [[42.6, 16.2]] },
      { role: "Naher Boxspieler", step: 4, to: [[55.9, 11.4]] },
      { role: "Ferner Boxspieler", step: 4, to: [[45.6, 11.4]] },
    ],
  },
  "corner-edge-cluster": {
    steps: ["Aufstellung", "Hereingabe in den Pulk", "Verlängerung zur Strafraumkante", "Abschluss aus dem Lauf"],
    ball: [99, 1], gk: GK, opponents: [[45.3, 5.3], [50, 6.1], [54.7, 5.3], [56.2, 9.3], [52.2, 12], [46.2, 11.2]],
    cue: "Viele Gegner stehen eng im Torraum und binden sich an den Pulk. Die Strafraumkante bleibt unbesetzt.", signal: "Blickkontakt zum Kantenspieler",
    passes: [{ step: 1, to: [[76.5, 19], [56.2, 13.3]], curved: true, label: "hoch in den Pulk" }, { step: 2, to: [[54.4, 32.4]], label: "verlängert" }, { step: 3, to: [[60.3, 15.2], [52.2, 0.6]], curved: true, label: "Abschluss" }],
    runs: [
      { role: "Kantenspieler", step: 1, to: [[54.4, 38.1]] },
      { role: "Kantenspieler", step: 2, to: [[54.4, 32.4]] },
    ],
  },
  "corner-short-edge-cross": {
    steps: ["Aufstellung", "Kurz an die Linie", "Weiterleiten zum Flankengeber", "Flanke in den Lauf", "Kopfball"],
    ball: [99, 1], gk: GK, opponents: [[50, 8], [55.9, 8], [44.1, 9.1], [58.1, 18.1], [47.1, 27.6], [64, 17.1]],
    cue: "Kein Gegner rückt zur kurzen Ecke heraus, alle bleiben im Strafraum.", signal: "Kurz hoch",
    passes: [{ step: 1, to: [[91.2, 7.6]], label: "kurz an die Linie" }, { step: 2, to: [[82.4, 36.2]], label: "weitergeleitet" }, { step: 3, to: [[64.7, 28.6], [52.9, 13.3]], curved: true, label: "Flanke in den Lauf" }, { step: 4, to: [[52.2, 0.6]], label: "Kopfball" }],
    runs: [
      { role: "Flankengeber", step: 2, to: [[82.4, 36.2]] },
      { role: "Zielspieler", step: 3, to: [[52.9, 13.3]] },
      { role: "Zweiter Pfosten", step: 3, to: [[43.4, 14.3]] },
    ],
  },
  "kickoff-outside-runner": {
    steps: ["Aufstellung", "Rückpass, vier Läufer starten", "Diagonalball auf den Aussenläufer", "Mit Tempo zum Strafraum, 2v1", "Flanke", "Abschluss"],
    ball: [50, 50], gk: GK, opponents: [[17.6, 24.8], [39.7, 22.9], [60.3, 22.9], [82.4, 24.8], [39.7, 41.9], [60.3, 41.9]],
    opponentMoves: [{ opponent: 1, step: 2, to: [21.3, 21.9] }],
    cue: "Die Abwehr steht hoch und der Aussenverteidiger sichert seinen Flügel allein.", signal: "Zurück und lang",
    passes: [{ step: 1, to: [[44.1, 55.7]], label: "zurück" }, { step: 2, to: [[20.6, 40], [10.3, 26.7]], curved: true, label: "Diagonalball" }, { step: 3, to: [[17.6, 16.2]], label: "Dribbling" }, { step: 4, to: [[29.4, 7.6], [44.1, 5.7]], curved: true, label: "Flanke" }, { step: 5, to: [[50, 0.3]], label: "Abschluss" }],
    runs: [
      { role: "Aussenläufer", step: 1, to: [[8.8, 40]] },
      { role: "Aussenläufer", step: 2, to: [[10.3, 26.7]] },
      { role: "Aussenläufer", step: 3, to: [[17.6, 16.2]] },
      { role: "Innenläufer", step: 1, to: [[32.4, 40]] },
      { role: "Innenläufer", step: 2, to: [[29.4, 28.6]] },
      { role: "Innenläufer", step: 3, to: [[27.9, 17.1]] },
      { role: "Zentraler Läufer", step: 1, to: [[54.4, 40]] },
      { role: "Zentraler Läufer", step: 2, to: [[51.5, 28.6]] },
      { role: "Zentraler Läufer", step: 3, to: [[51.5, 16.2]] },
      { role: "Ballferner Läufer", step: 1, to: [[70.6, 40]] },
      { role: "Ballferner Läufer", step: 2, to: [[69.1, 28.6]] },
      { role: "Ballferner Läufer", step: 3, to: [[67.6, 16.2]] },
      { role: "Innenläufer", step: 4, to: [[44.1, 5.7]] },
    ],
  },
  "kickoff-inside-run": {
    steps: ["Aufstellung", "Rückpass, Läufer starten", "Langer Ball in den Halbraum", "Annahme und Abschluss", "Tor"],
    ball: [50, 50], gk: GK, opponents: [[20.6, 21], [41.2, 20], [58.8, 20], [79.4, 21.9], [41.2, 41.9], [60.3, 41.9]],
    cue: "Zwischen Aussen- und Innenverteidiger der gegnerischen Kette klafft eine Lücke.", signal: "Innen",
    passes: [{ step: 1, to: [[44.1, 55.2]], label: "zurück" }, { step: 2, to: [[73.5, 38.1], [69.1, 21.9]], curved: true, label: "lang in den Halbraum" }, { step: 3, to: [[61.8, 7.6]], label: "Dribbling" }, { step: 4, to: [[50, 0.3]], label: "Abschluss" }],
    runs: [
      { role: "Innenläufer", step: 1, to: [[78.7, 36.7]] },
      { role: "Innenläufer", step: 2, to: [[69.1, 21.9]] },
      { role: "Innenläufer", step: 3, to: [[61.8, 7.6]] },
      { role: "Lockläufer", step: 1, to: [[50, 43.8]] },
      { role: "Lockläufer", step: 2, to: [[48.5, 26.7]] },
      { role: "Zweiter Läufer", step: 1, to: [[36.8, 40]] },
      { role: "Zweiter Läufer", step: 2, to: [[41.2, 28.6]] },
      { role: "Zweiter Läufer", step: 3, to: [[46.3, 17.1]] },
    ],
  },
};
