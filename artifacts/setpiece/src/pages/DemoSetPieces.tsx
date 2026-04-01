import { DemoLayout } from '@/components/DemoLayout';
import { useDemoMode } from '@/contexts/DemoContext';
import { useDemoSetPieces } from '@/hooks/useDemoData';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

export default function DemoSetPieces() {
  const { demoTeamId, demoTeam } = useDemoMode();
  const { data: setPieces, isLoading } = useDemoSetPieces(demoTeamId || '');

  return (
    <DemoLayout teamName={demoTeam?.name}>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Set Pieces</h1>
        <p className="text-muted-foreground mt-1">{setPieces?.length || 0} routines</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {setPieces?.map((sp: any, idx: number) => (
            <motion.div key={sp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Link href={`/demo/teams/${demoTeamId}/set-pieces/${sp.id}/editor`}>
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
                    {sp.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{sp.description}</p>}
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
