import { DemoLayout } from '@/components/DemoLayout';
import { useDemoMode } from '@/contexts/DemoContext';
import { useDemoPlayers } from '@/hooks/useDemoData';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DemoPlayers() {
  const { demoTeamId, demoTeam } = useDemoMode();
  const { data: players, isLoading } = useDemoPlayers(demoTeamId || '');

  return (
    <DemoLayout teamName={demoTeam?.name}>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Spieler</h1>
        <p className="text-muted-foreground mt-1">{players?.length || 0} Spieler</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players?.map((player: any, idx: number) => (
            <motion.div key={player.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center border border-border shrink-0">
                      <span className="font-display font-bold text-primary text-lg">
                        {player.shirtNumber || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate">{player.firstName} {player.lastName}</h3>
                      <p className="text-xs text-muted-foreground">{player.notes || 'Spieler'}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {(player.tags || []).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                            {tag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DemoLayout>
  );
}
