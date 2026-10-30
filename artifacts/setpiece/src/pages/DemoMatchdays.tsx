import { DemoLayout } from '@/components/DemoLayout';
import { useDemoMode } from '@/contexts/DemoContext';
import { useDemoMatchdays } from '@/hooks/useDemoData';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

export default function DemoMatchdays() {
  const { demoTeamId, demoTeam } = useDemoMode();
  const { data: matchdays, isLoading } = useDemoMatchdays(demoTeamId || '');

  return (
    <DemoLayout teamName={demoTeam?.name}>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Spieltage</h1>
        <p className="text-muted-foreground mt-1">{matchdays?.length || 0} vorbereitete Spieltage</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : matchdays?.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Keine Spieltage in der Demo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matchdays?.map((md: any, idx: number) => (
            <motion.div key={md.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Link href={`/demo/teams/${demoTeamId}/matchdays/${md.id}`}>
                <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Calendar className="h-6 w-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{md.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {md.date ? new Date(md.date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Noch offen'}
                          {md.opponent && ` · gegen ${md.opponent}`}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </DemoLayout>
  );
}
