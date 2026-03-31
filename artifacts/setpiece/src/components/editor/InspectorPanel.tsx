import { useState, useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from './editorStore';
import { ANNOTATION_COLORS } from './types';
import type { Annotation, EntityMarker } from './types';
import { cn } from '@/lib/utils';
import { Users, Layers, Trash2, Plus, ChevronDown, ChevronRight, ArrowLeft, UserRound, Info, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardHealth } from './BoardHealth';

interface RoleData {
  id: string;
  name: string;
  startPosition?: { x?: number | null; y?: number | null } | null;
}

interface AssignmentData {
  roleId: string;
  playerId: string;
  backupPlayerId?: string | null;
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
  onAssignBackup: (roleId: string, backupPlayerId: string) => void;
  onDeleteRole: (roleId: string) => void;
  onAddRole: () => void;
  forceVisible?: boolean;
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = true, children }: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        {title}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function PlayerCombobox({ players, assignments, roles, currentRoleId, value, onChange }: {
  players?: PlayerData[];
  assignments: AssignmentData[];
  roles: RoleData[];
  currentRoleId: string;
  value: string;
  onChange: (playerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedPlayer = value ? players?.find(p => p.id === value) : null;

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    const q = search.toLowerCase();
    return players.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const num = String(p.shirtNumber ?? '');
      return fullName.includes(q) || num.includes(q);
    });
  }, [players, search]);

  const getAssignedRoleName = (playerId: string): string | null => {
    const a = assignments.find(a => a.playerId === playerId && a.roleId !== currentRoleId);
    if (!a) return null;
    const role = roles.find(r => r.id === a.roleId);
    return role?.name ?? 'another role';
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => { setOpen(!open); setSearch(''); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={cn(
          "w-full bg-secondary border rounded-lg px-2 py-1.5 text-[11px] cursor-pointer flex items-center gap-1.5 transition-colors",
          open ? "border-primary" : "border-border hover:border-muted-foreground",
          !selectedPlayer && "text-muted-foreground",
        )}
      >
        {selectedPlayer ? (
          <span className="text-foreground flex-1 truncate">
            {selectedPlayer.shirtNumber ? `#${selectedPlayer.shirtNumber} ` : ''}{selectedPlayer.firstName} {selectedPlayer.lastName}
          </span>
        ) : (
          <span className="flex-1">Unassigned</span>
        )}
        {selectedPlayer && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
            className="text-muted-foreground hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-56 flex flex-col">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or #..."
              className="flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className={cn(
                "w-full text-left px-2 py-1.5 text-[11px] hover:bg-secondary transition-colors",
                !value ? "text-primary font-medium" : "text-muted-foreground",
              )}
            >
              Unassigned
            </button>
            {filteredPlayers.map(p => {
              const takenByRoleName = getAssignedRoleName(p.id);
              const isCurrent = p.id === value;
              const isTaken = !!takenByRoleName;

              return (
                <button
                  key={p.id}
                  onClick={() => { if (!isTaken || isCurrent) { onChange(p.id); setOpen(false); } }}
                  disabled={isTaken && !isCurrent}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-[11px] flex items-center gap-1.5 transition-colors",
                    isCurrent && "bg-primary/10 text-primary font-medium",
                    isTaken && !isCurrent && "opacity-40 cursor-not-allowed",
                    !isTaken && !isCurrent && "hover:bg-secondary text-foreground",
                  )}
                >
                  {p.shirtNumber && (
                    <span className={cn("font-mono text-[10px] w-5 text-right shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")}>
                      #{p.shirtNumber}
                    </span>
                  )}
                  <span className="truncate flex-1">{p.firstName} {p.lastName}</span>
                  {p.status === 'injured' && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">Injured</span>
                  )}
                  {isTaken && !isCurrent && (
                    <span className="text-[8px] text-muted-foreground shrink-0 truncate max-w-[80px]" title={`Taken by: ${takenByRoleName}`}>
                      {takenByRoleName}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredPlayers.length === 0 && (
              <div className="px-2 py-3 text-[11px] text-muted-foreground text-center">No players found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function InspectorPanel({
  roles, assignments, players, activeRoleId,
  onRoleClick, onAssignPlayer, onAssignBackup, onDeleteRole, onAddRole,
  forceVisible,
}: InspectorPanelProps) {
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const annotations = useEditorStore((s) => s.annotations);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation);
  const inspectorCollapsed = useEditorStore((s) => s.inspectorCollapsed);

  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const entities = useEditorStore((s) => s.entities);
  const updateEntity = useEditorStore((s) => s.updateEntity);
  const deleteEntity = useEditorStore((s) => s.deleteEntity);

  const selectedAnn = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : null;
  const selectedEnt = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  if (inspectorCollapsed && !forceVisible) return null;

  return (
    <aside data-tutorial="inspector" className="w-full md:w-72 lg:w-80 border-l border-border bg-card/60 backdrop-blur-md flex flex-col h-full shrink-0">
      {selectedAnn ? (
        <AnnotationInspector
          annotation={selectedAnn}
          onUpdate={(updates) => updateAnnotation(selectedAnn.id, updates)}
          onDelete={() => deleteAnnotation(selectedAnn.id)}
          roles={roles}
        />
      ) : selectedEnt ? (
        <EntityInspector
          entity={selectedEnt}
          onUpdate={(updates) => updateEntity(selectedEnt.id, updates)}
          onDelete={() => deleteEntity(selectedEnt.id)}
        />
      ) : activeRoleId && roles.find(r => r.id === activeRoleId) ? (
        <RoleMarkerInspector
          role={roles.find(r => r.id === activeRoleId)!}
          assignment={assignments.find(a => a.roleId === activeRoleId)}
          player={(() => { const a = assignments.find(a => a.roleId === activeRoleId); return a ? players?.find(p => p.id === a.playerId) : undefined; })()}
          linkedAnnotations={annotations.filter(a => a.linkedRoleId === activeRoleId)}
          players={players}
          assignments={assignments}
          roles={roles}
          activeRoleId={activeRoleId}
          onAssignPlayer={(playerId) => onAssignPlayer(activeRoleId, playerId)}
          onAssignBackup={(backupId) => onAssignBackup(activeRoleId, backupId)}
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
  const steps = useEditorStore((s) => s.steps);

  const typeLabels: Record<string, string> = {
    run_path: 'Run Path',
    curved_run: 'Curved Run',
    pass_line: 'Pass Line',
    curved_cross: 'Curved Cross',
    zone_circle: 'Circle Zone',
    zone_rect: 'Rectangle Zone',
    label: 'Text Label',
  };

  const semanticHint: Record<string, string> = {
    run_path: 'Dashed line showing player movement',
    curved_run: 'Curved dashed line for arcing runs',
    pass_line: 'Solid line representing a pass',
    curved_cross: 'Curved solid line for crosses',
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
      <div className="flex-1 overflow-y-auto">
        {semanticHint[annotation.type] && (
          <div className="mx-3 mt-3 flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <span className="text-[10px] text-primary/80 leading-snug">{semanticHint[annotation.type]}</span>
          </div>
        )}

        {annotation.type === 'label' && (
          <CollapsibleSection title="Text">
            <input
              value={annotation.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Color">
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
        </CollapsibleSection>

        {!['label', 'zone_circle', 'zone_rect'].includes(annotation.type) && (() => {
          const isSemantic = ['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(annotation.type);
          return (
            <CollapsibleSection title="Style">
              <div className="space-y-3">
                {isSemantic ? (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    <div className="text-[10px] text-primary/80 leading-snug">
                      <p className="font-medium">{annotation.dashed ? 'Dashed' : 'Solid'} • Arrowhead {annotation.arrowhead ? 'on' : 'off'}</p>
                      <p className="text-muted-foreground mt-0.5">Style locked by action type convention</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Line Style</label>
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
                      <label className="text-[10px] text-muted-foreground">Arrowhead</label>
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
                  <label className="text-[10px] text-muted-foreground">Thickness</label>
                  <input
                    type="range" min={1} max={8} step={0.5}
                    value={annotation.strokeWidth}
                    onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </CollapsibleSection>
          );
        })()}

        {(annotation.type === 'run_path' || annotation.type === 'curved_run' || annotation.type === 'pass_line' || annotation.type === 'curved_cross') && (
          <CollapsibleSection title="Ghost / Substitution">
            <div className="space-y-1">
              <button
                onClick={() => onUpdate({ ghost: !annotation.ghost })}
                className={cn("w-full py-1.5 rounded border text-xs font-semibold transition-all",
                  annotation.ghost ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "border-border text-muted-foreground hover:border-muted-foreground")}
              >
                {annotation.ghost ? 'Ghost Style Active' : 'Enable Ghost Style'}
              </button>
              <p className="text-[9px] text-muted-foreground">Blue translucent style for substitution movements</p>
            </div>
          </CollapsibleSection>
        )}

        {roles && roles.length > 0 && (annotation.type === 'run_path' || annotation.type === 'curved_run') && (
          <CollapsibleSection title="Link to Role">
            <div className="space-y-1">
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
          </CollapsibleSection>
        )}

        {steps.length > 1 && (
          <CollapsibleSection title="Animation Step">
            <div className="space-y-1">
              <select
                value={annotation.stepId || ''}
                onChange={(e) => onUpdate({ stepId: e.target.value || undefined })}
                className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
              >
                {steps.map((st, idx) => (
                  <option key={st.id} value={st.id}>{idx + 1}. {st.label}</option>
                ))}
              </select>
              <p className="text-[9px] text-muted-foreground">Which step this annotation plays in</p>
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

function RoleMarkerInspector({ role, assignment, player, linkedAnnotations, players, assignments, roles, activeRoleId, onAssignPlayer, onAssignBackup, onDeleteRole, onBack }: {
  role: RoleData;
  assignment?: AssignmentData;
  player?: PlayerData;
  linkedAnnotations: Annotation[];
  players?: PlayerData[];
  assignments: AssignmentData[];
  roles: RoleData[];
  activeRoleId: string;
  onAssignPlayer: (playerId: string) => void;
  onAssignBackup: (backupPlayerId: string) => void;
  onDeleteRole: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className={cn(
            "w-7 h-7 rounded-full border-2 flex items-center justify-center",
            assignment ? "bg-emerald-700 border-emerald-500" : "bg-gray-700 border-gray-500 border-dashed",
          )}>
            {assignment ? (
              <UserRound className="w-3.5 h-3.5 text-white" />
            ) : (
              <span className="text-gray-400 text-xs font-bold">?</span>
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-white">{role.name}</h2>
            <p className="text-[9px] text-muted-foreground">{assignment ? 'Assigned' : 'Unassigned'}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onDeleteRole} className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection title="Assignment">
          <PlayerCombobox
            players={players}
            assignments={assignments}
            roles={roles}
            currentRoleId={activeRoleId}
            value={assignment?.playerId || ''}
            onChange={onAssignPlayer}
          />
          {!assignment && (
            <p className="text-[9px] text-amber-300 mt-1.5">Assign a squad player to this role</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Backup Player" defaultOpen={!!assignment?.backupPlayerId}>
          <PlayerCombobox
            players={players}
            assignments={assignments}
            roles={roles}
            currentRoleId={activeRoleId}
            value={assignment?.backupPlayerId || ''}
            onChange={onAssignBackup}
          />
          <p className="text-[9px] text-muted-foreground mt-1.5">Optional substitute if primary player is unavailable</p>
        </CollapsibleSection>

        {player && (
          <CollapsibleSection title="Player Details">
            <div className="space-y-2 p-2.5 rounded-xl bg-background border border-border">
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
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Position" defaultOpen={false}>
          <p className="text-[11px] text-white">x: {(role.startPosition?.x ?? 50).toFixed(1)}% &nbsp; y: {(role.startPosition?.y ?? 50).toFixed(1)}%</p>
        </CollapsibleSection>

        {linkedAnnotations.length > 0 && (
          <CollapsibleSection title={`Linked Paths (${linkedAnnotations.length})`} defaultOpen={false}>
            {linkedAnnotations.map(a => (
              <div key={a.id} className="text-[10px] text-muted-foreground flex items-center gap-1.5 py-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.type === 'run_path' ? 'Run Path' : 'Curved Run'} ({a.points.length} pts)
              </div>
            ))}
          </CollapsibleSection>
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
      <div className="flex-1 overflow-y-auto">
        {entity.type !== 'ball' ? (
          <>
            <CollapsibleSection title="Details">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Shirt Number</label>
                  <input
                    type="number" min={1} max={99}
                    value={entity.shirtNumber ?? ''}
                    onChange={(e) => onUpdate({ shirtNumber: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Label</label>
                  <input
                    value={entity.label || ''}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </CollapsibleSection>
          </>
        ) : (
          <div className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">Drag the ball to reposition it on the pitch.</p>
          </div>
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

      <BoardHealth roles={roles} assignments={assignments} />

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {roles.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <UserRound className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-white font-medium mb-1">No roles yet</p>
            <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
              Click "Add" or use the Team Player tool to place your first role on the pitch.
            </p>
          </div>
        )}
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
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    assignment ? (isActive ? "bg-primary animate-pulse" : "bg-primary") : "bg-amber-400 animate-pulse",
                  )} />
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
                <PlayerCombobox
                  players={players}
                  assignments={assignments}
                  roles={roles}
                  currentRoleId={role.id}
                  value={assignment?.playerId || ''}
                  onChange={(playerId) => onAssignPlayer(role.id, playerId)}
                />
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
