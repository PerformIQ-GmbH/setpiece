import { DemoLayout } from '@/components/DemoLayout';
import { useDemoMode } from '@/contexts/DemoContext';
import { useDemoSetPieces, useDemoPlayers, useDemoMatchdays, useDemoReadiness } from '@/hooks/useDemoData';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Users, LayoutDashboard, Calendar, Activity, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

export default function DemoTeamDashboard() {
  const { demoTeamId, demoTeam } = useDemoMode();
  const teamId = demoTeamId || '';
  const { data: players } = useDemoPlayers(teamId);
  const { data: setPieces } = useDemoSetPieces(teamId);
  const { data: matchdays } = useDemoMatchdays(teamId);
  const { data: readiness } = useDemoReadiness(teamId);

  const activePieces = setPieces?.filter((sp: any) => sp.status === 'active_matchday' || sp.status === 'ready') || [];
  const totalPlayers = players?.length || 0;
  const totalSetPieces = setPieces?.length || 0;
  const totalMatchdays = matchdays?.length || 0;

  return (
    <DemoLayout teamName={demoTeam?.name}>
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">{demoTeam?.name}</h1>
            {demoTeam?.clubName && <p className="text-muted-foreground mt-1">{demoTeam.clubName}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Players', value: totalPlayers, icon: Users, color: 'text-blue-400', href: `/demo/teams/${teamId}/players` },
          { label: 'Set Pieces', value: totalSetPieces, icon: LayoutDashboard, color: 'text-primary', href: `/demo/teams/${teamId}/templates` },
          { label: 'Matchdays', value: totalMatchdays, icon: Calendar, color: 'text-amber-400', href: `/demo/teams/${teamId}/matchdays` },
          { label: 'Ready', value: readiness?.summary?.passed || 0, icon: Activity, color: 'text-emerald-400', href: `/demo/teams/${teamId}/readiness` },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={stat.href}>
              <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-3xl font-bold font-display text-white">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {readiness?.summary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Readiness Overview
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Not Opened', value: readiness.summary.notOpened, icon: EyeOff, color: 'text-zinc-400' },
                  { label: 'Opened', value: readiness.summary.opened, icon: Eye, color: 'text-blue-400' },
                  { label: 'Passed', value: readiness.summary.passed, icon: CheckCircle2, color: 'text-emerald-400' },
                  { label: 'Needs Review', value: readiness.summary.needsReview, icon: Activity, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-secondary/30">
                    <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">Active Set Pieces</h2>
        </div>
        {activePieces.length === 0 ? (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="p-8 text-center">
              <LayoutDashboard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No active set pieces in demo.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePieces.slice(0, 6).map((sp: any, idx: number) => (
              <motion.div key={sp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + idx * 0.05 }}>
                <Link href={`/demo/teams/${teamId}/set-pieces/${sp.id}/editor`}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group overflow-hidden">
                    <div className="aspect-video bg-emerald-950/50 border-b border-border/50 relative flex items-center justify-center">
                      {sp.previewImageUrl ? (
                        <img src={sp.previewImageUrl} alt={sp.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-3 border border-white/20 rounded-sm">
                          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{sp.title}</h3>
                        <StatusBadge status={sp.status} />
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{sp.category.replace(/_/g, ' ')}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </DemoLayout>
  );
}
