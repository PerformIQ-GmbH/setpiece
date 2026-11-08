import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, useLocation } from 'wouter';
import { getListSetPiecesQueryKey, useGetTeam, useListTemplates, useListSetPieces, useCreateSetPiece, useCloneSetPiece } from '@workspace/api-client-react';
import { getListSetPieceCollectionsQueryKey, useListSetPieceCollections, useCreateSetPieceCollection, useUpdateSetPieceCollection, useDeleteSetPieceCollection } from '@workspace/api-client-react';
import type { SetPieceCollection } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { SetPieceThumbnail } from '@/components/SetPieceThumbnail';
import { PlaybookSelect } from '@/components/PlaybookSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ArrowRight, Sparkles, Copy, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';

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

function categoryLabel(category: string) {
  return category.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

export default function Templates() {
  const [, params] = useRoute('/teams/:teamId/templates');
  const teamId = params?.teamId || '';
  return <TeamPlaybook key={teamId} teamId={teamId} />;
}

function TeamPlaybook({ teamId }: { teamId: string }) {
  const [, setLocation] = useLocation();
  const { data: team } = useGetTeam(teamId);
  const { data: templates } = useListTemplates();
  const { data: setPieces, refetch: refetchSP } = useListSetPieces(teamId, undefined, {
    query: { queryKey: getListSetPiecesQueryKey(teamId), refetchOnMount: 'always' },
  });
  const collectionsQuery = useListSetPieceCollections(teamId);
  const createCollection = useCreateSetPieceCollection();
  const updateCollection = useUpdateSetPieceCollection();
  const deleteCollection = useDeleteSetPieceCollection();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const createSP = useCreateSetPiece();
  const cloneSP = useCloneSetPiece();
  const { toast } = useToast();
  const [cloningId, setCloningId] = useState<string | null>(null);

  const [category, setCategory] = useState('all');
  const [pieceSearch, setPieceSearch] = useState('');
  const [pieceCategory, setPieceCategory] = useState('all');
  const [collectionId, setCollectionId] = useState('');
  const [collectionForm, setCollectionForm] = useState<{ id?: string; name: string; setPieceIds: string[] } | null>(null);
  const [collectionError, setCollectionError] = useState('');
  const [blankOpen, setBlankOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'offensive_corner_left' });

  const filteredTemplates = templates?.filter(t => category === 'all' || t.category === category) || [];
  const pieceCategories = [...new Set(setPieces?.map(piece => piece.category))].sort();
  const query = pieceSearch.trim().toLowerCase();
  const collections = [...(collectionsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const activeCollection = collections.find(item => item.id === collectionId);
  const collectionBusy = createCollection.isPending || updateCollection.isPending || deleteCollection.isPending;
  const collectionKey = getListSetPieceCollectionsQueryKey(teamId);
  const filteredPieces = setPieces?.filter(piece =>
    (!activeCollection || activeCollection.setPieceIds.includes(piece.id)) &&
    (pieceCategory === 'all' || piece.category === pieceCategory) &&
    piece.title.toLowerCase().includes(query)
  ) ?? [];

  const editCollection = (collection?: SetPieceCollection) => {
    setCollectionError('');
    setCollectionForm({
      id: collection?.id,
      name: collection?.name ?? '',
      setPieceIds: setPieces?.filter(piece => collection?.setPieceIds.includes(piece.id)).map(piece => piece.id) ?? [],
    });
  };

  const saveCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!collectionForm || !collectionForm.name.trim()) return;
    const data = { name: collectionForm.name.trim(), setPieceIds: collectionForm.setPieceIds };
    setCollectionError('');
    try {
      const saved = collectionForm.id
        ? await updateCollection.mutateAsync({ teamId, collectionId: collectionForm.id, data })
        : await createCollection.mutateAsync({ teamId, data });
      queryClient.setQueryData<SetPieceCollection[]>(collectionKey, items =>
        [...(items ?? []).filter(item => item.id !== saved.id), saved]);
      void queryClient.invalidateQueries({ queryKey: collectionKey });
      setCollectionId(saved.id);
      setPieceSearch('');
      setPieceCategory('all');
      setCollectionForm(null);
    } catch {
      setCollectionError('Could not save the collection. Check your connection and try again.');
    }
  };

  const removeCollection = async (collection: SetPieceCollection) => {
    if (!await confirm({
      title: 'Delete collection?',
      description: `“${collection.name}” will be removed. Its set pieces will stay in the playbook.`,
      confirmText: 'Delete collection',
      destructive: true,
    })) return;
    setCollectionError('');
    try {
      await deleteCollection.mutateAsync({ teamId, collectionId: collection.id });
      queryClient.setQueryData<SetPieceCollection[]>(collectionKey, items => items?.filter(item => item.id !== collection.id));
      void queryClient.invalidateQueries({ queryKey: collectionKey });
      setCollectionId('');
      setCollectionForm(null);
    } catch {
      setCollectionError('Could not delete the collection. Check your connection and try again.');
    }
  };

  const useTemplate = async (templateId: string, title: string, cat: string) => {
    const sp = await createSP.mutateAsync({ teamId, data: { title, category: cat, templateId } });
    setLocation(`/teams/${teamId}/set-pieces/${sp.id}/editor`);
  };

  const handleClone = async (setPieceId: string) => {
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

      {setPieces && (setPieces.length > 0 || collections.length > 0) && (
        <section className="mb-8" aria-labelledby="your-set-pieces">
          <h2 id="your-set-pieces" className="font-display font-bold text-base text-white mb-3">Your Set Pieces ({setPieces.length})</h2>
          {collectionsQuery.isError && <p role="status" className="mb-3 text-sm text-muted-foreground">Collections could not be loaded. <button type="button" className="underline" onClick={() => void collectionsQuery.refetch()}>Retry</button></p>}
          {collectionsQuery.data && (
            <div className="mb-4 flex flex-wrap items-end gap-2">
              <div className="w-full min-w-0 sm:max-w-xs">
                <PlaybookSelect label="Collection" value={activeCollection?.id ?? 'all'} disabled={collectionBusy || !!collectionForm} onChange={value => {
                  setCollectionId(value === 'all' ? '' : value);
                  setCollectionError('');
                  setPieceSearch('');
                  setPieceCategory('all');
                }} options={[{ value: 'all', label: 'All set pieces' }, ...collections.map(item => ({ value: item.id, label: item.name }))]} />
              </div>
              <Button type="button" variant="outline" disabled={collectionBusy || !!collectionForm} onClick={() => editCollection()}>New collection</Button>
              {activeCollection && <Button type="button" variant="ghost" disabled={collectionBusy || !!collectionForm} onClick={() => editCollection(activeCollection)}>Edit collection</Button>}
            </div>
          )}
          {collectionForm && (
            <form onSubmit={saveCollection} className="mb-4 space-y-3 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">{collectionForm.id ? 'Edit collection' : 'New collection'}</h3>
              <fieldset disabled={collectionBusy} className="min-w-0 space-y-3">
                <label className="block max-w-sm space-y-1">
                  <span className="text-sm font-medium">Collection name</span>
                  <Input required maxLength={80} autoFocus placeholder="e.g. Corners against zonal marking" value={collectionForm.name} onChange={event => setCollectionForm({ ...collectionForm, name: event.target.value })} />
                </label>
                <fieldset className="min-w-0">
                  <legend className="mb-1 text-sm font-medium">Set pieces in this collection</legend>
                  <div className="max-h-52 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                    {setPieces.map(piece => {
                      const checked = collectionForm.setPieceIds.includes(piece.id);
                      return <label key={piece.id} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
                        <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={checked} disabled={!checked && collectionForm.setPieceIds.length >= 100} onChange={event => setCollectionForm({
                          ...collectionForm,
                          setPieceIds: event.target.checked ? [...collectionForm.setPieceIds, piece.id] : collectionForm.setPieceIds.filter(id => id !== piece.id),
                        })} />
                        <span className="min-w-0 break-words">{piece.title}</span>
                      </label>;
                    })}
                    {setPieces.length === 0 && <p className="p-3 text-sm text-muted-foreground">There are no set pieces in the playbook yet.</p>}
                  </div>
                  {collectionForm.setPieceIds.length >= 100 && <p className="mt-1 text-sm text-muted-foreground">A collection can hold up to 100 set pieces.</p>}
                </fieldset>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={!collectionForm.name.trim()}>{collectionBusy ? 'Saving…' : 'Save collection'}</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setCollectionForm(null); setCollectionError(''); }}>Cancel</Button>
                  {activeCollection && collectionForm.id === activeCollection.id && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void removeCollection(activeCollection)}>Delete collection</Button>
                  )}
                </div>
              </fieldset>
            </form>
          )}
          {collectionError && <p role="alert" className="mb-3 text-sm text-destructive">{collectionError}</p>}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block w-full space-y-1 sm:max-w-xs">
              <span className="text-sm font-medium">Search your set pieces</span>
              <Input type="search" value={pieceSearch} onChange={e => setPieceSearch(e.target.value)} placeholder="Search by title" />
            </label>
            <div className="w-full min-w-0 sm:w-56">
              <PlaybookSelect label="Category" value={pieceCategory} onChange={setPieceCategory} options={[
                { value: 'all', label: 'All categories' },
                ...pieceCategories.map(value => ({ value, label: categoryLabel(value) })),
              ]} />
            </div>
          </div>
          <div className="mb-3 flex min-h-8 flex-wrap items-center gap-x-3">
            <p role="status" className="text-sm text-muted-foreground">
              {filteredPieces.length === 0
                ? activeCollection && !setPieces.some(piece => activeCollection.setPieceIds.includes(piece.id))
                  ? 'This collection has no set pieces yet.'
                  : 'No set pieces match your filters.'
                : `${filteredPieces.length} of ${setPieces.length} shown`}
            </p>
            {(pieceSearch || pieceCategory !== 'all') && (
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setPieceSearch('');
                setPieceCategory('all');
              }}>Clear filters</Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {filteredPieces.map(sp => (
              <Card key={sp.id} className="relative flex min-w-0 items-center gap-1 rounded-xl border-border bg-card p-2.5 transition-colors hover:border-primary/30">
                <Link href={`/teams/${teamId}/set-pieces/${sp.id}/editor`} className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <SetPieceThumbnail boardData={sp.boardData} category={sp.category} imageUrl={sp.previewImageUrl} />
                  <div className="min-w-0 py-1">
                    <h3 className="break-words text-sm font-bold text-foreground group-hover:text-primary">{sp.title}</h3>
                    <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">{categoryLabel(sp.category)}</p>
                    <StatusBadge status={sp.status} />
                  </div>
                </Link>
                <Button type="button" variant="ghost" size="icon" aria-label={`Duplicate ${sp.title}`} title="Duplicate set piece" onClick={() => void handleClone(sp.id)} disabled={cloningId === sp.id} className="size-9 shrink-0 text-muted-foreground">
                  {cloningId === sp.id ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                </Button>
              </Card>
            ))}
          </div>
        </section>
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
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="mb-1 flex items-center gap-3">
                  <SetPieceThumbnail boardData={t.boardData} category={t.category} imageUrl={t.previewImageUrl} roles={t.defaultRoles} />
                  <div className="min-w-0">
                    <h3 className="break-words font-bold text-sm text-white">{t.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{categoryLabel(t.category)}</p>
                  </div>
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
            <PlaybookSelect label="Category" value={form.category} onChange={category => setForm({ ...form, category })}
              options={CATEGORIES.filter(value => value !== 'all').map(value => ({ value, label: categoryLabel(value) }))} />
            <Button type="submit" className="w-full" disabled={createSP.isPending}>Create & Open Editor</Button>
          </form>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
