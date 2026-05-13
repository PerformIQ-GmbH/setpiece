import { useMemo, useState } from 'react';
import {
  useSuggestMatchdayAssignments,
  useUpsertAssignment,
  getSetPiece,
  type Player,
  type AssignmentSuggestionsResponse,
  type RoleAssignmentSuggestion,
  type SetPieceSuggestionGroup,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ChevronDown, ChevronRight, Check, Loader2, Users, AlertCircle, X, Info } from 'lucide-react';
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

export function MatchdayAssistant({ teamId, matchdayId, players, setPieces, onApplied }: MatchdayAssistantProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'fill_empty' | 'replace_all'>('fill_empty');
  const [suggestions, setSuggestions] = useState<AssignmentSuggestionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [applyState, setApplyState] = useState<Record<string, ApplyState>>({});
  const [applyAllState, setApplyAllState] = useState<ApplyState>('idle');

  const suggest = useSuggestMatchdayAssignments();
  const upsert = useUpsertAssignment();

  const playersById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const toggleId = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelectedIds(new Set(players.filter(p => p.status !== 'injured' && p.status !== 'suspended' && p.status !== 'inactive').map(p => p.id)));
  const clearAll = () => setSelectedIds(new Set());

  const compute = async () => {
    setError(null);
    setSuggestions(null);
    setApplyState({});
    setApplyAllState('idle');
    if (selectedIds.size === 0) {
      setError('Pick at least one available player from the squad.');
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
        data: { availablePlayerIds: Array.from(selectedIds), mode },
      });
      setSuggestions(res);
      // Auto-expand groups that have at least one applicable suggestion.
      const expanded = new Set<string>();
      for (const grp of res.setPieces) {
        if (grp.roles.some(r => r.suggestedPlayerId && !r.skipped)) expanded.add(grp.setPieceId);
      }
      setExpandedGroups(expanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute suggestions');
    }
  };

  const applyGroup = async (group: SetPieceSuggestionGroup) => {
    if (!suggestions) return;
    // Bind to the mode used at compute time, not the mutable UI mode —
    // otherwise switching the toggle after compute could bypass the
    // fill_empty no-overwrite guarantee on the client.
    const appliedMode = suggestions.mode;
    setApplyState(prev => ({ ...prev, [group.setPieceId]: 'applying' }));
    try {
      // Need each role's full assignment record so we can preserve backupPlayerId.
      const detail = await getSetPiece(teamId, group.setPieceId);
      const existing = new Map((detail.assignments ?? []).map(a => [a.roleId, a]));
      let applied = 0;
      for (const role of group.roles) {
        if (!role.suggestedPlayerId || role.skipped) continue;
        const cur = existing.get(role.roleId);
        // In fill_empty mode, never overwrite an existing assignment.
        if (appliedMode === 'fill_empty' && cur) continue;
        await upsert.mutateAsync({
          teamId,
          setPieceId: group.setPieceId,
          data: {
            roleId: role.roleId,
            playerId: role.suggestedPlayerId,
            ...(cur?.backupPlayerId ? { backupPlayerId: cur.backupPlayerId } : {}),
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

  const applyAll = async () => {
    if (!suggestions) return;
    setApplyAllState('applying');
    try {
      for (const grp of suggestions.setPieces) {
        await applyGroup(grp);
      }
      setApplyAllState('done');
    } catch {
      setApplyAllState('error');
    }
  };

  const totalSuggestions = suggestions
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
              Pick available players, get suggested role assignments across every set piece.
            </p>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {open && (
          <div className="border-t border-white/[0.06] p-5 space-y-5">
            {/* Squad selector */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="section-label flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Available squad ({selectedIds.size}/{players.length})
                </label>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-[11px] text-primary hover:underline" data-testid="select-all-available">All available</button>
                  <span className="text-muted-foreground/40 text-[11px]">·</span>
                  <button onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-white">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto rounded-xl border border-white/[0.06] p-2 bg-white/[0.02]">
                {players.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2 col-span-full">No players in this team yet.</p>
                )}
                {players.map(p => {
                  const sel = selectedIds.has(p.id);
                  const blocked = p.status === 'injured' || p.status === 'suspended' || p.status === 'inactive';
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleId(p.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] text-left transition-all',
                        sel
                          ? 'bg-primary/15 border-primary/40 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:border-white/[0.12]',
                        blocked && !sel && 'opacity-60',
                      )}
                      data-testid={`squad-toggle-${p.id}`}
                    >
                      <span className={cn('w-3 h-3 rounded border flex items-center justify-center shrink-0', sel ? 'bg-primary border-primary' : 'border-white/20')}>
                        {sel && <Check className="w-2.5 h-2.5 text-black" />}
                      </span>
                      {p.shirtNumber && <span className="font-mono text-[10px] text-muted-foreground">#{p.shirtNumber}</span>}
                      <span className="truncate">{p.firstName} {p.lastName}</span>
                      {blocked && <span className="ml-auto text-[8px] uppercase text-red-400">{p.status}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

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

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={compute}
                disabled={suggest.isPending || selectedIds.size === 0}
                className="rounded-xl"
                data-testid="compute-suggestions"
              >
                {suggest.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                {suggest.isPending ? 'Computing…' : 'Suggest assignments'}
              </Button>
              {suggestions && totalSuggestions > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={applyAll}
                  disabled={applyAllState === 'applying'}
                  className="rounded-xl border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  data-testid="apply-all"
                >
                  {applyAllState === 'applying' ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-2" />}
                  {applyAllState === 'done' ? 'Applied to all' : `Apply all (${totalSuggestions})`}
                </Button>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-300/60 hover:text-red-300"><X className="w-3 h-3" /></button>
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

            {suggestions && totalSuggestions === 0 && suggestions.setPieces.length > 0 && (
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
          {state === 'applying' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> :
           state === 'done' ? <Check className="w-3 h-3 mr-1" /> :
           <Check className="w-3 h-3 mr-1" />}
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

function SuggestionRow({ role, playersById, mode }: {
  role: RoleAssignmentSuggestion;
  playersById: Map<string, Player>;
  mode: AssignmentSuggestionsResponse['mode'];
}) {
  const player = role.suggestedPlayerId ? playersById.get(role.suggestedPlayerId) : null;
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
              <span className="text-[9px] text-muted-foreground">
                replaces {existing.firstName}
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">No suggestion</span>
        )}
      </div>
    </div>
  );
}
