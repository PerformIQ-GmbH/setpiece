import { useRef, useEffect, useState, type RefObject } from 'react';
import { useEditorStore } from './editorStore';
import { moveAnnotationGeometry } from './editorInteraction';
import { ANNOTATION_COLORS } from './types';
import type { Annotation, AnnotationType, Point } from './types';
import { cn } from '@/lib/utils';
import { Trash2, Copy, ArrowRightLeft } from 'lucide-react';

interface ContextualMiniBarProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  pointToScreen?: (point: Point) => Point | null;
}

const LINE_TYPE_SET: ReadonlySet<AnnotationType> = new Set([
  'run_path', 'curved_run', 'pass_line', 'curved_cross',
]);

function isLineAnnotation(type: AnnotationType): boolean {
  return LINE_TYPE_SET.has(type);
}

export function ContextualMiniBar({ canvasRef, pointToScreen }: ContextualMiniBarProps) {
  const view = useEditorStore((s) => s.view);
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
      const parentEl = container.closest('.relative') as HTMLElement | null;
      if (!parentEl || !pointToScreen) { setPos(null); return; }

      const parentRect = parentEl.getBoundingClientRect();


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

      const screenPoint = pointToScreen({ x: pctX, y: pctY });
      if (!screenPoint) { setPos(null); return; }
      const pixelX = screenPoint.x - parentRect.left;
      const pixelY = screenPoint.y - parentRect.top;

      const barW = Math.min(barRef.current?.offsetWidth || 200, Math.max(0, parentRect.width - 16));
      const clampedX = Math.max(barW / 2 + 8, Math.min(parentRect.width - barW / 2 - 8, pixelX));
      const offsetY = Math.max(8, pixelY - (barRef.current?.offsetHeight || 52) - 12);

      setPos(previous => previous?.x === clampedX && previous.y === offsetY ? previous : { x: clampedX, y: offsetY });
    };

    updatePosition();
    const ro = new ResizeObserver(updatePosition);
    ro.observe(container);
    if (barRef.current) ro.observe(barRef.current);
    return () => ro.disconnect();
  }, [selectedAnn, selectedEnt, canvasRef, pointToScreen, view, pos]);

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
        ...moveAnnotationGeometry(selectedAnn, 2, 2),
        id: crypto.randomUUID(),
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
      className="absolute z-30 flex items-center gap-1 px-2 py-1.5 bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl pointer-events-auto max-w-[calc(100%-16px)] overflow-x-auto"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translateX(-50%)',
      }}
    >
      {selectedAnn && (
        <>
          <div className="flex items-center gap-0.5 px-1 shrink-0">
            {ANNOTATION_COLORS.map((c, index) => (
              <button
                key={c}
                title={`Farbe: ${['Weiss', 'Grün', 'Rot', 'Blau', 'Orange', 'Violett', 'Pink', 'Türkis'][index]}`}
                aria-label={`Farbe: ${['Weiss', 'Grün', 'Rot', 'Blau', 'Orange', 'Violett', 'Pink', 'Türkis'][index]}`}
                onClick={() => { if (selectedAnn.color !== c) { useEditorStore.getState().snapshotBoard(); updateAnnotation(selectedAnn.id, { color: c }); } }}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all",
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
                onClick={() => { const conversions: Record<string, AnnotationType> = { run_path: 'pass_line', pass_line: 'run_path', curved_run: 'curved_cross', curved_cross: 'curved_run' }; const type = conversions[selectedAnn.type]; useEditorStore.getState().snapshotBoard(); updateAnnotation(selectedAnn.id, { type, dashed: type === 'run_path' || type === 'curved_run', arrowhead: true }); }}
                title={selectedAnn.type === 'run_path' || selectedAnn.type === 'curved_run' ? 'In Pass umwandeln' : 'In Lauf umwandeln'}
                aria-label={selectedAnn.type === 'run_path' || selectedAnn.type === 'curved_run' ? 'In Pass umwandeln' : 'In Lauf umwandeln'}
                className="h-9 px-2 rounded-lg flex items-center gap-1 shrink-0 text-xs text-foreground hover:bg-secondary"
              ><ArrowRightLeft className="w-3.5 h-3.5" /> {selectedAnn.type === 'run_path' || selectedAnn.type === 'curved_run' ? 'Pass' : 'Lauf'}</button>
            </>
          )}
        </>
      )}

      <div className="w-px h-5 bg-border/40" />

      <button
        onClick={handleDuplicate}
        title="Duplizieren" aria-label="Duplizieren"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-secondary transition-all"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleDelete}
        title="Löschen" aria-label="Löschen"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
