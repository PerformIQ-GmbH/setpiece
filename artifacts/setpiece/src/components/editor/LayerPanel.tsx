import { useEditorStore } from './editorStore';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Lock, Unlock, UserRound, UserX, Circle, Minus, Type, Square } from 'lucide-react';

const LAYERS = [
  { key: 'team', label: 'Team Players', icon: UserRound },
  { key: 'opponents', label: 'Opponents', icon: UserX },
  { key: 'ball', label: 'Ball', icon: Circle },
  { key: 'actions', label: 'Actions / Paths', icon: Minus },
  { key: 'zones', label: 'Zones', icon: Square },
  { key: 'labels', label: 'Labels', icon: Type },
];

export function LayerPanel() {
  const visibility = useEditorStore((s) => s.layerVisibility);
  const locked = useEditorStore((s) => s.layerLocked);
  const setVisibility = useEditorStore((s) => s.setLayerVisibility);
  const setLocked = useEditorStore((s) => s.setLayerLocked);

  return (
    <div className="space-y-0.5">
      {LAYERS.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className={cn(
            "text-[11px] flex-1",
            visibility[key] ? "text-foreground" : "text-muted-foreground/50 line-through"
          )}>
            {label}
          </span>
          <button
            onClick={() => setVisibility(key, !visibility[key])}
            title={visibility[key] ? 'Hide layer' : 'Show layer'}
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center transition-colors",
              visibility[key]
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground/40 hover:bg-secondary"
            )}
          >
            {visibility[key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setLocked(key, !locked[key])}
            title={locked[key] ? 'Unlock layer' : 'Lock layer'}
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center transition-colors",
              locked[key]
                ? "text-amber-400 hover:bg-amber-500/10"
                : "text-muted-foreground/40 hover:bg-secondary"
            )}
          >
            {locked[key] ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
        </div>
      ))}
    </div>
  );
}
