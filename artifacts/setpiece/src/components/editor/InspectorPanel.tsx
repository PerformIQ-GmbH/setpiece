import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore } from './editorStore';
import { ANNOTATION_COLORS } from './types';
import type { Annotation, EntityMarker } from './types';
import { cn } from '@/lib/utils';
import { Users, Layers, Trash2, Copy, Plus, ChevronDown, ChevronRight, ArrowLeft, UserRound, Info, Search, X, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardHealth } from './BoardHealth';
import { BADGE_STYLES, ROLE_CLASS_LABELS } from '@/lib/roleSuitability';
import { useGetSetPieceRoleSuggestions, type RoleEvaluation } from '@workspace/api-client-react';
import type { SuitabilityBadge } from '@/lib/roleSuitability';

interface RoleData {
  id: string;
  name: string;
  description?: string | null;
  coachingPoint?: string | null;
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
  speed?: number | null;
  headingStrength?: number | null;
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
  onDuplicateRole: (roleId: string) => void;
  onRenameRole: (roleId: string, newName: string) => void;
  onUpdateRoleField?: (roleId: string, field: string, value: string) => void;
  onAddRole: () => void;
  forceVisible?: boolean;
  /** Optional — when provided, the Inspector can fetch server-side role-fit. */
  teamId?: string;
  setPieceId?: string;
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = true, children }: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] hover:text-white transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        {title}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function PlayerCombobox({ players, assignments, roles, currentRoleId, value, onChange, teamId, setPieceId }: {
  players?: PlayerData[];
  assignments: AssignmentData[];
  roles: RoleData[];
  currentRoleId: string;
  value: string;
  onChange: (playerId: string) => void;
  teamId?: string;
  setPieceId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Server-driven fit data for the *current* role. Lazily fetched the first
  // time the user opens the combobox so we don't hammer the API on render.
  const suggest = useGetSetPieceRoleSuggestions();
  const [fitByPlayer, setFitByPlayer] = useState<Map<string, { score: number; badge: SuitabilityBadge }>>(new Map());
  const fetchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !teamId || !setPieceId) return;
    const key = `${teamId}|${setPieceId}|${currentRoleId}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    suggest.mutate(
      { teamId, setPieceId, data: {} },
      {
        onSuccess: (res) => {
          const role = res.roles.find(r => r.roleId === currentRoleId);
          const map = new Map<string, { score: number; badge: SuitabilityBadge }>();
          if (role) {
            for (const c of role.candidates) map.set(c.playerId, { score: c.score, badge: c.badge });
          }
          setFitByPlayer(map);
        },
        onError: () => { fetchedRef.current = null; },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teamId, setPieceId, currentRoleId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  const selectedPlayer = value ? players?.find(p => p.id === value) : null;

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    const q = search.toLowerCase();
    const matches = players.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const num = String(p.shirtNumber ?? '');
      return fullName.includes(q) || num.includes(q);
    });
    if (fitByPlayer.size === 0) return matches;
    // Sort by server fit score (desc); unscored players keep original order.
    return [...matches].sort((a, b) => {
      const sa = fitByPlayer.get(a.id)?.score ?? -1;
      const sb = fitByPlayer.get(b.id)?.score ?? -1;
      return sb - sa;
    });
  }, [players, search, fitByPlayer]);

  const getAssignedRoleName = (playerId: string): string | null => {
    const a = assignments.find(a => a.playerId === playerId && a.roleId !== currentRoleId);
    if (!a) return null;
    const role = roles.find(r => r.id === a.roleId);
    return role?.name ?? 'eine andere Rolle';
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={triggerRef}
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
          <span className="flex-1">Noch nicht zugewiesen</span>
        )}
        {selectedPlayer && (
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
            aria-label="Spielerzuweisung entfernen"
            className="-m-1 p-1.5 text-muted-foreground hover:text-red-400 transition-colors touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-card border border-border rounded-lg shadow-xl max-h-56 flex flex-col"
          style={dropdownPos ? { top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width } : undefined}
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name oder Nummer suchen …"
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
              Noch nicht zugewiesen
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
                  {(() => {
                    const fit = fitByPlayer.get(p.id);
                    if (!fit) return null;
                    const style = BADGE_STYLES[fit.badge];
                    return (
                      <span
                        className={cn('flex items-center gap-1 px-1.5 py-px rounded-full border text-[8px] font-bold uppercase tracking-wider shrink-0', style.bg, style.text, style.ring)}
                        title={`${style.label} · ${fit.score}/100`}
                      >
                        <span className={cn('w-1 h-1 rounded-full', style.dot)} />
                        {style.label}
                        <span className="opacity-70 font-mono">{fit.score}</span>
                      </span>
                    );
                  })()}
                  {p.status === 'injured' && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">Verletzt</span>
                  )}
                  {p.status === 'suspended' && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">Susp.</span>
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
        </div>,
        document.body
      )}
    </div>
  );
}

export function InspectorPanel({
  roles, assignments, players, activeRoleId,
  onRoleClick, onAssignPlayer, onAssignBackup, onDeleteRole, onDuplicateRole, onRenameRole, onUpdateRoleField, onAddRole,
  forceVisible, teamId, setPieceId,
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
    <aside data-tutorial="inspector" className="flex flex-col h-full">
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
          onDuplicateRole={() => onDuplicateRole(activeRoleId)}
          onRenameRole={(newName) => onRenameRole(activeRoleId, newName)}
          onUpdateRoleField={onUpdateRoleField ? (field, value) => onUpdateRoleField(activeRoleId, field, value) : undefined}
          onBack={() => onRoleClick(activeRoleId)}
          teamId={teamId}
          setPieceId={setPieceId}
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
          onDuplicateRole={onDuplicateRole}
          onAddRole={onAddRole}
          teamId={teamId}
          setPieceId={setPieceId}
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

function RoleMarkerInspector({ role, assignment, player, linkedAnnotations, players, assignments, roles, activeRoleId, onAssignPlayer, onAssignBackup, onDeleteRole, onDuplicateRole, onRenameRole, onUpdateRoleField, onBack, teamId, setPieceId }: {
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
  onDuplicateRole: () => void;
  onRenameRole: (newName: string) => void;
  onUpdateRoleField?: (field: string, value: string) => void;
  onBack: () => void;
  teamId?: string;
  setPieceId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(role.name);
  const [editDescription, setEditDescription] = useState(role.description || '');
  const [editCoachingPoint, setEditCoachingPoint] = useState(role.coachingPoint || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditName(role.name); }, [role.name]);
  useEffect(() => { setEditDescription(role.description || ''); }, [role.description]);
  useEffect(() => { setEditCoachingPoint(role.coachingPoint || ''); }, [role.coachingPoint]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commitDescription = () => {
    const trimmed = editDescription.trim();
    if (trimmed !== (role.description || '')) {
      onUpdateRoleField?.('description', trimmed);
    }
  };

  const commitCoachingPoint = () => {
    const trimmed = editCoachingPoint.trim();
    if (trimmed !== (role.coachingPoint || '')) {
      onUpdateRoleField?.('coachingPoint', trimmed);
    }
  };

  const commitRename = () => {
    const trimmed = editName.trim();
    setEditing(false);
    if (trimmed && trimmed !== role.name) {
      onRenameRole(trimmed);
    } else {
      setEditName(role.name);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-white transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className={cn(
            "w-9 h-9 rounded-xl border-2 flex items-center justify-center shrink-0",
            assignment ? "bg-emerald-700/50 border-emerald-500/50" : "bg-white/[0.04] border-white/10 border-dashed",
          )}>
            {assignment ? (
              <UserRound className="w-4 h-4 text-white" />
            ) : (
              <span className="text-muted-foreground text-xs font-bold">?</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditName(role.name); setEditing(false); } }}
                className="font-display font-bold text-sm text-white bg-white/[0.06] border border-primary rounded-lg px-2 py-1 outline-none w-full max-w-[160px]"
                maxLength={100}
              />
            ) : (
              <h2
                className="font-display font-bold text-sm text-white cursor-text hover:text-primary transition-colors truncate"
                onClick={() => setEditing(true)}
                title="Click to rename"
              >{role.name}</h2>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">{assignment ? 'Assigned' : 'Noch nicht zugewiesen'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 ml-11">
          <Button size="sm" variant="ghost" onClick={onDuplicateRole} className="h-7 text-muted-foreground hover:text-white text-[10px] gap-1" title="Rolle duplizieren">
            <Copy className="w-3 h-3" /> Duplicate
          </Button>
          <Button size="sm" variant="ghost" onClick={onDeleteRole} className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[10px] gap-1">
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection title="Assignment" icon={Users}>
          <PlayerCombobox
            players={players}
            assignments={assignments}
            roles={roles}
            currentRoleId={activeRoleId}
            value={assignment?.playerId || ''}
            onChange={onAssignPlayer}
            teamId={teamId}
            setPieceId={setPieceId}
          />
          {!assignment && (
            <p className="text-[9px] text-amber-300 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Assign a squad player to this role
            </p>
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
            teamId={teamId}
            setPieceId={setPieceId}
          />
          <p className="text-[9px] text-muted-foreground mt-2">Optional substitute if primary player is unavailable</p>
        </CollapsibleSection>

        {onUpdateRoleField && (
          <CollapsibleSection title="Tactical Notes" defaultOpen={!!(role.description || role.coachingPoint)}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Task / Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onBlur={commitDescription}
                  placeholder="What should this player do?"
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 resize-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Coaching Point</label>
                <textarea
                  value={editCoachingPoint}
                  onChange={(e) => setEditCoachingPoint(e.target.value)}
                  onBlur={commitCoachingPoint}
                  placeholder="Key instruction for the player"
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 resize-none transition-all"
                />
                <p className="text-[9px] text-muted-foreground">Shown to the player in the quiz and matchday pack</p>
              </div>
            </div>
          </CollapsibleSection>
        )}

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
                  <span className="text-[9px] text-red-400 font-medium">Verletzt</span>
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

        {teamId && setPieceId && (
          <RoleFitSection
            teamId={teamId}
            setPieceId={setPieceId}
            roleId={role.id}
            currentPlayerId={assignment?.playerId ?? null}
            players={players}
            onAssignPlayer={onAssignPlayer}
          />
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

/**
 * Server-driven role-fit panel. Calls
 * POST /teams/:teamId/set-pieces/:setPieceId/role-suggestions and shows the
 * current player's fit + Top 3 alternative players for this role. The server
 * is the single source of truth for scoring — no client-side engine.
 */
function RoleFitSection({
  teamId, setPieceId, roleId, currentPlayerId, players, onAssignPlayer,
}: {
  teamId: string;
  setPieceId: string;
  roleId: string;
  currentPlayerId: string | null;
  players?: PlayerData[];
  onAssignPlayer: (playerId: string) => void;
}) {
  const playersById = useMemo(() => new Map((players ?? []).map(p => [p.id, p])), [players]);
  const suggest = useGetSetPieceRoleSuggestions();
  const [data, setData] = useState<RoleEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever the role, set piece, or current assignment changes.
  // playerIds is omitted so the server uses the full active squad.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setData(null);
    suggest.mutate(
      { teamId, setPieceId, data: {} },
      {
        onSuccess: (res) => {
          if (cancelled) return;
          const r = res.roles.find(x => x.roleId === roleId) ?? null;
          setData(r);
        },
        onError: (err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Could not load suggestions');
        },
      },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, setPieceId, roleId, currentPlayerId]);

  const currentBadge = data?.currentBadge ? BADGE_STYLES[data.currentBadge] : null;
  const classLabel = data ? (ROLE_CLASS_LABELS[data.primaryClass] ?? data.primaryClass) : '';

  // Top alternatives: exclude the current player; cap at 3.
  const alternatives = useMemo(() => {
    if (!data) return [];
    return data.candidates
      .filter(c => c.playerId !== currentPlayerId)
      .slice(0, 3);
  }, [data, currentPlayerId]);

  const bestAlternative = alternatives[0] ?? null;
  const isLoading = suggest.isPending && !data;

  return (
    <CollapsibleSection title="Role Fit" icon={Sparkles} defaultOpen>
      <div className="space-y-3 p-2.5 rounded-xl bg-background border border-border" data-testid={`role-fit-${roleId}`}>
        {isLoading && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring this role…
          </div>
        )}
        {error && !isLoading && (
          <p className="text-[11px] text-red-300">{error}</p>
        )}

        {data && !isLoading && (
          <>
            {/* Current assignment fit */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{classLabel}</span>
              </div>
              {currentPlayerId && currentBadge && data.currentScore != null ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider', currentBadge.bg, currentBadge.text, currentBadge.ring)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', currentBadge.dot)} />
                    {currentBadge.label} · {data.currentScore}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No player assigned yet.</p>
              )}
              {data.currentReasons.slice(0, 2).map((r, i) => (
                <p key={`r-${i}`} className="text-[10px] text-emerald-400/90 leading-snug">+ {r}</p>
              ))}
              {data.currentCautions.slice(0, 2).map((c, i) => (
                <p key={`c-${i}`} className="text-[10px] text-amber-300/90 leading-snug">! {c}</p>
              ))}
            </div>

            {/* Top 3 alternatives */}
            {alternatives.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top alternatives</span>
                  {bestAlternative && bestAlternative.playerId !== currentPlayerId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAssignPlayer(bestAlternative.playerId)}
                      className="h-6 px-2 text-[10px] text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                      data-testid={`assign-best-${roleId}`}
                    >
                      <Wand2 className="w-3 h-3 mr-1" /> Assign best
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {alternatives.map(c => {
                    const p = playersById.get(c.playerId);
                    const style = BADGE_STYLES[c.badge];
                    return (
                      <button
                        key={c.playerId}
                        onClick={() => onAssignPlayer(c.playerId)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left"
                        data-testid={`alt-${roleId}-${c.playerId}`}
                      >
                        {p?.shirtNumber && <span className="font-mono text-[10px] text-muted-foreground">#{p.shirtNumber}</span>}
                        <span className="text-[11px] text-white truncate flex-1 min-w-0">
                          {p ? `${p.firstName} ${p.lastName}` : 'Unknown player'}
                        </span>
                        <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider shrink-0', style.bg, style.text, style.ring)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                          {c.score}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {alternatives.length === 0 && currentPlayerId && (
              <p className="text-[10px] text-muted-foreground pt-1">No stronger alternatives in the squad.</p>
            )}
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}

function RolesPanel({ roles, assignments, players, activeRoleId, onRoleClick, onAssignPlayer, onDeleteRole, onDuplicateRole, onAddRole, teamId, setPieceId }: {
  roles: RoleData[];
  assignments: AssignmentData[];
  players?: PlayerData[];
  activeRoleId: string | null;
  onRoleClick: (id: string) => void;
  onAssignPlayer: (roleId: string, playerId: string) => void;
  onDeleteRole: (roleId: string) => void;
  onDuplicateRole: (roleId: string) => void;
  onAddRole: () => void;
  teamId?: string;
  setPieceId?: string;
}) {
  return (
    <>
      <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex justify-between items-center">
        <h2 className="font-display font-bold text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Rollen <span className="text-muted-foreground font-normal">({roles.length})</span>
        </h2>
        <Button size="sm" variant="outline" onClick={onAddRole} className="h-7 text-xs rounded-lg">
          <Plus className="w-3.5 h-3.5 mr-1" /> Hinzufügen
        </Button>
      </div>

      <BoardHealth roles={roles} assignments={assignments} players={players} teamId={teamId} setPieceId={setPieceId} />

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {roles.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <UserRound className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-white font-semibold mb-1">Noch keine Rollen</p>
            <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
              Füge eine Rolle hinzu oder platziere mit dem Spieler-Werkzeug die erste Rolle auf dem Feld.
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
                "p-3 rounded-xl border transition-all cursor-pointer",
                isActive ? "bg-primary/[0.08] border-primary/40 shadow-md shadow-primary/10" : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
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
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateRole(role.id); }}
                    className="text-muted-foreground hover:text-white p-0.5"
                    title="Rolle duplizieren"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteRole(role.id); }}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <PlayerCombobox
                  players={players}
                  assignments={assignments}
                  roles={roles}
                  currentRoleId={role.id}
                  value={assignment?.playerId || ''}
                  onChange={(playerId) => onAssignPlayer(role.id, playerId)}
                  teamId={teamId}
                  setPieceId={setPieceId}
                />
                {!assignment && (
                  <div className="flex items-center gap-1 mt-1 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[8px] text-amber-300 font-medium">Noch nicht zugewiesen</span>
                  </div>
                )}
                {assignedPlayer && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assignedPlayer.shirtNumber && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">#{assignedPlayer.shirtNumber}</span>
                    )}
                    {assignedPlayer.status === 'injured' && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Verletzt</span>
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
