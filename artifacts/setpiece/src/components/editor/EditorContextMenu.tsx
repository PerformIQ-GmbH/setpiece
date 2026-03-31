import { useEffect, useRef } from 'react';
import { useEditorStore } from './editorStore';
import { Trash2, Copy, ArrowRightLeft, Layers } from 'lucide-react';

export function EditorContextMenu() {
  const contextMenu = useEditorStore((s) => s.contextMenu);
  const setContextMenu = useEditorStore((s) => s.setContextMenu);
  const annotations = useEditorStore((s) => s.annotations);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation);
  const entities = useEditorStore((s) => s.entities);
  const deleteEntity = useEditorStore((s) => s.deleteEntity);
  const steps = useEditorStore((s) => s.steps);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  const ann = contextMenu.targetType === 'annotation'
    ? annotations.find(a => a.id === contextMenu.targetId)
    : null;

  const ent = contextMenu.targetType === 'entity'
    ? entities.find(e => e.id === contextMenu.targetId)
    : null;

  const handleDuplicate = () => {
    if (ann) {
      const newAnn = {
        ...ann,
        id: crypto.randomUUID(),
        points: ann.points.map(p => ({ x: p.x + 3, y: p.y + 3 })),
      };
      addAnnotation(newAnn);
    }
    setContextMenu(null);
  };

  const handleConvertType = () => {
    if (!ann) return;
    const conversions: Record<string, string> = {
      run_path: 'pass_line',
      pass_line: 'run_path',
      curved_run: 'curved_cross',
      curved_cross: 'curved_run',
    };
    const newType = conversions[ann.type];
    if (newType) {
      const isRun = newType === 'run_path' || newType === 'curved_run';
      updateAnnotation(ann.id, {
        type: newType as any,
        dashed: isRun,
        arrowhead: true,
      });
    }
    setContextMenu(null);
  };

  const handleMoveToStep = (stepId: string) => {
    if (ann) {
      updateAnnotation(ann.id, { stepId });
    }
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (ann) deleteAnnotation(ann.id);
    if (ent) deleteEntity(ent.id);
    setContextMenu(null);
  };

  const isConvertible = ann && ['run_path', 'pass_line', 'curved_run', 'curved_cross'].includes(ann.type);
  const typeLabels: Record<string, string> = {
    run_path: 'Pass Line',
    pass_line: 'Run Path',
    curved_run: 'Curved Cross',
    curved_cross: 'Curved Run',
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl py-1.5 min-w-[160px]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {ann && (
        <>
          <button
            onClick={handleDuplicate}
            className="w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-secondary flex items-center gap-2 transition-colors"
          >
            <Copy className="w-3 h-3 text-muted-foreground" /> Duplicate
          </button>

          {isConvertible && (
            <button
              onClick={handleConvertType}
              className="w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-secondary flex items-center gap-2 transition-colors"
            >
              <ArrowRightLeft className="w-3 h-3 text-muted-foreground" /> Convert to {typeLabels[ann.type]}
            </button>
          )}

          {steps.length > 1 && (
            <div className="border-t border-border/50 my-1">
              <div className="px-3 py-1 text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                Move to Step
              </div>
              {steps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => handleMoveToStep(step.id)}
                  disabled={ann.stepId === step.id}
                  className="w-full text-left px-3 py-1 text-[11px] text-foreground hover:bg-secondary disabled:opacity-40 flex items-center gap-2 transition-colors"
                >
                  <Layers className="w-3 h-3 text-muted-foreground" />
                  {idx + 1}. {step.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="border-t border-border/50 my-1" />
      <button
        onClick={handleDelete}
        className="w-full text-left px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
      >
        <Trash2 className="w-3 h-3" /> Delete
      </button>
    </div>
  );
}
