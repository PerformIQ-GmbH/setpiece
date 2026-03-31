import { useEditorStore } from './editorStore';
import { QuickLegend } from './QuickLegend';
import { cn } from '@/lib/utils';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface PresentationModeProps {
  title: string;
  category: string;
  children: React.ReactNode;
}

export function PresentationMode({ title, category, children }: PresentationModeProps) {
  const presentationMode = useEditorStore((s) => s.presentationMode);
  const setPresentationMode = useEditorStore((s) => s.setPresentationMode);
  const animation = useEditorStore((s) => s.animation);
  const setPlaying = useEditorStore((s) => s.setAnimationPlaying);
  const setProgress = useEditorStore((s) => s.setAnimationProgress);
  const setActiveStepIndex = useEditorStore((s) => s.setActiveStepIndex);
  const steps = useEditorStore((s) => s.steps);
  const goToNextStep = useEditorStore((s) => s.goToNextStep);
  const goToPrevStep = useEditorStore((s) => s.goToPrevStep);
  const showLegend = useEditorStore((s) => s.showLegend);
  const setShowLegend = useEditorStore((s) => s.setShowLegend);

  if (!presentationMode) return null;

  const activeStep = steps[animation.activeStepIndex];

  const handleReset = () => {
    setPlaying(false);
    setProgress(0);
    setActiveStepIndex(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="h-14 border-b border-border/30 bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display font-bold text-lg text-white">{title}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{category.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {activeStep && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Step</span>
              <span className="text-sm font-display font-bold text-primary">{animation.activeStepIndex + 1}/{steps.length}</span>
              <span className="text-xs text-white font-medium">{activeStep.label}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setPresentationMode(false)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary transition-all"
          title="Exit Presentation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {children}
        {showLegend && (
          <div className="absolute bottom-4 left-4 z-10">
            <QuickLegend />
          </div>
        )}
      </div>

      <div className="h-16 border-t border-border/30 bg-card/40 backdrop-blur-md flex items-center justify-center gap-4 px-6 shrink-0">
        <button
          onClick={goToPrevStep}
          disabled={animation.activeStepIndex === 0}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleReset}
          title="Reset"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setPlaying(!animation.playing)}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
            animation.playing
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
          )}
        >
          {animation.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={animation.progress}
          onChange={(e) => { setPlaying(false); setProgress(Number(e.target.value)); }}
          className="w-40 h-1.5 accent-primary"
        />

        <button
          onClick={goToNextStep}
          disabled={animation.activeStepIndex >= steps.length - 1}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary disabled:opacity-30 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="w-px h-8 bg-border/40 mx-2" />

        <button
          onClick={() => setShowLegend(!showLegend)}
          title="Toggle Legend"
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            showLegend ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-white hover:bg-secondary"
          )}
        >
          <Info className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => { setPlaying(false); setProgress(0); setActiveStepIndex(idx); }}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                idx === animation.activeStepIndex
                  ? "bg-primary text-primary-foreground"
                  : idx < animation.activeStepIndex
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground hover:text-white"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
