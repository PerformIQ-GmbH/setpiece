import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  title: string;
  description: string;
  target: string;
  position: 'right' | 'left' | 'bottom' | 'top';
}

const STEPS: TutorialStep[] = [
  {
    title: 'Toolbar',
    description: 'Select tools to place players, draw run paths, and pass lines on the pitch.',
    target: 'toolbar',
    position: 'right',
  },
  {
    title: 'The Pitch',
    description: 'Click on the pitch to place players and draw tactical movements. Double-click to finish a path.',
    target: 'pitch',
    position: 'bottom',
  },
  {
    title: 'Roles Panel',
    description: 'Manage player roles and assign squad members. Each role becomes a marker on the pitch.',
    target: 'inspector',
    position: 'left',
  },
  {
    title: 'Drawing Semantics',
    description: 'Dashed lines = player runs. Solid lines = passes. Use these to create clear tactical instructions.',
    target: 'pitch',
    position: 'bottom',
  },
  {
    title: 'Animation',
    description: 'Press Play to preview how players move along their paths. Adjust speed and scrub the timeline.',
    target: 'bottombar',
    position: 'top',
  },
  {
    title: 'Export & Share',
    description: 'Export to PDF, share via QR code, or mark your set piece as ready for matchday.',
    target: 'header',
    position: 'bottom',
  },
];

const STORAGE_KEY = 'setpiece-tutorial-completed';

interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialOverlay({ open, onClose }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleComplete = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onClose();
  };

  const handleSkip = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 className="font-display font-bold text-white text-sm">{current.title}</h3>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        <div className="px-5 pb-2">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full flex-1 transition-all",
                  i <= step ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-border/50">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1"
          >
            Skip Tutorial
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:border-muted-foreground transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={isLast ? handleComplete : () => setStep(step + 1)}
              className={cn(
                "h-8 rounded-lg px-4 flex items-center gap-1.5 text-xs font-semibold transition-all",
                isLast
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
              )}
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return false;
  }
}

export function resetTutorial(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
