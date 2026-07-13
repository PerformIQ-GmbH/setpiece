// Season scoreboard for set pieces: coaches log "executed → goal / chance /
// nothing" with one tap on matchday, and the card proves the routine work
// pays off ("7 goals from set pieces this season").
//
// Outcomes live inside each set piece's boardData JSON, so no backend change
// is needed and the log syncs across devices.
import { useState } from 'react';
import { Link } from 'wouter';
import { useListSetPieces, useUpdateSetPiece } from '@workspace/api-client-react';
import type { SetPiece } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { readOutcomes, type SetPieceOutcome } from '@/components/editor/types';
import { Trophy, Target, ArrowRight, Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n';

interface Props {
  teamId: string;
}

export function SetPieceScoreboard({ teamId }: Props) {
  const { data: setPieces, refetch } = useListSetPieces(teamId);
  const updateSetPiece = useUpdateSetPiece();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pieces = (setPieces || []).filter(sp => sp.status !== 'archived');
  if (pieces.length === 0) return null;

  const allOutcomes = pieces.flatMap(sp => readOutcomes(sp.boardData));
  const goals = allOutcomes.filter(o => o.result === 'goal').length;
  const chances = allOutcomes.filter(o => o.result === 'chance').length;
  const executions = allOutcomes.length;

  // ponytail: last-writer-wins against a concurrently open editor session;
  // move outcomes to their own endpoint if that ever bites.
  const writeOutcomes = async (sp: SetPiece, outcomes: SetPieceOutcome[]) => {
    setBusyId(sp.id);
    try {
      await updateSetPiece.mutateAsync({
        teamId,
        setPieceId: sp.id,
        data: { boardData: { ...(sp.boardData as Record<string, unknown> | null ?? {}), outcomes } },
      });
      await refetch();
    } catch {
      toast({ title: t('Could not save the result'), description: t('Please try again.'), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const record = async (sp: SetPiece, result: SetPieceOutcome['result']) => {
    const existing = readOutcomes(sp.boardData);
    const outcome: SetPieceOutcome = { id: crypto.randomUUID(), at: new Date().toISOString(), result };
    await writeOutcomes(sp, [...existing, outcome]);
    const label = result === 'goal' ? t('Goal') : result === 'chance' ? t('Chance') : t('No effect');
    toast({
      title: `${label} ${t('logged')} — ${sp.title}`,
      action: (
        <ToastAction altText={t('Undo')} onClick={() => { void writeOutcomes(sp, existing); }}>
          {t('Undo')}
        </ToastAction>
      ),
    });
  };

  const sorted = [...pieces].sort((a, b) => {
    const ga = readOutcomes(a.boardData).filter(o => o.result === 'goal').length;
    const gb = readOutcomes(b.boardData).filter(o => o.result === 'goal').length;
    return gb - ga;
  });

  return (
    <Card className="bg-card border-border mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> {t('Set-Piece Scoreboard')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('Log results on matchday with one tap')}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: t('Goals'), value: goals, color: 'text-emerald-400' },
            { label: t('Chances'), value: chances, color: 'text-amber-400' },
            { label: t('Executed'), value: executions, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-xl bg-secondary/30">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {sorted.slice(0, 6).map(sp => {
            const outcomes = readOutcomes(sp.boardData);
            const g = outcomes.filter(o => o.result === 'goal').length;
            const c = outcomes.filter(o => o.result === 'chance').length;
            const busy = busyId === sp.id;
            return (
              <div key={sp.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/20 border border-white/[0.04]">
                <div className="flex-1 min-w-0">
                  <Link href={`/teams/${teamId}/set-pieces/${sp.id}/editor`}>
                    <p className="text-sm font-semibold text-white truncate hover:text-primary transition-colors cursor-pointer">{sp.title}</p>
                  </Link>
                  <p className="text-[10px] text-muted-foreground">
                    {g > 0 || c > 0 ? `${g} ${g === 1 ? t('goal') : t('goals')} · ${c} ${c === 1 ? t('chance') : t('chances')}` : t('No results yet')}
                  </p>
                </div>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-3" />
                ) : (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 px-3 text-[11px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => record(sp, 'goal')}
                      aria-label={`Log goal for ${sp.title}`}
                    >
                      <Trophy className="h-3.5 w-3.5 mr-1" /> {t('Goal')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 px-3 text-[11px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => record(sp, 'chance')}
                      aria-label={`Log chance for ${sp.title}`}
                    >
                      <Target className="h-3.5 w-3.5 mr-1" /> {t('Chance')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11 px-2.5 text-[11px] text-muted-foreground"
                      onClick={() => record(sp, 'none')}
                      aria-label={`Log execution without effect for ${sp.title}`}
                    >
                      –
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {pieces.length > 6 && (
          <Link href={`/teams/${teamId}/templates`}>
            <Button variant="ghost" size="sm" className="text-primary text-xs mt-3">
              {t('All set pieces')} <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
