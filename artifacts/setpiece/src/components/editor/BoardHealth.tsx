import { useMemo, useState } from 'react';
import { useEditorStore } from './editorStore';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

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
  status?: string | null;
}

type Severity = 'green' | 'amber' | 'red';

interface HealthIssue {
  severity: Severity;
  message: string;
  roleId?: string;
}

interface BoardHealthProps {
  roles: RoleData[];
  assignments: AssignmentData[];
  players?: PlayerData[];
}

/**
 * Lightweight, structural board-health checks. Deliberately does NOT score
 * role/player fit — that belongs to the server engine and surfaces in the
 * Inspector's "Role Fit" panel via /set-pieces/:setPieceId/role-suggestions.
 */
function computeHealth(
  roles: RoleData[],
  assignments: AssignmentData[],
  annotations: { linkedRoleId?: string; type: string; points: { x: number; y: number }[] }[],
  players: PlayerData[],
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const playersById = new Map(players.map(p => [p.id, p]));

  for (const role of roles) {
    const assignment = assignments.find(a => a.roleId === role.id);
    if (!assignment) {
      issues.push({ severity: 'red', message: `"${role.name}" has no player assigned`, roleId: role.id });
      continue;
    }

    const player = playersById.get(assignment.playerId);
    if (!player) continue;

    const status = (player.status ?? '').toLowerCase();
    if (status === 'injured') {
      issues.push({ severity: 'red', message: `"${role.name}" is assigned to ${player.firstName} ${player.lastName} (injured)`, roleId: role.id });
      continue;
    }
    if (status === 'suspended') {
      issues.push({ severity: 'red', message: `"${role.name}" is assigned to ${player.firstName} ${player.lastName} (suspended)`, roleId: role.id });
      continue;
    }
    if (status === 'inactive') {
      issues.push({ severity: 'amber', message: `"${role.name}" is assigned to ${player.firstName} ${player.lastName} (inactive)`, roleId: role.id });
    }
  }

  for (const role of roles) {
    const hasPath = annotations.some(
      a => a.linkedRoleId === role.id && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
    );
    if (!hasPath) {
      issues.push({ severity: 'amber', message: `"${role.name}" has no movement path linked`, roleId: role.id });
    }
  }

  if (roles.length === 0) {
    issues.push({ severity: 'amber', message: 'No roles on the board yet' });
  }

  return issues;
}

export function BoardHealth({ roles, assignments, players }: BoardHealthProps) {
  const annotations = useEditorStore((s) => s.annotations);
  const [expanded, setExpanded] = useState(true);

  const issues = useMemo(
    () => computeHealth(roles, assignments, annotations, players ?? []),
    [roles, assignments, annotations, players],
  );

  const redCount = issues.filter(i => i.severity === 'red').length;
  const amberCount = issues.filter(i => i.severity === 'amber').length;

  const overallSeverity: Severity = redCount > 0 ? 'red' : amberCount > 0 ? 'amber' : 'green';

  const severityColors = {
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  const severityBg = {
    green: 'bg-emerald-500/10 border-emerald-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    red: 'bg-red-500/10 border-red-500/20',
  };

  const SeverityIcon = overallSeverity === 'green' ? CheckCircle2 : overallSeverity === 'amber' ? AlertTriangle : XCircle;

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors",
          severityColors[overallSeverity],
        )}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <SeverityIcon className="w-3.5 h-3.5" />
        Board Health
        {issues.length > 0 && (
          <span className={cn("ml-auto text-[9px] px-1.5 py-0.5 rounded border", severityBg[overallSeverity])}>
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </span>
        )}
        {issues.length === 0 && (
          <span className="ml-auto text-[9px] text-emerald-400/70">All clear</span>
        )}
      </button>

      {expanded && issues.length > 0 && (
        <div className="px-3 pb-2.5 space-y-1">
          {issues.map((issue, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] leading-snug",
                severityBg[issue.severity],
              )}
            >
              {issue.severity === 'red' ? (
                <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              )}
              <span className={severityColors[issue.severity]}>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && issues.length === 0 && (
        <div className="px-3 pb-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            All assigned roles have available players
          </div>
        </div>
      )}
    </div>
  );
}
