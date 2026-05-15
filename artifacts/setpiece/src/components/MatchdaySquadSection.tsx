import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useUpdateMatchday,
  type Player,
  type MatchdaySquad,
} from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Check, Loader2, Info, ListChecks, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchdaySquadSectionProps {
  teamId: string;
  matchdayId: string;
  players: Player[];
  starterIds: Set<string>;
  benchIds: Set<string>;
  onChange: (next: { starters: Set<string>; bench: Set<string> }) => void;
  persistedSquad: MatchdaySquad | null | undefined;
  onSaved?: () => void;
}

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

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function MatchdaySquadSection({
  teamId,
  matchdayId,
  players,
  starterIds,
  benchIds,
  onChange,
  persistedSquad,
  onSaved,
}: MatchdaySquadSectionProps) {
  const update = useUpdateMatchday();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const persistedStarterSet = useMemo(
    () => new Set(persistedSquad?.starters ?? []),
    [persistedSquad],
  );
  const persistedBenchSet = useMemo(
    () => new Set(persistedSquad?.bench ?? []),
    [persistedSquad],
  );

  const dirty =
    !setsEqual(starterIds, persistedStarterSet) || !setsEqual(benchIds, persistedBenchSet);

  // Clear the "Saved" pill if the user starts editing again.
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    if (dirty && !dirtyRef.current) setSavedAt(null);
    dirtyRef.current = dirty;
  }, [dirty]);

  const toggleStarter = (id: string) => {
    const nextStarters = new Set(starterIds);
    const nextBench = new Set(benchIds);
    if (nextStarters.has(id)) nextStarters.delete(id);
    else {
      nextStarters.add(id);
      nextBench.delete(id);
    }
    onChange({ starters: nextStarters, bench: nextBench });
  };

  const toggleBench = (id: string) => {
    const nextStarters = new Set(starterIds);
    const nextBench = new Set(benchIds);
    if (nextBench.has(id)) nextBench.delete(id);
    else {
      nextBench.add(id);
      nextStarters.delete(id);
    }
    onChange({ starters: nextStarters, bench: nextBench });
  };

  const autoFillFromRoster = () => {
    const active = players.filter(p => (p.status ?? 'active') === 'active');
    const starters = active.slice(0, 11).map(p => p.id);
    const bench = active.slice(11, 18).map(p => p.id);
    onChange({ starters: new Set(starters), bench: new Set(bench) });
  };

  const clearAll = () => {
    onChange({ starters: new Set(), bench: new Set() });
  };

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        teamId,
        matchdayId,
        data: {
          squad: {
            starters: Array.from(starterIds),
            bench: Array.from(benchIds),
          },
        },
      });
      setSavedAt(Date.now());
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save squad');
    }
  };

  return (
    <Card className="mb-4 border-white/[0.08] bg-card/80 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
            <ListChecks className="w-4 h-4 text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm text-white">Squad for this matchday</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick your starting XI + bench once. The Matchday Assistant and other tools will use this squad by default.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!dirty && savedAt !== null && (
              <span className="text-[10px] text-emerald-300 flex items-center gap-1" data-testid="squad-saved-indicator">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            <Button
              size="sm"
              onClick={save}
              disabled={!dirty || update.isPending}
              className="rounded-xl"
              data-testid="save-squad"
            >
              {update.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
              ) : (
                <>Save squad</>
              )}
            </Button>
          </div>
        </div>

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

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button
            onClick={autoFillFromRoster}
            className="text-[11px] text-primary hover:underline"
            data-testid="autofill-squad"
          >
            Prefill from active roster
          </button>
          <button
            onClick={clearAll}
            className="text-[11px] text-muted-foreground hover:text-white"
            data-testid="clear-squad"
          >
            Clear
          </button>
          <p className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1.5">
            <Info className="w-3 h-3" /> A player can only be on one list.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SquadList({
  title, count, total, players, selected, otherSelected, onToggle, accent,
}: {
  title: string;
  count: number;
  total: number;
  players: Player[];
  selected: Set<string>;
  otherSelected: Set<string>;
  onToggle: (id: string) => void;
  accent: 'primary' | 'muted';
}) {
  const isPrimary = accent === 'primary';
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <label className="section-label flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> {title} ({count}/{total})
        </label>
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
              data-testid={`squad-${isPrimary ? 'starter' : 'bench'}-toggle-${p.id}`}
              title={inOther ? `Currently in ${isPrimary ? 'bench' : 'starting XI'} — selecting will move here` : undefined}
            >
              <span className={cn(
                'w-3 h-3 rounded border flex items-center justify-center shrink-0',
                sel ? (isPrimary ? 'bg-primary border-primary' : 'bg-white/80 border-white') : 'border-white/20',
              )}>
                {sel && <Check className={cn('w-2.5 h-2.5 text-black')} />}
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
