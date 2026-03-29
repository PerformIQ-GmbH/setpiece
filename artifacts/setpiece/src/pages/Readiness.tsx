import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute } from 'wouter';
import { useGetTeam, useGetReadinessDashboard, useListMatchdays, useListSetPieces } from '@workspace/api-client-react';
import type { ReadinessDashboardPlayersItem, PlayerReadinessStatus } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, Users, Filter, ChevronDown } from 'lucide-react';
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
  const { data: matchdays } = useListMatchdays(teamId);
  const { data: setPieces } = useListSetPieces(teamId);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [setPieceFilter, setSetPieceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const summary = readiness?.summary;
  const allPlayers = readiness?.players || [];

  const filteredPlayers = allPlayers.filter((entry: ReadinessDashboardPlayersItem) => {
    const p = entry.player;
    const r = entry.readiness || [];
    const best = computeBestStatus(r);

    if (statusFilter !== 'all' && best !== statusFilter) return false;

    if (setPieceFilter !== 'all') {
      const hasMatch = r.some(rd => rd.setPieceId === setPieceFilter);
      if (!hasMatch && setPieceFilter !== 'none') return false;
    }

    if (searchTerm) {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      if (!fullName.includes(searchTerm.toLowerCase())) return false;
    }

    return true;
  });

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
            { label: 'Total', value: summary.total, icon: Users, color: 'text-foreground', bg: 'bg-secondary/30', filter: 'all' },
            { label: 'Not Opened', value: summary.notOpened, icon: EyeOff, color: 'text-zinc-400', bg: 'bg-zinc-500/10', filter: 'not_opened' },
            { label: 'Opened', value: summary.opened, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', filter: 'opened' },
            { label: 'Passed', value: summary.passed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filter: 'passed' },
            { label: 'Needs Review', value: summary.needsReview, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', filter: 'needs_review' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <button
                onClick={() => setStatusFilter(s.filter === statusFilter ? 'all' : s.filter)}
                className="w-full text-left"
              >
                <Card className={`border-border ${s.bg} ${statusFilter === s.filter && s.filter !== 'all' ? 'ring-1 ring-primary' : ''} transition-all cursor-pointer hover:ring-1 hover:ring-primary/50`}>
                  <CardContent className="p-4 text-center">
                    <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:border-primary outline-none"
          />
        </div>
        {setPieces && setPieces.length > 0 && (
          <select
            value={setPieceFilter}
            onChange={e => setSetPieceFilter(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none text-muted-foreground"
          >
            <option value="all">All Set Pieces</option>
            {setPieces.map(sp => (
              <option key={sp.id} value={sp.id}>{sp.title}</option>
            ))}
          </select>
        )}
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Set Pieces</th>
                <th className="px-4 py-3">Last Opened</th>
                <th className="px-4 py-3">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPlayers.map((entry: ReadinessDashboardPlayersItem, idx: number) => {
                const p = entry.player;
                const r = entry.readiness || [];
                const bestStatus = computeBestStatus(r);
                const totalViews = r.reduce((sum, rd) => sum + (rd.viewCount || 0), 0);
                const lastOpened = r.reduce((latest: string | null, rd) => {
                  if (!rd.lastOpenedAt) return latest;
                  if (!latest) return rd.lastOpenedAt;
                  return rd.lastOpenedAt > latest ? rd.lastOpenedAt : latest;
                }, null);

                return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">{p.shirtNumber || '?'}</div>
                        <div>
                          <span className="font-semibold text-white block">{p.firstName} {p.lastName}</span>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {p.tags.slice(0, 2).map(t => (
                                <span key={t} className="text-[8px] px-1 py-0 rounded bg-primary/10 text-primary/70">{t.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={bestStatus} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{r.length} piece{r.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {lastOpened ? new Date(lastOpened).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">{totalViews}</span>
                    </td>
                  </motion.tr>
                );
              })}
              {filteredPlayers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {allPlayers.length === 0 ? 'No readiness data available.' : 'No players match your filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </CoachLayout>
  );
}
