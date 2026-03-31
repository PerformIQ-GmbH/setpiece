import { useEditorStore } from './editorStore';
import { X, Info } from 'lucide-react';

export function QuickLegend() {
  const showLegend = useEditorStore((s) => s.showLegend);
  const setShowLegend = useEditorStore((s) => s.setShowLegend);

  if (!showLegend) return null;

  return (
    <div className="absolute top-3 right-3 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-3.5 w-52">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Legend</span>
          </div>
          <button
            onClick={() => setShowLegend(false)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Lines</p>
            <div className="flex items-center gap-2">
              <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="white" strokeWidth="2" strokeDasharray="4 3" /></svg>
              <span className="text-[10px] text-muted-foreground">Player Run</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="white" strokeWidth="2" /></svg>
              <span className="text-[10px] text-muted-foreground">Pass / Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="28" height="8"><path d="M0,6 Q14,0 28,6" fill="none" stroke="white" strokeWidth="2" /></svg>
              <span className="text-[10px] text-muted-foreground">Curved Path</span>
            </div>
          </div>

          <div className="w-full border-t border-border/50" />

          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Markers</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-700 border-2 border-emerald-500 flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">7</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Team Player</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-800 border-2 border-red-500 flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">4</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Opponent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-700 border-2 border-amber-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <span className="text-[7px] text-amber-200 font-bold">1</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Goalkeeper</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-400" />
              <span className="text-[10px] text-muted-foreground">Ball</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
