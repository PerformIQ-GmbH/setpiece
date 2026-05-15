import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRoute } from 'wouter';
import { useGetTeam, useGetSetPiece, useCreateRole, useUpdateRole, useDeleteRole, useUpsertAssignment, useListPlayers, useUpdateSetPieceStatus, useUpdateSetPiece } from '@workspace/api-client-react';
import type { SetPieceRole, RoleAssignment } from '@workspace/api-client-react';
import { EditorCanvas, EditorToolbar, MobileToolDrawer, BottomBar, InspectorPanel, TutorialOverlay, ContextualTip, QuickLegend, PresentationMode, EditorContextMenu, ContextualMiniBar, useEditorStore } from '@/components/editor';
import type { Point, Annotation, BoardData, EditorCanvasHandle, PitchTheme } from '@/components/editor';
import { migrateLegacyBoardData } from '@/components/editor/types';
import { shouldShowTutorial, resetTutorial } from '@/components/editor/TutorialOverlay';
import { resetAllTips } from '@/components/editor/ContextualTip';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { ArrowLeft, ShieldCheck, Ghost, FileDown, Loader2, Cloud, CloudOff, HelpCircle, Info, Sun, Trees, Moon, MoreVertical, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { useBreakpoint } from '@/hooks/use-mobile';
import type { Breakpoint } from '@/hooks/use-mobile';

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
  const mirrorBoard = useEditorStore((s) => s.mirrorBoard);
  const presentationMode = useEditorStore((s) => s.presentationMode);

  const bp: Breakpoint = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const isDesktop = bp === 'desktop';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  const handleMirror = useCallback(async () => {
    mirrorBoard();
    setSaveState('saving');
    try {
      for (const role of (setPiece?.roles || [])) {
        const curX = role.startPosition?.x ?? 50;
        const curY = role.startPosition?.y ?? 50;
        await updateRole.mutateAsync({
          teamId, setPieceId, roleId: role.id,
          data: { startPosition: { x: 100 - curX, y: curY } },
        });
      }
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [mirrorBoard, setPiece?.roles, teamId, setPieceId, updateRole, refetch]);

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
  const drawingPoints = useEditorStore((s) => s.drawingPoints);
  const resetStore = useEditorStore((s) => s.resetStore);
  const steps = useEditorStore((s) => s.steps);

  const boardDataLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (shouldShowTutorial()) {
      setShowTutorial(true);
    }
  }, []);

  const setSteps = useEditorStore((s) => s.setSteps);
  const stepPositions = useEditorStore((s) => s.stepPositions);
  const setStepPositions = useEditorStore((s) => s.setStepPositions);
  const setStepRolePosition = useEditorStore((s) => s.setStepRolePosition);
  const animationState = useEditorStore((s) => s.animation);

  useEffect(() => {
    if (!setPiece?.id) return;
    if (boardDataLoadedRef.current === setPiece.id) return;
    resetStore();
    if (setPiece.boardData && typeof setPiece.boardData === 'object') {
      const bd = migrateLegacyBoardData(setPiece.boardData as Partial<BoardData>);
      setAnnotations(bd.annotations);
      setEntities(bd.entities);
      if (bd.steps && bd.steps.length > 0) {
        setSteps(bd.steps);
      }
      if (bd.stepPositions && typeof bd.stepPositions === 'object') {
        setStepPositions(bd.stepPositions);
      }
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
        const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isCorner && width > 0 && height > 0 && !isMobileViewport) {
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
    const state = useEditorStore.getState();
    setSaveState('saving');
    try {
      await updateSetPiece.mutateAsync({
        teamId, setPieceId,
        data: { boardData: { annotations: state.annotations, entities: state.entities, steps: state.steps, stepPositions: state.stepPositions } }
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
  }, [annotations, entities, steps, stepPositions]);

  const handleRoleDragEnd = useCallback(async (roleId: string, pos: { x: number; y: number }) => {
    const currentStepIndex = useEditorStore.getState().animation.activeStepIndex;
    const currentSteps = useEditorStore.getState().steps;
    const currentStepId = currentSteps[currentStepIndex]?.id;

    if (currentStepIndex > 0 && currentStepId) {
      setStepRolePosition(currentStepId, roleId, pos);
      return;
    }

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
  }, [teamId, setPieceId, updateRole, refetch, setPiece?.roles, setStepRolePosition]);

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
    } catch (err) {
      setSaveState('error');
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? 'Could not delete role.';
      alert(`Delete failed: ${msg}`);
    }
  };

  const handleDuplicateRole = async (roleId: string) => {
    const sourceRole = setPiece?.roles.find(r => r.id === roleId);
    if (!sourceRole) return;
    setSaveState('saving');
    try {
      const srcX = sourceRole.startPosition?.x ?? 50;
      const srcY = sourceRole.startPosition?.y ?? 50;
      const offsetX = Math.min(srcX + 3, 98);
      const offsetY = Math.min(srcY + 3, 98);
      const res = await createRole.mutateAsync({
        teamId, setPieceId,
        data: { name: `${sourceRole.name} (copy)`, startPosition: { x: offsetX, y: offsetY } },
      });
      setActiveRoleId(res.id);
      setActiveTool('select');
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleUpdateRoleField = async (roleId: string, field: string, value: string) => {
    setSaveState('saving');
    try {
      await updateRole.mutateAsync({ teamId, setPieceId, roleId, data: { [field]: value } });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleRenameRole = async (roleId: string, newName: string) => {
    setSaveState('saving');
    try {
      await updateRole.mutateAsync({ teamId, setPieceId, roleId, data: { name: newName } });
      await refetch();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleExportPDF = async () => {
    if (!setPiece) return;
    const [jsPDFMod, { renderSetPieceSteps }] = await Promise.all([
      import('jspdf'),
      import('@/utils/offscreenPitchRenderer'),
    ]);
    const jsPDF = jsPDFMod.default;
    const pw = 210;
    const ph = 297;

    const stepImages = renderSetPieceSteps({
      boardData: (setPiece.boardData || {}) as Record<string, unknown>,
      roles: (setPiece.roles || []).map((r: SetPieceRole) => ({
        id: r.id,
        name: r.name,
        startPosition: r.startPosition,
      })),
      assignments: (setPiece.assignments || []).map((a: RoleAssignment) => ({
        roleId: a.roleId,
        playerId: a.playerId,
      })),
      players: (players || []).map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        shirtNumber: p.shirtNumber,
      })),
      category: setPiece.category,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');

    const addPageBg = () => {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pw, ph, 'F');
    };

    addPageBg();

    pdf.setFillColor(16, 185, 129);
    pdf.rect(0, 0, pw, 3, 'F');

    pdf.setTextColor(16, 185, 129);
    pdf.setFontSize(10);
    pdf.text('SETPIECE by PerformIQ', pw / 2, 14, { align: 'center' });

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(20);
    pdf.text(setPiece.title || 'Set Piece', pw / 2, 24, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(setPiece.category?.replace(/_/g, ' ').toUpperCase() || '', pw / 2, 31, { align: 'center' });

    let yOff = 38;
    const imgWidth = 170;
    const imgAspect = 560 / 800;
    const imgHeight = imgWidth * imgAspect;

    for (let i = 0; i < stepImages.length; i++) {
      const neededHeight = 10 + imgHeight + 4;
      if (yOff + neededHeight > ph - 15) {
        pdf.addPage();
        addPageBg();
        yOff = 15;
      }

      pdf.setTextColor(16, 185, 129);
      pdf.setFontSize(11);
      pdf.text(stepImages[i].stepLabel, 20, yOff);
      yOff += 5;

      pdf.addImage(stepImages[i].dataUrl, 'PNG', 20, yOff, imgWidth, imgHeight);
      yOff += imgHeight + 6;
    }

    const ensureSpace = (needed: number) => {
      if (yOff + needed > ph - 15) {
        pdf.addPage();
        addPageBg();
        yOff = 15;
      }
    };

    ensureSpace(14);
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(12);
    pdf.text('Roles & Assignments', 20, yOff);
    yOff += 8;
    pdf.setFontSize(9);
    setPiece.roles?.forEach((role: SetPieceRole) => {
      ensureSpace(8);
      const assignment = setPiece.assignments?.find((a: RoleAssignment) => a.roleId === role.id);
      const player = assignment ? players?.find(p => p.id === assignment.playerId) : null;
      const playerName = player ? `${player.firstName} ${player.lastName} (#${player.shirtNumber || '?'})` : 'Unassigned';
      pdf.setTextColor(16, 185, 129);
      pdf.text(role.name, 20, yOff);
      pdf.setTextColor(80, 80, 80);
      pdf.text(playerName, 80, yOff);
      yOff += 6;
    });

    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('SETPIECE by PerformIQ', pw / 2, ph - 8, { align: 'center' });
    pdf.save(`${setPiece.title || 'setpiece'}.pdf`);
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

  const handleRoleClick = useCallback((id: string) => {
    const newId = id === activeRoleId ? null : id;
    setActiveRoleId(newId);
    if (newId && isMobile) {
      setMobileInspectorOpen(true);
    }
  }, [activeRoleId, isMobile]);

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

  const inspectorPanel = (
    <InspectorPanel
      teamId={teamId}
      setPieceId={setPieceId}
      roles={setPiece.roles}
      assignments={setPiece.assignments || []}
      players={players}
      activeRoleId={activeRoleId}
      onRoleClick={handleRoleClick}
      onAssignPlayer={assignPlayer}
      onAssignBackup={assignBackupPlayer}
      onDeleteRole={handleDeleteRole}
      onDuplicateRole={handleDuplicateRole}
      onRenameRole={handleRenameRole}
      onUpdateRoleField={handleUpdateRoleField}
      onAddRole={() => { setPendingPos(null); setNewRoleName(''); setRoleFormOpen(true); if (isMobile) setMobileInspectorOpen(false); }}
      forceVisible
    />
  );

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen md:h-screen md:overflow-hidden">
      {/* ─── HEADER ─── */}
      <header
        data-tutorial="header"
        className={cn(
          "border-b border-white/[0.06] bg-card/80 backdrop-blur-xl flex items-center justify-between shrink-0 z-10",
          isMobile ? "h-11 px-2" : "h-12 px-3 md:px-4"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/teams/${teamId}/templates`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full h-8 w-8 shrink-0">
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
                className={cn(
                  "bg-transparent border-b border-primary text-white font-display font-bold outline-none px-0",
                  isMobile ? "text-xs max-w-[120px]" : "text-sm max-w-[200px]"
                )}
              />
            ) : (
              <h1
                className={cn(
                  "font-display font-bold leading-none text-white cursor-pointer hover:text-primary transition-colors truncate",
                  isMobile ? "text-xs max-w-[120px]" : "text-sm max-w-[200px]"
                )}
                onClick={() => { setTitleDraft(setPiece.title); setEditingTitle(true); }}
                title="Click to rename"
              >
                {setPiece.title}
              </h1>
            )}
            {!isMobile && (
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{setPiece.category.replace(/_/g, ' ')}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Save state badge */}
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide transition-colors border",
            saveState === 'saved' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            saveState === 'saving' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
            saveState === 'error' && "bg-red-500/10 text-red-400 border-red-500/20",
          )}>
            {saveState === 'saved' && <Cloud className="h-3 w-3" />}
            {saveState === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
            {saveState === 'unsaved' && <CloudOff className="h-3 w-3" />}
            {saveState === 'error' && <CloudOff className="h-3 w-3" />}
            {!isMobile && (
              <span>
                {saveState === 'saved' && 'Saved'}
                {saveState === 'saving' && 'Saving'}
                {saveState === 'unsaved' && 'Unsaved'}
                {saveState === 'error' && 'Error'}
              </span>
            )}
          </div>

          {/* Desktop/Tablet: full header controls */}
          {!isMobile && (
            <>
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
            </>
          )}

          {/* Mobile: overflow menu */}
          {isMobile && (
            <>
              <div className="relative">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white active:scale-95 transition-all"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {mobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden">
                      <div className="px-3 py-2 border-b border-border/50">
                        <StatusBadge status={setPiece.status} />
                      </div>

                      <div className="px-3 py-2 border-b border-border/50">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Pitch Theme</p>
                        <div className="flex gap-1">
                          {THEME_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setPitchTheme(opt.value)}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10px] font-medium transition-all",
                                pitchTheme === opt.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
                              )}
                            >
                              <opt.icon className="w-3 h-3" />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => { setShowLegend(!showLegend); setMobileMenuOpen(false); }}
                        className="w-full text-left px-3 py-2.5 text-[11px] text-muted-foreground hover:text-white hover:bg-secondary transition-colors flex items-center gap-2"
                      >
                        <Info className="w-3.5 h-3.5" />
                        {showLegend ? 'Hide Legend' : 'Show Legend'}
                      </button>

                      <button
                        onClick={() => { handleExportPDF(); setMobileMenuOpen(false); }}
                        className="w-full text-left px-3 py-2.5 text-[11px] text-muted-foreground hover:text-white hover:bg-secondary transition-colors flex items-center gap-2"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Export PDF
                      </button>

                      <Link href={`/teams/${teamId}/ghost/${setPieceId}`}>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="w-full text-left px-3 py-2.5 text-[11px] text-muted-foreground hover:text-white hover:bg-secondary transition-colors flex items-center gap-2"
                        >
                          <Ghost className="w-3.5 h-3.5" />
                          Ghost View
                        </button>
                      </Link>

                      {setPiece.status === 'draft' && (
                        <button
                          onClick={async () => {
                            await updateStatus.mutateAsync({ teamId, setPieceId, data: { status: 'ready' } });
                            refetch();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2.5 text-[11px] text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Mark Ready
                        </button>
                      )}

                      <div className="h-px bg-border my-1" />

                      <button
                        onClick={() => {
                          resetTutorial();
                          setShowTutorial(true);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 text-[11px] text-muted-foreground hover:text-white hover:bg-secondary transition-colors flex items-center gap-2"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Tutorial
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ─── MAIN BODY ─── */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden md:min-h-0">
        {/* ─── PITCH AREA ─── */}
        <div className="flex-1 relative flex flex-col min-w-0 md:min-h-0">
          <main data-tutorial="pitch" className="relative h-[68vh] md:h-auto md:flex-1 md:min-h-0">
            <div
              ref={canvasRef}
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                isMobile ? "p-0" : isTablet ? "p-1" : "p-2 lg:p-3"
              )}
              data-pitch-container
            >
              {!presentationMode && (
                <ErrorBoundary>
                  <EditorCanvas
                    ref={canvasHandleRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    roles={setPiece.roles}
                    assignments={setPiece.assignments || []}
                    players={players}
                    activeRoleId={activeRoleId}
                    category={setPiece.category}
                    onRoleClick={handleRoleClick}
                    onRoleDragEnd={handleRoleDragEnd}
                    onPitchClick={handlePitchClick}
                    onLabelPrompt={handleLabelPrompt}
                    compact={isMobile}
                  />
                </ErrorBoundary>
              )}
              {setPiece.roles.length === 0 && entities.length === 0 && annotations.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className={cn(
                    "bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl text-center",
                    isMobile ? "px-4 py-3 max-w-[200px]" : "px-6 py-4 max-w-[260px]"
                  )}>
                    <p className="text-sm font-display font-bold text-white mb-1">Empty Board</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {isMobile
                        ? 'Tap the tool button to place players and draw movements.'
                        : 'Use the toolbar to place players and draw movements. Start with the Team Player tool to add your first role.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isMobile && <QuickLegend />}
            {!isMobile && <ContextualTip />}

            {/* Desktop sidebar toolbar */}
            {isDesktop && (
              <div className="absolute left-3 top-3 z-20 overflow-y-auto scrollbar-none" style={{ maxHeight: 'calc(100% - 24px)' }}>
                <EditorToolbar
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={undoStack.length > 0}
                  canRedo={redoStack.length > 0}
                  onMirror={handleMirror}
                />
              </div>
            )}

            {/* Tablet sidebar toolbar (compact) */}
            {isTablet && (
              <div className="absolute left-2 top-2 z-20 overflow-y-auto scrollbar-none" style={{ maxHeight: 'calc(100% - 16px)' }}>
                <EditorToolbar
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={undoStack.length > 0}
                  canRedo={redoStack.length > 0}
                  onMirror={handleMirror}
                />
              </div>
            )}

            <ContextualMiniBar canvasRef={canvasRef} />

            {['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(activeTool) && drawingPoints.length >= 2 && canvasHandleRef.current && (() => {
              const screenPos = canvasHandleRef.current?.getLastDrawingPointScreen();
              if (!screenPos) return null;
              const containerRect = canvasRef.current?.getBoundingClientRect();
              if (!containerRect) return null;
              const relX = screenPos.x - containerRect.left + 16;
              const relY = screenPos.y - containerRect.top - 16;
              return (
                <button
                  onClick={() => canvasHandleRef.current?.finishDrawing()}
                  className="absolute z-30 w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-400 active:scale-90 transition-all"
                  style={{ left: relX, top: relY }}
                  title="Confirm drawing (Enter)"
                >
                  <Check className="w-4 h-4" />
                </button>
              );
            })()}
          </main>

          {/* ─── BOTTOM BAR (step nav + controls) ─── */}
          <div className={cn(
            "shrink-0 z-20",
            isMobile ? "px-0 pb-0" : "px-3 pb-2"
          )}>
            <BottomBar
              mobile={isMobile}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              onMirror={handleMirror}
              onOpenInspector={() => setMobileInspectorOpen(true)}
              toolDrawer={isMobile ? (
                <MobileToolDrawer
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={undoStack.length > 0}
                  canRedo={redoStack.length > 0}
                  onMirror={handleMirror}
                />
              ) : undefined}
            />
          </div>
        </div>

        {/* ─── DESKTOP INSPECTOR SIDEBAR ─── */}
        {isDesktop && !inspectorCollapsed && (
          <aside className="w-80 xl:w-[340px] shrink-0 border-l border-white/[0.06] bg-card/95 backdrop-blur-xl overflow-y-auto scrollbar-none">
            {inspectorPanel}
          </aside>
        )}

        {/* ─── TABLET INSPECTOR: Persistent compact side panel ─── */}
        {isTablet && (
          <aside className="w-[260px] shrink-0 border-l border-white/[0.06] bg-card/95 backdrop-blur-xl overflow-y-auto scrollbar-none">
            {inspectorPanel}
          </aside>
        )}
      </div>

      {/* ─── MOBILE INSPECTOR: Bottom sheet ─── */}
      {isMobile && (
        <Drawer open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <DrawerContent className="bg-card border-white/[0.08] max-h-[80vh]">
            <DrawerTitle className="sr-only">Inspector</DrawerTitle>
            <div className="overflow-y-auto max-h-[70vh]">
              {inspectorPanel}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <TutorialOverlay
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <Dialog open={roleFormOpen} onOpenChange={setRoleFormOpen}>
        <DialogContent className="bg-card border-white/[0.08] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm">New Role</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-3 pt-1">
            <input
              autoFocus
              required
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              placeholder="e.g. Near Post Flick"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={createRole.isPending}>Create Role</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={labelFormOpen} onOpenChange={setLabelFormOpen}>
        <DialogContent className="bg-card border-white/[0.08] sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm">Add Label</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateLabel} className="space-y-3 pt-1">
            <input
              autoFocus
              required
              value={labelText}
              onChange={e => setLabelText(e.target.value)}
              placeholder="Label text..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <Button type="submit" className="w-full rounded-xl">Add Label</Button>
          </form>
        </DialogContent>
      </Dialog>

      <EditorContextMenu />

      <PresentationMode
        title={setPiece.title}
        category={setPiece.category}
      >
        {(size) => (
          <div className="w-full h-full flex items-center justify-center">
            <EditorCanvas
              width={size.width}
              height={size.height}
              roles={setPiece.roles}
              assignments={setPiece.assignments || []}
              players={players}
              activeRoleId={null}
              category={setPiece.category}
              readOnly
              onRoleClick={() => {}}
              onRoleDragEnd={() => {}}
              onPitchClick={() => {}}
              onLabelPrompt={() => {}}
            />
          </div>
        )}
      </PresentationMode>
    </div>
  );
}
