import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  title: string;
  description: string;
  selector: string;
  position: 'right' | 'left' | 'bottom' | 'top';
}

const STEPS: TutorialStep[] = [
  {
    title: 'Toolbar',
    description: 'Select tools to place players, draw run paths, and pass lines on the pitch. Toggle "More" to reveal advanced tools.',
    selector: '[data-tutorial="toolbar"]',
    position: 'right',
  },
  {
    title: 'The Pitch',
    description: 'Click on the pitch to place players and draw tactical movements. Double-click or press Enter to finish a path.',
    selector: '[data-tutorial="pitch"]',
    position: 'bottom',
  },
  {
    title: 'Roles Panel',
    description: 'Manage player roles and assign squad members. Each role becomes a marker on the pitch.',
    selector: '[data-tutorial="inspector"]',
    position: 'left',
  },
  {
    title: 'Drawing Semantics',
    description: 'Dashed lines = player runs. Solid lines = passes. Use these conventions to create clear tactical instructions.',
    selector: '[data-tutorial="pitch"]',
    position: 'top',
  },
  {
    title: 'Animation & Playback',
    description: 'Press Play to preview how players move along their paths. Adjust speed and scrub the timeline.',
    selector: '[data-tutorial="bottombar"]',
    position: 'top',
  },
  {
    title: 'Export & Share',
    description: 'Export to PDF, share via QR code, or mark your set piece as ready for matchday.',
    selector: '[data-tutorial="header"]',
    position: 'bottom',
  },
];

const STORAGE_KEY = 'setpiece-tutorial-completed';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialOverlay({ open, onClose }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const measureTarget = useCallback((stepIdx: number) => {
    const selector = STEPS[stepIdx]?.selector;
    if (!selector) { setTargetRect(null); return; }
    const el = document.querySelector(selector);
    if (el && el.getBoundingClientRect().width > 0) {
      const r = el.getBoundingClientRect();
      setTargetRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    } else {
      setTargetRect(null);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep(0);
      setTimeout(() => measureTarget(0), 100);
    }
  }, [open, measureTarget]);

  useEffect(() => {
    if (!open) return;
    measureTarget(step);
    const handleResize = () => measureTarget(step);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, step, measureTarget]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const PAD = 8;

  const handleComplete = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onClose();
  };

  const handleSkip = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      const next = step + 1;
      setStep(next);
      setTimeout(() => measureTarget(next), 50);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      const prev = step - 1;
      setStep(prev);
      setTimeout(() => measureTarget(prev), 50);
    }
  };

  const cutout = targetRect
    ? {
        x: targetRect.x - PAD,
        y: targetRect.y - PAD,
        w: targetRect.width + PAD * 2,
        h: targetRect.height + PAD * 2,
        r: 12,
      }
    : null;

  const cardStyle: React.CSSProperties = {};
  if (targetRect && cutout) {
    const pos = current.position;
    const cardW = 320;
    const cardGap = 16;
    if (pos === 'right') {
      cardStyle.position = 'fixed';
      cardStyle.left = cutout.x + cutout.w + cardGap;
      cardStyle.top = cutout.y + cutout.h / 2;
      cardStyle.transform = 'translateY(-50%)';
    } else if (pos === 'left') {
      cardStyle.position = 'fixed';
      cardStyle.left = cutout.x - cardW - cardGap;
      cardStyle.top = cutout.y + cutout.h / 2;
      cardStyle.transform = 'translateY(-50%)';
    } else if (pos === 'bottom') {
      cardStyle.position = 'fixed';
      cardStyle.left = cutout.x + cutout.w / 2;
      cardStyle.top = cutout.y + cutout.h + cardGap;
      cardStyle.transform = 'translateX(-50%)';
    } else if (pos === 'top') {
      cardStyle.position = 'fixed';
      cardStyle.left = cutout.x + cutout.w / 2;
      cardStyle.top = cutout.y - cardGap;
      cardStyle.transform = 'translate(-50%, -100%)';
    }
    cardStyle.maxWidth = cardW;
    cardStyle.width = cardW;
    cardStyle.zIndex = 110;
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutout && (
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.w}
                height={cutout.h}
                rx={cutout.r}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tutorial-mask)"
          style={{ pointerEvents: 'all' }}
          onClick={handleSkip}
        />
      </svg>

      {cutout && (
        <div
          className="absolute border-2 border-primary rounded-xl pointer-events-none animate-pulse"
          style={{
            left: cutout.x,
            top: cutout.y,
            width: cutout.w,
            height: cutout.h,
            zIndex: 105,
            boxShadow: '0 0 0 4px rgba(16,185,129,0.15)',
          }}
        />
      )}

      <div
        ref={cardRef}
        style={targetRect ? cardStyle : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 400, width: '90%', zIndex: 110 }}
        className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 className="font-display font-bold text-white text-sm leading-tight">{current.title}</h3>
            </div>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Close Tutorial"
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-[12px] text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        <div className="px-4 pb-2">
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

        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <button
            onClick={handleSkip}
            className="text-[10px] text-muted-foreground hover:text-white transition-colors px-1.5 py-1"
          >
            Skip
          </button>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                onClick={handlePrev}
                aria-label="Previous Step"
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:border-muted-foreground transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                "h-7 rounded-lg px-3.5 flex items-center gap-1 text-[11px] font-semibold transition-all",
                isLast
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
              )}
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-3 h-3" />}
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
