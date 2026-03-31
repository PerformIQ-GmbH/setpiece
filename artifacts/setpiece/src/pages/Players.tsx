import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute } from 'wouter';
import { useGetTeam, useListPlayers, useCreatePlayer, useDeletePlayer, useUpdatePlayer } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Search, Trash2, Edit2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const FOOT_OPTIONS = ['right', 'left', 'both'];
const TAG_OPTIONS = ['tall', 'fast', 'strong_header', 'set_piece_specialist', 'captain', 'penalty_taker', 'goalkeeper', 'defender', 'midfielder', 'forward'];

export default function Players() {
  const [, params] = useRoute('/teams/:teamId/players');
  const teamId = params?.teamId || '';
  const { data: team } = useGetTeam(teamId);
  const { data: players, refetch } = useListPlayers(teamId);
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();

  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', shirtNumber: '', dominantFoot: 'right',
    height: '', status: 'active', tags: [] as string[],
    headingStrength: '', speed: '', notes: ''
  });

  const filtered = players?.filter(p => {
    const matchesSearch = !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !filterTag || p.tags?.includes(filterTag);
    return matchesSearch && matchesTag;
  }) || [];

  const openEdit = (p: typeof players extends (infer T)[] | undefined ? T : never) => {
    if (!p) return;
    setEditingId(p.id);
    setForm({
      firstName: p.firstName, lastName: p.lastName,
      shirtNumber: p.shirtNumber?.toString() || '', dominantFoot: p.dominantFoot || 'right',
      height: p.height?.toString() || '', status: p.status || 'active',
      tags: p.tags || [], headingStrength: p.headingStrength?.toString() || '',
      speed: p.speed?.toString() || '', notes: p.notes || ''
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ firstName: '', lastName: '', shirtNumber: '', dominantFoot: 'right', height: '', status: 'active', tags: [], headingStrength: '', speed: '', notes: '' });
    setDialogOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      firstName: form.firstName, lastName: form.lastName,
      shirtNumber: form.shirtNumber ? parseInt(form.shirtNumber) : undefined,
      dominantFoot: form.dominantFoot || undefined,
      height: form.height ? parseInt(form.height) : undefined,
      status: form.status, tags: form.tags.length > 0 ? form.tags : undefined,
      headingStrength: form.headingStrength ? parseInt(form.headingStrength) : undefined,
      speed: form.speed ? parseInt(form.speed) : undefined,
      notes: form.notes || undefined,
    };
    if (editingId) {
      await updatePlayer.mutateAsync({ teamId, playerId: editingId, data });
    } else {
      await createPlayer.mutateAsync({ teamId, data });
    }
    setDialogOpen(false);
    refetch();
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Squad Roster</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} player{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Player
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:border-primary outline-none"
          />
        </div>
        <select
          value={filterTag} onChange={e => setFilterTag(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none text-muted-foreground w-full sm:w-auto"
        >
          <option value="">All Tags</option>
          {TAG_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Foot</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p, idx) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{p.shirtNumber || '-'}</td>
                  <td className="px-4 py-3 font-semibold text-white">{p.firstName} {p.lastName}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{p.dominantFoot || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tags?.map(t => (
                        <span key={t} className="px-1.5 py-0.5 text-[9px] rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                          {t.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => openEdit(p)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={async () => {
                        if (confirm('Remove player?')) { await deletePlayer.mutateAsync({ teamId, playerId: p.id }); refetch(); }
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No players found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Player' : 'Add Player'}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">First Name</label>
                <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Last Name</label>
                <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Shirt No.</label>
                <input type="number" value={form.shirtNumber} onChange={e => setForm({...form, shirtNumber: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Foot</label>
                <select value={form.dominantFoot} onChange={e => setForm({...form, dominantFoot: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                  {FOOT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Height (cm)</label>
                <input type="number" value={form.height} onChange={e => setForm({...form, height: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Heading (1-10)</label>
                <input type="number" min={1} max={10} value={form.headingStrength} onChange={e => setForm({...form, headingStrength: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Speed (1-10)</label>
                <input type="number" min={1} max={10} value={form.speed} onChange={e => setForm({...form, speed: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-2 py-1 text-xs rounded-md border transition-all ${form.tags.includes(tag) ? 'bg-primary/20 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border hover:border-muted-foreground'}`}>
                    {tag.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none resize-none" />
            </div>
            <Button type="submit" className="w-full" disabled={createPlayer.isPending || updatePlayer.isPending}>
              {editingId ? 'Save Changes' : 'Add Player'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
