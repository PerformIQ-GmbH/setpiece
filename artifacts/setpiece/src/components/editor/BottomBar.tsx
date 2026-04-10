import { useState } from 'react';
import { useEditorStore } from './editorStore';
import { ANNOTATION_COLORS, ACTION_SEMANTICS } from './types';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Trash2, ArrowRight, Minus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown as ChevronDownIcon, Plus, Check, X, Users } from 'lucide-react';

const WIDTHS = [1.5, 2.5, 4, 6];

const TOOL_LABELS: Record<string, string> = {
  select: 'Select',
  team_player: 'Place Player',
  opponent: 'Place Opponent',
  goalkeeper: 'Place Goalkeeper',
  ball: 'Place Ball',
  run_path: 'Draw Run',
  curved_run: 'Draw Curved Run',
  pass_line: 'Draw Pass',
  curved_cross: 'Draw Cross',
  zone_circle: 'Circle Zone',
  zone_rect: 'Rect Zone',
  label: 'Place Label',
  erase: 'Delete Mode',
};

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

const SEMANTIC_TOOLS = new Set(['run_path', 'curved_run', 'pass_line', 'curved_cross']);

interface BottomBarProps {
  mobile?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onMirror?: () => void;
  onOpenInspector?: () => void;
}

export function BottomBar({ mobile = false, onUndo, onRedo, canUndo, canRedo, onMirror, onOpenInspector }: BottomBarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const editorMode = useEditorStore((s) => s.editorMode);
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
  const setActiveStepIndex = useEditorStore((s) => s.setActiveStepIndex);
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation);
  const deleteEntity = useEditorStore((s) => s.deleteEntity);
  const annotations = useEditorStore((s) => s.annotations);
  const entities = useEditorStore((s) => s.entities);
  const steps = useEditorStore((s) => s.steps);
  const goToNextStep = useEditorStore((s) => s.goToNextStep);
  const goToPrevStep = useEditorStore((s) => s.goToPrevStep);
  const addStep = useEditorStore((s) => s.addStep);
  const updateStep = useEditorStore((s) => s.updateStep);
  const deleteStep = useEditorStore((s) => s.deleteStep);
  const reorderStep = useEditorStore((s) => s.reorderStep);
  const setPlayMode = useEditorStore((s) => s.setPlayMode);

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const isDrawTool = ['run_path', 'curved_run', 'pass_line', 'curved_cross', 'zone_circle', 'zone_rect', 'label'].includes(activeTool);
  const selectedAnn = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : null;
  const selectedEnt = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  const isSemanticTool = SEMANTIC_TOOLS.has(activeTool);
  const isSemanticSelection = selectedAnn && SEMANTIC_TOOLS.has(selectedAnn.type);
  const semanticLocked = isSemanticTool || isSemanticSelection;

  const selectionSummary = selectedAnn
    ? `${ANNOTATION_TYPE_LABELS[selectedAnn.type] || selectedAnn.type}${selectedAnn.linkedRoleId ? ' (linked)' : ''}`
    : selectedEnt
    ? `${ENTITY_TYPE_LABELS[selectedEnt.type] || selectedEnt.type}${selectedEnt.shirtNumber ? ` #${selectedEnt.shirtNumber}` : ''}`
    : null;

  const showStyleControls = (isDrawTool || selectedAnn) && (editorMode === 'advanced' || isDrawTool);
  const activeStep = steps[animation.activeStepIndex];
  const activeStepAnns = activeStep ? annotations.filter(a => a.stepId === activeStep.id) : [];

  const semanticHint = isSemanticTool
    ? ACTION_SEMANTICS[activeTool]
    : isSemanticSelection
    ? ACTION_SEMANTICS[selectedAnn!.type]
    : null;

  const handleReset = () => {
    setPlaying(false);
    setProgress(0);
    setActiveStepIndex(0);
  };

  if (mobile) {
    return (
      <div className="bg-card/95 backdrop-blur-xl border-t border-white/[0.08] shrink-0">
        {/* Step navigation row */}
        <div className="h-11 flex items-center px-2 gap-1">
          <button
            onClick={goToPrevStep}
            disabled={animation.activeStepIndex === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white disabled:opacity-30 transition-colors shrink-0 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-none">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 shrink-0",
                  idx === animation.activeStepIndex
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground active:bg-secondary"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold",
                  idx === animation.activeStepIndex ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {idx + 1}
                </span>
                {step.label}
              </button>
            ))}
          </div>

          <button
            onClick={goToNextStep}
            disabled={animation.activeStepIndex >= steps.length - 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white disabled:opacity-30 transition-colors shrink-0 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border shrink-0" />

          <button
            onClick={addStep}
            title="Add Step"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Controls row: play + inspector */}
        <div className="h-11 flex items-center px-2 gap-1 border-t border-white/[0.04]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPlaying(!animation.playing)}
              className={cn(
                "w-10 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95",
                animation.playing
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              {animation.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={handleReset}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              onClick={() => setPlayMode('step')}
              className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-semibold transition-all",
                animation.playMode === 'step' ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              Step
            </button>
            <button
              onClick={() => setPlayMode('all')}
              className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-semibold transition-all",
                animation.playMode === 'all' ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              All
            </button>
          </div>

          <div className="flex-1" />

          {showStyleControls && (
            <div className="flex items-center gap-0.5 shrink-0">
              {ANNOTATION_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setStrokeColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all",
                    strokeColor === c ? "border-white scale-110" : "border-transparent hover:border-white/40"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {onOpenInspector && (
            <button
              onClick={onOpenInspector}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white active:scale-95 shrink-0"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    );
  }

  return (
    <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] shrink-0">
      <div className="h-9 flex items-center px-2 gap-1 border-b border-white/[0.06] overflow-x-auto rounded-t-2xl">
        <button
          onClick={goToPrevStep}
          disabled={animation.activeStepIndex === 0}
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-white disabled:opacity-30 transition-colors shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-0.5 overflow-x-auto">
          {steps.map((step, idx) => {
            const stepAnns = annotations.filter(a => a.stepId === step.id);
            const actionSummary = stepAnns.reduce((acc, a) => {
              const label = ANNOTATION_TYPE_LABELS[a.type] || a.type;
              acc[label] = (acc[label] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            const actionList = Object.entries(actionSummary).map(([k, v]) => `${v} ${k}`).join(', ');

            return (
              <div key={step.id} className="shrink-0 group relative">
                {editingStepId === step.id ? (
                  <div className="flex items-center gap-0.5">
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateStep(step.id, { label: editLabel.trim() || step.label });
                          setEditingStepId(null);
                        }
                        if (e.key === 'Escape') setEditingStepId(null);
                      }}
                      className="w-16 bg-secondary border border-primary rounded px-1 py-0.5 text-[10px] text-foreground outline-none"
                    />
                    <button
                      onClick={() => {
                        updateStep(step.id, { label: editLabel.trim() || step.label });
                        setEditingStepId(null);
                      }}
                      className="w-4 h-4 text-primary"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <button
                      onClick={() => setActiveStepIndex(idx)}
                      onDoubleClick={() => {
                        setEditLabel(step.label);
                        setEditingStepId(step.id);
                      }}
                      title={actionList || 'No actions'}
                      className={cn(
                        "px-2.5 py-1 rounded-l text-[10px] font-semibold transition-all flex items-center gap-1",
                        idx === animation.activeStepIndex
                          ? "bg-primary/20 text-primary border border-primary/30 border-r-0"
                          : "text-muted-foreground hover:text-white hover:bg-secondary border border-transparent"
                      )}
                    >
                      <span className={cn(
                        "w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold",
                        idx === animation.activeStepIndex ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      {step.label}
                      <span className="text-[8px] text-muted-foreground/60">
                        ({stepAnns.length})
                      </span>
                    </button>

                    {idx === animation.activeStepIndex && steps.length > 1 && (
                      <div className="flex flex-col border border-primary/30 border-l-0 rounded-r overflow-hidden">
                        <button
                          onClick={() => reorderStep(step.id, 'up')}
                          disabled={idx === 0}
                          className="h-[14px] w-4 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors bg-primary/10"
                        >
                          <ChevronUp className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => reorderStep(step.id, 'down')}
                          disabled={idx === steps.length - 1}
                          className="h-[14px] w-4 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors bg-primary/10"
                        >
                          <ChevronDownIcon className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={goToNextStep}
          disabled={animation.activeStepIndex >= steps.length - 1}
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-white disabled:opacity-30 transition-colors shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-border shrink-0 mx-0.5" />

        <button
          onClick={addStep}
          title="Add Step"
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
        >
          <Plus className="w-3 h-3" />
        </button>

        {steps.length > 1 && activeStep && (
          <button
            onClick={() => deleteStep(activeStep.id)}
            title="Delete Step"
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setPlayMode('step')}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] font-semibold transition-all",
              animation.playMode === 'step' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
            )}
          >
            Step
          </button>
          <button
            onClick={() => setPlayMode('all')}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] font-semibold transition-all",
              animation.playMode === 'all' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
            )}
          >
            All
          </button>
        </div>
      </div>

      <div className="h-10 flex items-center px-3 gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <div className={cn(
            "w-2 h-2 rounded-full",
            activeTool === 'erase' ? "bg-red-400" : "bg-primary"
          )} />
          <span className="font-semibold text-white text-[11px]">{TOOL_LABELS[activeTool] || activeTool}</span>
          {semanticHint && (
            <span className="text-[9px] text-primary/70 italic">{semanticHint.style}</span>
          )}
        </div>

        {selectionSummary && (
          <>
            <div className="w-px h-5 bg-border shrink-0" />
            <span className="text-[10px] text-primary/80 font-medium shrink-0 truncate max-w-[120px]">{selectionSummary}</span>
          </>
        )}

        {showStyleControls && (
          <>
            <div className="w-px h-5 bg-border shrink-0" />

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

            {editorMode === 'advanced' && !semanticLocked && (
              <>
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

            {semanticLocked && (
              <>
                <div className="w-px h-5 bg-border shrink-0" />
                <span className="text-[9px] text-muted-foreground/60 italic shrink-0">Style locked by action type</span>
              </>
            )}
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPlaying(!animation.playing)}
            title={animation.playing ? 'Pause' : animation.playMode === 'all' ? 'Play All Steps' : `Play Step ${animation.activeStepIndex + 1}`}
            className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              animation.playing ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:bg-secondary hover:text-white")}
          >
            {animation.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleReset}
            title="Reset to Step 1"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={animation.progress}
            onChange={(e) => { setPlaying(false); setProgress(Number(e.target.value)); }}
            className="w-24 h-1.5 accent-primary"
          />
          <select
            value={animation.speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-secondary border border-border rounded-md px-1.5 py-1 text-[10px] text-muted-foreground"
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
    </div>
  );
}
