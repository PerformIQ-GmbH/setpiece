import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getListTeamsQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { platformAdminEndpoint } from '@/lib/platform-admin';
import { useConfirm } from '@/hooks/use-confirm';
import { tierLabel } from '@/lib/team-plan';

const pageSize = 20;
const roles: Record<string, string> = { head_coach: 'Cheftrainer', assistant_coach: 'Assistenztrainer', player: 'Spieler' };
const dateLabel = (date: string) => new Date(date).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });

type Grant = { tier: string; expiresAt: string | null; active: boolean };
type Team = {
  teamId: string;
  teamName: string;
  role: string;
  billingTier: string;
  effectiveTier: string;
  pilotExpiresAt: string | null;
  complimentaryAccess: Grant | null;
};
type Account = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  emailVerified: boolean;
  teams: Team[];
};

function AccessForm({ team, onSaved, onCancel }: {
  team: Team;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const confirm = useConfirm();
  const [tier, setTier] = useState(team.complimentaryAccess?.tier ?? 'solo_coach');
  const [duration, setDuration] = useState(team.complimentaryAccess?.active ? 'keep' : '30');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const validReason = reason.trim().length >= 3;

  async function submit(action: 'grant' | 'revoke') {
    if (!validReason || pending) return;
    setPending(true);
    setError('');
    try {
      if (action === 'revoke' && !(await confirm({
        title: 'Gratiszugang widerrufen?',
        description: `Für ${team.teamName} gelten danach wieder der reguläre Tarif und ein allfälliger aktiver Pilot.`,
        confirmText: 'Widerrufen', cancelText: 'Abbrechen', destructive: true,
      }))) return;

      let expiresAt: string | null = null;
      if (duration === 'keep') expiresAt = team.complimentaryAccess?.expiresAt ?? null;
      else if (duration !== 'unlimited') expiresAt = new Date(Date.now() + Number(duration) * 86_400_000).toISOString();
      const data = action === 'grant' ? { action, reason, tier, expiresAt } : { action, reason };
      const response = await fetch(`${platformAdminEndpoint}/teams/${encodeURIComponent(team.teamId)}/complimentary-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        setError(response.status === 403 ? 'Dir fehlt die Berechtigung für diese Änderung.'
          : 'Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.');
        return;
      }
      onSaved(action === 'grant' ? `Gratiszugang für ${team.teamName} gespeichert.` : `Gratiszugang für ${team.teamName} widerrufen.`);
    } catch {
      setError('Keine Verbindung. Bitte prüfe den Zugang vor einem erneuten Versuch.');
    } finally {
      setPending(false);
    }
  }

  return <form className="mt-4 space-y-4 border-t border-border pt-4" onSubmit={event => { event.preventDefault(); void submit('grant'); }}>
    <h3 className="font-semibold">Gratiszugang für {team.teamName}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor="grant-tier" className="text-sm font-medium">Tarif</label>
        <Select value={tier} onValueChange={setTier} disabled={pending}>
          <SelectTrigger id="grant-tier"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="solo_coach">Solo Coach</SelectItem><SelectItem value="team">Team</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="grant-duration" className="text-sm font-medium">Laufzeit</label>
        <Select value={duration} onValueChange={setDuration} disabled={pending}>
          <SelectTrigger id="grant-duration"><SelectValue /></SelectTrigger>
          <SelectContent>
            {team.complimentaryAccess?.active && <SelectItem value="keep">Bestehende Laufzeit behalten</SelectItem>}
            <SelectItem value="30">30 Tage ab heute</SelectItem><SelectItem value="90">90 Tage ab heute</SelectItem>
            <SelectItem value="365">365 Tage ab heute</SelectItem><SelectItem value="unlimited">Unbefristet</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="space-y-1.5">
      <label htmlFor="grant-reason" className="text-sm font-medium">Grund für die Änderung</label>
      <Input id="grant-reason" required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} disabled={pending} />
    </div>
    {error && <p role="alert" className="text-sm">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={pending || !validReason}>{pending ? 'Wird gespeichert …' : 'Zugang speichern'}</Button>
      {team.complimentaryAccess && <Button type="button" variant="outline" disabled={pending || !validReason} onClick={() => void submit('revoke')}>Widerrufen</Button>}
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>Abbrechen</Button>
    </div>
  </form>;
}

export function UserAdmin() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ q: '', offset: 0 });
  const [selectedTeam, setSelectedTeam] = useState<string>();
  const [notice, setNotice] = useState('');
  const users = useQuery({
    queryKey: ['platform-admin', 'users', filters],
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q: filters.q, offset: String(filters.offset) });
      const response = await fetch(`${platformAdminEndpoint}/users?${params}`, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Benutzer konnten nicht geladen werden.');
      return await response.json() as { users: Account[]; hasMore: boolean };
    },
  });
  const changeFilters = (q: string, offset: number) => {
    setSelectedTeam(undefined);
    setNotice('');
    setFilters({ q, offset });
  };
  const searchUsers = (event: FormEvent) => {
    event.preventDefault();
    changeFilters(search.trim(), 0);
  };

  return <div className="space-y-5">
        <form onSubmit={searchUsers} className="space-y-2">
          <label htmlFor="admin-search" className="text-sm font-medium">Name oder E-Mail</label>
          <div className="flex gap-2">
            <Input id="admin-search" type="search" value={search} maxLength={254} onChange={event => setSearch(event.target.value)} />
            <Button type="submit" variant="outline">Suchen</Button>
          </div>
        </form>
        {notice && <p role="status" className="rounded-lg bg-primary/10 p-3">{notice}</p>}
        {users.isPending && <p role="status">Benutzer werden geladen …</p>}
        {users.isError && <p role="alert">{users.error.message} <Button variant="link" onClick={() => void users.refetch()}>Erneut laden</Button></p>}
        {users.data?.users.length === 0 && <p>Keine Benutzer gefunden.</p>}
        {users.data?.users.map(user => <article key={user.id} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div>
            <h2 className="font-semibold">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Konto ohne Namen'}</h2>
            <p className="break-all text-sm text-muted-foreground">{user.email ?? 'Keine E-Mail'} · {user.emailVerified ? 'Bestätigt' : 'Unbestätigt'}</p>
          </div>
          {user.teams.length === 0 && <p className="text-sm text-muted-foreground">Noch keinem Team zugeordnet.</p>}
          {user.teams.map(team => {
            const key = `${user.id}/${team.teamId}`;
            const grant = team.complimentaryAccess;
            return <div key={team.teamId} className="rounded-lg border border-border bg-background/40 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{team.teamName} · {roles[team.role] ?? team.role}</p>
                  <p className="text-muted-foreground">Aktiv {tierLabel(team.effectiveTier)} · Regulär {tierLabel(team.billingTier)}</p>
                  {grant && <p>Gratiszugang {tierLabel(grant.tier)} · {grant.active
                    ? (grant.expiresAt ? `bis ${dateLabel(grant.expiresAt)}` : 'unbefristet')
                    : 'abgelaufen'}</p>}
                  {team.pilotExpiresAt && new Date(team.pilotExpiresAt) > new Date() && <p>Solo-Coach-Pilot bis {dateLabel(team.pilotExpiresAt)}</p>}
                </div>
                {selectedTeam === undefined && <Button type="button" size="sm" variant="outline" onClick={() => setSelectedTeam(key)}>
                  {grant ? 'Gratiszugang bearbeiten' : 'Gratiszugang vergeben'}
                </Button>}
              </div>
              {selectedTeam === key && <AccessForm team={team} onCancel={() => setSelectedTeam(undefined)} onSaved={message => {
                setSelectedTeam(undefined);
                setNotice(message);
                void queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users'] });
                void queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
              }} />}
            </div>;
          })}
        </article>)}
        {(filters.offset > 0 || users.data?.hasMore) && <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={filters.offset === 0 || users.isFetching} onClick={() => changeFilters(filters.q, filters.offset - pageSize)}>Zurück</Button>
          <Button variant="outline" disabled={!users.data?.hasMore || users.isFetching} onClick={() => changeFilters(filters.q, filters.offset + pageSize)}>Weiter</Button>
        </div>}
  </div>;
}
