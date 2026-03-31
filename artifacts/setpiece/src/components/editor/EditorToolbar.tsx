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
} from 'lucide-react';
import { BASIC_TOOLS } from './types';
import { LayerPanel } from './LayerPanel';

interface ToolDef {
  tool: EditorTool;
  icon: React.ElementType;
  label: string;
}

const SELECT_TOOLS: ToolDef[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select & Move' },
];

const ENTITY_TOOLS: ToolDef[] = [
  { tool: 'team_player', icon: UserRound, label: 'Team Player' },
  { tool: 'opponent', icon: UserX, label: 'Opponent' },
  { tool: 'ball', icon: Circle, label: 'Ball' },
];

const ACTION_TOOLS: ToolDef[] = [
  { tool: 'run_path', icon: Minus, label: 'Run Path (dashed)' },
  { tool: 'pass_line', icon: MoveRight, label: 'Pass Line (solid)' },
];

const ADVANCED_ENTITY_TOOLS: ToolDef[] = [
  { tool: 'goalkeeper', icon: Shield, label: 'Goalkeeper' },
];

const ADVANCED_ACTION_TOOLS: ToolDef[] = [
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
}

export function EditorToolbar({ onUndo, onRedo, canUndo, canRedo, onMirror }: EditorToolbarProps) {
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

  const [showLayerPanel, setShowLayerPanel] = useState(false);

  return (
    <div data-tutorial="toolbar" className="w-14 border-r border-border bg-card/60 backdrop-blur-md flex flex-col items-center py-3 gap-1 shrink-0 relative">
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
    </div>
  );
}
