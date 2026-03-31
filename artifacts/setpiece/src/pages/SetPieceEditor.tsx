import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRoute } from 'wouter';
import { useGetTeam, useGetSetPiece, useCreateRole, useUpdateRole, useDeleteRole, useUpsertAssignment, useListPlayers, useUpdateSetPieceStatus, useUpdateSetPiece } from '@workspace/api-client-react';
import type { SetPieceRole, RoleAssignment } from '@workspace/api-client-react';
import { EditorCanvas, EditorToolbar, BottomBar, InspectorPanel, TutorialOverlay, ContextualTip, QuickLegend, useEditorStore } from '@/components/editor';
import type { Point, Annotation, BoardData, EditorCanvasHandle, PitchTheme } from '@/components/editor';
import { shouldShowTutorial, resetTutorial } from '@/components/editor/TutorialOverlay';
import { resetAllTips } from '@/components/editor/ContextualTip';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ShieldCheck, Ghost, FileDown, Loader2, Cloud, CloudOff, HelpCircle, Info, PanelRightClose, PanelRight, Sun, Trees, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

const THEME_OPTIONS: { value: PitchTheme; label: string; icon: React.ElementType }[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'green', label: 'Green', icon: Trees },
  { value: 'light', label: 'Light', icon: Sun },
];

export default function SetPieceEditor() {
  const [, params] = useRoute('/teams/:teamId/set-pieces/:setPieceId/editor');
  const teamId = params?.teamId || '';
  const setPieceId = params?.setPieceId || '';

  const { data: team } = useGetTeam(teamId);
  const { data: setPiece, isLoading, refetch } = useGetSetPiece(teamId, setPieceId);
  const { data: players } = useListPlayers(teamId);

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const upsertAssignment = useUpsertAssignment();
  const updateStatus = useUpdateSetPieceStatus();
  const updateSetPiece = useUpdateSetPiece();

  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [labelFormOpen, setLabelFormOpen] = useState(false);
  const [labelText, setLabelText] = useState('');
  const [labelPos, setLabelPos] = useState<Point | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const showTutorial = useEditorStore((s) => s.showTutorial);
  const setShowTutorial = useEditorStore((s) => s.setShowTutorial);
  const pitchTheme = useEditorStore((s) => s.pitchTheme);
  const setPitchTheme = useEditorStore((s) => s.setPitchTheme);
  const showLegend = useEditorStore((s) => s.showLegend);
  const setShowLegend = useEditorStore((s) => s.setShowLegend);
  const showTips = useEditorStore((s) => s.showTips);
  const setShowTips = useEditorStore((s) => s.setShowTips);
  const inspectorCollapsed = useEditorStore((s) => s.inspectorCollapsed);
  const setInspectorCollapsed = useEditorStore((s) => s.setInspectorCollapsed);

  interface UndoEntry { roleId: string; prevPos: { x: number; y: number }; newPos: { x: number; y: number } }
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasHandleRef = useRef<EditorCanvasHandle>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 500 });

  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const annotations = useEditorStore((s) => s.annotations);
  const setAnnotations = useEditorStore((s) => s.setAnnotations);
  const entities = useEditorStore((s) => s.entities);
  const setEntities = useEditorStore((s) => s.setEntities);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const strokeColor = useEditorStore((s) => s.strokeColor);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);
  const showArrowhead = useEditorStore((s) => s.showArrowhead);
  const resetStore = useEditorStore((s) => s.resetStore);

  const boardDataLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (shouldShowTutorial()) {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    if (!setPiece?.id) return;
    if (boardDataLoadedRef.current === setPiece.id) return;
    resetStore();
    if (setPiece.boardData && typeof setPiece.boardData === 'object') {
      const bd = setPiece.boardData as Partial<BoardData>;
      if (Array.isArray(bd.annotations)) setAnnotations(bd.annotations);
      if (Array.isArray(bd.entities)) setEntities(bd.entities);
    }
    boardDataLoadedRef.current = setPiece.id;
  }, [setPiece?.id]);

  useEffect(() => {
    return () => { resetStore(); };
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const isCorner = setPiece?.category?.includes('corner');
    const CORNER_RATIO = 654 / 608;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let { width, height } = entry.contentRect;
        width = Math.floor(width);
        height = Math.floor(height);
        if (isCorner && width > 0 && height > 0) {
          const fitByWidth = width / CORNER_RATIO;
          if (fitByWidth <= height) {
            height = Math.floor(fitByWidth);
          } else {
            width = Math.floor(height * CORNER_RATIO);
          }
        }
        setCanvasSize({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const saveBoardData = useCallback(async () => {
    const currentAnnotations = useEditorStore.getState().annotations;
    const currentEntities = useEditorStore.getState().entities;
    setSaveState('saving');
    try {
      await updateSetPiece.mutateAsync({
        teamId, setPieceId,
        data: { boardData: { annotations: currentAnnotations, entities: currentEntities } }
      });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [teamId, setPieceId, updateSetPiece]);

  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (!boardDataLoadedRef.current) return;
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      saveBoardData();
    }, 2000);
    return () => clearTimeout(timer);
  }, [annotations, entities]);

  const movementPathCacheRef = useRef<Record<string, string>>({});
  const handleMovementPathSync = useCallback(async (roleId: string, path: Array<{ x: number; y: number }>) => {
    const key = JSON.stringify(path);
    if (movementPathCacheRef.current[roleId] === key) return;
    movementPathCacheRef.current[roleId] = key;
    try {
      await updateRole.mutateAsync({ teamId, setPieceId, roleId, data: { movementPath: path } });
    } catch { /* silent */ }
  }, [teamId, setPieceId, updateRole]);

  const handleRoleDragEnd = useCallback(async (roleId: string, pos: { x: number; y: number }) => {
    const role = setPiece?.roles.find(r => r.id === roleId);
    const prevPos = { x: role?.startPosition?.x ?? 50, y: role?.startPosition?.y ?? 50 };
    setUndoStack(prev => [...prev, { roleId, prevPos, newPos: pos }]);
    setRedoStack([]);
    setSaveState('saving');
    try {
      await updateRole.mutateAsync({ teamId, setPieceId, roleId, data: { startPosition: pos } });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [teamId, setPieceId, updateRole, refetch, setPiece?.roles]);

  const handleUndo = useCallback(async () => {
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, entry]);
    setSaveState('saving');
    try {
      await updateRole.mutateAsync({ teamId, setPieceId, roleId: entry.roleId, data: { startPosition: entry.prevPos } });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [undoStack, teamId, setPieceId, updateRole, refetch]);

  const handleRedo = useCallback(async () => {
    const entry = redoStack[redoStack.length - 1];
    if (!entry) return;
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, entry]);
    setSaveState('saving');
    try {
      await updateRole.mutateAsync({ teamId, setPieceId, roleId: entry.roleId, data: { startPosition: entry.newPos } });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [redoStack, teamId, setPieceId, updateRole, refetch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const handlePitchClick = async (pos: { x: number; y: number }) => {
    if (activeTool === 'team_player') {
      setPendingPos(pos);
      setNewRoleName('');
      setRoleFormOpen(true);
    } else if (activeTool === 'select' && activeRoleId) {
      setSaveState('saving');
      try {
        await updateRole.mutateAsync({ teamId, setPieceId, roleId: activeRoleId, data: { startPosition: pos } });
        await refetch();
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }
  };

  const handleLabelPrompt = (pos: Point) => {
    setLabelPos(pos);
    setLabelText('');
    setLabelFormOpen(true);
  };

  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelText || !labelPos) return;
    addAnnotation({
      id: crypto.randomUUID(),
      type: 'label',
      points: [labelPos],
      color: strokeColor,
      strokeWidth,
      dashed: false,
      arrowhead: false,
      label: labelText,
      layerOrder: annotations.length,
    });
    setLabelFormOpen(false);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;
    setSaveState('saving');
    try {
      const position = pendingPos || { x: 50, y: 50 };
      const res = await createRole.mutateAsync({ teamId, setPieceId, data: { name: newRoleName, startPosition: position } });
      setRoleFormOpen(false);
      setPendingPos(null);
      setActiveRoleId(res.id);
      setActiveTool('select');
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const assignPlayer = async (roleId: string, playerId: string) => {
    setSaveState('saving');
    try {
      await upsertAssignment.mutateAsync({ teamId, setPieceId, data: { roleId, playerId } });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const assignBackupPlayer = async (roleId: string, backupPlayerId: string) => {
    const assignment = setPiece?.assignments?.find((a: RoleAssignment) => a.roleId === roleId);
    if (!assignment) return;
    setSaveState('saving');
    try {
      await upsertAssignment.mutateAsync({
        teamId, setPieceId,
        data: { roleId, playerId: assignment.playerId, backupPlayerId: backupPlayerId || undefined },
      });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this role?')) return;
    setSaveState('saving');
    try {
      await deleteRole.mutateAsync({ teamId, setPieceId, roleId });
      if (activeRoleId === roleId) setActiveRoleId(null);
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleExportPDF = async () => {
    if (!canvasHandleRef.current) return;
    const jsPDF = (await import('jspdf')).default;
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFillColor(10, 14, 23);
    pdf.rect(0, 0, 210, 297, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text(setPiece?.title || 'Set Piece', 105, 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text(setPiece?.category?.replace(/_/g, ' ').toUpperCase() || '', 105, 28, { align: 'center' });
    const imgData = canvasHandleRef.current.toDataURL({ pixelRatio: 2 });
    const imgWidth = 170;
    const imgHeight = (canvasSize.height / canvasSize.width) * imgWidth;
    pdf.addImage(imgData, 'PNG', 20, 35, imgWidth, imgHeight);
    let yOff = 40 + imgHeight + 10;
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.text('Roles & Assignments', 20, yOff);
    yOff += 8;
    pdf.setFontSize(9);
    setPiece?.roles?.forEach((role: SetPieceRole) => {
      const assignment = setPiece.assignments?.find((a: RoleAssignment) => a.roleId === role.id);
      const player = assignment ? players?.find(p => p.id === assignment.playerId) : null;
      const playerName = player ? `${player.firstName} ${player.lastName} (#${player.shirtNumber || '?'})` : 'Unassigned';
      pdf.setTextColor(16, 185, 129);
      pdf.text(role.name, 20, yOff);
      pdf.setTextColor(200, 200, 200);
      pdf.text(playerName, 80, yOff);
      yOff += 6;
    });
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text('SETPIECE by PerformIQ', 105, 290, { align: 'center' });
    pdf.save(`${setPiece?.title || 'setpiece'}.pdf`);
  };

  const handleTitleSave = async () => {
    if (!titleDraft.trim() || titleDraft === setPiece?.title) {
      setEditingTitle(false);
      return;
    }
    setSaveState('saving');
    try {
      await updateSetPiece.mutateAsync({ teamId, setPieceId, data: { title: titleDraft.trim() } });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
    setEditingTitle(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Tactical Board...</p>
        </div>
      </div>
    );
  }
  if (!setPiece) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Set piece not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen overflow-hidden">
      <header data-tutorial="header" className="h-12 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-3 md:px-4 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/teams/${teamId}/templates`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full h-7 w-7 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-5 w-px bg-border shrink-0" />
          <div className="min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                className="bg-transparent border-b border-primary text-white font-display font-bold text-sm outline-none px-0 max-w-[200px]"
              />
            ) : (
              <h1
                className="font-display font-bold text-sm leading-none text-white cursor-pointer hover:text-primary transition-colors truncate max-w-[200px]"
                onClick={() => { setTitleDraft(setPiece.title); setEditingTitle(true); }}
                title="Click to rename"
              >
                {setPiece.title}
              </h1>
            )}
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{setPiece.category.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-secondary/50 rounded-lg border border-border p-0.5 gap-0.5">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPitchTheme(opt.value)}
                title={`${opt.label} Pitch`}
                className={cn(
                  "w-7 h-6 rounded-md flex items-center justify-center transition-all",
                  pitchTheme === opt.value
                    ? "bg-primary/20 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                <opt.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border" />

          <button
            onClick={() => setShowLegend(!showLegend)}
            title="Toggle Legend"
            aria-label="Toggle Legend"
            aria-pressed={showLegend}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center transition-colors",
              showLegend ? "text-primary" : "text-muted-foreground hover:text-white"
            )}
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setHelpOpen(!helpOpen)}
              title="Help"
              aria-label="Help Menu"
              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            {helpOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setHelpOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 py-1.5">
                  <button
                    onClick={() => {
                      resetTutorial();
                      setShowTutorial(true);
                      setHelpOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
                  >
                    Show Tutorial Again
                  </button>
                  <button
                    onClick={() => {
                      setShowTips(!showTips);
                      if (!showTips) resetAllTips();
                      setHelpOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
                  >
                    {showTips ? 'Hide Tool Tips' : 'Show Tool Tips'}
                  </button>
                  <button
                    onClick={() => { setShowLegend(!showLegend); setHelpOpen(false); }}
                    className="w-full text-left px-3 py-2 text-[11px] text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
                  >
                    {showLegend ? 'Hide Legend' : 'Show Legend'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-border" />

          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide transition-colors border",
            saveState === 'saved' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            saveState === 'saving' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
            saveState === 'error' && "bg-red-500/10 text-red-400 border-red-500/20",
          )}>
            {saveState === 'saved' && <><Cloud className="h-3 w-3" /> Saved</>}
            {saveState === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving</>}
            {saveState === 'unsaved' && <><CloudOff className="h-3 w-3" /> Unsaved</>}
            {saveState === 'error' && <><CloudOff className="h-3 w-3" /> Error</>}
          </div>

          <StatusBadge status={setPiece.status} />

          <Button size="sm" variant="outline" className="text-[10px] h-6 border-border px-2" onClick={handleExportPDF}>
            <FileDown className="w-3 h-3 mr-1" /> PDF
          </Button>

          <Link href={`/teams/${teamId}/ghost/${setPieceId}`}>
            <Button size="sm" variant="outline" className="text-[10px] h-6 border-border px-2">
              <Ghost className="w-3 h-3 mr-1" /> Ghost
            </Button>
          </Link>

          {setPiece.status === 'draft' && (
            <Button size="sm" className="text-[10px] h-6 px-2" onClick={async () => {
              await updateStatus.mutateAsync({ teamId, setPieceId, data: { status: 'ready' } });
              refetch();
            }}>
              <ShieldCheck className="w-3 h-3 mr-1" /> Ready
            </Button>
          )}

          <button
            onClick={() => setInspectorCollapsed(!inspectorCollapsed)}
            title={inspectorCollapsed ? 'Show Panel' : 'Hide Panel'}
            aria-label={inspectorCollapsed ? 'Show Inspector Panel' : 'Hide Inspector Panel'}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            {inspectorCollapsed ? <PanelRight className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <EditorToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <main data-tutorial="pitch" className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background via-card to-background relative overflow-hidden flex items-center justify-center">
            <div ref={canvasRef} className="w-full h-full p-3 flex items-center justify-center" data-pitch-container>
              <EditorCanvas
                ref={canvasHandleRef}
                width={canvasSize.width}
                height={canvasSize.height}
                roles={setPiece.roles}
                assignments={setPiece.assignments || []}
                players={players}
                activeRoleId={activeRoleId}
                category={setPiece.category}
                onRoleClick={(id) => setActiveRoleId(id === activeRoleId ? null : id)}
                onRoleDragEnd={handleRoleDragEnd}
                onPitchClick={handlePitchClick}
                onLabelPrompt={handleLabelPrompt}
                onMovementPathSync={handleMovementPathSync}
              />
            </div>

            <QuickLegend />
            <ContextualTip />
          </main>

          <BottomBar />
        </div>

        <InspectorPanel
          roles={setPiece.roles}
          assignments={setPiece.assignments || []}
          players={players}
          activeRoleId={activeRoleId}
          onRoleClick={(id) => setActiveRoleId(id === activeRoleId ? null : id)}
          onAssignPlayer={assignPlayer}
          onAssignBackup={assignBackupPlayer}
          onDeleteRole={handleDeleteRole}
          onAddRole={() => { setPendingPos(null); setNewRoleName(''); setRoleFormOpen(true); }}
        />
      </div>

      <TutorialOverlay
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <Dialog open={roleFormOpen} onOpenChange={setRoleFormOpen}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">New Role</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-3 pt-1">
            <input
              autoFocus
              required
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              placeholder="e.g. Near Post Flick"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
            />
            <Button type="submit" className="w-full" disabled={createRole.isPending}>Create Role</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={labelFormOpen} onOpenChange={setLabelFormOpen}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Add Label</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateLabel} className="space-y-3 pt-1">
            <input
              autoFocus
              required
              value={labelText}
              onChange={e => setLabelText(e.target.value)}
              placeholder="Label text..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
            />
            <Button type="submit" className="w-full">Add Label</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
