// Einschätzung je Vorlage für Filter und Erklärung (Vor-/Nachteile). Schlüssel = slug aus library-data.ts.
// basis "research": Quellen und Zahlen aus docs/library/*.md. basis "ai": aus Videoszene und Trainingslehre.
import type { TemplateProfile } from "@workspace/db";

const SRC = {
  plRecord: { label: "Premier League: Arsenal-Rekord bei Eckballtoren (20.05.2026)", url: "https://www.premierleague.com/en/news/4662597/arsenal" },
  analyst: { label: "The Analyst: Arsenal, meiste Eckballtore einer Saison (25.04.2026)", url: "https://theanalyst.com/articles/arsenal-most-goals-from-corners-premier-league-season-record" },
  plSetPieces: { label: "Total Football Analysis: How Set Pieces Are Reshaping the PL (06.08.2026)", url: "https://totalfootballanalysis.com/set-piece-analysis/premier-league-set-pieces" },
  freiburg: { label: "Tactical Football Analysis: Freiburg 2025/26, Standards (17.05.2026)", url: "https://tacticalfootballanalysis.com/julian-schuster-tactics-freiburg-2025-2026-set-piece-analysis/" },
  uae: { label: "Total Football Analysis: U17 VAE, U17-WM 2025 (17.11.2025)", url: "https://totalfootballanalysis.com/set-piece-analysis/uae-tactics-set-piece-analysis-u17-world-cup-2025-analysis" },
  mainz: { label: "Total Football Analysis: Mainz U19 2025/26 (03.09.2025)", url: "https://totalfootballanalysis.com/set-piece-analysis/mainz-u19-tactics-set-piece-analysis-2025-2026" },
  koeln: { label: "Total Football Analysis: 1. FC Köln, Ecken (11.12.2025)", url: "https://totalfootballanalysis.com/set-piece-analysis/how-fc-koln-are-so-dangerous-from-corners-set-piece-analysis-tactical-analysis-tactics" },
  arsenalRest: { label: "Total Football Analysis: Arsenal, Absicherung bei Ecken (27.08.2025)", url: "https://totalfootballanalysis.com/set-piece-analysis/arsenal-rest-defence-attacking-corners-set-piece-analysis-tactics" },
  stuttgart: { label: "Total Football Analysis: VfB Stuttgart, Eckballabwehr (16.04.2026)", url: "https://totalfootballanalysis.com/set-piece-analysis/stuttgart-corner-defence-2025-2026-set-piece-analysis-tactics" },
  brentford: { label: "Total Football Analysis: Brentford, Eckballabwehr", url: "https://totalfootballanalysis.com/set-piece-analysis/keith-andrews-defending-corner-tactics-brentford-2024-2025-set-piece" },
  gkBlocks: { label: "Total Football Analysis: Torhüter vor Blocks schützen", url: "https://totalfootballanalysis.com/set-piece-analysis/protect-goalkeepers-from-blocks-set-piece-analysis-tactics" },
  longThrows: { label: "Total Football Analysis: Weite Einwürfe Premier League (29.10.2025)", url: "https://totalfootballanalysis.com/set-piece-analysis/premier-league-long-throw-ins-tactics-set-piece-analysis-tactics" },
  groennemark: { label: "Total Football Analysis: Grønnemark, Einwürfe (09.08.2025)", url: "https://totalfootballanalysis.com/set-piece-analysis/long-fast-clever-throw-in-set-piece-tactical-analysis-tactics" },
  bayern: { label: "Tactical Football Analysis: Bayern München 2025/26, Standards (23.05.2026)", url: "https://tacticalfootballanalysis.com/vincent-kompany-tactics-bayern-munich-2025-2026-set-piece-analysis/" },
};

export const PROFILES: Record<string, TemplateProfile> = {
  // ─── Ecken Angriff ───
  "near-post-flick": {
    level: "medium", against: ["zone", "man"], juniors: false, needsHeader: true, effort: "ca. 2 × 15 Min.",
    pros: [
      "Der erste Kontakt passiert vor den meisten Verteidigern, die Verlängerung kommt für den Torhüter schwer berechenbar an den langen Pfosten.",
      "Laut Tactical Football Analysis entstehen beim SC Freiburg viele Schüsse am langen Pfosten aus solchen Verlängerungen (Bundesliga).",
      "Mit fünf Spielern machbar, der Rest bleibt zur Absicherung hinten.",
    ],
    cons: [
      "Hängt an einem Verlängerer, der den Ball mit dem Kopf nur streift statt ihn voll zu treffen. Das braucht viele Wiederholungen.",
      "Kommt die Ecke zu hoch oder zu langsam, gewinnt der Verteidiger am kurzen Pfosten den Ball.",
      "Der Läufer am langen Pfosten muss die Verlängerung erahnen. Startet er zu früh, läuft er am Ball vorbei.",
    ],
    tip: "Der Schütze tritt flach und scharf auf Kopfhöhe des Verlängerers, eine hohe Ecke macht das Streifen fast unmöglich.",
    basis: "research", sources: [SRC.freiburg],
  },
  "back-post-bomb": {
    level: "easy", against: ["zone", "man"], juniors: false, needsHeader: true, effort: "ca. 15 Min. in einer Einheit",
    pros: [
      "Einfacher Plan, den alle schnell verstehen: ein Ziel, ein Zielraum, zwei Ablenkungen.",
      "Der Zielspieler kommt mit Anlauf gegen einen Verteidiger, der oft aus dem Stand springen muss.",
      "Der Nachsetzer steht für zweite Bälle bereit, wenn der Kopfball geblockt oder gehalten wird.",
    ],
    cons: [
      "Der Schütze muss den Ball hoch und genau über den ganzen Fünfmeterraum bringen. Das schaffen nicht alle Teams.",
      "Ein hoher, langer Ball ist lange in der Luft. Ein Torhüter, der gut herauskommt, fängt ihn ab.",
      "Ohne einen kopfballstarken Zielspieler bleibt die Variante wirkungslos.",
    ],
    tip: "Die Ablenkungsläufer starten vor dem Zielspieler, sonst ziehen sie keinen Gegenspieler mehr weg.",
    basis: "ai",
  },
  "far-post-overload": {
    level: "medium", against: ["man"], juniors: true, needsHeader: true, effort: "ca. 2 × 15 Min.",
    pros: [
      "Drei gestaffelte Läufe in dieselbe Zone überfordern Manndecker, die sich gegenseitig im Weg stehen.",
      "Der dritte Läufer kommt spät und ist bei Abprallern oft frei.",
      "Die Rollen sind klar getrennt: wegziehen, Raum angreifen, nachsetzen.",
    ],
    cons: [
      "Die Ecke dreht vom Tor weg. Laut Total Football Analysis (Opta) liegt die Torquote zum Tor drehender Ecken in der Premier League bei 5,3 %, wegdrehender bei 3,6 %.",
      "Der Blocker vor dem Torhüter muss regelkonform stehen, ohne Halten oder Stossen. Sonst pfeift der Schiedsrichter Foul.",
      "Starten die Läufer gleichzeitig statt gestaffelt, verliert die Variante ihre Wirkung.",
    ],
    tip: "Zwischen den Läufen braucht es einen kurzen Abstand: Der zweite startet erst, wenn der erste seinen Gegenspieler mitgenommen hat.",
    basis: "research", sources: [SRC.plSetPieces],
  },
  "sturmlauf-kurzer-pfosten": {
    level: "medium", against: ["zone"], juniors: false, needsHeader: true, effort: "ca. 3 × 15 Min.",
    pros: [
      "Arsenal erzielte 2025/26 einen Premier-League-Rekord an Eckballtoren (18, Stand 20.05.2026) und setzte dabei auf Läufe vom langen an den kurzen Pfosten.",
      "Die Läufer kommen mit Anlauf in den Fünfmeterraum und drängen Raumverteidiger aus ihrer Position.",
      "Zum Tor drehende Ecken führten in der Premier League etwas öfter zu Toren als wegdrehende (5,3 % gegen 3,6 %, Opta laut Total Football Analysis).",
      "Der Spieler am langen Pfosten und der Rückraum fangen Verlängerungen und Abpraller ab.",
    ],
    cons: [
      "Braucht einen Schützen, der scharf zum Tor dreht, und einen kopfballstarken Zielspieler. Für Junioren ist das oft zu hoch.",
      "Der Torhüterposten muss regelkonform stehen, ohne Halten oder Stossen. Sonst gibt es Foulpfiff.",
      "Die Zahlen stammen aus der Premier League. Bei Amateuren hängt viel mehr an der Qualität der einzelnen Hereingabe.",
    ],
    tip: "Alle starten erst beim Ballkontakt des Schützen. Wer zu früh oder aus dem Stand läuft, kommt ohne Tempo an.",
    basis: "research", sources: [SRC.plRecord, SRC.analyst, SRC.plSetPieces],
  },
  "drei-wellen": {
    level: "hard", against: ["hybrid"], juniors: false, needsHeader: true, effort: "ca. 3 Einheiten",
    pros: [
      "Der späte Läufer kommt in eine Lücke, die erst durch die beiden ersten Wellen entsteht. So fiel Freiburgs Kopfballtor gegen Köln.",
      "Die Wirkung kommt aus dem Timing, nicht aus überlegener Körpergrösse.",
      "Freiburg hatte laut Tactical Football Analysis den besten Wert der Top-5-Ligen bei erwarteten Toren (xG) pro 10 Ecken: 0,72.",
    ],
    cons: [
      "Braucht 7 Spieler im Strafraum. Gegen einen Konter bleiben dann nur wenige hinten.",
      "Das Timing braucht mehrere Einheiten. Starten die Wellen gleichzeitig, steht alles in einem Knäuel.",
      "Die zweite Welle bindet Verteidiger nur regelkonform, also ohne Halten oder Stossen. Sonst pfeift der Schiedsrichter.",
    ],
    tip: "Zum Einstieg Welle 1 auf zwei Läufer kürzen und das Nacheinander der Wellen zuerst ohne Gegner üben.",
    basis: "research", sources: [SRC.freiburg],
  },
  "kurze-ecke-neuer-winkel": {
    level: "easy", against: ["deep", "man"], juniors: true, needsHeader: false, effort: "ca. 15 Min. in einer Einheit",
    pros: [
      "Braucht keinen Kopfballspezialisten und nur wenige Spieler, darum gut auf Amateure übertragbar.",
      "Lockt Verteidiger aus dem Fünfmeterraum, die Flanke kommt danach aus einem neuen Winkel.",
      "Arsenal erzielte 2025/26 laut The Analyst ein Eckballtor durch Eberechi Eze nach kurzer Ecke.",
    ],
    cons: [
      "Wirkt vor allem als Überraschung. Beim dritten Mal im selben Spiel stellt sich der Gegner darauf ein.",
      "Schickt der Gegner einen zweiten Verteidiger zur Eckfahne, ist der Doppelpass zugestellt.",
      "Der Rückraum muss besetzt bleiben, sonst wird ein Ballverlust an der Eckfahne zum Konter.",
    ],
    tip: "Schnell ausführen, bevor die Abwehr einen zweiten Spieler zur Eckfahne schickt.",
    basis: "research", sources: [SRC.analyst],
  },
  "zug-langer-pfosten": {
    level: "easy", against: ["man"], juniors: true, needsHeader: false, effort: "ca. 2 × 15 Min.",
    pros: [
      "Braucht keinen Kopfballriesen: Die Läufe im Bogen schütteln den Gegenspieler ab, der Kopfball kommt oft ohne Duell.",
      "Feste Reihenfolge und feste Zonen, das lernen auch Junioren schnell.",
      "Die U17 der Vereinigten Arabischen Emirate erzielte so an der U17-WM 2025 ihr einziges Turniertor (Total Football Analysis).",
    ],
    cons: [
      "Kleine Datengrundlage: laut Total Football Analysis 10 Ecken im Turnier, ein Tor und ein aberkanntes Tor.",
      "Der Schütze muss hoch und genau an den langen Pfosten treffen. Zu kurze Bälle landen beim ersten Verteidiger.",
      "Der Torhüterposten muss regelkonform bleiben, ohne Halten oder Stossen, sonst gibt es Foulpfiff.",
    ],
    tip: "Die erste Bewegung geht immer im Bogen zum Ball hin. Wer gerade losläuft, nimmt seinen Gegenspieler mit.",
    basis: "research", sources: [SRC.uae],
  },
  "zug-mit-torhueterblock": {
    level: "medium", against: ["man"], juniors: true, needsHeader: true, effort: "ca. 2 × 15 Min.",
    pros: [
      "Durch das späte Lösen aus dem Zug entsteht irgendwo ein 2-gegen-1, das Manndecker nicht abdecken können.",
      "Mainz U19 kam laut Total Football Analysis mit solchen Routinen im Schnitt auf etwa ein Tor pro 10 Ecken (Junioren, U19).",
      "Der Läufer an der kurzen Seite sichert auch zu kurz getretene Ecken ab.",
    ],
    cons: [
      "Gegen Raumdeckung müssen Ort und Zeitpunkt der Blocks exakt stimmen, sonst bringt der Zug wenig.",
      "Zwei Spieler stehen nah am Torhüter. Halten oder Stossen pfeift der Schiedsrichter, erlaubt ist nur regelkonformes Im-Weg-Stehen.",
      "Fast alle Spieler sind im Strafraum, gegen einen Konter sichert nur der Rückraum.",
    ],
    tip: "Der Zug löst sich erst beim Ballkontakt des Schützen, nicht schon beim Anlauf.",
    basis: "research", sources: [SRC.mainz],
  },
  "anker-vor-dem-manndecker": {
    level: "medium", against: ["man"], juniors: false, needsHeader: true, effort: "ca. 2 × 15 Min.",
    pros: [
      "Die Anker stehen zwischen Tor und Manndecker, der Verteidiger kommt nicht mehr direkt an den Ball.",
      "Verlängerung, Läufer aus der Tiefe und langer Pfosten geben auch bei ungenauen Ecken eine zweite Chance.",
      "Der 1. FC Köln hatte laut Total Football Analysis die meisten Eckball-xG (erwartete Tore) der Bundesliga, die Saison ist im Artikel unklar.",
    ],
    cons: [
      "Die Ecke muss genau sein: zu lang wird sie geklärt, zu kurz steht der Anker im Weg.",
      "Gegen reine Raumdeckung fehlt der Manndecker, vor den sich der Anker stellen kann.",
      "Die Anker müssen ihre Position gegen Druck halten, ohne selbst zu halten oder zu stossen. Sonst gibt es Foulpfiff.",
    ],
    tip: "Liegt der Ball frei im Fünfmeterraum, geht er zuerst aufs Tor, nicht zum Mitspieler.",
    basis: "research", sources: [SRC.koeln],
  },
  "taeuschung-kurz-angriff-lang": {
    level: "hard", against: ["man", "zone"], juniors: false, needsHeader: true, effort: "ca. 3 Einheiten",
    pros: [
      "Vier Spieler bleiben zur Absicherung draussen, ein Konter nach geklärter Ecke ist so besser abgedeckt.",
      "Der Zielspieler täuscht den kurzen Pfosten an und gewinnt so einen Schritt auf seinen Gegenspieler.",
      "Laut Total Football Analysis Teil von Arsenals Eckballkonzept, bei dem die Absicherung fest eingeplant ist.",
    ],
    cons: [
      "Die Störer aus dem toten Winkel müssen regelkonform im Weg stehen, ohne Halten oder Stossen. Sonst gibt es Foulpfiff.",
      "Zehn Spieler mit festen Rollen: Es braucht mehrere Einheiten, bis Täuschung, Störer und Flanke zusammenpassen.",
      "Ohne einen Schützen, der genau in den Fünfmeterraum am langen Pfosten trifft, verpufft die Täuschung.",
    ],
    tip: "Die Störer lösen sich spät aus der Gruppe. Kommen sie zu früh, stellt sich der letzte Raumverteidiger um.",
    basis: "research", sources: [SRC.arsenalRest],
  },
  "ecke-angetippt-dribbling": {
    level: "easy", against: ["unset"], juniors: true, needsHeader: false, effort: "ca. 10 Min. in einer Einheit",
    pros: [
      "Überrascht die ganze Abwehr, weil alle auf eine normale Hereingabe warten.",
      "Braucht weder Kopfballspieler noch eine präzise Flanke.",
      "Kurzer Ablauf mit zwei Hauptakteuren, wenig Trainingszeit nötig.",
    ],
    cons: [
      "Nur einmal pro Spiel einsetzbar, danach achtet der Gegner auf die Eckfahne.",
      "Berührt der Schütze den Ball nach dem Antippen als Nächster noch einmal, gibt es einen indirekten Freistoss für den Gegner.",
      "Bewegt sich der Ball nicht sichtbar, ist er nicht im Spiel. Der Schiedsrichter lässt dann wiederholen.",
    ],
    tip: "Der Schütze bewegt den Ball sichtbar und geht dann ruhig weg, der Dribbler startet erst danach.",
    basis: "ai",
  },
  "ecke-strafraumrand-volley": {
    level: "medium", against: ["deep"], juniors: false, needsHeader: false, effort: "ca. 2 × 15 Min.",
    pros: [
      "Die Spieler im Strafraum ziehen die Verteidiger zum Tor, der Strafraumrand ist dann oft frei.",
      "Der Abschluss kommt mit dem Fuss, die Körpergrösse der Spieler ist hier kein Thema.",
      "Passt gegen Teams, die mit allen Spielern tief im Strafraum verteidigen.",
    ],
    cons: [
      "Ein Volley vom Strafraumrand ist technisch schwer. Im Amateurbereich geht der Ball oft weit am Tor vorbei.",
      "Bleibt der Abschluss in der Abwehr hängen, kontert der Gegner gegen wenige Absicherer.",
      "Wer dem Torhüter die Sicht nimmt, muss regelkonform stehen, ohne Halten oder Stossen.",
    ],
    tip: "Der Spieler am Rand startet erst, wenn der Ball unterwegs ist. Steht er zu früh dort, wird er gedeckt.",
    basis: "ai",
  },
  // ─── Ecken Abwehr ───
  "zonal-wall": {
    level: "easy", against: [], juniors: true, needsHeader: true, effort: "ca. 2 × 15 Min.",
    pros: [
      "Jeder kennt seinen Raum. Das ist für Teams ohne grosse Kopfballspieler leichter zu lernen als Manndeckung.",
      "Blocks und Ablenkungsläufe des Gegners wirken weniger, weil niemand einem Läufer folgen muss.",
      "Die Zuteilung bleibt gleich, egal welche Spieler der Gegner nach vorne schickt.",
    ],
    cons: [
      "Angreifer mit Anlauf gewinnen oft das Kopfballduell gegen Verteidiger, die aus dem Stand springen.",
      "Zwischen den Zonen entstehen Lücken. Wer dort ankommt, hat oft keinen direkten Gegenspieler.",
      "Wer in seiner Zone abwartet statt zum Ball zu gehen, verliert den ersten Kontakt.",
    ],
    tip: "Kommt der Ball in die Zone, geht der Spieler entschlossen hin und klärt hoch und breit, nicht in die Mitte.",
    basis: "ai",
  },
  "man-mark-press": {
    level: "medium", against: [], juniors: true, needsHeader: true, effort: "ca. 15 Min. in einer Einheit",
    pros: [
      "Klare Verantwortung: Nach einem Gegentor ist sofort sichtbar, wer seinen Gegenspieler verloren hat.",
      "Gefährliche Kopfballspieler des Gegners lassen sich gezielt mit den eigenen Stärksten decken.",
      "Der Konterspieler bleibt vorne und kann nach einer Klärung sofort starten.",
    ],
    cons: [
      "Blocks, Ketten und Ablenkungsläufe lösen Manndecker leicht von ihrem Gegenspieler.",
      "Hängt an der Zuteilung vor dem Spiel. Fehlt ein Spieler oder wechselt der Gegner, entsteht schnell Durcheinander.",
      "Wer nur auf den Mann schaut, verliert den Ball aus den Augen und reagiert zu spät auf Abpraller.",
    ],
    tip: "Vor jeder Ecke laut die Zuteilung abfragen, damit kein Gegner ungedeckt im Strafraum steht.",
    basis: "ai",
  },
  "gemischte-deckung-4-5": {
    level: "medium", against: [], juniors: false, needsHeader: true, effort: "ca. 3 × 20 Min.",
    pros: [
      "Die Raumspieler schützen den Fünfmeterraum, die Manndecker nehmen die stärksten Kopfballspieler des Gegners.",
      "Der VfB Stuttgart verteidigt so und kassierte laut Total Football Analysis (Stand 16.04.2026, 29 Spiele) nur ein Gegentor nach Standards.",
      "Ein Manndecker kann sich in den Laufweg eines Blockers stellen, statt direkt vor dem Torhüter zu stehen (so bei Arsenal gesehen).",
    ],
    cons: [
      "Braucht zehn Spieler im und am Strafraum, vorne bleibt kaum jemand für einen Konter.",
      "Raumspieler und Manndecker müssen wissen, wer bei Läufen zwischen den Zonen übernimmt. Das braucht Abstimmung.",
      "Die Werte stammen aus der Bundesliga. Mit Amateurspielern braucht die Abstimmung deutlich mehr Training.",
    ],
    tip: "Die Raumspieler dürfen aus ihrer Zone nach vorne zum Ball, der Strafraumrand bleibt aber besetzt.",
    basis: "research", sources: [SRC.stuttgart, SRC.brentford, SRC.gkBlocks],
  },
  // ─── Freistösse ───
  "wall-buster": {
    level: "medium", against: ["wall"], juniors: false, needsHeader: false, effort: "ca. 15 Min. pro Einheit, über Wochen",
    pros: [
      "Mit einem guten Schützen eine direkte Torchance ohne Zwischenstation.",
      "Der Täuscher lässt Mauer und Torhüter zu früh reagieren.",
      "Mauerläufer und Nachsetzer sind bei Abprallern vom Torhüter schon unterwegs.",
    ],
    cons: [
      "Steht und fällt mit einem Schützen, der den Ball mit Effet über oder um die Mauer bringt. Das ist Einzeltechnik.",
      "Bleibt der Ball in der Mauer hängen, droht ein Konter gegen eine aufgerückte Mannschaft.",
      "Ein zu durchschaubarer Täuscher bringt nichts, die Mauer springt erst beim echten Schuss.",
    ],
    tip: "Der Schütze übt den Schuss allein vor oder nach dem Training, im Teamtraining nur noch den Ablauf mit Täuscher.",
    basis: "ai",
  },
  "training-ground-special": {
    level: "medium", against: ["wall"], juniors: true, needsHeader: false, effort: "ca. 3 × 15 Min.",
    pros: [
      "Zwei Täuscher binden Mauer und Torhüter, der Schuss kommt aus einem neuen Winkel.",
      "Der flache, harte Schuss ist leichter zu treffen als ein Ball über die Mauer.",
      "Passt gegen Gegner, die nur den direkten Schuss erwarten.",
    ],
    cons: [
      "Drei Spieler müssen das Timing genau treffen. Läuft einer zu früh, ist die Täuschung durchschaut.",
      "Nach dem Pass darf die Mauer herauslaufen und den Schuss blocken.",
      "Einmal gezeigt, ist die Variante beim Gegner bekannt.",
    ],
    tip: "Der Passgeber legt erst ab, wenn beide Täuscher am Ball vorbei sind, nicht vorher.",
    basis: "ai",
  },
  "quick-wide-play": {
    level: "easy", against: ["unset"], juniors: true, needsHeader: true, effort: "ca. 10 Min. in einer Einheit",
    pros: [
      "Die Abwehr hat keine Zeit, sich im Strafraum zu ordnen.",
      "Einfacher Ablauf mit nur zwei Pässen bis zur Flanke.",
      "Lässt sich in Spielformen im Training einbauen, ohne eigene Standardübung.",
    ],
    cons: [
      "Zögert der Ausführende, ist der Vorteil weg und es bleibt eine normale Flanke.",
      "Die frühe Flanke braucht Abnehmer, die im Kopfball gegen Verteidiger bestehen.",
      "Lässt der Schiedsrichter auf Pfiff ausführen, ist die schnelle Ausführung nicht möglich.",
    ],
    tip: "Der erste Pass kommt sofort, auch wenn noch nicht alle Läufer im Strafraum sind.",
    basis: "ai",
  },
  "freistoss-aussen-weglocken": {
    level: "medium", against: ["man"], juniors: false, needsHeader: true, effort: "ca. 2 × 15 Min.",
    pros: [
      "Der Weglocker zieht den Abprallspieler des Gegners aus dem Strafraum, am langen Pfosten entsteht Raum.",
      "Ohne die riskante Abseitsfalle aus dem Bayern-Original, darum für Amateure besser geeignet.",
      "Bayern München erzielte 2025/26 laut Tactical Football Analysis die meisten Standardtore der Bundesliga (22).",
    ],
    cons: [
      "Der Blocker muss stehen bleiben und darf nicht halten oder stossen, sonst pfeift der Schiedsrichter Foul.",
      "Die Hereingabe muss genau an den langen Pfosten drehen. Ein zu kurzer Ball landet beim ersten Verteidiger.",
      "Der Ablauf ist aus der Beschreibung eines Profiteams übertragen und vereinfacht, nicht exakt nachgebaut.",
    ],
    tip: "Alle Läufe starten erst beim Anlauf des Schützen, sonst verrät der Weglocker die Variante zu früh.",
    basis: "research", sources: [SRC.bayern],
  },
  "kette-loest-sich-auf": {
    level: "easy", against: ["man"], juniors: true, needsHeader: true, effort: "ca. 15 Min. in einer Einheit",
    pros: [
      "Fünf Läufe gleichzeitig in fünf Richtungen: Manndecker wissen nicht, wen sie nehmen sollen.",
      "Einfach zu erklären, jeder hat genau eine Zone.",
      "Der Spieler hinter dem langen Pfosten bleibt oft ohne Gegenspieler.",
    ],
    cons: [
      "Gegen Raumdeckung verpufft der Effekt, weil die Verteidiger in ihren Zonen warten.",
      "Laufen zwei Spieler in dieselbe Richtung, stehen sie sich im Weg und die Ordnung ist weg.",
      "Die Kette ist auffällig. Ein vorbereiteter Gegner stellt sich schon vor dem Anlauf darauf ein.",
    ],
    tip: "Die Kette löst sich erst beim Anlauf des Schützen. Wer früher geht, gibt den Verteidigern Zeit.",
    basis: "ai",
  },
  "freistoss-flach-in-den-lauf": {
    level: "easy", against: ["zone"], juniors: true, needsHeader: false, effort: "ca. 15 Min. in einer Einheit",
    pros: [
      "Die Abwehr erwartet die hohe Flanke, der flache Ball hinter die Linie überrascht.",
      "Alles läuft flach am Boden, Kopfballspieler sind nicht nötig.",
      "Die flache Hereingabe durch den Fünfmeterraum ist für den Torhüter schwer abzufangen.",
    ],
    cons: [
      "Zwei flache Pässe müssen genau sitzen. Ein Fehlpass, und der Angriff ist vorbei.",
      "Funktioniert nur, wenn die Lockvögel wirklich wie bei einer Flanke stehen und Verteidiger binden.",
      "Der Läufer aus der Tiefe muss auf Abseits achten und darf erst beim Pass hinter die Linie laufen.",
    ],
    tip: "Der Läufer aus der Tiefe startet spät, damit kein Verteidiger seinen Lauf früh erkennt.",
    basis: "ai",
  },
  "mauer-ende-anspiel": {
    level: "easy", against: ["wall"], juniors: true, needsHeader: false, effort: "ca. 10 Min. in einer Einheit",
    pros: [
      "Alle erwarten den Schuss, die Mauer springt und der Spieler am Mauerende steht frei.",
      "Braucht keinen Freistossspezialisten, nur einen genauen flachen Pass und einen sauberen Abschluss.",
      "Funktioniert auch aus Distanzen, aus denen ein direkter Schuss wenig bringt.",
    ],
    cons: [
      "Der Spieler am Mauerende muss mit dem Rücken zum Tor annehmen und mit dem ersten Kontakt aufdrehen.",
      "Stellt der Gegner einen Spieler neben die Mauer, ist der Pass zugestellt.",
      "Einmal gezeigt, ist die Variante bekannt. Eher für einen Einsatz pro Spiel.",
    ],
    tip: "Der Täuscher läuft wirklich wie zum Schuss an, sonst bleibt die Mauer ruhig und deckt den Mann am Ende.",
    basis: "ai",
  },
  "schneller-freistoss": {
    level: "easy", against: ["unset"], juniors: true, needsHeader: false, effort: "ca. 10 Min. in einer Einheit",
    pros: [
      "Die Abwehr ist noch nicht sortiert, die Läufer haben viel Raum auf dem Flügel.",
      "Funktioniert auch weit vor dem Strafraum, nicht nur in Tornähe.",
      "Wenig Training nötig, es zählt vor allem die Aufmerksamkeit.",
    ],
    cons: [
      "Lässt der Schiedsrichter auf Pfiff ausführen, ist die schnelle Variante nicht erlaubt.",
      "Ein überhasteter langer Ball geht leicht ins Aus oder zum Gegner.",
      "Rücken alle mit nach vorne, fehlt bei Ballverlust die Absicherung.",
    ],
    tip: "Wer gefoult wurde, steht auf und schaut zuerst nach vorne, bevor er sich über das Foul ärgert.",
    basis: "ai",
  },
  "chip-hinter-die-linie": {
    level: "medium", against: ["high"], juniors: true, needsHeader: false, effort: "ca. 15 Min. in einer Einheit",
    pros: [
      "Nutzt den Raum hinter einer hoch stehenden Abwehrlinie, die auf eine Flanke wartet.",
      "Der Stürmer läuft mit Tempo auf den Ball, die Verteidiger müssen sich erst umdrehen.",
      "Abschluss mit dem Fuss nach einem Lauf, ohne Kopfballduell.",
    ],
    cons: [
      "Abseitsgefahr: Der Stürmer darf erst beim Schuss starten. Ein zu früher Lauf beendet die Aktion.",
      "Der Chip muss kurz hinter die Linie. Ist er zu lang, kommt der Torhüter heraus.",
      "Steht der Gegner tief, gibt es keinen Raum hinter der Linie.",
    ],
    tip: "Den Chip schnell ausführen, solange die Linie noch hoch steht und sich nicht zurückfallen lässt.",
    basis: "ai",
  },
  "seitlich-anlegen-direkt": {
    level: "easy", against: ["wall"], juniors: true, needsHeader: false, effort: "ca. 10 Min., Schütze übt zusätzlich",
    pros: [
      "Ein Meter zur Seite verändert den Winkel zur Mauer, sie deckt danach schlechter ab.",
      "Einfacher Ablauf mit nur zwei Spielern am Ball.",
      "Der Torhüter muss sich neu ausrichten, während der Schuss schon kommt.",
    ],
    cons: [
      "Braucht einen Schützen, der aus dem Lauf präzise schiesst. Ohne ihn bleibt die Variante harmlos.",
      "Nach der Ablage darf die Mauer herauslaufen. Eine zu weite Ablage gibt ihr Zeit zum Blocken.",
      "Lohnt sich nur aus kurzer Distanz vor dem Strafraum.",
    ],
    tip: "Die Ablage bleibt kurz und ruhig, der Schütze steht schon im Anlauf und schiesst sofort.",
    basis: "ai",
  },
  // ─── Einwürfe ───
  "long-throw-flick": {
    level: "medium", against: [], juniors: false, needsHeader: true, effort: "ca. 2 × 15 Min.",
    pros: [
      "Beim Einwurf gibt es kein Abseits, die Läufer können nah am Tor stehen.",
      "Eine Verlängerung am kurzen Pfosten ist für Torhüter und Abwehr schwer zu lesen.",
      "Mit vier Spielern machbar, die übrigen bleiben in ihrer Ordnung.",
    ],
    cons: [
      "Ohne einen Werfer, der den Ball weit und flach bis an den kurzen Pfosten bringt, funktioniert es nicht.",
      "Gewinnt der Verlängerer das Kopfballduell am kurzen Pfosten nicht, ist der Ball schnell geklärt.",
      "Weite Würfe brauchen Kraft und Technik. Bei jüngeren Spielern reicht die Weite oft nicht.",
    ],
    tip: "Der Abstauber startet schon beim Wurf, nicht erst bei der Verlängerung, sonst ist der Verteidiger schneller.",
    basis: "ai",
  },
  "einwurf-verlaengern-einrahmen": {
    level: "medium", against: [], juniors: false, needsHeader: true, effort: "ca. 2 × 20 Min.",
    pros: [
      "Mehrere Läufer rahmen das Tor ein, auch der zweite oder dritte Kontakt kann noch zum Abschluss führen.",
      "Der flache Wurf ist kurz in der Luft, die Abwehr hat wenig Zeit zum Reagieren.",
      "Leeds kam in der Premier League laut Total Football Analysis aus 75 weiten Einwürfen zu 28 Schüssen.",
      "Das Dreieck am Strafraumrand fängt geklärte Bälle ab und hält den Druck hoch.",
    ],
    cons: [
      "Ohne einen Werfer, der flach und weit bis an den kurzen Pfosten wirft, fällt die Variante weg.",
      "Zehn Spieler mit Aufgaben im und um den Strafraum: viel Abstimmung für einen einzelnen Einwurf.",
      "Die Zahlen stammen aus der Premier League. Bei Amateuren gelingen weite, flache Würfe seltener.",
    ],
    tip: "Flach und gerade werfen. Ein hoher Bogen gibt Torhüter und Abwehr zu viel Zeit.",
    basis: "research", sources: [SRC.longThrows, SRC.plSetPieces],
  },
  "schneller-einwurf-ueber-den-kopf": {
    level: "easy", against: ["unset"], juniors: true, needsHeader: false, effort: "ca. 10 Min. in einer Einheit",
    pros: [
      "Nutzt die Sekunden, in denen der Gegner noch nicht geordnet ist.",
      "Der hohe Spieler darf weit vorne stehen, weil es beim Einwurf kein Abseits gibt, und wartet auf den Ball in die Tiefe.",
      "Einfacher Ablauf mit drei Spielern, nach dem Ansatz des Einwurftrainers Thomas Grønnemark.",
    ],
    cons: [
      "Klappt nur, wenn der Werfer sofort bereit ist. Wer erst lange den Ball holt, verpasst den Moment.",
      "Ein ungenauer Wurf über den Kopf landet beim Gegner, der dann im Rücken des Zielspielers startet.",
      "Der Zielspieler muss glaubhaft kurz fordern, sonst bleibt der Verteidiger hinter ihm.",
    ],
    tip: "Der Wurf geht in den Lauf, nicht zum Spieler, und der Raumläufer startet genau mit dem Wurf.",
    basis: "research", sources: [SRC.groennemark],
  },
  "safe-outlet": {
    level: "easy", against: [], juniors: true, needsHeader: false, effort: "ca. 10 Min. in einer Einheit",
    pros: [
      "Senkt das Risiko eines Ballverlusts in der eigenen Hälfte.",
      "Drei Anspielstationen geben dem Werfer fast immer eine freie Option.",
      "Leicht zu lernen und für jede Altersstufe geeignet.",
    ],
    cons: [
      "Bringt kaum Raumgewinn, der Ball bleibt zunächst in der eigenen Hälfte.",
      "Stehen die kurzen Spieler still, sind sie leicht zugestellt und ein Fehlwurf droht.",
      "Ein Rückpass unter Druck kann in der eigenen Hälfte gefährlich werden.",
    ],
    tip: "Die kurzen Spieler bewegen sich vor dem Wurf weg und kommen dann entgegen, damit sie frei sind.",
    basis: "ai",
  },

  // ─── Aus Trainings- und Spielclips (27.11.2026): KI-Einschätzung, keine Recherche ───
  "corner-man-free-run": {
    "level": "medium",
    "against": [
      "man"
    ],
    "juniors": false,
    "needsHeader": true,
    "effort": "ca. 3 × 15 Min.",
    "pros": [
      "Nutzt aus, dass Manndecker jedem Lauf folgen: Die Gegenspieler stören sich beim Kreuzen gegenseitig.",
      "Der Zielspieler kommt mit Anlauf in einen Raum, den die Abwehr selbst geöffnet hat.",
      "Mit einer Ausweichlösung am zweiten Pfosten und einem Rückraumspieler abgesichert."
    ],
    "cons": [
      "Das Timing der Läufe braucht viele Wiederholungen, sonst läuft der Zielspieler zu früh los.",
      "Die Läufe dürfen nicht zum Block werden: Stehenbleiben im Weg ist ein Foul.",
      "Gegen Raumdeckung bringt das Kreuzen wenig."
    ],
    "tip": "Erst ohne Gegner üben, dann mit Manndeckern: Der Zielspieler startet erst, wenn die Läufer sich gekreuzt haben.",
    "basis": "ai"
  },
  "corner-man-cross-run": {
    "level": "medium",
    "against": [
      "man"
    ],
    "juniors": false,
    "needsHeader": true,
    "effort": "ca. 2 × 15 Min.",
    "pros": [
      "Zwei echte Ziele: Die Abwehr muss sich entscheiden, wem sie folgt.",
      "Der Ball kommt flach und scharf, das ist für den Torhüter schwer zu lesen.",
      "Nur wenige Spieler im Ablauf, die übrigen sichern ab."
    ],
    "cons": [
      "Eine scharfe, flache Ecke über die ganze Breite gelingt nicht jedem Schützen.",
      "Ein zusätzlicher Gegner am ersten Pfosten kann den Ball abfangen.",
      "Die Läufer brauchen Tempo und Abstimmung, sonst stehen sie sich im Weg."
    ],
    "tip": "Der Schütze wartet mit dem Schuss, bis der ferne Läufer die Kreuzung verlassen hat.",
    "basis": "ai"
  },
  "corner-mixed-zone-gap": {
    "level": "medium",
    "against": [
      "hybrid"
    ],
    "juniors": false,
    "needsHeader": true,
    "effort": "ca. 2 × 15 Min.",
    "pros": [
      "Zonen- und Manndecker sind sich in der Lücke dazwischen oft uneins, wer zuständig ist.",
      "Der Läufer kommt mit Anlauf gegen Verteidiger, die zum Ball schauen.",
      "Ein Zweitballspieler und ein Rückraumspieler sichern ab."
    ],
    "cons": [
      "Die Lücke ist schmal: Die Flanke muss auf wenige Meter genau kommen.",
      "Gegen reine Manndeckung gibt es keine Lücke, der Ablauf bringt dort nichts Besonderes.",
      "Der Lockläufer muss glaubhaft starten, sonst bindet er niemanden."
    ],
    "tip": "Den Zielraum mit Hütchen markieren und die Flanke zuerst ohne Gegner üben.",
    "basis": "ai"
  },
  "corner-short-feint": {
    "level": "easy",
    "against": [
      "deep",
      "man"
    ],
    "juniors": true,
    "needsHeader": false,
    "effort": "ca. 15 Min. in einer Einheit",
    "pros": [
      "Wenige Spieler im Ablauf, die Täuschung ist leicht zu erklären.",
      "Zieht einen Gegner aus dem Strafraum und öffnet einen freien Flankenwinkel.",
      "Passt auch für Junioren, weil keine Kopfballstärke nötig ist."
    ],
    "cons": [
      "Funktioniert nur, wenn ein Gegner auf die kurze Ecke reagiert.",
      "Ein Fehler in der Absprache (wer lässt durch, wer nimmt an) kostet den Ball.",
      "Die Flanke aus dem neuen Winkel muss trotzdem genau kommen."
    ],
    "tip": "Vor jedem Versuch ein Handzeichen vereinbaren, wer den Ball durchlässt.",
    "basis": "ai"
  },
  "corner-def-mixed": {
    "level": "medium",
    "against": [],
    "juniors": true,
    "needsHeader": true,
    "effort": "ca. 2 × 15 Min.",
    "pros": [
      "Klare Aufgaben: Pfosten, Zone, Mann und Sammler sind getrennt.",
      "Der Sammler sichert den zweiten Ball, nicht nur die erste Klärung.",
      "Lässt sich mit der eigenen Aufstellung der Mannschaft leicht anpassen."
    ],
    "cons": [
      "Wechselt der Gegner den Zielspieler, müssen die Manndecker Zuordnungen sofort tauschen.",
      "Pfostenspieler binden zwei Spieler, die im Zweikampf fehlen.",
      "Ohne feste Zuordnung vor dem Spiel entstehen Lücken."
    ],
    "tip": "Die Zuordnung vor jeder Ecke laut ansagen, besonders wenn der Gegner Läufer vertauscht.",
    "basis": "ai"
  },
  "freistoss-zwei-am-ball-fluegel": {
    "level": "medium",
    "against": [
      "wall",
      "man"
    ],
    "juniors": false,
    "needsHeader": true,
    "effort": "ca. 2 × 15 Min.",
    "pros": [
      "Die Mauer steht auf das Zentrum, der Flügel bleibt offen.",
      "Die Täuschung bindet Mauer und Torhüter, bevor der Pass kommt.",
      "Der Flügelspieler hat gegen den allein stehenden Aussenverteidiger Platz."
    ],
    "cons": [
      "Ob der Kurzpass im Originalclip Teil der Variante war, ist nicht belegt; die Vorlage ist ein Vorschlag.",
      "Das 1v1 hängt an einem Flügelspieler mit gutem Dribbling.",
      "Verlangsamt sich der Ablauf, ordnet sich die Abwehr neu."
    ],
    "tip": "Die Mauer vor dem Ausführen mit Hütchen genau auf 9,15 m stellen, sonst stimmt der Ablauf nicht.",
    "basis": "ai"
  },
  "corner-edge-cluster": {
    "level": "medium",
    "against": [
      "man",
      "deep"
    ],
    "juniors": false,
    "needsHeader": true,
    "effort": "ca. 2 × 15 Min.",
    "pros": [
      "Der Pulk bindet viele Gegner, die Strafraumkante bleibt frei.",
      "Der Kantenspieler hat Anlauf und freie Sicht.",
      "Ein Zweitball-Plan ist schon eingebaut."
    ],
    "cons": [
      "Der Ablauf stammt aus einem schwer lesbaren Clip und ist ein Trainingsvorschlag.",
      "Der Pulk muss den Ball treffen, sonst fehlt die Verlängerung.",
      "Steht ein Gegner an der Strafraumkante, ist die Variante bekannt."
    ],
    "tip": "Zuerst nur die Verlängerung zur Kante üben, dann den Lauf des Kantenspielers dazunehmen.",
    "basis": "ai"
  },
  "corner-short-edge-cross": {
    "level": "easy",
    "against": [
      "zone",
      "man"
    ],
    "juniors": true,
    "needsHeader": true,
    "effort": "ca. 15 Min. in einer Einheit",
    "pros": [
      "Ein freier Flankenwinkel ohne Zweikampf, wenn niemand herausrückt.",
      "Wenige Pässe, gut für Mannschaften mit sicherer Passtechnik.",
      "Der Zielspieler startet mit Anlauf hinter der Zonenlinie."
    ],
    "cons": [
      "Rückt ein Gegner heraus, ist der Ablauf blockiert.",
      "Verliert der Partner den ersten Kontakt, ist der Ball weg.",
      "Es braucht einen Kopfballspieler als Ziel."
    ],
    "tip": "Den Partner an der Linie zuerst ohne Gegner dreimal wiederholen lassen, damit der Pass im ersten Kontakt sitzt.",
    "basis": "ai"
  },
  "kickoff-outside-runner": {
    "level": "medium",
    "against": [
      "high"
    ],
    "juniors": false,
    "needsHeader": false,
    "effort": "ca. 2 × 15 Min.",
    "pros": [
      "Überrascht eine Abwehr, die nach dem Anstoss noch nicht geordnet steht.",
      "Vier gleichzeitige Läufe binden die Abwehrkette.",
      "Am Flügel entsteht ein 2v1 gegen einen allein stehenden Aussenverteidiger."
    ],
    "cons": [
      "Braucht einen Spieler mit sicherem langen Diagonalpass.",
      "Wer Ziel der vier Läufe ist, blieb im Clip offen; die Vorlage ist ein Trainingsvorschlag.",
      "Presst der Gegner anders, geht die Diagonale ins Leere."
    ],
    "tip": "Zuerst Rückpass und Starttempo ohne Gegner üben; die Diagonale erst, wenn alle vier gleichzeitig starten.",
    "basis": "ai"
  },
  "kickoff-inside-run": {
    "level": "medium",
    "against": [
      "high"
    ],
    "juniors": false,
    "needsHeader": false,
    "effort": "ca. 2 × 15 Min.",
    "pros": [
      "Nutzt die Lücke in einer Kette, die auf einer Linie steht.",
      "Der Läufer kommt mit Tempo von hinten, Verteidiger müssen drehen.",
      "Zwei weitere Läufer binden die Innenverteidiger."
    ],
    "cons": [
      "Der lange Ball muss auf wenige Meter genau in die Lücke fallen.",
      "Der Läufer darf nicht zu früh starten, sonst ist er im Abseits.",
      "Gegen eine tiefe Abwehr gibt es keinen Raum hinter der Kette."
    ],
    "tip": "Die Abseitslinie beim Training von einem Trainer an der Seitenlinie anzeigen lassen.",
    "basis": "ai"
  },
};
