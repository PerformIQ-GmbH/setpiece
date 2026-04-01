import { DemoLayout } from '@/components/DemoLayout';
import { useDemoMode } from '@/contexts/DemoContext';
import { useDemoReadiness } from '@/hooks/useDemoData';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DemoReadiness() {
  const { demoTeamId, demoTeam } = useDemoMode();
  const { data: readiness, isLoading } = useDemoReadiness(demoTeamId || '');

  return (
    <DemoLayout teamName={demoTeam?.name}>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Player Readiness</h1>
        <p className="text-muted-foreground mt-1">Track player preparation across set pieces</p>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-2xl bg-card border border-border animate-pulse" />
      ) : (
        <>
          {readiness?.summary && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Not Opened', value: readiness.summary.notOpened, icon: EyeOff, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
                  { label: 'Opened', value: readiness.summary.opened, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Passed', value: readiness.summary.passed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Needs Review', value: readiness.summary.needsReview, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="bg-card border-border">
                      <CardContent className="p-5 text-center">
                        <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
                        <p className="text-3xl font-bold font-display text-white">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1">{s.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {readiness?.details && readiness.details.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="font-display font-bold text-lg text-white mb-4">Detail</h2>
              <div className="space-y-2">
                {readiness.details.map((item: any) => (
                  <Card key={`${item.playerId}-${item.setPieceId}`} className="bg-card border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-border text-xs font-bold text-primary">
                          {item.player?.shirtNumber || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.player ? `${item.player.firstName} ${item.player.lastName}` : 'Unknown'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Views: {item.viewCount || 0}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                        item.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' :
                        item.status === 'needs_review' ? 'bg-amber-500/10 text-amber-400' :
                        item.status === 'opened' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {item.status?.replace(/_/g, ' ')}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </DemoLayout>
  );
}
