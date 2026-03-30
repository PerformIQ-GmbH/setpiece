import { useEditorStore } from './editorStore';
import { ANNOTATION_COLORS } from './types';
import type { Annotation, EntityMarker } from './types';
import { cn } from '@/lib/utils';
import { Users, Layers, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleData {
  id: string;
  name: string;
  startPosition?: { x?: number | null; y?: number | null } | null;
}

interface AssignmentData {
  roleId: string;
  playerId: string;
}

interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  shirtNumber?: number | null;
  dominantFoot?: string | null;
  height?: number | null;
  status?: string | null;
  tags?: string[] | null;
}

interface InspectorPanelProps {
  roles: RoleData[];
  assignments: AssignmentData[];
  players?: PlayerData[];
  activeRoleId: string | null;
  onRoleClick: (id: string) => void;
  onAssignPlayer: (roleId: string, playerId: string) => void;
  onDeleteRole: (roleId: string) => void;
  onAddRole: () => void;
}

export function InspectorPanel({
  roles, assignments, players, activeRoleId,
  onRoleClick, onAssignPlayer, onDeleteRole, onAddRole,
}: InspectorPanelProps) {
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const annotations = useEditorStore((s) => s.annotations);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation);

  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const entities = useEditorStore((s) => s.entities);
  const updateEntity = useEditorStore((s) => s.updateEntity);
  const deleteEntity = useEditorStore((s) => s.deleteEntity);

  const selectedAnn = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : null;
  const selectedEnt = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  const showAnnotationInspector = selectedAnn != null;
  const showEntityInspector = selectedEnt != null;

  return (
    <aside className="w-72 md:w-80 border-l border-border bg-card/60 backdrop-blur-md flex flex-col h-full shrink-0">
      {showAnnotationInspector && selectedAnn ? (
        <AnnotationInspector
          annotation={selectedAnn}
          onUpdate={(updates) => updateAnnotation(selectedAnn.id, updates)}
          onDelete={() => deleteAnnotation(selectedAnn.id)}
          roles={roles}
        />
      ) : showEntityInspector && selectedEnt ? (
        <EntityInspector
          entity={selectedEnt}
          onUpdate={(updates) => updateEntity(selectedEnt.id, updates)}
          onDelete={() => deleteEntity(selectedEnt.id)}
        />
      ) : activeRoleId ? (
        <RoleMarkerInspector
          role={roles.find(r => r.id === activeRoleId)!}
          assignment={assignments.find(a => a.roleId === activeRoleId)}
          player={(() => { const a = assignments.find(a => a.roleId === activeRoleId); return a ? players?.find(p => p.id === a.playerId) : undefined; })()}
          linkedAnnotations={annotations.filter(a => a.linkedRoleId === activeRoleId)}
          players={players}
          onAssignPlayer={(playerId) => onAssignPlayer(activeRoleId, playerId)}
          onDeleteRole={() => onDeleteRole(activeRoleId)}
          onBack={() => onRoleClick(activeRoleId)}
        />
      ) : (
        <RolesPanel
          roles={roles}
          assignments={assignments}
          players={players}
          activeRoleId={activeRoleId}
          onRoleClick={onRoleClick}
          onAssignPlayer={onAssignPlayer}
          onDeleteRole={onDeleteRole}
          onAddRole={onAddRole}
        />
      )}
    </aside>
  );
}

function AnnotationInspector({ annotation, onUpdate, onDelete, roles }: {
  annotation: Annotation;
  onUpdate: (updates: Partial<Annotation>) => void;
  onDelete: () => void;
  roles?: RoleData[];
}) {
  const typeLabels: Record<string, string> = {
    run_path: 'Run Path',
    curved_run: 'Curved Run',
    pass_line: 'Pass Line',
    curved_cross: 'Curved Cross',
    zone_circle: 'Circle Zone',
    zone_rect: 'Rectangle Zone',
    label: 'Text Label',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex justify-between items-center">
        <h2 className="font-display font-bold text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> {typeLabels[annotation.type] || annotation.type}
        </h2>
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {annotation.type === 'label' && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Text</label>
            <input
              value={annotation.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Color</label>
          <div className="flex flex-wrap gap-1.5">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onUpdate({ color: c })}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all",
                  annotation.color === c ? "border-white scale-110" : "border-transparent hover:border-white/40"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {!['label', 'zone_circle', 'zone_rect'].includes(annotation.type) && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Line Style</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate({ dashed: false })}
                  className={cn("flex-1 py-1.5 rounded border text-xs font-semibold transition-all",
                    !annotation.dashed ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-muted-foreground")}
                >
                  Solid
                </button>
                <button
                  onClick={() => onUpdate({ dashed: true })}
                  className={cn("flex-1 py-1.5 rounded border text-xs font-semibold transition-all",
                    annotation.dashed ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-muted-foreground")}
                >
                  Dashed
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Arrowhead</label>
              <button
                onClick={() => onUpdate({ arrowhead: !annotation.arrowhead })}
                className={cn("px-3 py-1.5 rounded border text-xs font-semibold transition-all",
                  annotation.arrowhead ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-muted-foreground")}
              >
                {annotation.arrowhead ? 'On' : 'Off'}
              </button>
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Thickness</label>
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={annotation.strokeWidth}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        {roles && roles.length > 0 && (annotation.type === 'run_path' || annotation.type === 'curved_run') && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linked Role</label>
            <select
              value={annotation.linkedRoleId || ''}
              onChange={(e) => onUpdate({ linkedRoleId: e.target.value || undefined })}
              className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">None (auto-assign)</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-[9px] text-muted-foreground">Player animates along this path</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleMarkerInspector({ role, assignment, player, linkedAnnotations, players, onAssignPlayer, onDeleteRole, onBack }: {
  role: RoleData;
  assignment?: AssignmentData;
  player?: PlayerData;
  linkedAnnotations: Annotation[];
  players?: PlayerData[];
  onAssignPlayer: (playerId: string) => void;
  onDeleteRole: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-white">
            <Layers className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-display font-bold text-sm text-white">{role.name}</h2>
            <p className="text-[9px] text-muted-foreground">Team Player Marker</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onDeleteRole} className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assigned Player</label>
          <select
            value={assignment?.playerId || ''}
            onChange={(e) => onAssignPlayer(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">Unassigned</option>
            {players?.map(p => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.shirtNumber ? `(#${p.shirtNumber})` : ''}</option>
            ))}
          </select>
        </div>

        {player && (
          <div className="space-y-2 p-2.5 rounded-xl bg-background border border-border">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player Details</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="text-white font-medium">{player.firstName} {player.lastName}</p>
              </div>
              {player.shirtNumber && (
                <div>
                  <span className="text-muted-foreground">Shirt</span>
                  <p className="text-primary font-bold">#{player.shirtNumber}</p>
                </div>
              )}
              {player.dominantFoot && (
                <div>
                  <span className="text-muted-foreground">Foot</span>
                  <p className="text-white">{player.dominantFoot}</p>
                </div>
              )}
              {player.height && (
                <div>
                  <span className="text-muted-foreground">Height</span>
                  <p className="text-white">{player.height}cm</p>
                </div>
              )}
            </div>
            {player.status === 'injured' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                <span className="text-[9px] text-red-400 font-medium">Injured</span>
              </div>
            )}
            {player.tags && player.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {player.tags.map(tag => (
                  <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Position</label>
          <p className="text-[11px] text-white">x: {(role.startPosition?.x ?? 50).toFixed(1)}% &nbsp; y: {(role.startPosition?.y ?? 50).toFixed(1)}%</p>
        </div>

        {linkedAnnotations.length > 0 && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linked Paths ({linkedAnnotations.length})</label>
            {linkedAnnotations.map(a => (
              <div key={a.id} className="text-[10px] text-muted-foreground flex items-center gap-1.5 py-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.type === 'run_path' ? 'Run Path' : 'Curved Run'} ({a.points.length} pts)
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntityInspector({ entity, onUpdate, onDelete }: {
  entity: EntityMarker;
  onUpdate: (updates: Partial<EntityMarker>) => void;
  onDelete: () => void;
}) {
  const typeLabels = { opponent: 'Opponent', goalkeeper: 'Goalkeeper', ball: 'Ball' };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex justify-between items-center">
        <h2 className="font-display font-bold text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> {typeLabels[entity.type]}
        </h2>
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {entity.type !== 'ball' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Shirt Number</label>
              <input
                type="number"
                min={1}
                max={99}
                value={entity.shirtNumber ?? ''}
                onChange={(e) => onUpdate({ shirtNumber: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Label</label>
              <input
                value={entity.label || ''}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RolesPanel({ roles, assignments, players, activeRoleId, onRoleClick, onAssignPlayer, onDeleteRole, onAddRole }: {
  roles: RoleData[];
  assignments: AssignmentData[];
  players?: PlayerData[];
  activeRoleId: string | null;
  onRoleClick: (id: string) => void;
  onAssignPlayer: (roleId: string, playerId: string) => void;
  onDeleteRole: (roleId: string) => void;
  onAddRole: () => void;
}) {
  return (
    <>
      <div className="p-3 border-b border-border flex justify-between items-center">
        <h2 className="font-display font-bold text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Roles ({roles.length})
        </h2>
        <Button size="sm" variant="outline" onClick={onAddRole} className="border-border h-7 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {roles.map((role) => {
          const assignment = assignments.find(a => a.roleId === role.id);
          const isActive = role.id === activeRoleId;
          const assignedPlayer = assignment ? players?.find(p => p.id === assignment.playerId) : null;

          return (
            <div
              key={role.id}
              className={cn(
                "p-2.5 rounded-xl border transition-all cursor-pointer",
                isActive ? "bg-primary/10 border-primary/50 shadow-md shadow-primary/10" : "bg-background border-border hover:border-muted-foreground/50"
              )}
              onClick={() => onRoleClick(role.id)}
            >
              <div className="flex justify-between items-start mb-1.5">
                <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                  {role.name}
                </h3>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteRole(role.id); }}
                  className="text-muted-foreground hover:text-destructive p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <select
                  className="w-full bg-secondary border border-border rounded-lg px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary"
                  value={assignment?.playerId || ''}
                  onChange={(e) => onAssignPlayer(role.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {players?.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.shirtNumber ? `(#${p.shirtNumber})` : ''}</option>
                  ))}
                </select>
                {!assignment && (
                  <div className="flex items-center gap-1 mt-1 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[8px] text-amber-300 font-medium">Unassigned</span>
                  </div>
                )}
                {assignedPlayer && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assignedPlayer.shirtNumber && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">#{assignedPlayer.shirtNumber}</span>
                    )}
                    {assignedPlayer.status === 'injured' && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Injured</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
