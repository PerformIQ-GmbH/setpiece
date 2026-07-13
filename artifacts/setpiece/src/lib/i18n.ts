// Minimal i18n: `t('English source string')` returns the German translation
// when the app language is German, otherwise the key itself. English strings
// double as keys, so untranslated surfaces gracefully stay English.
//
// The language is resolved once at load; switching (Settings) reloads the
// app — language changes are rare enough that a reactive context would be
// pure overhead.

export type AppLang = 'en' | 'de';
export type LangSetting = AppLang | 'auto';

const STORAGE_KEY = 'setpiece-lang';

export function getLangSetting(): LangSetting {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'de' || v === 'en') return v;
  } catch { /* SSR/private mode */ }
  return 'auto';
}

function resolveLang(): AppLang {
  const setting = getLangSetting();
  if (setting !== 'auto') return setting;
  try {
    return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
  } catch {
    return 'en';
  }
}

export const LANG: AppLang = resolveLang();

export function setLangSetting(lang: LangSetting): void {
  try {
    if (lang === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, lang);
  } catch { /* ignore */ }
  window.location.reload();
}

const de: Record<string, string> = {
  // Navigation & layout
  'Dashboard': 'Übersicht',
  'Pricing': 'Preise',
  'Settings': 'Einstellungen',
  'Overview': 'Team-Übersicht',
  'Players': 'Spieler',
  'Set Pieces': 'Standards',
  'Matchdays': 'Spieltage',
  'Readiness': 'Bereitschaft',
  'All Teams': 'Alle Teams',
  'Team': 'Team',
  'Logout': 'Abmelden',
  'Sign Out': 'Abmelden',

  // Team dashboard
  'New Set Piece': 'Neuer Standard',
  'Ready': 'Bereit',
  'Readiness Overview': 'Bereitschafts-Übersicht',
  'View All': 'Alle anzeigen',
  'Not Opened': 'Nicht geöffnet',
  'Opened': 'Geöffnet',
  'Passed': 'Bestanden',
  'Needs Review': 'Wiederholen',
  'Active Set Pieces': 'Aktive Standards',
  'No active set pieces yet. Create one from the template library.': 'Noch keine aktiven Standards. Erstelle einen aus der Vorlagen-Bibliothek.',
  'Browse Templates': 'Vorlagen ansehen',

  // Scoreboard
  'Set-Piece Scoreboard': 'Standards-Bilanz',
  'Log results on matchday with one tap': 'Ergebnisse am Spieltag mit einem Tap erfassen',
  'Goals': 'Tore',
  'Chances': 'Chancen',
  'Executed': 'Ausgeführt',
  'Goal': 'Tor',
  'Chance': 'Chance',
  'No effect': 'Ohne Wirkung',
  'No results yet': 'Noch keine Ergebnisse',
  'goal': 'Tor',
  'goals': 'Tore',
  'chance': 'Chance',
  'chances': 'Chancen',
  'All set pieces': 'Alle Standards',
  'Undo': 'Rückgängig',
  'logged': 'erfasst',
  'Could not save the result': 'Ergebnis konnte nicht gespeichert werden',
  'Please try again.': 'Bitte erneut versuchen.',

  // Editor chrome
  'Export PDF': 'PDF exportieren',
  'Exporting…': 'Exportiere…',
  'Recording…': 'Nehme auf…',
  'Share Video': 'Video teilen',
  'Video shared': 'Video geteilt',
  'Video downloaded': 'Video heruntergeladen',
  'Attach it to your team chat (e.g. WhatsApp) to share the routine.': 'Häng es an den Team-Chat (z. B. WhatsApp), um die Variante zu teilen.',
  'Video export failed': 'Video-Export fehlgeschlagen',
  'Could not record the video.': 'Das Video konnte nicht aufgenommen werden.',
  'Ghost View': 'Ghost-Ansicht',
  'Mark Ready': 'Als bereit markieren',
  'Tutorial': 'Tutorial',
  'Show Legend': 'Legende anzeigen',
  'Hide Legend': 'Legende ausblenden',
  'New Role': 'Neue Rolle',
  'Create Role': 'Rolle erstellen',
  'Add Label': 'Beschriftung hinzufügen',
  'Label text...': 'Text der Beschriftung…',
  'e.g. Near Post Flick': 'z. B. Verlängerung erster Pfosten',
  'Empty Board': 'Leeres Board',
  'Tap the tool button to place players and draw movements.': 'Tippe auf das Werkzeug-Symbol, um Spieler zu platzieren und Laufwege zu zeichnen.',
  'Use the toolbar to place players and draw movements. Start with the Team Player tool to add your first role.': 'Platziere Spieler und zeichne Laufwege über die Werkzeugleiste. Starte mit dem Spieler-Werkzeug für deine erste Rolle.',
  'Delete this role?': 'Diese Rolle löschen?',
  'This will remove the role and its assignment from this set piece.': 'Die Rolle und ihre Zuordnung werden aus diesem Standard entfernt.',
  'Delete': 'Löschen',
  'Loading Tactical Board...': 'Taktikboard wird geladen…',
  'Set piece not found.': 'Standard nicht gefunden.',
  'Zoom in': 'Hineinzoomen',
  'Zoom out': 'Herauszoomen',
  'Reset zoom': 'Zoom zurücksetzen',

  // Editor toolbar / bottom bar
  'Select': 'Auswählen',
  'Select & Move': 'Auswählen & Verschieben',
  'Run Path (dashed)': 'Laufweg (gestrichelt)',
  'Pass Line (solid)': 'Passlinie (durchgezogen)',
  'Curved Cross': 'Flanke (Bogen)',
  'Circle Zone': 'Kreiszone',
  'Rectangle Zone': 'Rechteckzone',
  'Text Label': 'Textbeschriftung',
  'Delete Selected': 'Radierer',
  'Switch to Basic': 'Zu Basis wechseln',
  'Show Advanced Tools': 'Erweiterte Werkzeuge anzeigen',
  'Tools': 'Werkzeuge',
  'Draw': 'Zeichnen',
  'Play': 'Abspielen',
  'History': 'Verlauf',
  'Basic': 'Basis',
  'Advanced': 'Erweitert',
  'Team Player': 'Spieler',
  'Opponent': 'Gegner',
  'Goalkeeper': 'Torwart',
  'Ball': 'Ball',
  'Player Run': 'Laufweg',
  'Curved Run': 'Bogenlauf',
  'Pass': 'Pass',
  'Cross / Delivery': 'Flanke / Hereingabe',
  'Zone': 'Zone',
  'Zone Box': 'Zonen-Rechteck',
  'Label': 'Beschriftung',
  'Erase': 'Radierer',
  'Play Animation': 'Animation abspielen',
  'Pause Animation': 'Animation pausieren',
  'Reset Animation': 'Animation zurücksetzen',
  'Presentation Mode': 'Präsentationsmodus',
  'Undo (Ctrl+Z)': 'Rückgängig (Strg+Z)',
  'Redo (Ctrl+Y)': 'Wiederholen (Strg+Y)',
  'Mirror Board (flip horizontal)': 'Board spiegeln (horizontal)',
  'Enable Snap': 'Einrasten aktivieren',
  'Disable Snap': 'Einrasten deaktivieren',
  'Show Grid': 'Raster anzeigen',
  'Hide Grid': 'Raster ausblenden',
  'Layer Controls': 'Ebenen-Steuerung',
  'Add Step': 'Schritt hinzufügen',
  'Step': 'Schritt',

  // Presentation mode
  'Fullscreen': 'Vollbild',
  'Exit Presentation (Esc)': 'Präsentation beenden (Esc)',
  'Toggle Legend': 'Legende umschalten',

  // Settings
  'Language': 'Sprache',
  'Automatic (browser)': 'Automatisch (Browser)',
  'German': 'Deutsch',
  'English': 'Englisch',
  'Choose the app language.': 'Wähle die Sprache der App.',

  // Pricing / common
  'Current Plan': 'Aktueller Tarif',
  'Upgrade': 'Upgraden',
  'per month': 'pro Monat',
  'Free': 'Kostenlos',

  // Generic
  'Save': 'Speichern',
  'Cancel': 'Abbrechen',
  'Saved': 'Gespeichert',
  'Saving…': 'Speichere…',
  'Unsaved': 'Ungespeichert',
  'Error': 'Fehler',
};

export function t(key: string): string {
  if (LANG === 'de') return de[key] ?? key;
  return key;
}
