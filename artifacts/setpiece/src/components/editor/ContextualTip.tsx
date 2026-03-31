import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { useEditorStore } from './editorStore';
import { cn } from '@/lib/utils';

const TOOL_TIPS: Record<string, { text: string; accent?: string }> = {
  select: { text: 'Click to select markers and annotations. Drag to reposition.' },
  team_player: { text: 'Click on the pitch to place a team player role.', accent: 'text-emerald-400' },
  opponent: { text: 'Click on the pitch to place an opponent marker.', accent: 'text-red-400' },
  goalkeeper: { text: 'Click on the pitch to place a goalkeeper.', accent: 'text-amber-400' },
  ball: { text: 'Click on the pitch to place the ball.' },
  run_path: { text: 'Click to draw a player run path (dashed line). Double-click or Enter to finish.' },
  curved_run: { text: 'Click points to create a curved run. Double-click or Enter to finish.' },
  pass_line: { text: 'Click to draw a pass line (solid). Double-click or Enter to finish.' },
  curved_cross: { text: 'Click points to create a curved cross/delivery. Double-click or Enter to finish.' },
  zone_circle: { text: 'Click on the pitch to place a tactical zone circle.' },
  zone_rect: { text: 'Click two points to create a rectangular zone.' },
  label: { text: 'Click on the pitch to place a text label.' },
  erase: { text: 'Click on any marker or annotation to delete it.' },
};

const STORAGE_KEY = 'setpiece-dismissed-tips';

function getDismissedTips(): Set<string> {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? new Set(JSON.parse(v)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissTip(tool: string) {
  const tips = getDismissedTips();
  tips.add(tool);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...tips])); } catch {}
}

export function resetAllTips() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function ContextualTip() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const showTips = useEditorStore((s) => s.showTips);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedTips);

  useEffect(() => {
    setDismissed(getDismissedTips());
  }, [showTips]);

  if (!showTips) return null;

  const tip = TOOL_TIPS[activeTool];
  if (!tip || dismissed.has(activeTool)) return null;

  return (
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl max-w-sm">
        <Lightbulb className={cn("w-3.5 h-3.5 shrink-0", tip.accent || "text-primary")} />
        <span className="text-[11px] text-muted-foreground leading-snug">{tip.text}</span>
        <button
          onClick={() => {
            dismissTip(activeTool);
            setDismissed(new Set(dismissed).add(activeTool));
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-white hover:bg-secondary transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
