import { cn } from '@/lib/utils';
import { useEditorStore } from './editorStore';
import type { EditorTool } from './types';
import {
  MousePointer2, UserRound, UserX, Shield, Circle,
  Minus, Spline, MoveRight, CornerDownRight,
  Square, Type, Eraser,
  Play, Pause, RotateCcw,
  ChevronDown, ChevronRight,
  Undo2, Redo2,
  Magnet, Grid3x3, FlipHorizontal2, Presentation, Layers,
  Wrench, PanelRight, PanelRightClose,
} from 'lucide-react';
import { BASIC_TOOLS } from './types';
import { LayerPanel } from './LayerPanel';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';

export interface ToolDef {
  tool: EditorTool;
  icon: React.ElementType;
  label: string;
}

export const SELECT_TOOLS: ToolDef[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select & Move' },
];

export const ENTITY_TOOLS: ToolDef[] = [
  { tool: 'team_player', icon: UserRound, label: 'Team Player' },
  { tool: 'opponent', icon: UserX, label: 'Opponent' },
  { tool: 'ball', icon: Circle, label: 'Ball' },
];

export const ACTION_TOOLS: ToolDef[] = [
  { tool: 'run_path', icon: Minus, label: 'Run Path (dashed)' },
  { tool: 'pass_line', icon: MoveRight, label: 'Pass Line (solid)' },
];

export const ADVANCED_ENTITY_TOOLS: ToolDef[] = [
  { tool: 'goalkeeper', icon: Shield, label: 'Goalkeeper' },
];

export const ADVANCED_ACTION_TOOLS: ToolDef[] = [
  { tool: 'curved_run', icon: Spline, label: 'Curved Run' },
  { tool: 'curved_cross', icon: CornerDownRight, label: 'Curved Cross' },
  { tool: 'zone_circle', icon: Circle, label: 'Circle Zone' },
  { tool: 'zone_rect', icon: Square, label: 'Rectangle Zone' },
  { tool: 'label', icon: Type, label: 'Text Label' },
  { tool: 'erase', icon: Eraser, label: 'Delete Selected' },
];

function ToolButton({ tool, icon: Icon, label, compact }: ToolDef & { compact?: boolean }) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const isActive = activeTool === tool;

  return (
    <button
      onClick={() => setActiveTool(tool)}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-all relative group",
        compact && "w-9 h-9",
        isActive
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
          : "text-muted-foreground hover:bg-secondary hover:text-white"
      )}
    >
      <Icon className={cn("w-4 h-4", compact && "w-3.5 h-3.5")} />
      <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-card border border-border rounded-lg text-[11px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
        {label}
      </div>
    </button>
  );
}

function ToolGroupLabel({ text }: { text: string }) {
  return (
    <span className="text-[8px] text-muted-foreground/60 uppercase tracking-[0.12em] font-bold mb-0.5 select-none">
      {text}
    </span>
  );
}

function Divider() {
  return <div className="w-7 border-t border-border/40 my-0.5" />;
}

import { useState } from 'react';

interface EditorToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onMirror?: () => void;
  onOpenInspectorSheet?: () => void;
  useSheetInspector?: boolean;
}

export function EditorToolbar({ onUndo, onRedo, canUndo, canRedo, onMirror, onOpenInspectorSheet, useSheetInspector }: EditorToolbarProps) {
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const animation = useEditorStore((s) => s.animation);
  const setPlaying = useEditorStore((s) => s.setAnimationPlaying);
  const setProgress = useEditorStore((s) => s.setAnimationProgress);
  const isAdvanced = editorMode === 'advanced';

  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled);
  const showGrid = useEditorStore((s) => s.showGrid);
  const setShowGrid = useEditorStore((s) => s.setShowGrid);
  const setPresentationMode = useEditorStore((s) => s.setPresentationMode);

  const inspectorCollapsed = useEditorStore((s) => s.inspectorCollapsed);
  const setInspectorCollapsed = useEditorStore((s) => s.setInspectorCollapsed);

  const [showLayerPanel, setShowLayerPanel] = useState(false);

  return (
    <div data-tutorial="toolbar" className="w-14 bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/60 flex flex-col items-center py-3 gap-1 relative">
      <div className="flex flex-col items-center gap-0.5">
        <ToolGroupLabel text="Select" />
        {SELECT_TOOLS.map((t) => <ToolButton key={t.tool} {...t} />)}
      </div>

      <Divider />

      <div className="flex flex-col items-center gap-0.5">
        <ToolGroupLabel text="Place" />
        {ENTITY_TOOLS.map((t) => <ToolButton key={t.tool} {...t} />)}
        {isAdvanced && ADVANCED_ENTITY_TOOLS.map((t) => <ToolButton key={t.tool} {...t} compact />)}
      </div>

      <Divider />

      <div className="flex flex-col items-center gap-0.5">
        <ToolGroupLabel text="Draw" />
        {ACTION_TOOLS.map((t) => <ToolButton key={t.tool} {...t} />)}
        {isAdvanced && ADVANCED_ACTION_TOOLS.map((t) => <ToolButton key={t.tool} {...t} compact />)}
      </div>

      <Divider />

      <button
        onClick={() => setEditorMode(isAdvanced ? 'basic' : 'advanced')}
        title={isAdvanced ? 'Switch to Basic' : 'Show Advanced Tools'}
        className={cn(
          "w-10 h-7 rounded-md flex items-center justify-center gap-0.5 text-[8px] font-bold uppercase tracking-wide transition-all",
          isAdvanced
            ? "bg-primary/15 text-primary border border-primary/30"
            : "text-muted-foreground/70 hover:bg-secondary hover:text-white border border-transparent"
        )}
      >
        {isAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{isAdvanced ? 'Less' : 'More'}</span>
      </button>

      <Divider />

      <div className="flex flex-col items-center gap-0.5">
        <ToolGroupLabel text="Tools" />
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          title={snapEnabled ? 'Disable Snap' : 'Enable Snap'}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
            snapEnabled ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-white"
          )}
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? 'Hide Grid' : 'Show Grid'}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
            showGrid ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-white"
          )}
        >
          <Grid3x3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMirror}
          title="Mirror Board (flip horizontal)"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white transition-all"
        >
          <FlipHorizontal2 className="w-3.5 h-3.5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            title="Layer Controls"
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
              showLayerPanel ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-white"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          {showLayerPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLayerPanel(false)} />
              <div className="absolute left-full top-0 ml-2 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 p-2">
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1">Layers</div>
                <LayerPanel />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={() => setPresentationMode(true)}
          title="Presentation Mode"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white transition-all"
        >
          <Presentation className="w-4 h-4" />
        </button>
      </div>

      <Divider />

      <div className="flex flex-col items-center gap-0.5">
        <ToolGroupLabel text="Play" />
        <button
          onClick={() => setPlaying(!animation.playing)}
          title={animation.playing ? 'Pause Animation' : 'Play Animation'}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            animation.playing
              ? "bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20"
              : "text-muted-foreground hover:bg-secondary hover:text-white"
          )}
        >
          {animation.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { setPlaying(false); setProgress(0); }}
          title="Reset Animation"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <Divider />

      <div className="flex flex-col items-center gap-0.5">
        <ToolGroupLabel text="History" />
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="w-10 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white disabled:opacity-25 transition-all"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="w-10 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white disabled:opacity-25 transition-all"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <Divider />

      <button
        onClick={() => {
          if (useSheetInspector && onOpenInspectorSheet) {
            onOpenInspectorSheet();
          } else {
            setInspectorCollapsed(!inspectorCollapsed);
          }
        }}
        title={useSheetInspector ? 'Open Inspector' : (inspectorCollapsed ? 'Show Inspector' : 'Hide Inspector')}
        className={cn(
          "w-10 h-9 rounded-lg flex items-center justify-center transition-all",
          !useSheetInspector && !inspectorCollapsed ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-white"
        )}
      >
        {inspectorCollapsed || useSheetInspector ? <PanelRight className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface MobileToolDrawerProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onMirror?: () => void;
}

export function MobileToolDrawer({ onUndo, onRedo, canUndo, canRedo, onMirror }: MobileToolDrawerProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled);
  const showGrid = useEditorStore((s) => s.showGrid);
  const setShowGrid = useEditorStore((s) => s.setShowGrid);
  const setPresentationMode = useEditorStore((s) => s.setPresentationMode);
  const animation = useEditorStore((s) => s.animation);
  const setPlaying = useEditorStore((s) => s.setAnimationPlaying);
  const setProgress = useEditorStore((s) => s.setAnimationProgress);
  const isAdvanced = editorMode === 'advanced';
  const [open, setOpen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

  const activeIcon = [...SELECT_TOOLS, ...ENTITY_TOOLS, ...ACTION_TOOLS, ...ADVANCED_ENTITY_TOOLS, ...ADVANCED_ACTION_TOOLS]
    .find(t => t.tool === activeTool);

  const MobileToolBtn = ({ tool, icon: Icon, label }: ToolDef) => {
    const isActive = activeTool === tool;
    return (
      <button
        onClick={() => { setActiveTool(tool); setOpen(false); }}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left",
          isActive
            ? "bg-primary text-primary-foreground font-semibold"
            : "text-muted-foreground hover:bg-secondary hover:text-white"
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-sm">{label}</span>
      </button>
    );
  };

  return (
    <>
      <div className="fixed bottom-[calc(theme(spacing.20)+env(safe-area-inset-bottom))] left-3 z-30 flex flex-col gap-2">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              className={cn(
                "w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all border",
                "bg-card/90 backdrop-blur-md border-border text-white active:scale-95"
              )}
            >
              {activeIcon ? <activeIcon.icon className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-card border-border max-h-[70vh]">
            <DrawerTitle className="sr-only">Tools</DrawerTitle>
            <div className="p-4 pb-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">Select</p>
                {SELECT_TOOLS.map(t => <MobileToolBtn key={t.tool} {...t} />)}

                <div className="h-px bg-border my-2" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">Place</p>
                {ENTITY_TOOLS.map(t => <MobileToolBtn key={t.tool} {...t} />)}
                {isAdvanced && ADVANCED_ENTITY_TOOLS.map(t => <MobileToolBtn key={t.tool} {...t} />)}

                <div className="h-px bg-border my-2" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">Draw</p>
                {ACTION_TOOLS.map(t => <MobileToolBtn key={t.tool} {...t} />)}
                {isAdvanced && ADVANCED_ACTION_TOOLS.map(t => <MobileToolBtn key={t.tool} {...t} />)}

                <div className="h-px bg-border my-2" />

                <div className="flex flex-wrap gap-2 px-1">
                  <button
                    onClick={() => setEditorMode(isAdvanced ? 'basic' : 'advanced')}
                    className={cn(
                      "flex-1 min-w-[100px] py-2 rounded-xl text-xs font-semibold transition-all border",
                      isAdvanced
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {isAdvanced ? 'Basic Mode' : 'Advanced Mode'}
                  </button>
                  <button
                    onClick={() => { setSnapEnabled(!snapEnabled); }}
                    className={cn(
                      "py-2 px-4 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2",
                      snapEnabled ? "bg-primary/15 text-primary border-primary/30" : "border-border text-muted-foreground"
                    )}
                  >
                    <Magnet className="w-4 h-4" /> Snap
                  </button>
                  <button
                    onClick={() => { setShowGrid(!showGrid); }}
                    className={cn(
                      "py-2 px-4 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2",
                      showGrid ? "bg-primary/15 text-primary border-primary/30" : "border-border text-muted-foreground"
                    )}
                  >
                    <Grid3x3 className="w-4 h-4" /> Grid
                  </button>
                  <button
                    onClick={() => { onMirror?.(); setOpen(false); }}
                    className="py-2 px-4 rounded-xl text-xs font-semibold transition-all border border-border text-muted-foreground flex items-center gap-2"
                  >
                    <FlipHorizontal2 className="w-4 h-4" /> Mirror
                  </button>
                  <button
                    onClick={() => { setShowLayers(!showLayers); }}
                    className={cn(
                      "py-2 px-4 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2",
                      showLayers ? "bg-primary/15 text-primary border-primary/30" : "border-border text-muted-foreground"
                    )}
                  >
                    <Layers className="w-4 h-4" /> Layers
                  </button>
                </div>

                {showLayers && (
                  <div className="mt-2 p-3 bg-background rounded-xl border border-border">
                    <LayerPanel />
                  </div>
                )}

                <div className="h-px bg-border my-2" />

                <div className="flex gap-2 px-1">
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-border text-muted-foreground disabled:opacity-25 flex items-center justify-center gap-2"
                  >
                    <Undo2 className="w-4 h-4" /> Undo
                  </button>
                  <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-border text-muted-foreground disabled:opacity-25 flex items-center justify-center gap-2"
                  >
                    <Redo2 className="w-4 h-4" /> Redo
                  </button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="fixed bottom-[calc(theme(spacing.20)+env(safe-area-inset-bottom))] right-3 z-30 flex flex-col gap-2">
        <button
          onClick={() => setPresentationMode(true)}
          className="w-12 h-12 rounded-2xl shadow-xl bg-card/90 backdrop-blur-md border border-border text-muted-foreground flex items-center justify-center active:scale-95"
        >
          <Presentation className="w-5 h-5" />
        </button>
        <button
          onClick={() => setPlaying(!animation.playing)}
          className={cn(
            "w-12 h-12 rounded-2xl shadow-xl backdrop-blur-md border flex items-center justify-center active:scale-95",
            animation.playing
              ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
              : "bg-card/90 border-border text-muted-foreground"
          )}
        >
          {animation.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
