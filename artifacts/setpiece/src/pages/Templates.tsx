import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, useLocation } from 'wouter';
import { useGetTeam, useListTemplates, useListSetPieces, useCreateSetPiece, useCloneSetPiece, useUpdateSetPiece } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ArrowRight, Sparkles, LayoutDashboard, Copy, Loader2, Search, X, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  'all',
  'offensive_corner_left',
  'offensive_corner_right',
  'defensive_corner_left',
  'defensive_corner_right',
  'direct_free_kick_central',
  'direct_free_kick_left',
  'direct_free_kick_right',
  'indirect_free_kick_wide',
  'indirect_free_kick_left',
  'indirect_free_kick_right',
  'attacking_throw_in',
  'defensive_throw_in',
];

const STATUSES = ['all', 'draft', 'ready', 'active_matchday', 'archived'];

const labelize = (s: string) => s.replace(/_/g, ' ');

type TagDraft = { id: string; title: string; tags: string[] };

export default function Templates() {
  const [, params] = useRoute('/teams/:teamId/templates');
  const teamId = params?.teamId || '';
  const [, setLocation] = useLocation();
  const { data: team } = useGetTeam(teamId);
  const { data: templates } = useListTemplates();
  const { data: setPieces, refetch: refetchSP } = useListSetPieces(teamId);
  const createSP = useCreateSetPiece();
  const cloneSP = useCloneSetPiece();
  const updateSP = useUpdateSetPiece();
  const { toast } = useToast();
  const [cloningId, setCloningId] = useState<string | null>(null);

  const [category, setCategory] = useState('all');
  const [blankOpen, setBlankOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'offensive_corner_left' });

  // Library filtering for "Your Set Pieces".
  const [search, setSearch] = useState('');
  const [spCategory, setSpCategory] = useState('all');
  const [spStatus, setSpStatus] = useState('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Inline tag editor.
  const [tagEditSP, setTagEditSP] = useState<TagDraft | null>(null);
  const [tagInput, setTagInput] = useState('');

  const q = search.trim().toLowerCase();

  const allTags = Array.from(new Set((setPieces || []).flatMap(sp => sp.tags || []))).sort((a, b) => a.localeCompare(b));

  const matchesSearch = (fields: Array<string | null | undefined>) =>
    !q || fields.some(f => (f || '').toLowerCase().includes(q));

  const filteredSetPieces = (setPieces || []).filter(sp =>
    (spCategory === 'all' || sp.category === spCategory) &&
    (spStatus === 'all' || sp.status === spStatus) &&
    (activeTags.length === 0 || activeTags.every(t => (sp.tags || []).includes(t))) &&
    matchesSearch([sp.title, labelize(sp.category), sp.description, ...(sp.tags || [])])
  );

  const filteredTemplates = (templates || []).filter(t =>
    (category === 'all' || t.category === category) &&
    matchesSearch([t.title, labelize(t.category), t.description])
  );

  const spFiltersActive = q !== '' || spCategory !== 'all' || spStatus !== 'all' || activeTags.length > 0;
  const clearSpFilters = () => { setSearch(''); setSpCategory('all'); setSpStatus('all'); setActiveTags([]); };

  const useTemplate = async (templateId: string, title: string, cat: string) => {
    const sp = await createSP.mutateAsync({ teamId, data: { title, category: cat, templateId } });
    setLocation(`/teams/${teamId}/set-pieces/${sp.id}/editor`);
  };

  const handleClone = async (e: React.MouseEvent, setPieceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCloningId(setPieceId);
    try {
      const cloned = await cloneSP.mutateAsync({ teamId, setPieceId });
      refetchSP();
      toast({ title: "Set piece duplicated", description: `"${cloned.title}" is ready to edit.` });
      setLocation(`/teams/${teamId}/set-pieces/${cloned.id}/editor`);
    } catch {
      toast({ title: "Failed to duplicate", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setCloningId(null);
    }
  };

  const createBlank = async (e: React.FormEvent) => {
    e.preventDefault();
    const sp = await createSP.mutateAsync({ teamId, data: form });
    setBlankOpen(false);
    setLocation(`/teams/${teamId}/set-pieces/${sp.id}/editor`);
  };

  const toggleTagFilter = (e: React.MouseEvent, t: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const openTagEditor = (e: React.MouseEvent, sp: { id: string; title: string; tags?: string[] | null }) => {
    e.preventDefault();
    e.stopPropagation();
    setTagEditSP({ id: sp.id, title: sp.title, tags: sp.tags || [] });
    setTagInput('');
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || !tagEditSP) return;
    if (tagEditSP.tags.includes(v)) { setTagInput(''); return; }
    if (tagEditSP.tags.length >= 20) {
      toast({ title: "Tag limit reached", description: "A set piece can have up to 20 tags.", variant: "destructive" });
      return;
    }
    setTagEditSP({ ...tagEditSP, tags: [...tagEditSP.tags, v] });
    setTagInput('');
  };

  const removeDraftTag = (t: string) => {
    if (!tagEditSP) return;
    setTagEditSP({ ...tagEditSP, tags: tagEditSP.tags.filter(x => x !== t) });
  };

  const saveTags = async () => {
    if (!tagEditSP) return;
    try {
      await updateSP.mutateAsync({ teamId, setPieceId: tagEditSP.id, data: { tags: tagEditSP.tags } });
      await refetchSP();
      toast({ title: "Tags updated", description: `"${tagEditSP.title}" now has ${tagEditSP.tags.length} tag${tagEditSP.tags.length === 1 ? '' : 's'}.` });
      setTagEditSP(null);
    } catch {
      toast({ title: "Failed to update tags", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const inputCls = "bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none";

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
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-display font-bold text-base text-white">
              Your Set Pieces {spFiltersActive ? `(${filteredSetPieces.length}/${setPieces.length})` : `(${setPieces.length})`}
            </h2>
            {spFiltersActive && (
              <button onClick={clearSpFilters} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>

          {/* Search + filter toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, category or tag…"
                className={`${inputCls} w-full pl-9`}
              />
            </div>
            <select value={spCategory} onChange={e => setSpCategory(e.target.value)} className={`${inputCls} sm:w-48`}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : labelize(c)}</option>)}
            </select>
            <select value={spStatus} onChange={e => setSpStatus(e.target.value)} className={`${inputCls} sm:w-36`}>
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : labelize(s)}</option>)}
            </select>
          </div>

          {/* Tag filter row */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {allTags.map(t => (
                <button
                  key={t}
                  onClick={(e) => toggleTagFilter(e, t)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${activeTags.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {filteredSetPieces.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No set pieces match your filters.
                <button onClick={clearSpFilters} className="text-primary hover:underline ml-1">Clear filters</button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSetPieces.map((sp, idx) => (
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
                              onClick={(e) => openTagEditor(e, sp)}
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                              title="Edit tags"
                            >
                              <Tag className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleClone(e, sp.id)}
                              disabled={cloningId === sp.id}
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-primary disabled:opacity-50"
                              title="Duplicate set piece"
                            >
                              {cloningId === sp.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <StatusBadge status={sp.status} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{labelize(sp.category)}</p>
                        {sp.tags && sp.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {sp.tags.map(t => (
                              <button
                                key={t}
                                onClick={(e) => toggleTagFilter(e, t)}
                                className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${activeTags.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'bg-primary/10 text-primary border-primary/20 hover:border-primary/50'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-display font-bold text-base text-white mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Template Library
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${category === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground'}`}>
              {cat === 'all' ? 'All' : labelize(cat)}
            </button>
          ))}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No templates match your search.
          </CardContent>
        </Card>
      ) : (
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
                    <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded capitalize">{labelize(t.category)}</span>
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
      )}

      <Dialog open={blankOpen} onOpenChange={setBlankOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Create Blank Set Piece</DialogTitle></DialogHeader>
          <form onSubmit={createBlank} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Title</label>
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Short Corner Routine A" className={`${inputCls} w-full`} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={`${inputCls} w-full`}>
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{labelize(c)}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={createSP.isPending}>Create & Open Editor</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tagEditSP} onOpenChange={(open) => { if (!open) setTagEditSP(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Tags{tagEditSP ? ` — ${tagEditSP.title}` : ''}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag, e.g. near-post"
                className={`${inputCls} flex-1`}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>Add</Button>
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.filter(t => !tagEditSP?.tags.includes(t)).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => tagEditSP && setTagEditSP({ ...tagEditSP, tags: [...tagEditSP.tags, t] })}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
            <div className="min-h-[2.5rem] flex flex-wrap gap-1.5">
              {tagEditSP && tagEditSP.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">No tags yet.</span>
              )}
              {tagEditSP?.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  {t}
                  <button type="button" onClick={() => removeDraftTag(t)} className="hover:text-white"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setTagEditSP(null)}>Cancel</Button>
              <Button type="button" size="sm" onClick={saveTags} disabled={updateSP.isPending}>
                {updateSP.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save tags'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
