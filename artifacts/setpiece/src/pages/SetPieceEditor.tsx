import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRoute } from 'wouter';
import { useGetTeam, useGetSetPiece, useCreateRole, useUpdateRole, useDeleteRole, useUpsertAssignment, useListPlayers, useUpdateSetPieceStatus, useUpdateSetPiece } from '@workspace/api-client-react';
import type { SetPieceRole, RoleAssignment } from '@workspace/api-client-react';
import { KonvaPitch } from '@/components/KonvaPitch';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, ArrowLeft, ShieldCheck, Trash2, Ghost, FileDown, Loader2, Cloud, CloudOff, MousePointer2, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';
type EditorTool = 'select' | 'place' | 'pan';

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
  const [newRoleName, setNewRoleName] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  interface UndoEntry { roleId: string; prevPos: { x: number; y: number }; newPos: { x: number; y: number } }
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 500 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleRoleDragEnd = useCallback(async (roleId: string, pos: { x: number; y: number }) => {
    const role = setPiece?.roles.find(r => r.id === roleId);
    const prevPos = { x: role?.startPosition?.x ?? 50, y: role?.startPosition?.y ?? 50 };
    setUndoStack(prev => [...prev, { roleId, prevPos, newPos: pos }]);
    setRedoStack([]);
    setSaveState('saving');
    try {
      await updateRole.mutateAsync({
        teamId, setPieceId, roleId,
        data: { startPosition: pos }
      });
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
      await updateRole.mutateAsync({
        teamId, setPieceId, roleId: entry.roleId,
        data: { startPosition: entry.prevPos }
      });
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
      await updateRole.mutateAsync({
        teamId, setPieceId, roleId: entry.roleId,
        data: { startPosition: entry.newPos }
      });
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
    if (activeTool === 'place') {
      setPendingPos(pos);
      setNewRoleName('');
      setRoleFormOpen(true);
    } else if (activeTool === 'select' && activeRoleId) {
      setSaveState('saving');
      try {
        await updateRole.mutateAsync({
          teamId, setPieceId, roleId: activeRoleId,
          data: { startPosition: pos }
        });
        await refetch();
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;
    setSaveState('saving');
    try {
      const position = pendingPos || { x: 50, y: 50 };
      const res = await createRole.mutateAsync({
        teamId, setPieceId,
        data: { name: newRoleName, startPosition: position }
      });
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
    const stageEl = canvasRef.current?.querySelector('canvas');
    if (!stageEl) return;
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
    const imgData = stageEl.toDataURL('image/png');
    const imgWidth = 170;
    const imgHeight = (stageEl.height / stageEl.width) * imgWidth;
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

  const activeRole = setPiece.roles.find(r => r.id === activeRoleId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen overflow-hidden">
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/teams/${teamId}/templates`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                className="bg-transparent border-b border-primary text-white font-display font-bold text-base outline-none px-0"
              />
            ) : (
              <h1
                className="font-display font-bold text-base leading-none text-white cursor-pointer hover:text-primary transition-colors"
                onClick={() => { setTitleDraft(setPiece.title); setEditingTitle(true); }}
                title="Click to rename"
              >
                {setPiece.title}
              </h1>
            )}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{setPiece.category.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors border",
            saveState === 'saved' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            saveState === 'saving' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
            saveState === 'unsaved' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
            saveState === 'error' && "bg-red-500/10 text-red-400 border-red-500/20",
          )}>
            {saveState === 'saved' && <><Cloud className="h-3 w-3" /> Saved</>}
            {saveState === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving</>}
            {saveState === 'unsaved' && <><CloudOff className="h-3 w-3" /> Unsaved</>}
            {saveState === 'error' && <><CloudOff className="h-3 w-3" /> Error</>}
          </div>

          <StatusBadge status={setPiece.status} />

          <Button size="sm" variant="outline" className="text-xs h-7 border-border" onClick={handleExportPDF}>
            <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>

          <Link href={`/teams/${teamId}/ghost/${setPieceId}`}>
            <Button size="sm" variant="outline" className="text-xs h-7 border-border">
              <Ghost className="w-3.5 h-3.5 mr-1" /> Ghost
            </Button>
          </Link>

          {setPiece.status === 'draft' && (
            <Button size="sm" className="text-xs h-7" onClick={async () => {
              await updateStatus.mutateAsync({ teamId, setPieceId, data: { status: 'ready' } });
              refetch();
            }}>
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Ready
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-12 border-r border-border bg-card/50 flex flex-col items-center py-3 gap-1 shrink-0">
          {([
            { tool: 'select' as EditorTool, icon: MousePointer2, label: 'Select & Move' },
            { tool: 'place' as EditorTool, icon: Plus, label: 'Place Role' },
          ]).map(t => (
            <button
              key={t.tool}
              onClick={() => setActiveTool(t.tool)}
              title={t.label}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                activeTool === t.tool ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-white"
              )}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-6 border-t border-border" />
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-secondary hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-secondary hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <main className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-background via-card to-background relative overflow-hidden flex items-center justify-center">
          <div ref={canvasRef} className="w-full h-full max-w-3xl max-h-[80vh] p-4 flex items-center justify-center" data-pitch-container>
            <KonvaPitch
              width={canvasSize.width}
              height={canvasSize.height}
              roles={setPiece.roles}
              activeRoleId={activeRoleId}
              halfPitch={setPiece.category.includes('corner') || setPiece.category.includes('freekick')}
              onRoleClick={(id) => setActiveRoleId(id === activeRoleId ? null : id)}
              onRoleDragEnd={handleRoleDragEnd}
              onPitchClick={handlePitchClick}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {activeTool === 'place' ? (
              <div className="bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-xl px-4 py-2 shadow-lg">
                <span className="text-xs text-primary font-semibold">Click on the pitch to place a new role</span>
              </div>
            ) : activeRole ? (
              <div className="bg-card/80 backdrop-blur-sm border border-primary/30 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-white font-semibold">{activeRole.name}</span>
                <span className="text-xs text-muted-foreground">Drag to reposition</span>
                <button onClick={() => setActiveRoleId(null)} className="text-muted-foreground hover:text-white text-xs ml-2 underline">Deselect</button>
              </div>
            ) : (
              <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl px-4 py-2 shadow-lg">
                <span className="text-xs text-muted-foreground">Click a role to select, or use the Place tool to add new roles</span>
              </div>
            )}
          </div>
        </main>

        <aside className="w-80 md:w-96 border-l border-border bg-card/50 backdrop-blur flex flex-col h-full shrink-0 shadow-2xl">
          <div className="p-3 border-b border-border flex justify-between items-center">
            <h2 className="font-display font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Roles ({setPiece.roles.length})
            </h2>
            <Button size="sm" variant="outline" onClick={() => { setPendingPos(null); setNewRoleName(''); setRoleFormOpen(true); }} className="border-border h-7 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {setPiece.roles.map((role: SetPieceRole) => {
              const assignment = setPiece.assignments.find((a: RoleAssignment) => a.roleId === role.id);
              const isActive = role.id === activeRoleId;
              const assignedPlayer = assignment ? players?.find(p => p.id === assignment.playerId) : null;

              return (
                <div
                  key={role.id}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer",
                    isActive ? "bg-primary/10 border-primary/50 shadow-md shadow-primary/10" : "bg-background border-border hover:border-muted-foreground/50"
                  )}
                  onClick={() => setActiveRoleId(role.id === activeRoleId ? null : role.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", isActive ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                      {role.name}
                    </h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRole(role.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player</label>
                    <select
                      className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      value={assignment?.playerId || ''}
                      onChange={(e) => assignPlayer(role.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {players?.map(p => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.shirtNumber ? `(#${p.shirtNumber})` : ''}</option>
                      ))}
                    </select>
                    {assignedPlayer && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assignedPlayer.dominantFoot && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border capitalize">{assignedPlayer.dominantFoot} foot</span>
                        )}
                        {assignedPlayer.height && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">{assignedPlayer.height}cm</span>
                        )}
                        {assignedPlayer.tags?.slice(0, 2).map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{t.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {role.startPosition && (
                    <p className="text-[9px] text-muted-foreground mt-2">
                      Position: ({Math.round(role.startPosition.x || 0)}, {Math.round(role.startPosition.y || 0)})
                    </p>
                  )}
                </div>
              );
            })}

            {setPiece.roles.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                <p className="text-muted-foreground text-sm mb-2">No roles defined yet.</p>
                <p className="text-xs text-muted-foreground mb-3">Use the Place tool or click Add to create roles.</p>
                <Button variant="link" onClick={() => setRoleFormOpen(true)} className="text-primary text-xs">Create first role</Button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={roleFormOpen} onOpenChange={setRoleFormOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add New Role</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Role Name</label>
              <input
                autoFocus required
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="e.g. Near Post Flick"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
              />
            </div>
            {pendingPos && (
              <p className="text-xs text-muted-foreground">
                Position: ({Math.round(pendingPos.x)}, {Math.round(pendingPos.y)})
              </p>
            )}
            <Button type="submit" className="w-full" disabled={createRole.isPending}>Add Role</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
