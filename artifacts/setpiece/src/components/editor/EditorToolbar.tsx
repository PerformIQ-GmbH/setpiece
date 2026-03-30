import { cn } from '@/lib/utils';
import { useEditorStore } from './editorStore';
import type { EditorTool } from './types';
import {
  MousePointer2, UserRound, UserX, Shield, Circle,
  Minus, Spline, MoveRight, CornerDownRight,
  Square, Type, Eraser,
  Play, Pause, RotateCcw
} from 'lucide-react';

interface ToolDef {
  tool: EditorTool;
  icon: React.ElementType;
  label: string;
}

const ENTITY_TOOLS: ToolDef[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select & Move' },
  { tool: 'team_player', icon: UserRound, label: 'Team Player' },
  { tool: 'opponent', icon: UserX, label: 'Opponent' },
  { tool: 'goalkeeper', icon: Shield, label: 'Goalkeeper' },
  { tool: 'ball', icon: Circle, label: 'Ball' },
];

const ACTION_TOOLS: ToolDef[] = [
  { tool: 'run_path', icon: Minus, label: 'Run Path (dashed)' },
  { tool: 'curved_run', icon: Spline, label: 'Curved Run' },
  { tool: 'pass_line', icon: MoveRight, label: 'Pass Line (solid)' },
  { tool: 'curved_cross', icon: CornerDownRight, label: 'Curved Cross' },
];

const NOTE_TOOLS: ToolDef[] = [
  { tool: 'zone_circle', icon: Circle, label: 'Circle Zone' },
  { tool: 'zone_rect', icon: Square, label: 'Rectangle Zone' },
  { tool: 'label', icon: Type, label: 'Text Label' },
  { tool: 'erase', icon: Eraser, label: 'Delete Selected' },
];

function ToolGroup({ tools, label }: { tools: ToolDef[]; label: string }) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider font-bold mb-0.5">{label}</span>
      {tools.map((t) => (
        <button
          key={t.tool}
          onClick={() => setActiveTool(t.tool)}
          title={t.label}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group",
            activeTool === t.tool
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "text-muted-foreground hover:bg-secondary hover:text-white"
          )}
        >
          <t.icon className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-border rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
            {t.label}
          </div>
        </button>
      ))}
    </div>
  );
}

export function EditorToolbar() {
  const animation = useEditorStore((s) => s.animation);
  const setPlaying = useEditorStore((s) => s.setAnimationPlaying);
  const setProgress = useEditorStore((s) => s.setAnimationProgress);

  return (
    <div className="w-12 border-r border-border bg-card/60 backdrop-blur-md flex flex-col items-center py-3 gap-2 shrink-0">
      <ToolGroup tools={ENTITY_TOOLS} label="ENT" />
      <div className="w-6 border-t border-border/50" />
      <ToolGroup tools={ACTION_TOOLS} label="ACT" />
      <div className="w-6 border-t border-border/50" />
      <ToolGroup tools={NOTE_TOOLS} label="NOTE" />
      <div className="w-6 border-t border-border/50" />
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider font-bold mb-0.5">PLAY</span>
        <button
          onClick={() => setPlaying(!animation.playing)}
          title={animation.playing ? 'Pause' : 'Play'}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
            animation.playing
              ? "bg-amber-500/20 text-amber-400"
              : "text-muted-foreground hover:bg-secondary hover:text-white"
          )}
        >
          {animation.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { setPlaying(false); setProgress(0); }}
          title="Reset"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
