import React, { useState, useRef, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useDemoMode } from '@/contexts/DemoContext';
import { useDemoSetPiece, useDemoPlayers } from '@/hooks/useDemoData';
import { EditorCanvas, QuickLegend, useEditorStore } from '@/components/editor';
import type { BoardData } from '@/components/editor';
import { migrateLegacyBoardData } from '@/components/editor/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Lock, Moon, Trees, Sun, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoBanner } from '@/components/DemoBanner';
import type { PitchTheme } from '@/components/editor';

const THEME_OPTIONS: { value: PitchTheme; label: string; icon: React.ElementType }[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'green', label: 'Green', icon: Trees },
  { value: 'light', label: 'Light', icon: Sun },
];

export default function DemoSetPieceViewer() {
  const [, params] = useRoute('/demo/teams/:teamId/set-pieces/:setPieceId/editor');
  const teamId = params?.teamId || '';
  const setPieceId = params?.setPieceId || '';
  const { demoTeam } = useDemoMode();

  const { data: setPiece, isLoading } = useDemoSetPiece(teamId, setPieceId);
  const { data: players } = useDemoPlayers(teamId);

  const pitchTheme = useEditorStore((s) => s.pitchTheme);
  const setPitchTheme = useEditorStore((s) => s.setPitchTheme);
  const showLegend = useEditorStore((s) => s.showLegend);
  const setShowLegend = useEditorStore((s) => s.setShowLegend);
  const setAnnotations = useEditorStore((s) => s.setAnnotations);
  const setEntities = useEditorStore((s) => s.setEntities);
  const annotations = useEditorStore((s) => s.annotations);
  const entities = useEditorStore((s) => s.entities);
  const steps = useEditorStore((s) => s.steps);
  const setSteps = useEditorStore((s) => s.setSteps);
  const resetStore = useEditorStore((s) => s.resetStore);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 500 });
  const boardDataLoadedRef = useRef<string | null>(null);

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
      <DemoBanner />
      <header className="h-12 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-3 md:px-4 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/demo/teams/${teamId}/templates`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-full h-8 w-8 md:h-7 md:w-7 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-5 w-px bg-border shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-sm leading-none text-white truncate max-w-[140px] md:max-w-[200px]">
              {setPiece.title}
            </h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{setPiece.category.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Lock className="h-3 w-3" />
            <span className="hidden sm:inline">Read Only</span>
          </div>

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

          <button
            onClick={() => setShowLegend(!showLegend)}
            title="Toggle Legend"
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center transition-colors",
              showLegend ? "text-primary" : "text-muted-foreground hover:text-white"
            )}
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <StatusBadge status={setPiece.status} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div ref={canvasRef} className="flex-1 relative overflow-hidden flex items-center justify-center bg-background">
          <EditorCanvas
            width={canvasSize.width}
            height={canvasSize.height}
            roles={setPiece.roles || []}
            assignments={setPiece.assignments || []}
            players={players || []}
            activeRoleId={null}
            onRoleClick={() => {}}
            onRoleDragEnd={() => {}}
            activeTool="select"
            annotations={annotations}
            onAnnotationComplete={() => {}}
            entities={entities}
            strokeColor="#10b981"
            strokeWidth={2}
            showArrowhead={false}
            onPitchClick={() => {}}
            onLabelPrompt={() => {}}
            category={setPiece.category}
            pitchTheme={pitchTheme}
            steps={steps}
            readOnly
          />
          {showLegend && (
            <div className="absolute bottom-4 left-4 z-10">
              <QuickLegend onClose={() => setShowLegend(false)} />
            </div>
          )}
        </div>

        <aside className="hidden lg:block w-[280px] border-l border-border bg-card/30 backdrop-blur-xl overflow-y-auto">
          <div className="p-4">
            <h2 className="font-display font-bold text-sm text-white mb-3">Roles & Assignments</h2>
            <div className="space-y-2">
              {(setPiece.roles || []).map((role: any) => {
                const assignment = setPiece.assignments?.find((a: any) => a.roleId === role.id);
                const player = assignment ? players?.find((p: any) => p.id === assignment.playerId) : null;
                return (
                  <div key={role.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <p className="font-semibold text-xs text-primary">{role.name}</p>
                    {role.description && <p className="text-[10px] text-muted-foreground mt-0.5">{role.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center border border-border text-[9px] font-bold text-primary">
                        {player?.shirtNumber || '?'}
                      </div>
                      <span className="text-xs text-foreground">
                        {player ? `${player.firstName} ${player.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                    {role.coachingPoint && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic">"{role.coachingPoint}"</p>
                    )}
                  </div>
                );
              })}
            </div>

            {setPiece.coachingNotes && (
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-1">Coaching Notes</p>
                <p className="text-xs text-muted-foreground">{setPiece.coachingNotes}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
