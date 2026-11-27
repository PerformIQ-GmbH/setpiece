// Filter, Sortierung und Beschriftungen der Vorlagenbibliothek. Reine Logik ohne Importe,
// damit sie sich ohne Browser testen lässt (scripts/tests/template-filters.test.mjs).

export type Kind = 'corner' | 'free_kick' | 'throw_in' | 'kickoff';
export type Side = 'attack' | 'defense';
export type Level = 'easy' | 'medium' | 'hard';
export type Against = 'zone' | 'man' | 'hybrid' | 'deep' | 'high' | 'wall' | 'unset';
export type Experience = 'none' | 'some' | 'lots';

export interface TemplateLike {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  media?: unknown[] | null;
  defaultRoles?: { name?: string }[] | null;
  profile?: { level: Level; against: Against[]; juniors: boolean; needsHeader: boolean } | null;
}

export interface TemplateFilters {
  kind: Kind | 'all';
  side: Side | 'all';
  level: Level | 'all';
  against: Against | 'all';
  withVideo: boolean;
  juniors: boolean;
  noHeader: boolean;
  query: string;
}

export const NO_FILTERS: TemplateFilters = { kind: 'all', side: 'all', level: 'all', against: 'all', withVideo: false, juniors: false, noHeader: false, query: '' };

export const KIND_LABELS: Record<Kind, string> = { corner: 'Ecke', free_kick: 'Freistoss', throw_in: 'Einwurf', kickoff: 'Anstoss' };
export const SIDE_LABELS: Record<Side, string> = { attack: 'Angriff', defense: 'Abwehr' };
export const LEVEL_LABELS: Record<Level, string> = { easy: 'Einfach', medium: 'Mittel', hard: 'Anspruchsvoll' };
export const AGAINST_LABELS: Record<Against, string> = {
  zone: 'Raumdeckung', man: 'Manndeckung', hybrid: 'Gemischte Deckung', deep: 'Tiefe Abwehr', high: 'Hohe Abwehrlinie', wall: 'Mauer', unset: 'Ungeordnete Abwehr',
};
const LEVEL_ORDER: Record<Level, number> = { easy: 0, medium: 1, hard: 2 };

export const kindOf = (category: string): Kind =>
  category.includes('corner') ? 'corner' : category.includes('free_kick') ? 'free_kick' : category.includes('kickoff') ? 'kickoff' : 'throw_in';
export const sideOf = (category: string): Side => (category.startsWith('defensive') ? 'defense' : 'attack');
export const hasVideo = (t: TemplateLike): boolean => (t.media?.length ?? 0) > 0;

/** «Ecke links · Angriff», «Direkter Freistoss · Mitte», «Einwurf · Abwehr», «Anstoss». */
export function categoryLabel(category: string): string {
  const kind = kindOf(category);
  if (kind === 'kickoff') return KIND_LABELS.kickoff; // gibt es nur im Angriff, ohne Seitenzusatz
  const where = category.endsWith('_left') ? 'links' : category.endsWith('_right') ? 'rechts' : category.endsWith('_central') ? 'Mitte' : category.endsWith('_wide') ? 'aussen' : '';
  if (kind === 'free_kick') return `${category.startsWith('direct') ? 'Direkter' : 'Indirekter'} Freistoss${where ? ` · ${where}` : ''}`;
  return `${kind === 'corner' ? `Ecke${where ? ` ${where}` : ''}` : 'Einwurf'} · ${SIDE_LABELS[sideOf(category)]}`;
}

export function filterTemplates<T extends TemplateLike>(templates: T[], f: TemplateFilters): T[] {
  const q = f.query.trim().toLowerCase();
  return templates.filter(t => {
    if (f.kind !== 'all' && kindOf(t.category) !== f.kind) return false;
    if (f.side !== 'all' && sideOf(t.category) !== f.side) return false;
    if (f.withVideo && !hasVideo(t)) return false;
    // Ohne Einschätzung lässt sich nach Niveau, Gegner, Junioren und Kopfball nicht sagen: nicht zeigen, sobald danach gefiltert wird.
    const p = t.profile;
    if (f.level !== 'all' && p?.level !== f.level) return false;
    if (f.against !== 'all' && !p?.against.includes(f.against)) return false;
    if (f.juniors && !p?.juniors) return false;
    if (f.noHeader && p?.needsHeader !== false) return false;
    if (q) {
      const haystack = [t.title, t.description ?? '', ...(t.defaultRoles ?? []).map(r => r.name ?? '')].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function activeFilterCount(f: TemplateFilters): number {
  return [f.kind !== 'all', f.side !== 'all', f.level !== 'all', f.against !== 'all', f.withVideo, f.juniors, f.noHeader, !!f.query.trim()].filter(Boolean).length;
}

/** Einfache zuerst, innerhalb des Niveaus Vorlagen mit Video zuerst, dann nach Titel. Ohne Einschätzung ans Ende. */
export function sortTemplates<T extends TemplateLike>(templates: T[]): T[] {
  const rank = (t: T) => (t.profile ? LEVEL_ORDER[t.profile.level] : 3);
  return [...templates].sort((a, b) => rank(a) - rank(b) || Number(hasVideo(b)) - Number(hasVideo(a)) || a.title.localeCompare(b.title, 'de'));
}

/** Gegner-Werte, die in den Vorlagen tatsächlich vorkommen (in fester Reihenfolge). */
export function availableAgainst(templates: TemplateLike[]): Against[] {
  const order = Object.keys(AGAINST_LABELS) as Against[];
  const seen = new Set(templates.flatMap(t => t.profile?.against ?? []));
  return order.filter(a => seen.has(a));
}

const ALLOWED_LEVELS: Record<Experience, Level[]> = { none: ['easy'], some: ['easy', 'medium'], lots: ['easy', 'medium', 'hard'] };

/** Onboarding: passende Einstiegsvorlagen, mit Video zuerst, quer über Ecke, Freistoss, Einwurf und Anstoss gemischt. */
export function recommendTemplates<T extends TemplateLike>(templates: T[], experience: Experience, kind: Kind | 'all', limit = 6): T[] {
  const allowed = ALLOWED_LEVELS[experience];
  const pool = sortTemplates(templates.filter(t => t.profile && allowed.includes(t.profile.level) && (kind === 'all' || kindOf(t.category) === kind)));
  const byVideo = [...pool.filter(hasVideo), ...pool.filter(t => !hasVideo(t))];
  if (kind !== 'all') return byVideo.slice(0, limit);
  // Abwechselnd je Art nehmen, damit nicht nur Ecken erscheinen.
  const kinds = Object.keys(KIND_LABELS) as Kind[];
  const lanes = kinds.map(k => byVideo.filter(t => kindOf(t.category) === k));
  const out: T[] = [];
  for (let i = 0; out.length < limit && lanes.some(l => i < l.length); i++) for (const lane of lanes) if (lane[i] && out.length < limit) out.push(lane[i]);
  return out;
}
