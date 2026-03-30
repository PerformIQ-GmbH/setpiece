import { useEditorStore } from './editorStore';
import { ANNOTATION_COLORS } from './types';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Trash2, ArrowRight, Minus } from 'lucide-react';

const WIDTHS = [1.5, 2.5, 4, 6];

const ANNOTATION_TYPE_LABELS: Record<string, string> = {
  run_path: 'Run Path',
  curved_run: 'Curved Run',
  pass_line: 'Pass Line',
  curved_cross: 'Curved Cross',
  zone_circle: 'Circle Zone',
  zone_rect: 'Rect Zone',
  label: 'Label',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  opponent: 'Opponent',
  goalkeeper: 'Goalkeeper',
  ball: 'Ball',
};

export function BottomBar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const strokeColor = useEditorStore((s) => s.strokeColor);
  const setStrokeColor = useEditorStore((s) => s.setStrokeColor);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);
  const setStrokeWidth = useEditorStore((s) => s.setStrokeWidth);
  const showArrowhead = useEditorStore((s) => s.showArrowhead);
  const setShowArrowhead = useEditorStore((s) => s.setShowArrowhead);
  const forceDashed = useEditorStore((s) => s.forceDashed);
  const setForceDashed = useEditorStore((s) => s.setForceDashed);
  const clearAnnotations = useEditorStore((s) => s.clearAnnotations);
  const animation = useEditorStore((s) => s.animation);
  const setPlaying = useEditorStore((s) => s.setAnimationPlaying);
  const setProgress = useEditorStore((s) => s.setAnimationProgress);
  const setSpeed = useEditorStore((s) => s.setAnimationSpeed);
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation);
  const deleteEntity = useEditorStore((s) => s.deleteEntity);
  const annotations = useEditorStore((s) => s.annotations);
  const entities = useEditorStore((s) => s.entities);

  const isDrawTool = ['run_path', 'curved_run', 'pass_line', 'curved_cross', 'zone_circle', 'zone_rect', 'label'].includes(activeTool);
  const selectedAnn = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : null;
  const selectedEnt = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  const toolLabel: Record<string, string> = {
    select: 'Select',
    team_player: 'Place Team Player',
    opponent: 'Place Opponent',
    goalkeeper: 'Place Goalkeeper',
    ball: 'Place Ball',
    run_path: 'Draw Run Path',
    curved_run: 'Draw Curved Run',
    pass_line: 'Draw Pass Line',
    curved_cross: 'Draw Curved Cross',
    zone_circle: 'Draw Circle Zone',
    zone_rect: 'Draw Rectangle Zone',
    label: 'Place Label',
    erase: 'Delete Mode',
  };

  const selectionSummary = selectedAnn
    ? `${ANNOTATION_TYPE_LABELS[selectedAnn.type] || selectedAnn.type}${selectedAnn.linkedRoleId ? ' (linked)' : ''}`
    : selectedEnt
    ? `${ENTITY_TYPE_LABELS[selectedEnt.type] || selectedEnt.type}${selectedEnt.shirtNumber ? ` #${selectedEnt.shirtNumber}` : ''}`
    : null;

  return (
    <div className="h-10 border-t border-border bg-card/80 backdrop-blur-md flex items-center px-3 gap-3 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="font-semibold text-white">{toolLabel[activeTool] || activeTool}</span>
      </div>

      {selectionSummary && (
        <>
          <div className="w-px h-5 bg-border shrink-0" />
          <span className="text-[10px] text-primary/80 font-medium shrink-0 truncate max-w-[120px]">{selectionSummary}</span>
        </>
      )}

      <div className="w-px h-5 bg-border shrink-0" />

      {(isDrawTool || selectedAnn) && (
        <>
          <div className="flex items-center gap-1 shrink-0">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-all",
                  strokeColor === c ? "border-white scale-110" : "border-transparent hover:border-white/40"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-border shrink-0" />

          <div className="flex items-center gap-1 shrink-0">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={cn(
                  "w-7 h-7 rounded flex items-center justify-center transition-all",
                  strokeWidth === w ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <div className="rounded-full bg-current" style={{ width: w * 2, height: w * 2 }} />
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border shrink-0" />

          <button
            onClick={() => setShowArrowhead(!showArrowhead)}
            title="Toggle arrowhead"
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center transition-all",
              showArrowhead ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setForceDashed(!forceDashed)}
            title="Toggle dashed/solid"
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center transition-all",
              forceDashed ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Minus className="w-3.5 h-3.5" strokeDasharray={forceDashed ? "3 3" : undefined} />
          </button>
        </>
      )}

      <div className="flex-1" />

      {(selectedAnnotationId || selectedEntityId) && (
        <button
          onClick={() => {
            if (selectedAnnotationId) deleteAnnotation(selectedAnnotationId);
            if (selectedEntityId) deleteEntity(selectedEntityId);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      )}

      <div className="w-px h-5 bg-border shrink-0" />

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setPlaying(!animation.playing)}
          className={cn("w-7 h-7 rounded flex items-center justify-center transition-all",
            animation.playing ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:bg-secondary hover:text-white")}
        >
          {animation.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => { setPlaying(false); setProgress(0); }}
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={animation.progress}
          onChange={(e) => { setPlaying(false); setProgress(Number(e.target.value)); }}
          className="w-20 h-1 accent-primary"
        />
        <select
          value={animation.speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="bg-secondary border border-border rounded px-1 py-0.5 text-[10px] text-muted-foreground"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      <div className="w-px h-5 bg-border shrink-0" />

      <button
        onClick={() => { if (confirm('Clear all annotations?')) clearAnnotations(); }}
        className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors shrink-0 px-1"
      >
        Clear All
      </button>
    </div>
  );
}
