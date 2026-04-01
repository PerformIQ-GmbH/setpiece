import { useRoute, Link } from 'wouter';
import { DemoLayout } from '@/components/DemoLayout';
import { useDemoMode } from '@/contexts/DemoContext';
import { useDemoMatchday } from '@/hooks/useDemoData';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function DemoMatchdayDetail() {
  const [, params] = useRoute('/demo/teams/:teamId/matchdays/:matchdayId');
  const teamId = params?.teamId || '';
  const matchdayId = params?.matchdayId || '';
  const { demoTeam } = useDemoMode();

  const { data: matchday, isLoading } = useDemoMatchday(teamId, matchdayId);

  if (isLoading) {
    return (
      <DemoLayout teamName={demoTeam?.name}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DemoLayout>
    );
  }

  if (!matchday) {
    return (
      <DemoLayout teamName={demoTeam?.name}>
        <p className="text-muted-foreground">Matchday not found.</p>
      </DemoLayout>
    );
  }

  return (
    <DemoLayout teamName={demoTeam?.name}>
      <div className="mb-6">
        <Link href={`/demo/teams/${teamId}/matchdays`}>
          <Button variant="ghost" size="sm" className="text-muted-foreground mb-3">
            <ArrowLeft className="h-4 w-4 mr-1" /> All Matchdays
          </Button>
        </Link>
        <h1 className="text-3xl font-display font-bold text-white">{matchday.title}</h1>
        <p className="text-muted-foreground mt-1">
          {matchday.date ? new Date(matchday.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
          {matchday.opponent && ` · vs ${matchday.opponent}`}
        </p>
        {matchday.notes && <p className="text-sm text-muted-foreground mt-2 italic">"{matchday.notes}"</p>}
      </div>

      <h2 className="font-display font-bold text-lg text-white mb-4">Active Set Pieces</h2>
      {matchday.setPieces?.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-sm">No set pieces assigned to this matchday.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchday.setPieces?.map((sp: any, idx: number) => (
            <motion.div key={sp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
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
    </DemoLayout>
  );
}
