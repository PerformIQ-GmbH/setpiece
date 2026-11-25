import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, PenLine, MousePointerClick, Users, Film, Eye, Hand, Send, Printer, PartyPopper,
  ListOrdered, Target, QrCode, UserPlus, Pencil, Trophy, CheckCircle2, ClipboardList, Wand2,
} from 'lucide-react';

export interface TourStep {
  title: string;
  icon: React.ElementType;
  /** Warum lohnt sich das? Eine Zeile, die den Nutzen nennt. */
  benefit: string;
  /** Was tue ich hier? Kurz und konkret. */
  body: string[];
  /** Abweichender Text für Handys. */
  mobileBody?: string[];
  /** Erster sichtbare Treffer gewinnt; ohne Treffer zentrierte Karte ohne Spotlight. */
  desktop?: string[];
  mobile?: string[];
  side?: 'right' | 'left' | 'bottom' | 'top';
  /** Abschlussschritt: Checkliste statt Text. */
  checklist?: Array<{ icon: React.ElementType; text: string }>;
  celebrate?: boolean;
}

export interface Tour {
  /** localStorage-Schlüssel; «true» = abgeschlossen oder übersprungen. */
  key: string;
  steps: TourStep[];
  restartHint?: string;
}

// v2: neue Tour; wer die alte Version schon weggeklickt hat, sieht diese einmal.
export const EDITOR_TOUR: Tour = {
  key: 'setpiece-tour-v2',
  restartHint: 'Die Tour startest du jederzeit neu über das Menü.',
  steps: [
    {
      title: 'Willkommen im Standards-Editor', icon: Sparkles,
      benefit: 'In 2 Minuten zum ersten Standard, den dein ganzes Team versteht.',
      body: ['Zeichne Laufwege statt lange zu erklären.', 'Jeder Spieler sieht seine Rolle auf dem Handy.', 'Gegner erkennen, Signal geben, richtig reagieren.'],
    },
    {
      title: 'Das Spielfeld', icon: MousePointerClick,
      benefit: 'Hier entsteht dein Standard. Was du siehst, sehen später die Spieler.',
      body: ['Klicke aufs Feld, um Spieler zu setzen und Wege zu zeichnen.', 'Doppelklick oder Enter beendet einen Weg.'],
      mobileBody: ['Tippe aufs Feld, um Spieler zu setzen und Wege zu zeichnen.', 'Zwei Finger zoomen, ein Finger verschiebt.'],
      desktop: ['[data-tutorial="pitch"]'], mobile: ['[data-tutorial="pitch"]'], side: 'bottom',
    },
    {
      title: 'Werkzeuge', icon: PenLine,
      benefit: 'Gestrichelt = Laufweg, durchgezogen = Pass. So liest jeder es sofort.',
      body: ['Wähle Spieler, Gegner, Ball, Laufweg oder Pass.', 'Tipp: V, R, L, P wählen Werkzeuge per Tastatur.'],
      mobileBody: ['Öffne die Werkzeuge unten links.', 'Wähle Spieler, Gegner, Ball, Laufweg oder Pass.'],
      desktop: ['[data-tutorial="toolbar"]'], mobile: ['[data-tutorial="mobile-tools"]'], side: 'right',
    },
    {
      title: 'Rollen und Spieler', icon: Users,
      benefit: 'Die App schlägt vor, wer am besten passt, nach Grösse, Kopfball und Tempo.',
      body: ['Jede Rolle wird ein Marker auf dem Feld.', 'Weise Spieler zu und lege eine Ersatzperson fest.'],
      mobileBody: ['Tippe auf das Spieler-Symbol unten rechts.', 'Dort legst du Rollen an und weist Spieler zu.'],
      desktop: ['[data-tutorial="inspector"]'], mobile: ['[data-tutorial="mobile-roles"]'], side: 'left',
    },
    {
      title: 'Phasen und Ablauf', icon: Film,
      benefit: 'Zeige den Ablauf in Schritten: wenn das, dann das.',
      body: ['Mit + fügst du eine Phase hinzu.', 'Play spielt den Ablauf ab, ideal zum Durchsprechen in der Garderobe.'],
      desktop: ['[data-tutorial="bottombar"]'], mobile: ['[data-tutorial="bottombar"]'], side: 'top',
    },
    {
      title: 'Varianten: Gegner erkennen', icon: Eye,
      benefit: 'Gegen Raumdeckung anders als gegen Manndeckung, ohne neuen Standard.',
      body: ['Pro Variante notierst du, woran man den Gegner erkennt.', 'Und welches Teamsignal gilt, zum Beispiel «Arm hoch».'],
      desktop: ['[data-tutorial="variants"]'], mobile: ['[data-tutorial="variants"]'], side: 'bottom',
    },
    {
      title: 'Für Spieler veröffentlichen', icon: Hand,
      benefit: 'Danach sieht jeder Spieler seine Rolle, mit Quiz und Rückmeldung an dich.',
      body: ['Erst wenn du veröffentlichst, sehen es die Spieler.', 'Änderungen bleiben Entwurf, bis du erneut veröffentlichst.'],
      mobileBody: ['Im Menü oben rechts veröffentlichst du für die Spieler.', 'Änderungen bleiben Entwurf, bis du erneut veröffentlichst.'],
      desktop: ['[data-tutorial="publish"]', '[data-tutorial="header"]'], mobile: ['[data-tutorial="menu"]', '[data-tutorial="header"]'], side: 'bottom',
    },
    {
      title: 'Du bist bereit', icon: PartyPopper, benefit: 'So geht es weiter:', body: [], celebrate: true,
      checklist: [
        { icon: PenLine, text: 'Standard zeichnen und Rollen zuweisen' },
        { icon: Eye, text: 'Variante mit Gegnererkennung und Signal anlegen' },
        { icon: Send, text: 'Für Spieler veröffentlichen' },
        { icon: Printer, text: 'Am Spieltag «Drucken → Garderobe» für den Aushang' },
      ],
    },
  ],
};

export const MATCHDAY_TOUR: Tour = {
  key: 'setpiece-tour-matchday-v1',
  restartHint: 'Die Tour startest du jederzeit neu mit «Tour» oben rechts.',
  steps: [
    {
      title: 'Dein Spieltag in 4 Schritten', icon: Sparkles,
      benefit: 'Vom Kader zum fertigen Blatt für die Garderobe, ohne Papierkram.',
      body: ['Aufstellung festlegen.', 'Rollen vorschlagen lassen.', 'Schützen bestimmen.', 'Ausdrucken und aufhängen.'],
    },
    {
      title: 'Aufstellung und Bank', icon: ListOrdered,
      benefit: 'Einmal wählen, alle Werkzeuge nutzen sie automatisch.',
      body: ['Wähle Startelf und Bank. Jeder Spieler steht nur auf einer Liste.', 'Mit «Save squad» speicherst du die Auswahl.'],
      desktop: ['[data-tutorial="squad"]'], mobile: ['[data-tutorial="squad"]'], side: 'bottom',
    },
    {
      title: 'Elfmeter und Freistoss', icon: Target,
      benefit: 'Die Schützen stehen gross auf dem Aushang. Niemand muss fragen.',
      body: ['Wähle bis zu 3 Schützen in Reihenfolge.', 'Speichern nicht vergessen.'],
      desktop: ['[data-tutorial="takers"]', '[data-tutorial="squad"]'], mobile: ['[data-tutorial="takers"]', '[data-tutorial="squad"]'], side: 'top',
    },
    {
      title: 'Assistent: Rollen vorschlagen', icon: Wand2,
      benefit: 'Die App schlägt für jeden Standard die passenden Spieler vor, mit Ersatz.',
      body: ['Der Vorschlag nutzt Grösse, Kopfball, Tempo und die Rollen der Spieler.', 'Du siehst Begründungen und übernimmst mit einem Klick.'],
      desktop: ['[data-tutorial="assistant"]'], mobile: ['[data-tutorial="assistant"]'], side: 'bottom',
    },
    {
      title: 'Ausdrucken für Garderobe und Bank', icon: Printer,
      benefit: 'Ein Blatt A4 oder A3: Gegner erkennen, Signal, Bild. Doppelt gedruckt dient es als Bankkarte.',
      body: ['Wähle «Drucken», dann Garderobe A4 oder A3.', 'Auf der Bank trägst du Wechsel direkt auf dem Blatt ein.'],
      desktop: ['[data-tutorial="print"]'], mobile: ['[data-tutorial="print"]'], side: 'bottom',
    },
    {
      title: 'Spieler informieren', icon: QrCode,
      benefit: 'Jeder Spieler öffnet seine Rolle per QR-Code oder Link im Handy.',
      body: ['«Share» erzeugt den Link für diesen Spieltag.', 'Du siehst, wer seine Aufgaben gelesen oder das Quiz bestanden hat.'],
      desktop: ['[data-tutorial="share"]'], mobile: ['[data-tutorial="share"]'], side: 'bottom',
    },
    {
      title: 'Bereit für den Spieltag', icon: PartyPopper, benefit: 'Kurz zusammengefasst:', body: [], celebrate: true,
      checklist: [
        { icon: ListOrdered, text: 'Aufstellung und Schützen speichern' },
        { icon: Wand2, text: 'Assistent Rollen vorschlagen lassen' },
        { icon: Printer, text: 'Drucken → Garderobe, doppelt für die Bank' },
        { icon: QrCode, text: 'Link an die Spieler schicken' },
      ],
    },
  ],
};

export const ROSTER_TOUR: Tour = {
  key: 'setpiece-tour-roster-v1',
  restartHint: 'Die Tour startest du jederzeit neu mit «Tour» oben rechts.',
  steps: [
    {
      title: 'Dein Kader in 1 Minute', icon: Sparkles,
      benefit: 'Spieler tragen ihre Daten selbst ein, du sparst dir das Abtippen.',
      body: ['Per QR-Code oder Link beitreten lassen.', 'Fehlende Werte schnell nachtragen.'],
    },
    {
      title: 'Spieler einladen', icon: QrCode,
      benefit: 'Ein Link oder QR-Code genügt. Kein Konto, kein Passwort für Spieler.',
      body: ['Der Spieler gibt Name, Nummer, Grösse, Fuss, Kopfball, Tempo und seine Standard-Rollen an.', 'Du kannst den Link jederzeit ersetzen oder sperren.'],
      desktop: ['[data-tutorial="invite"]'], mobile: ['[data-tutorial="invite"]'], side: 'bottom',
    },
    {
      title: 'Schnell nachtragen', icon: Pencil,
      benefit: 'Die Rollenvorschläge werden so gut wie die Daten. Hier ergänzt du sie in Sekunden.',
      body: ['Fuss, Grösse, Kopfball und Tempo änderst du direkt in der Zeile.', 'Gelbe «Selbstangabe» heisst: vom Spieler eingetragen. Speichern bestätigt sie.'],
      desktop: ['[data-tutorial="roster-table"]'], mobile: ['[data-tutorial="roster-table"]'], side: 'top',
    },
    {
      title: 'Spieler von Hand anlegen', icon: UserPlus,
      benefit: 'Für Spieler ohne Handy: du trägst alles selbst ein.',
      body: ['Dort kannst du auch Merkmale wie Schütze, Läufer oder Kopfballspieler setzen.'],
      desktop: ['[data-tutorial="add-player"]'], mobile: ['[data-tutorial="add-player"]'], side: 'bottom',
    },
    {
      title: 'Fertig', icon: PartyPopper, benefit: 'So geht es weiter:', body: [], celebrate: true,
      checklist: [
        { icon: QrCode, text: 'Link oder QR-Code ans Team schicken' },
        { icon: Pencil, text: 'Fehlende Werte in der Liste ergänzen' },
        { icon: Wand2, text: 'Danach schlägt der Assistent die Rollen vor' },
      ],
    },
  ],
};

export const PLAYER_LIST_TOUR: Tour = {
  key: 'setpiece-tour-player-list-v1',
  steps: [
    {
      title: 'Willkommen im Team', icon: Sparkles,
      benefit: 'Hier siehst du deine Aufgaben bei Standards. Das dauert pro Standard eine Minute.',
      body: ['Lies deine Rolle.', 'Erkenne das Signal.', 'Mach das kurze Quiz.'],
    },
    {
      title: 'Dein Fortschritt', icon: Trophy,
      benefit: 'So siehst du auf einen Blick, was noch offen ist.',
      body: ['Der Balken zählt alle erforderlichen Aufgaben, die du angesehen hast.'],
      desktop: ['[data-tutorial="player-progress"]'], mobile: ['[data-tutorial="player-progress"]'], side: 'bottom',
    },
    {
      title: 'Deine Aufgaben', icon: ClipboardList,
      benefit: 'Erforderliche zuerst, Optionales danach.',
      body: ['Tippe eine Aufgabe an, um deine Rolle zu sehen.', 'Ein grüner Haken heisst: erledigt.'],
      desktop: ['[data-tutorial="player-tasks"]'], mobile: ['[data-tutorial="player-tasks"]'], side: 'top',
    },
    {
      title: 'Los geht’s', icon: PartyPopper, benefit: 'Dein Ablauf:', body: [], celebrate: true,
      checklist: [
        { icon: ClipboardList, text: 'Aufgabe antippen und deine Rolle lesen' },
        { icon: Eye, text: 'Gegner erkennen und Teamsignal merken' },
        { icon: Trophy, text: 'Quiz machen, damit dein Trainer es weiss' },
      ],
    },
  ],
};

export const PLAYER_TASK_TOUR: Tour = {
  key: 'setpiece-tour-player-task-v1',
  steps: [
    {
      title: 'Deine Rolle', icon: Trophy,
      benefit: 'Das ist deine Aufgabe bei diesem Standard, in einem Satz.',
      body: ['Schau auch aufs Spielfeld: dort ist deine Position markiert.'],
      desktop: ['[data-tutorial="player-role"]'], mobile: ['[data-tutorial="player-role"]'], side: 'bottom',
    },
    {
      title: 'Gegner erkennen, Signal', icon: Eye,
      benefit: 'Daran siehst du, welche Variante gespielt wird.',
      body: ['«Gegner erkennen» sagt dir, worauf du achtest.', '«Teamsignal» ist das Zeichen deines Teams.'],
      desktop: ['[data-tutorial="player-cues"]', '[data-tutorial="player-role"]'], mobile: ['[data-tutorial="player-cues"]', '[data-tutorial="player-role"]'], side: 'bottom',
    },
    {
      title: 'Verstanden? Quiz', icon: CheckCircle2,
      benefit: 'Mit dem Quiz zeigst du deinem Trainer, dass du bereit bist.',
      body: ['«Acknowledge» heisst: gelesen. «Unsure?» meldet deinem Trainer, dass du Fragen hast.', 'Das Quiz dauert eine Minute.'],
      desktop: ['[data-tutorial="player-quiz"]'], mobile: ['[data-tutorial="player-quiz"]'], side: 'top',
    },
  ],
};

/**
 * Startet eine Tour einmal automatisch, sobald die Seite bereit ist, und
 * erlaubt jederzeit den Neustart (z. B. über einen «Tour»-Knopf).
 */
export function useGuidedTour(tour: Tour, ready: boolean) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let seen = false;
    try { seen = localStorage.getItem(tour.key) === 'true'; } catch { seen = true; }
    if (seen) return;
    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [ready, tour.key]);
  const start = useCallback(() => {
    try { localStorage.removeItem(tour.key); } catch { /* private mode */ }
    setOpen(true);
  }, [tour.key]);
  const close = useCallback(() => setOpen(false), []);
  return { open, start, close };
}
