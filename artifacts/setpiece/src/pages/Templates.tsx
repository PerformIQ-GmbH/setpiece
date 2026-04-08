import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, useLocation } from 'wouter';
import { useGetTeam, useListTemplates, useListSetPieces, useCreateSetPiece, useCloneSetPiece } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ArrowRight, Sparkles, LayoutDashboard, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

const CATEGORIES = [
  'all',
  'offensive_corner_left',
  'offensive_corner_right',
  'defensive_corner_left',
  'defensive_corner_right',
  'direct_free_kick_central',
  'indirect_free_kick_wide',
  'attacking_throw_in',
  'defensive_throw_in',
];

export default function Templates() {
  const [, params] = useRoute('/teams/:teamId/templates');
  const teamId = params?.teamId || '';
  const [, setLocation] = useLocation();
  const { data: team } = useGetTeam(teamId);
  const { data: templates } = useListTemplates();
  const { data: setPieces, refetch: refetchSP } = useListSetPieces(teamId);
  const createSP = useCreateSetPiece();
  const cloneSP = useCloneSetPiece();

  const [category, setCategory] = useState('all');
  const [blankOpen, setBlankOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'offensive_corner_left' });

  const filteredTemplates = templates?.filter(t => category === 'all' || t.category === category) || [];

  const useTemplate = async (templateId: string, title: string, cat: string) => {
    const sp = await createSP.mutateAsync({ teamId, data: { title, category: cat, templateId } });
    setLocation(`/teams/${teamId}/set-pieces/${sp.id}/editor`);
  };

  const handleClone = async (e: React.MouseEvent, setPieceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const cloned = await cloneSP.mutateAsync({ teamId, setPieceId });
      refetchSP();
      setLocation(`/teams/${teamId}/set-pieces/${cloned.id}/editor`);
    } catch {
      alert("Failed to duplicate set piece. Please try again.");
    }
  };

  const createBlank = async (e: React.FormEvent) => {
    e.preventDefault();
    const sp = await createSP.mutateAsync({ teamId, data: form });
    setBlankOpen(false);
    setLocation(`/teams/${teamId}/set-pieces/${sp.id}/editor`);
  };

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Tactical Playbook</h1>
          <p className="text-muted-foreground text-sm mt-1">Your set pieces and template library</p>
        </div>
        <Button size="sm" onClick={() => setBlankOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Blank Set Piece
        </Button>
      </div>

      {setPieces && setPieces.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-bold text-base text-white mb-3">Your Set Pieces ({setPieces.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {setPieces.map((sp, idx) => (
              <motion.div key={sp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                <Link href={`/teams/${teamId}/set-pieces/${sp.id}/editor`}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group overflow-hidden">
                    <div className="aspect-[16/9] bg-emerald-950/40 border-b border-border/50 relative flex items-center justify-center">
                      {sp.previewImageUrl ? (
                        <img src={sp.previewImageUrl} alt={sp.title} className="w-full h-full object-cover" />
                      ) : (
                        <LayoutDashboard className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{sp.title}</h3>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleClone(e, sp.id)}
                            disabled={cloneSP.isPending}
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                            title="Duplicate set piece"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <StatusBadge status={sp.status} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{sp.category.replace(/_/g, ' ')}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-display font-bold text-base text-white mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Template Library
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${category === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground'}`}>
              {cat === 'all' ? 'All' : cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((t, idx) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
            <Card className="bg-card border-border hover:border-primary/30 transition-all group overflow-hidden h-full flex flex-col">
              <div className="aspect-[16/9] bg-emerald-950/40 border-b border-border/50 relative flex items-center justify-center">
                {t.previewImageUrl ? (
                  <img src={t.previewImageUrl} alt={t.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-3 border border-white/10 rounded-sm" />
                )}
              </div>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{t.title}</h3>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded capitalize">{t.category.replace(/_/g, ' ')}</span>
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                {t.defaultRoles && t.defaultRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.defaultRoles.slice(0, 4).map((r, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{r.name}</span>
                    ))}
                    {t.defaultRoles.length > 4 && <span className="text-[9px] text-muted-foreground">+{t.defaultRoles.length - 4}</span>}
                  </div>
                )}
                {t.coachingNote && <p className="text-[10px] text-muted-foreground mt-2 italic line-clamp-1">{t.coachingNote}</p>}
                <div className="mt-auto pt-3">
                  <Button size="sm" variant="outline" className="w-full text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => useTemplate(t.id, t.title, t.category)} disabled={createSP.isPending}>
                    Use Template <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={blankOpen} onOpenChange={setBlankOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Create Blank Set Piece</DialogTitle></DialogHeader>
          <form onSubmit={createBlank} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Title</label>
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Short Corner Routine A" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={createSP.isPending}>Create & Open Editor</Button>
          </form>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
