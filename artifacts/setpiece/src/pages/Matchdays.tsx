import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, Link } from 'wouter';
import { useGetTeam, useListMatchdays, useCreateMatchday, useDeleteMatchday } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfirm } from '@/hooks/use-confirm';

export default function Matchdays() {
  const [, params] = useRoute('/teams/:teamId/matchdays');
  const teamId = params?.teamId || '';
  const { data: team } = useGetTeam(teamId);
  const { data: matchdays, refetch } = useListMatchdays(teamId);
  const createMatchday = useCreateMatchday();
  const deleteMatchday = useDeleteMatchday();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', opponent: '', date: '', notes: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    await createMatchday.mutateAsync({ teamId, data: { ...form, date: form.date || undefined, notes: form.notes || undefined } });
    setOpen(false);
    setForm({ title: '', opponent: '', date: '', notes: '' });
    refetch();
  };

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Matchdays</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your match packs</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Matchday
        </Button>
      </div>

      {matchdays?.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No matchdays yet. Create one to start building your match pack.</p>
            <Button size="sm" className="mt-4" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Matchday</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchdays?.map((m, idx) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="bg-card border-border hover:border-primary/30 transition-all group">
                <CardContent className="p-5 flex items-center justify-between">
                  <Link href={`/teams/${teamId}/matchdays/${m.id}`} className="flex-1">
                    <div className="cursor-pointer">
                      <h3 className="font-bold text-base text-white group-hover:text-primary transition-colors">{m.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {m.opponent ? `vs ${m.opponent}` : 'Opponent TBD'}
                        {m.date && ` · ${new Date(m.date).toLocaleDateString()}`}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link href={`/teams/${teamId}/matchdays/${m.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">Manage <ArrowRight className="h-3 w-3 ml-1" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={async () => {
                      const ok = await confirm({
                        title: 'Delete matchday?',
                        description: `"${m.title}" will be permanently removed.`,
                        confirmText: 'Delete',
                        destructive: true,
                      });
                      if (ok) { await deleteMatchday.mutateAsync({ teamId, matchdayId: m.id }); refetch(); }
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Create Matchday</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Match Title</label>
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Round 12 vs City" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Opponent</label>
                <input value={form.opponent} onChange={e => setForm({...form, opponent: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none resize-none" />
            </div>
            <Button type="submit" className="w-full" disabled={createMatchday.isPending}>Create Matchday</Button>
          </form>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
