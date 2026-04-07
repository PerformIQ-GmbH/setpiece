import { useRef, useEffect, useState, type RefObject } from 'react';
import { useEditorStore } from './editorStore';
import { ANNOTATION_COLORS } from './types';
import type { Annotation, AnnotationType } from './types';
import { cn } from '@/lib/utils';
import { Trash2, Copy, Minus, ArrowRight } from 'lucide-react';

interface ContextualMiniBarProps {
  canvasRef: RefObject<HTMLDivElement | null>;
}

const LINE_TYPE_SET: ReadonlySet<AnnotationType> = new Set([
  'run_path', 'curved_run', 'pass_line', 'curved_cross',
]);

function isLineAnnotation(type: AnnotationType): boolean {
  return LINE_TYPE_SET.has(type);
}

export function ContextualMiniBar({ canvasRef }: ContextualMiniBarProps) {
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const annotations = useEditorStore((s) => s.annotations);
  const entities = useEditorStore((s) => s.entities);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation);
  const deleteEntity = useEditorStore((s) => s.deleteEntity);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const addEntity = useEditorStore((s) => s.addEntity);

  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const selectedAnn = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : null;
  const selectedEnt = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  useEffect(() => {
    const container = canvasRef?.current;
    if (!container) { setPos(null); return; }
    if (!selectedAnn && !selectedEnt) { setPos(null); return; }

    const updatePosition = () => {
      const stageEl = container.querySelector('.konvajs-content') as HTMLElement | null;
      const parentEl = container.closest('.relative') as HTMLElement | null;
      if (!stageEl || !parentEl) { setPos(null); return; }

      const stageRect = stageEl.getBoundingClientRect();
      const parentRect = parentEl.getBoundingClientRect();

      const stageOffsetX = stageRect.left - parentRect.left;
      const stageOffsetY = stageRect.top - parentRect.top;

      let pctX = 50;
      let pctY = 50;

      if (selectedAnn) {
        const xs = selectedAnn.points.map(p => p.x);
        const ys = selectedAnn.points.map(p => p.y);
        pctX = (Math.min(...xs) + Math.max(...xs)) / 2;
        pctY = Math.min(...ys);
      } else if (selectedEnt) {
        pctX = selectedEnt.position.x;
        pctY = selectedEnt.position.y;
      }

      const pixelX = stageOffsetX + (pctX / 100) * stageRect.width;
      const pixelY = stageOffsetY + (pctY / 100) * stageRect.height;

      const barW = barRef.current?.offsetWidth || 200;
      const clampedX = Math.max(barW / 2 + 8, Math.min(parentRect.width - barW / 2 - 8, pixelX));
      const offsetY = Math.max(8, pixelY - 44);

      setPos({ x: clampedX, y: offsetY });
    };

    updatePosition();
    const ro = new ResizeObserver(updatePosition);
    ro.observe(container);
    return () => ro.disconnect();
  }, [selectedAnn, selectedEnt, canvasRef]);

  if (!selectedAnn && !selectedEnt) return null;
  if (!pos) return null;

  const isLine = selectedAnn ? isLineAnnotation(selectedAnn.type) : false;

  const handleDelete = () => {
    if (selectedAnnotationId) deleteAnnotation(selectedAnnotationId);
    if (selectedEntityId) deleteEntity(selectedEntityId);
  };

  const handleDuplicate = () => {
    if (selectedAnn) {
      const dup: Annotation = {
        ...selectedAnn,
        id: crypto.randomUUID(),
        points: selectedAnn.points.map(p => ({
          x: Math.min(100, p.x + 2),
          y: Math.min(100, p.y + 2),
        })),
        layerOrder: annotations.length,
      };
      addAnnotation(dup);
    }
    if (selectedEnt) {
      addEntity({
        ...selectedEnt,
        id: crypto.randomUUID(),
        position: {
          x: Math.min(100, selectedEnt.position.x + 2),
          y: Math.min(100, selectedEnt.position.y + 2),
        },
      });
    }
  };

  return (
    <div
      ref={barRef}
      className="absolute z-30 flex items-center gap-1 px-2 py-1.5 bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl pointer-events-auto"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translateX(-50%)',
      }}
    >
      {selectedAnn && (
        <>
          <div className="flex items-center gap-0.5 px-1">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateAnnotation(selectedAnn.id, { color: c })}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-all",
                  selectedAnn.color === c ? "border-white scale-110" : "border-transparent hover:border-white/40"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {isLine && (
            <>
              <div className="w-px h-5 bg-border/40" />
              <button
                onClick={() => updateAnnotation(selectedAnn.id, { dashed: !selectedAnn.dashed })}
                title={selectedAnn.dashed ? 'Solid' : 'Dashed'}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  selectedAnn.dashed ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white hover:bg-secondary"
                )}
              >
                <Minus className="w-3.5 h-3.5" strokeDasharray={selectedAnn.dashed ? "3 3" : undefined} />
              </button>
              <button
                onClick={() => updateAnnotation(selectedAnn.id, { arrowhead: !selectedAnn.arrowhead })}
                title={selectedAnn.arrowhead ? 'Remove Arrowhead' : 'Add Arrowhead'}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  selectedAnn.arrowhead ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white hover:bg-secondary"
                )}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </>
      )}

      <div className="w-px h-5 bg-border/40" />

      <button
        onClick={handleDuplicate}
        title="Duplicate"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary transition-all"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleDelete}
        title="Delete"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
