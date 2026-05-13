import { useMemo, useState } from 'react';
import {
  useSuggestMatchdayAssignments,
  useUpsertAssignment,
  getSetPiece,
  type Player,
  type AssignmentSuggestionsResponse,
  type RoleAssignmentSuggestion,
  type SetPieceSuggestionGroup,
  type SuggestionAlternative,
  type SuitabilityBadge,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles, ChevronDown, ChevronRight, Check, Loader2, Users, AlertCircle,
  X, Info, ShieldAlert, ShieldCheck, ListChecks, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BADGE_STYLES, ROLE_CLASS_LABELS } from '@/lib/roleSuitability';

interface MatchdayAssistantProps {
  teamId: string;
  matchdayId: string;
  players: Player[];
  setPieces: Array<{ id: string; title: string }>;
  onApplied?: () => void;
}

type ApplyState = 'idle' | 'applying' | 'done' | 'error';

const STATUS_TONE: Record<string, string> = {
  active: 'text-emerald-400/80',
  injured: 'text-red-400',
  suspended: 'text-red-400',
  inactive: 'text-amber-300',
};

function statusBadge(p: Player) {
  const s = (p.status ?? 'active').toLowerCase();
  return s === 'active' ? null : (
    <span className={cn('ml-auto text-[8px] uppercase tracking-wider font-bold', STATUS_TONE[s] ?? 'text-amber-300')}>
      {s}
    </span>
  );
}

export function MatchdayAssistant({ teamId, matchdayId, players, setPieces, onApplied }: MatchdayAssistantProps) {
  const [open, setOpen] = useState(false);
  const [starterIds, setStarterIds] = useState<Set<string>>(new Set());
  const [benchIds, setBenchIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'fill_empty' | 'replace_all'>('fill_empty');
  const [suggestions, setSuggestions] = useState<AssignmentSuggestionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [applyState, setApplyState] = useState<Record<string, ApplyState>>({});
  const [applyAllState, setApplyAllState] = useState<ApplyState>('idle');

  const suggest = useSuggestMatchdayAssignments();
  const upsert = useUpsertAssignment();

  const playersById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Move a player into starters; remove from bench (dedupe).
  const toggleStarter = (id: string) => {
    setStarterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setBenchIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  const toggleBench = (id: string) => {
    setBenchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setStarterIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const fillStartersFromAvailable = () => {
    setStarterIds(new Set(players.filter(p => (p.status ?? 'active') === 'active').slice(0, 11).map(p => p.id)));
    setBenchIds(prev => {
      const next = new Set(prev);
      for (const p of players.slice(0, 11)) next.delete(p.id);
      return next;
    });
  };
  const clearAll = () => { setStarterIds(new Set()); setBenchIds(new Set()); };

  const compute = async () => {
    setError(null);
    setSuggestions(null);
    setApplyState({});
    setApplyAllState('idle');
    if (starterIds.size === 0) {
      setError('Pick at least one starter (this is the players you want strongly preferred for assignments).');
      return;
    }
    if (setPieces.length === 0) {
      setError('Add at least one set piece to this matchday before suggesting assignments.');
      return;
    }
    try {
      const res = await suggest.mutateAsync({
        teamId,
        matchdayId,
        data: {
          starterPlayerIds: Array.from(starterIds),
          benchPlayerIds: Array.from(benchIds),
          mode,
        },
      });
      setSuggestions(res);
      const expanded = new Set<string>();
      for (const grp of res.setPieces) {
        if (grp.roles.some(r => r.suggestedPlayerId && !r.skipped)) expanded.add(grp.setPieceId);
      }
      setExpandedGroups(expanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute suggestions');
    }
  };

  const SAFE_BADGES: ReadonlyArray<SuitabilityBadge> = ['best', 'good'];

  const applyGroup = async (group: SetPieceSuggestionGroup, opts?: { safeOnly?: boolean }) => {
    if (!suggestions) return;
    // Bind to mode at compute time (not the mutable UI mode).
    const appliedMode = suggestions.mode;
    const safeOnly = !!opts?.safeOnly;
    setApplyState(prev => ({ ...prev, [group.setPieceId]: 'applying' }));
    try {
      const detail = await getSetPiece(teamId, group.setPieceId);
      const existing = new Map((detail.assignments ?? []).map(a => [a.roleId, a]));
      let applied = 0;
      for (const role of group.roles) {
        if (!role.suggestedPlayerId || role.skipped) continue;
        if (safeOnly && !SAFE_BADGES.includes(role.badge)) continue;
        const cur = existing.get(role.roleId);
        if (appliedMode === 'fill_empty' && cur) continue;

        // Prefer the server-suggested backup, but never reuse the primary
        // player as their own backup; fall back to the existing backup.
        const suggestedBackup =
          role.suggestedBackupPlayerId && role.suggestedBackupPlayerId !== role.suggestedPlayerId
            ? role.suggestedBackupPlayerId
            : (cur?.backupPlayerId && cur.backupPlayerId !== role.suggestedPlayerId
                ? cur.backupPlayerId
                : undefined);

        await upsert.mutateAsync({
          teamId,
          setPieceId: group.setPieceId,
          data: {
            roleId: role.roleId,
            playerId: role.suggestedPlayerId,
            ...(suggestedBackup ? { backupPlayerId: suggestedBackup } : {}),
            ...(cur?.notes ? { notes: cur.notes } : {}),
          },
        });
        applied += 1;
      }
      setApplyState(prev => ({ ...prev, [group.setPieceId]: applied > 0 ? 'done' : 'idle' }));
      onApplied?.();
    } catch {
      setApplyState(prev => ({ ...prev, [group.setPieceId]: 'error' }));
    }
  };

  const applyAll = async (opts?: { safeOnly?: boolean }) => {
    if (!suggestions) return;
    setApplyAllState('applying');
    try {
      for (const grp of suggestions.setPieces) {
        await applyGroup(grp, opts);
      }
      setApplyAllState('done');
    } catch {
      setApplyAllState('error');
    }
  };

  const summary = useMemo(() => {
    if (!suggestions) return null;
    let total = 0, protectedCount = 0, safe = 0, review = 0, problem = 0, missing = 0;
    for (const grp of suggestions.setPieces) {
      for (const r of grp.roles) {
        total += 1;
        if (r.skipped) { protectedCount += 1; continue; }
        if (r.missingProfileData) missing += 1;
        if (r.badge === 'best' || r.badge === 'good') safe += 1;
        else if (r.badge === 'review') review += 1;
        else if (r.badge === 'problem') problem += 1;
      }
    }
    return { total, protectedCount, safe, review, problem, missing };
  }, [suggestions]);

  const totalApplicable = suggestions
    ? suggestions.setPieces.reduce((acc, g) => acc + g.roles.filter(r => r.suggestedPlayerId && !r.skipped).length, 0)
    : 0;

  return (
    <Card className="mb-5 border-primary/20 bg-gradient-to-br from-primary/[0.04] via-card to-card overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
          data-testid="matchday-assistant-toggle"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm text-white">Matchday Assistant</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Pick your starting XI + bench, then get suggested assignments for every set piece.
            </p>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {open && (
          <div className="border-t border-white/[0.06] p-5 space-y-5">
            {/* Dual squad selector: Starting XI + Bench */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SquadList
                title="Starting XI"
                accent="primary"
                count={starterIds.size}
                total={players.length}
                players={players}
                selected={starterIds}
                otherSelected={benchIds}
                onToggle={toggleStarter}
                onFill={fillStartersFromAvailable}
                fillLabel="Auto-fill 11"
              />
              <SquadList
                title="Bench"
                accent="muted"
                count={benchIds.size}
                total={players.length}
                players={players}
                selected={benchIds}
                otherSelected={starterIds}
                onToggle={toggleBench}
              />
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2 flex items-center gap-1.5">
              <Info className="w-3 h-3" /> Starters get a small priority bias when scores are close. A player can only be on one list.
            </p>

            {/* Mode toggle */}
            <div>
              <label className="section-label mb-2 block">Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('fill_empty')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-xl border text-[11px] text-left transition-all',
                    mode === 'fill_empty' ? 'bg-primary/15 border-primary/40 text-white' : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:border-white/[0.12]',
                  )}
                  data-testid="mode-fill-empty"
                >
                  <p className="font-semibold">Fill empty roles only</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Never overwrite existing picks</p>
                </button>
                <button
                  onClick={() => setMode('replace_all')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-xl border text-[11px] text-left transition-all',
                    mode === 'replace_all' ? 'bg-primary/15 border-primary/40 text-white' : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:border-white/[0.12]',
                  )}
                  data-testid="mode-replace-all"
                >
                  <p className="font-semibold">Replace all</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Suggest a player for every role</p>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={compute}
                disabled={suggest.isPending || starterIds.size === 0}
                className="rounded-xl"
                data-testid="compute-suggestions"
              >
                {suggest.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                {suggest.isPending ? 'Computing…' : 'Suggest assignments'}
              </Button>
              {suggestions && summary && summary.safe > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyAll({ safeOnly: true })}
                  disabled={applyAllState === 'applying'}
                  className="rounded-xl border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  data-testid="apply-safe"
                >
                  {applyAllState === 'applying' ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-2" />}
                  Apply safe only ({summary.safe})
                </Button>
              )}
              {suggestions && totalApplicable > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => applyAll()}
                  disabled={applyAllState === 'applying'}
                  className="rounded-xl text-muted-foreground hover:text-white"
                  data-testid="apply-all"
                  title="Apply every suggestion regardless of fit quality"
                >
                  {applyAllState === 'done' ? 'Applied to all' : `Apply all (${totalApplicable})`}
                </Button>
              )}
              <button onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-white ml-auto">Reset squad</button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-300/60 hover:text-red-300"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Summary cards */}
            {summary && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <SummaryCard label="Roles" value={summary.total} icon={ListChecks} tone="muted" testId="summary-total" />
                <SummaryCard label="Protected" value={summary.protectedCount} icon={ShieldCheck} tone="muted" testId="summary-protected" />
                <SummaryCard label="Safe" value={summary.safe} icon={Check} tone="emerald" testId="summary-safe" />
                <SummaryCard label="Review" value={summary.review} icon={AlertCircle} tone="amber" testId="summary-review" />
                <SummaryCard label="Problem" value={summary.problem} icon={ShieldAlert} tone="red" testId="summary-problem" />
                <SummaryCard label="Missing data" value={summary.missing} icon={HelpCircle} tone="muted" testId="summary-missing" />
              </div>
            )}

            {suggestions && suggestions.setPieces.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No set pieces to assign in this matchday.</p>
            )}

            {suggestions && suggestions.setPieces.length > 0 && (
              <div className="space-y-2">
                {suggestions.setPieces.map(group => (
                  <SuggestionGroupCard
                    key={group.setPieceId}
                    group={group}
                    expanded={expandedGroups.has(group.setPieceId)}
                    onToggle={() => setExpandedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(group.setPieceId)) next.delete(group.setPieceId);
                      else next.add(group.setPieceId);
                      return next;
                    })}
                    playersById={playersById}
                    onApply={() => applyGroup(group)}
                    state={applyState[group.setPieceId] ?? 'idle'}
                    mode={suggestions.mode}
                  />
                ))}
              </div>
            )}

            {suggestions && totalApplicable === 0 && suggestions.setPieces.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>No applicable suggestions — every role already has a player and you're in "Fill empty" mode. Switch to "Replace all" to get suggestions for every role.</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SquadList({
  title, count, total, players, selected, otherSelected, onToggle, onFill, fillLabel, accent,
}: {
  title: string;
  count: number;
  total: number;
  players: Player[];
  selected: Set<string>;
  otherSelected: Set<string>;
  onToggle: (id: string) => void;
  onFill?: () => void;
  fillLabel?: string;
  accent: 'primary' | 'muted';
}) {
  const isPrimary = accent === 'primary';
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <label className="section-label flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> {title} ({count}/{total})
        </label>
        {onFill && (
          <button onClick={onFill} className="text-[11px] text-primary hover:underline" data-testid={`fill-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {fillLabel}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto rounded-xl border border-white/[0.06] p-2 bg-white/[0.02]">
        {players.length === 0 && (
          <p className="text-xs text-muted-foreground p-2 col-span-full">No players in this team yet.</p>
        )}
        {players.map(p => {
          const sel = selected.has(p.id);
          const inOther = otherSelected.has(p.id);
          const blocked = p.status === 'injured' || p.status === 'suspended' || p.status === 'inactive';
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] text-left transition-all',
                sel
                  ? (isPrimary
                    ? 'bg-primary/15 border-primary/40 text-white'
                    : 'bg-white/[0.08] border-white/30 text-white')
                  : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:border-white/[0.12]',
                inOther && !sel && 'opacity-50',
                blocked && !sel && 'opacity-60',
              )}
              data-testid={`${isPrimary ? 'starter' : 'bench'}-toggle-${p.id}`}
              title={inOther ? `Currently in ${isPrimary ? 'bench' : 'starting XI'} — selecting will move here` : undefined}
            >
              <span className={cn(
                'w-3 h-3 rounded border flex items-center justify-center shrink-0',
                sel ? (isPrimary ? 'bg-primary border-primary' : 'bg-white/80 border-white') : 'border-white/20',
              )}>
                {sel && <Check className={cn('w-2.5 h-2.5', isPrimary ? 'text-black' : 'text-black')} />}
              </span>
              {p.shirtNumber && <span className="font-mono text-[10px] text-muted-foreground">#{p.shirtNumber}</span>}
              <span className="truncate">{p.firstName} {p.lastName}</span>
              {statusBadge(p)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, testId }: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: 'emerald' | 'amber' | 'red' | 'muted';
  testId?: string;
}) {
  const styles: Record<typeof tone, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    red: 'bg-red-500/10 border-red-500/20 text-red-300',
    muted: 'bg-white/[0.03] border-white/[0.08] text-muted-foreground',
  };
  return (
    <div
      className={cn('flex items-center gap-2 px-2.5 py-2 rounded-xl border', styles[tone])}
      data-testid={testId}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider opacity-80 leading-none">{label}</p>
        <p className="text-sm font-bold leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function SuggestionGroupCard({
  group, expanded, onToggle, playersById, onApply, state, mode,
}: {
  group: SetPieceSuggestionGroup;
  expanded: boolean;
  onToggle: () => void;
  playersById: Map<string, Player>;
  onApply: () => void;
  state: ApplyState;
  mode: AssignmentSuggestionsResponse['mode'];
}) {
  const applicable = group.roles.filter(r => r.suggestedPlayerId && !r.skipped).length;
  const reviewCount = group.roles.filter(r => r.badge === 'review' && r.suggestedPlayerId).length;
  const problemCount = group.roles.filter(r => r.badge === 'problem' && r.suggestedPlayerId).length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left" data-testid={`group-toggle-${group.setPieceId}`}>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          <span className="font-semibold text-xs text-white truncate">{group.setPieceTitle}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {applicable} suggestion{applicable === 1 ? '' : 's'}
            {reviewCount > 0 && <span className="text-amber-400"> · {reviewCount} review</span>}
            {problemCount > 0 && <span className="text-red-400"> · {problemCount} problem</span>}
          </span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onApply}
          disabled={applicable === 0 || state === 'applying'}
          className="h-7 text-[11px] text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
          data-testid={`apply-group-${group.setPieceId}`}
        >
          {state === 'applying' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
          {state === 'done' ? 'Applied' : state === 'error' ? 'Retry' : 'Apply set piece'}
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
          {group.roles.map(role => (
            <SuggestionRow key={role.roleId} role={role} playersById={playersById} mode={mode} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlternativesList({ alternatives, playersById, primaryId }: {
  alternatives: SuggestionAlternative[];
  playersById: Map<string, Player>;
  primaryId: string | null | undefined;
}) {
  const top = alternatives.filter(a => a.playerId !== primaryId).slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Top alternatives</p>
      <div className="flex flex-wrap gap-1.5">
        {top.map(alt => {
          const p = playersById.get(alt.playerId);
          const style = BADGE_STYLES[alt.badge];
          return (
            <span
              key={alt.playerId}
              className={cn(
                'flex items-center gap-1.5 px-1.5 py-0.5 rounded-full border text-[9px]',
                'bg-white/[0.03] border-white/[0.08]',
              )}
              data-testid={`alt-badge-${alt.playerId}`}
            >
              {p?.shirtNumber && <span className="font-mono text-muted-foreground">#{p.shirtNumber}</span>}
              <span className="text-white/90">{p ? `${p.firstName} ${p.lastName}` : 'Unknown'}</span>
              <span className={cn('flex items-center gap-1 px-1 py-px rounded-full border font-bold uppercase tracking-wider', style.bg, style.text, style.ring)}>
                <span className={cn('w-1 h-1 rounded-full', style.dot)} />
                {alt.score}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionRow({ role, playersById, mode }: {
  role: RoleAssignmentSuggestion;
  playersById: Map<string, Player>;
  mode: AssignmentSuggestionsResponse['mode'];
}) {
  const player = role.suggestedPlayerId ? playersById.get(role.suggestedPlayerId) : null;
  const backup = role.suggestedBackupPlayerId ? playersById.get(role.suggestedBackupPlayerId) : null;
  const existing = role.existingPlayerId ? playersById.get(role.existingPlayerId) : null;
  const badge = BADGE_STYLES[role.badge];
  const classLabel = ROLE_CLASS_LABELS[role.primaryClass] ?? role.primaryClass;
  const skipped = role.skipped;

  return (
    <div className="px-3 py-2 flex flex-wrap items-start gap-x-3 gap-y-1.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-white truncate">{role.roleName}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{classLabel}</span>
          {role.missingProfileData && !skipped && (
            <span className="text-[9px] uppercase tracking-wider text-amber-300/80" data-testid={`missing-data-${role.roleId}`}>
              missing data
            </span>
          )}
        </div>
        {(role.reasons.length > 0 || role.cautions.length > 0) && !skipped && (
          <div className="mt-1 space-y-0.5">
            {role.reasons.slice(0, 2).map((r, i) => (
              <p key={`r-${i}`} className="text-[10px] text-emerald-400/80 leading-snug">+ {r}</p>
            ))}
            {role.cautions.slice(0, 2).map((c, i) => (
              <p key={`c-${i}`} className="text-[10px] text-amber-300/80 leading-snug">! {c}</p>
            ))}
          </div>
        )}
        {backup && !skipped && (
          <p className="mt-1 text-[10px] text-muted-foreground leading-snug">
            Backup: {backup.shirtNumber ? `#${backup.shirtNumber} ` : ''}{backup.firstName} {backup.lastName}
          </p>
        )}
        {!skipped && role.alternatives && role.alternatives.length > 0 && (
          <AlternativesList
            alternatives={role.alternatives}
            playersById={playersById}
            primaryId={role.suggestedPlayerId}
          />
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {skipped ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Already assigned</span>
            {existing && (
              <span className="text-[10px] text-white/80">
                {existing.shirtNumber ? `#${existing.shirtNumber} ` : ''}{existing.firstName} {existing.lastName}
              </span>
            )}
          </div>
        ) : player ? (
          <>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {player.shirtNumber && <span className="font-mono text-[10px] text-muted-foreground">#{player.shirtNumber}</span>}
              <span className="text-[11px] text-white">{player.firstName} {player.lastName}</span>
            </div>
            <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider', badge.bg, badge.text, badge.ring)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
              {badge.label} · {role.score}
            </span>
            {mode === 'replace_all' && existing && existing.id !== player.id && (
              <span className="text-[9px] text-muted-foreground">replaces {existing.firstName}</span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">No suggestion</span>
        )}
      </div>
    </div>
  );
}
