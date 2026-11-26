import { useMemo, useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, useLocation } from 'wouter';
import {
  getListSetPiecesQueryKey, useGetTeam, useListTemplates, useListSetPieces, useCreateSetPiece, useCloneSetPiece,
  useDeleteSetPiece, useUpdateSetPieceStatus,
} from '@workspace/api-client-react';
import { getListSetPieceCollectionsQueryKey, useListSetPieceCollections, useCreateSetPieceCollection, useUpdateSetPieceCollection, useDeleteSetPieceCollection } from '@workspace/api-client-react';
import type { SetPieceCollection, SetPieceTemplate } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { SetPieceThumbnail } from '@/components/SetPieceThumbnail';
import { PlaybookSelect } from '@/components/PlaybookSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Archive, ArchiveRestore, Copy, Loader2, MoreHorizontal, Plus, Sparkles, Trash2 } from 'lucide-react';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateDetail } from '@/components/templates/TemplateDetail';
import { TemplateFilterBar } from '@/components/templates/TemplateFilterBar';
import { NO_FILTERS, categoryLabel, filterTemplates, sortTemplates, type TemplateFilters } from '@/lib/templateFilters';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';

const CATEGORIES = [
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

type PieceView = 'active' | 'draft' | 'ready' | 'archived';
const VIEW_LABELS: Record<PieceView, string> = { active: 'Alle aktiven', draft: 'Entwürfe', ready: 'Freigegeben', archived: 'Archiv' };

/** Server meldet erreichte Plangrenzen mit 403 und {error: 'Plan limit reached', limit, current}. */
function planLimitOf(err: unknown): { limit?: number } | null {
  const e = err as { status?: number; data?: { error?: string; limit?: number } | null };
  return e?.status === 403 && e.data?.error === 'Plan limit reached' ? { limit: e.data.limit } : null;
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
  const deleteSP = useDeleteSetPiece();
  const updateStatus = useUpdateSetPieceStatus();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [filters, setFilters] = useState<TemplateFilters>(NO_FILTERS);
  const [detail, setDetail] = useState<SetPieceTemplate | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [pieceView, setPieceView] = useState<PieceView>('active');
  const [pieceSearch, setPieceSearch] = useState('');
  const [pieceCategory, setPieceCategory] = useState('all');
  const [collectionId, setCollectionId] = useState('');
  const [collectionForm, setCollectionForm] = useState<{ id?: string; name: string; setPieceIds: string[] } | null>(null);
  const [collectionError, setCollectionError] = useState('');
  const [blankOpen, setBlankOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'offensive_corner_left' });

  const allTemplates = templates ?? [];
  const shownTemplates = useMemo(() => sortTemplates(filterTemplates(allTemplates, filters)), [allTemplates, filters]);

  const pieces = setPieces ?? [];
  const inView = (status: string, view: PieceView) =>
    view === 'active' ? status !== 'archived' : view === 'draft' ? status === 'draft' : view === 'ready' ? status === 'ready' || status === 'active_matchday' : status === 'archived';
  const viewCount = (view: PieceView) => pieces.filter(piece => inView(piece.status, view)).length;
  const pieceCategories = [...new Set(pieces.map(piece => piece.category))].sort();
  const query = pieceSearch.trim().toLowerCase();
  const collections = [...(collectionsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const activeCollection = collections.find(item => item.id === collectionId);
  const collectionBusy = createCollection.isPending || updateCollection.isPending || deleteCollection.isPending;
  const collectionKey = getListSetPieceCollectionsQueryKey(teamId);
  const filteredPieces = pieces.filter(piece =>
    inView(piece.status, pieceView) &&
    (!activeCollection || activeCollection.setPieceIds.includes(piece.id)) &&
    (pieceCategory === 'all' || piece.category === pieceCategory) &&
    piece.title.toLowerCase().includes(query)
  );

  const editCollection = (collection?: SetPieceCollection) => {
    setCollectionError('');
    setCollectionForm({
      id: collection?.id,
      name: collection?.name ?? '',
      setPieceIds: pieces.filter(piece => collection?.setPieceIds.includes(piece.id)).map(piece => piece.id),
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
      setCollectionError('Die Sammlung konnte nicht gespeichert werden. Prüfe die Verbindung und versuche es nochmals.');
    }
  };

  const removeCollection = async (collection: SetPieceCollection) => {
    if (!await confirm({
      title: 'Sammlung löschen?',
      description: `«${collection.name}» wird entfernt. Die Standards darin bleiben im Playbook.`,
      confirmText: 'Sammlung löschen',
      cancelText: 'Abbrechen',
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
      setCollectionError('Die Sammlung konnte nicht gelöscht werden. Prüfe die Verbindung und versuche es nochmals.');
    }
  };

  // Fehler nie verschlucken: bei erreichter Plangrenze sagt die Meldung, was zu tun ist.
  const reportCreateError = (err: unknown, fallback: string) => {
    const limit = planLimitOf(err);
    if (limit) {
      toast({
        title: 'Limit deines Plans erreicht',
        description: `Dein Team hat ${limit.limit ?? 'die maximale Anzahl'} Standards, archivierte zählen mit. Lösche einen nicht mehr benötigten Standard oder wechsle unter «Preise» auf einen grösseren Plan.`,
        variant: 'destructive',
      });
    } else {
      toast({ title: fallback, description: 'Bitte versuche es nochmal.', variant: 'destructive' });
    }
  };

  const useTemplate = async (template: SetPieceTemplate) => {
    setUsingId(template.id);
    try {
      const sp = await createSP.mutateAsync({ teamId, data: { title: template.title, category: template.category, templateId: template.id } });
      setLocation(`/teams/${teamId}/set-pieces/${sp.id}/editor`);
    } catch (err) {
      reportCreateError(err, 'Vorlage konnte nicht übernommen werden');
    } finally {
      setUsingId(null);
    }
  };

  const handleClone = async (setPieceId: string) => {
    setBusyId(setPieceId);
    try {
      const cloned = await cloneSP.mutateAsync({ teamId, setPieceId });
      refetchSP();
      toast({ title: 'Standard dupliziert', description: `«${cloned.title}» ist bereit zum Bearbeiten.` });
      setLocation(`/teams/${teamId}/set-pieces/${cloned.id}/editor`);
    } catch (err) {
      reportCreateError(err, 'Duplizieren fehlgeschlagen');
    } finally {
      setBusyId(null);
    }
  };

  /** Archivieren und Löschen darf nur der Haupttrainer; der Server entscheidet, wir übersetzen die Antwort. */
  const reportManageError = (err: unknown, fallback: string) => {
    const forbidden = (err as { status?: number })?.status === 403;
    toast({
      title: forbidden ? 'Dafür fehlt dir die Berechtigung' : fallback,
      description: forbidden ? 'Standards archivieren oder löschen dürfen nur die Haupttrainer des Teams.' : 'Bitte versuche es nochmal.',
      variant: 'destructive',
    });
  };

  const setStatus = async (piece: { id: string; title: string }, status: 'archived' | 'draft') => {
    setBusyId(piece.id);
    try {
      await updateStatus.mutateAsync({ teamId, setPieceId: piece.id, data: { status } });
      await refetchSP();
      toast(status === 'archived'
        ? { title: 'Standard archiviert', description: `«${piece.title}» liegt jetzt im Archiv. Er zählt weiter zum Limit deines Plans.` }
        : { title: 'Standard wiederhergestellt', description: `«${piece.title}» ist wieder ein Entwurf. Veröffentliche ihn im Editor erneut für deine Spieler.` });
    } catch (err) {
      reportManageError(err, status === 'archived' ? 'Archivieren fehlgeschlagen' : 'Wiederherstellen fehlgeschlagen');
    } finally {
      setBusyId(null);
    }
  };

  const removePiece = async (piece: { id: string; title: string; status: string }) => {
    const shared = piece.status !== 'draft';
    if (!await confirm({
      title: shared ? 'Freigegebenen Standard löschen?' : 'Entwurf löschen?',
      description: shared
        ? `«${piece.title}» wird mit Rollen und Zuweisungen endgültig gelöscht, ebenso die Rückmeldungen der Spieler dazu und die Verknüpfung mit Spieltagen. Willst du ihn nur ausblenden, wähle «Archivieren».`
        : `«${piece.title}» wird mit Rollen und Zuweisungen endgültig gelöscht. Das lässt sich nicht rückgängig machen.`,
      confirmText: 'Endgültig löschen',
      cancelText: 'Abbrechen',
      destructive: true,
    })) return;
    setBusyId(piece.id);
    try {
      await deleteSP.mutateAsync({ teamId, setPieceId: piece.id });
      await refetchSP();
      toast({ title: 'Standard gelöscht', description: `«${piece.title}» wurde entfernt.` });
    } catch (err) {
      reportManageError(err, 'Löschen fehlgeschlagen');
    } finally {
      setBusyId(null);
    }
  };

  const createBlank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sp = await createSP.mutateAsync({ teamId, data: form });
      setBlankOpen(false);
      setLocation(`/teams/${teamId}/set-pieces/${sp.id}/editor`);
    } catch (err) {
      setBlankOpen(false);
      reportCreateError(err, 'Standard konnte nicht erstellt werden');
    }
  };

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Playbook</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deine Standards und die Vorlagenbibliothek</p>
        </div>
        <Button size="sm" className="min-h-10" onClick={() => setBlankOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Leeren Standard anlegen
        </Button>
      </div>

      {setPieces && (pieces.length > 0 || collections.length > 0) && (
        <section className="mb-10" aria-labelledby="your-set-pieces">
          <h2 id="your-set-pieces" className="mb-3 font-display text-base font-bold text-white">Deine Standards ({viewCount('active')})</h2>

          <div role="group" aria-label="Anzeigen" className="mb-4 flex flex-wrap items-center gap-1.5">
            {(Object.keys(VIEW_LABELS) as PieceView[]).map(view => (
              <button
                key={view} type="button" aria-pressed={pieceView === view} onClick={() => setPieceView(view)}
                className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors ${pieceView === view ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-white'}`}
              >
                {VIEW_LABELS[view]} ({viewCount(view)})
              </button>
            ))}
            {collectionsQuery.data && collections.length === 0 && !collectionForm && (
              <Button type="button" variant="ghost" className="min-h-10 text-muted-foreground" onClick={() => editCollection()}>Neue Sammlung</Button>
            )}
          </div>
          {pieceView === 'archived' && (
            <p className="mb-3 text-sm text-muted-foreground">Archivierte Standards sind für Spieler und Spieltage ausgeblendet, zählen aber weiter zum Limit deines Plans. Lösche sie, wenn du Platz brauchst.</p>
          )}

          {collectionsQuery.isError && <p role="status" className="mb-3 text-sm text-muted-foreground">Die Sammlungen konnten nicht geladen werden. <button type="button" className="underline" onClick={() => void collectionsQuery.refetch()}>Nochmals versuchen</button></p>}
          {collectionsQuery.data && (collections.length > 0 || collectionForm) && (
            <div className="mb-4 flex flex-wrap items-end gap-2">
              <div className="w-full min-w-0 sm:max-w-xs">
                <PlaybookSelect label="Sammlung" value={activeCollection?.id ?? 'all'} disabled={collectionBusy || !!collectionForm} onChange={value => {
                  setCollectionId(value === 'all' ? '' : value);
                  setCollectionError('');
                  setPieceSearch('');
                  setPieceCategory('all');
                }} options={[{ value: 'all', label: 'Alle Standards' }, ...collections.map(item => ({ value: item.id, label: item.name }))]} />
              </div>
              <Button type="button" variant="outline" className="min-h-10" disabled={collectionBusy || !!collectionForm} onClick={() => editCollection()}>Neue Sammlung</Button>
              {activeCollection && <Button type="button" variant="ghost" className="min-h-10" disabled={collectionBusy || !!collectionForm} onClick={() => editCollection(activeCollection)}>Sammlung bearbeiten</Button>}
            </div>
          )}
          {collectionForm && (
            <form onSubmit={saveCollection} className="mb-4 space-y-3 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">{collectionForm.id ? 'Sammlung bearbeiten' : 'Neue Sammlung'}</h3>
              <fieldset disabled={collectionBusy} className="min-w-0 space-y-3">
                <label className="block max-w-sm space-y-1">
                  <span className="text-sm font-medium">Name der Sammlung</span>
                  <Input required maxLength={80} autoFocus placeholder="z. B. Ecken gegen Raumdeckung" value={collectionForm.name} onChange={event => setCollectionForm({ ...collectionForm, name: event.target.value })} />
                </label>
                <fieldset className="min-w-0">
                  <legend className="mb-1 text-sm font-medium">Standards in dieser Sammlung</legend>
                  <div className="max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {pieces.map(piece => {
                      const checked = collectionForm.setPieceIds.includes(piece.id);
                      return <label key={piece.id} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
                        <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={checked} disabled={!checked && collectionForm.setPieceIds.length >= 100} onChange={event => setCollectionForm({
                          ...collectionForm,
                          setPieceIds: event.target.checked ? [...collectionForm.setPieceIds, piece.id] : collectionForm.setPieceIds.filter(id => id !== piece.id),
                        })} />
                        <span className="min-w-0 break-words">{piece.title}</span>
                      </label>;
                    })}
                    {pieces.length === 0 && <p className="p-3 text-sm text-muted-foreground">Im Playbook gibt es noch keine Standards.</p>}
                  </div>
                  {collectionForm.setPieceIds.length >= 100 && <p className="mt-1 text-sm text-muted-foreground">Eine Sammlung fasst höchstens 100 Standards.</p>}
                </fieldset>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={!collectionForm.name.trim()}>{collectionBusy ? 'Wird gespeichert …' : 'Sammlung speichern'}</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setCollectionForm(null); setCollectionError(''); }}>Abbrechen</Button>
                  {activeCollection && collectionForm.id === activeCollection.id && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void removeCollection(activeCollection)}>Sammlung löschen</Button>
                  )}
                </div>
              </fieldset>
            </form>
          )}
          {collectionError && <p role="alert" className="mb-3 text-sm text-destructive">{collectionError}</p>}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block w-full space-y-1 sm:max-w-xs">
              <span className="text-sm font-medium">Deine Standards durchsuchen</span>
              <Input type="search" value={pieceSearch} onChange={e => setPieceSearch(e.target.value)} placeholder="Nach Titel suchen" />
            </label>
            <div className="w-full min-w-0 sm:w-56">
              <PlaybookSelect label="Art" value={pieceCategory} onChange={setPieceCategory} options={[
                { value: 'all', label: 'Alle Arten' },
                ...pieceCategories.map(value => ({ value, label: categoryLabel(value) })),
              ]} />
            </div>
          </div>
          <div className="mb-3 flex min-h-8 flex-wrap items-center gap-x-3">
            <p role="status" className="text-sm text-muted-foreground">
              {filteredPieces.length === 0
                ? pieceView === 'archived' && !pieceSearch && pieceCategory === 'all' && !activeCollection ? 'Das Archiv ist leer.'
                  : activeCollection && !pieces.some(piece => activeCollection.setPieceIds.includes(piece.id)) ? 'Diese Sammlung enthält noch keine Standards.'
                  : 'Keine Standards passen zu deinen Filtern.'
                : `${filteredPieces.length} von ${pieces.length} angezeigt`}
            </p>
            {(pieceSearch || pieceCategory !== 'all') && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setPieceSearch(''); setPieceCategory('all'); }}>Filter zurücksetzen</Button>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Aktionen für ${sp.title}`} disabled={busyId === sp.id} className="size-11 shrink-0 text-muted-foreground">
                      {busyId === sp.id ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-5" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="min-h-11" onSelect={() => void handleClone(sp.id)}><Copy className="mr-2 size-4" /> Duplizieren</DropdownMenuItem>
                    {sp.status === 'archived'
                      ? <DropdownMenuItem className="min-h-11" onSelect={() => void setStatus(sp, 'draft')}><ArchiveRestore className="mr-2 size-4" /> Als Entwurf wiederherstellen</DropdownMenuItem>
                      : <DropdownMenuItem className="min-h-11" onSelect={() => void setStatus(sp, 'archived')}><Archive className="mr-2 size-4" /> Archivieren</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="min-h-11 text-destructive focus:text-destructive" onSelect={() => void removePiece(sp)}><Trash2 className="mr-2 size-4" /> Löschen …</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="library">
        <h2 id="library" className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Sparkles className="h-4 w-4 text-primary" /> Vorlagenbibliothek
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Bewährte Varianten mit echter Szene und Zeichnung. Übernimm eine und passe sie an dein Team an.</p>

        {templates === undefined ? (
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">Vorlagen werden geladen …</p>
        ) : (
          <>
            <TemplateFilterBar templates={allTemplates} filters={filters} onChange={setFilters} shown={shownTemplates.length} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shownTemplates.map(t => (
                <TemplateCard key={t.id} template={t} onOpen={setDetail} onUse={useTemplate} busy={usingId === t.id} />
              ))}
            </div>
          </>
        )}
      </section>

      <TemplateDetail template={detail} onClose={() => setDetail(null)} onUse={useTemplate} busy={!!detail && usingId === detail.id} />

      <Dialog open={blankOpen} onOpenChange={setBlankOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Leeren Standard anlegen</DialogTitle></DialogHeader>
          <form onSubmit={createBlank} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label htmlFor="blank-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titel</label>
              <input id="blank-title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="z. B. Kurze Ecke A" className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <PlaybookSelect label="Art" value={form.category} onChange={category => setForm({ ...form, category })}
              options={CATEGORIES.map(value => ({ value, label: categoryLabel(value) }))} />
            <Button type="submit" className="min-h-11 w-full" disabled={createSP.isPending}>Anlegen und Editor öffnen</Button>
          </form>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}
