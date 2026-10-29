export interface RoleData {
  id: string;
  name: string;
  description?: string | null;
  coachingPoint?: string | null;
  startPosition?: { x?: number | null; y?: number | null } | null;
}

export interface AssignmentData {
  roleId: string;
  playerId: string;
  backupPlayerId?: string | null;
}

export interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  shirtNumber?: number | null;
  status?: string | null;
}

export type Severity = 'green' | 'amber' | 'red';

export interface HealthIssue {
  severity: Severity;
  message: string;
  roleId?: string;
}

export function computeStructural(
  roles: RoleData[],
  assignments: AssignmentData[],
  players: PlayerData[],
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const playersById = new Map(players.map(p => [p.id, p]));

  for (const role of roles) {
    const assignment = assignments.find(a => a.roleId === role.id);
    if (!assignment) {
      issues.push({ severity: 'red', message: `"${role.name}" hat noch keinen Spieler`, roleId: role.id });
      continue;
    }

    const player = playersById.get(assignment.playerId);
    if (!player) continue;

    const status = (player.status ?? '').toLowerCase();
    if (status === 'injured') {
      issues.push({ severity: 'red', message: `"${role.name}" ist zugewiesen an ${player.firstName} ${player.lastName} (verletzt)`, roleId: role.id });
      continue;
    }
    if (status === 'suspended') {
      issues.push({ severity: 'red', message: `"${role.name}" ist zugewiesen an ${player.firstName} ${player.lastName} (gesperrt)`, roleId: role.id });
      continue;
    }
    if (status === 'inactive') {
      issues.push({ severity: 'amber', message: `"${role.name}" ist zugewiesen an ${player.firstName} ${player.lastName} (inaktiv)`, roleId: role.id });
    }
  }

  if (roles.length === 0) {
    issues.push({ severity: 'amber', message: 'Füge die erste Rolle hinzu.' });
  }

  return issues;
}

