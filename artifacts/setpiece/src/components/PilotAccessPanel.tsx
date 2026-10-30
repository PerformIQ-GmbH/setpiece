import { useState } from 'react';
import type { Team } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';

export function PilotStatus({ team }: { team: Team }) {
  if (!team.pilotExpiresAt) return null;
  const active = new Date(team.pilotExpiresAt).getTime() > Date.now();
  const date = new Date(team.pilotExpiresAt).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
  return <p className="text-sm leading-relaxed text-muted-foreground">
    {active ? `Solo-Coach-Pilot kostenlos bis ${date}.` : `Dein kostenloser Pilot endete am ${date}.`}
    {' '}Der Pilot endet automatisch. Es wird kein kostenpflichtiges Abo abgeschlossen.
  </p>;
}

export function PilotAccessPanel({ team, onRedeemed }: { team: Team; onRedeemed: () => void }) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (!team.pilotAvailable) return null;
  if (team.pilotExpiresAt) return <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-5"><PilotStatus team={team} /></div>;
  if (team.tier !== 'free') return null;
  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/teams/${encodeURIComponent(team.id)}/pilot`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!response.ok) throw new Error(response.status === 403
        ? 'Nur der Besitzer eines kostenlosen Teams kann den Pilot aktivieren.'
        : response.status === 409 ? 'Der Code ist nicht verfügbar oder für dein Konto/Team wurde bereits ein Pilot eingelöst.'
        : 'Der Pilot konnte nicht aktiviert werden. Prüfe den Code und versuche es erneut.');
      setCode('');
      onRedeemed();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Verbindung fehlgeschlagen. Bitte versuche es erneut.'); }
    finally { setPending(false); }
  }
  return <section className="mb-6 rounded-xl border border-border bg-card p-5" aria-labelledby="pilot-title">
    <h2 id="pilot-title" className="font-display text-lg font-semibold">Einladung zum 30-Tage-Pilot</h2>
    <p className="mb-4 mt-2 text-sm leading-relaxed text-muted-foreground">Mit persönlichem Einladungscode testest du Solo Coach für dieses Team 30 Tage kostenlos. Keine Zahlungsangaben, kein automatisches Abo. Anschliessend gelten wieder die Grenzen deines kostenlosen Tarifs; deine Daten werden dabei nicht gelöscht.</p>
    <form onSubmit={redeem} className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="pilot-code">Dein Einladungscode</label>
      <input id="pilot-code" value={code} onChange={event => setCode(event.target.value)} maxLength={32} autoComplete="off" autoCapitalize="characters" spellCheck={false} required className="w-full rounded-lg border border-border bg-background px-3 py-3 font-mono text-sm" />
      {error && <p role="alert" className="text-sm">{error}</p>}
      <Button type="submit" disabled={pending || !/^[a-fA-F0-9]{32}$/.test(code.trim())}>{pending ? 'Wird aktiviert …' : '30 Tage kostenlos aktivieren'}</Button>
    </form>
  </section>;
}
