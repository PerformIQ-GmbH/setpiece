import { CoachLayout } from '@/components/Layout';
import { useRoute } from 'wouter';
import { useGetTeam, useGetReadinessDashboard } from '@workspace/api-client-react';
import type { ReadinessDashboardPlayersItem, PlayerReadinessStatus } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { motion } from 'framer-motion';

function computeBestStatus(readiness: PlayerReadinessStatus[]): string {
  if (readiness.length === 0) return 'not_opened';
  if (readiness.some(r => r.status === 'passed')) return 'passed';
  if (readiness.some(r => r.status === 'needs_review')) return 'needs_review';
  if (readiness.some(r => r.status === 'opened')) return 'opened';
  return 'not_opened';
}

export default function Readiness() {
  const [, params] = useRoute('/teams/:teamId/readiness');
  const teamId = params?.teamId || '';
  const { data: team } = useGetTeam(teamId);
  const { data: readiness, isLoading } = useGetReadinessDashboard(teamId);

  const summary = readiness?.summary;
  const players = readiness?.players || [];

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Readiness Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Track player preparation across set pieces</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: summary.total, icon: Users, color: 'text-foreground', bg: 'bg-secondary/30' },
            { label: 'Not Opened', value: summary.notOpened, icon: EyeOff, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
            { label: 'Opened', value: summary.opened, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Passed', value: summary.passed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Needs Review', value: summary.needsReview, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`border-border ${s.bg}`}>
                <CardContent className="p-4 text-center">
                  <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {players.map((entry: ReadinessDashboardPlayersItem, idx: number) => {
                const p = entry.player;
                const r = entry.readiness || [];
                const bestStatus = computeBestStatus(r);
                return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">{p.shirtNumber || '?'}</div>
                        <span className="font-semibold text-white">{p.firstName} {p.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={bestStatus} />
                        {r.length > 0 && (
                          <span className="text-xs text-muted-foreground">{r.length} set piece{r.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {players.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No readiness data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </CoachLayout>
  );
}
