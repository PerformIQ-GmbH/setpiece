import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGetAdminStatusQueryKey, useGetAdminStatus } from '@workspace/api-client-react';
import { CoachLayout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAdmin } from '@/components/admin/UserAdmin';
import { fetchAdminStats, type AdminStats } from '@/lib/platform-admin';

const number = (value: number) => value.toLocaleString('de-CH');
const percent = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)} %` : '–');

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold sm:text-3xl">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="space-y-3">
    <div>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
    {children}
  </section>;
}

const Unavailable = () => <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
  Dieser Bereich konnte nicht berechnet werden. Bitte Migrationen und Serverprotokoll prüfen.
</p>;

function weekLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('de-CH', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
}

function SignupChart({ weeks }: { weeks: { week: string; count: number }[] }) {
  const max = Math.max(1, ...weeks.map(week => week.count));
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  return <figure className="rounded-xl border border-border bg-card p-4">
    <figcaption className="mb-3 text-sm font-medium">Neue Benutzer pro Woche <span className="text-muted-foreground">(letzte {weeks.length} Wochen, {number(total)} insgesamt)</span></figcaption>
    <div role="img" aria-label={`Neue Benutzer pro Woche: ${weeks.map(week => `ab ${weekLabel(week.week)} ${week.count}`).join(', ')}`}>
      <div className="flex h-36 items-end gap-1 sm:gap-2" aria-hidden="true">
        {weeks.map(week => <div key={week.week} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
          <span className="mb-1 text-[11px] leading-none text-muted-foreground">{week.count}</span>
          <div className="w-full rounded-t bg-primary" style={{ height: `${(week.count / max) * 100}%`, minHeight: week.count ? 4 : 2, opacity: week.count ? 1 : 0.25 }} />
        </div>)}
      </div>
      <div className="mt-1 flex gap-1 sm:gap-2" aria-hidden="true">
        {weeks.map((week, index) => <span key={week.week} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-muted-foreground">
          {index % 2 === (weeks.length - 1) % 2 ? weekLabel(week.week) : ''}
        </span>)}
      </div>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Wochen ab Montag (UTC), Datum = Wochenbeginn.</p>
  </figure>;
}

const tierRows = [['free', 'Kostenlos'], ['solo_coach', 'Solo Coach'], ['team', 'Team']] as const;

function Overview({ stats }: { stats: AdminStats }) {
  const { users, teams, setPieces, matchdays, quiz, pilot } = stats;
  return <div className="space-y-8">
    <Section title="Benutzer">
      {users ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Benutzer gesamt" value={number(users.total)} />
        <Stat label="E-Mail bestätigt" value={number(users.verified)} hint={`${percent(users.verified, users.total)} aller Benutzer`} />
        <Stat label="Neu, 7 Tage" value={number(users.new7)} />
        <Stat label="Neu, 30 Tage" value={number(users.new30)} />
      </div> : <Unavailable />}
      {stats.signupsPerWeek ? <SignupChart weeks={stats.signupsPerWeek} /> : <Unavailable />}
    </Section>

    <Section title="Teams" note="Abo = gespeicherter Tarif. Wirksam = was das Team nutzen darf, inklusive Pilot und Gratiszugang.">
      {teams ? <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Teams gesamt" value={number(teams.total)} />
          <Stat label="Aktiv, 30 Tage" value={teams.active30 === null ? '–' : number(teams.active30)} hint="Standard, Spieltag oder Quiz bearbeitet" />
          <Stat label="Bezahlte Abos" value={number(teams.withActiveSubscription)} hint="Stripe-Status aktiv oder Testphase" />
          <Stat label="Pilot / Gratis aktiv" value={`${number(teams.withActivePilot)} / ${number(teams.withActiveComplimentary)}`} hint="Pilotzugang / Gratiszugang" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Teams nach Tarif</caption>
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th scope="col" className="px-4 py-2 font-medium">Tarif</th><th scope="col" className="px-4 py-2 text-right font-medium">Abo</th><th scope="col" className="px-4 py-2 text-right font-medium">Wirksam</th></tr>
            </thead>
            <tbody>
              {tierRows.map(([tier, label]) => <tr key={tier} className="border-t border-border">
                <th scope="row" className="px-4 py-2 text-left font-medium">{label}</th>
                <td className="px-4 py-2 text-right tabular-nums">{number(teams.byBillingTier[tier])}</td>
                <td className="px-4 py-2 text-right tabular-nums">{number(teams.byEffectiveTier[tier])}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </> : <Unavailable />}
    </Section>

    <Section title="Nutzung">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Spieler" value={stats.players === null ? '–' : number(stats.players)} />
        <Stat label="Standards" value={setPieces ? number(setPieces.total) : '–'}
          hint={setPieces && `${number(setPieces.published)} veröffentlicht · ${number(setPieces.draft)} Entwurf · ${number(setPieces.archived)} archiviert`} />
        <Stat label="Spieltage" value={matchdays ? number(matchdays.total) : '–'} hint={matchdays && `${number(matchdays.new30)} neu in 30 Tagen`} />
        <Stat label="Quiz-Antworten, 30 Tage" value={quiz ? number(quiz.completed30) : '–'}
          hint={quiz && `${number(quiz.passed30)} bestanden · ${number(quiz.players30)} Spieler · ${number(quiz.completedTotal)} gesamt`} />
      </div>
    </Section>

    <Section title="Zugänge">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pilotcodes eingelöst" value={pilot ? `${number(pilot.redeemed)} / ${number(pilot.total)}` : '–'} />
        <Stat label="Pilotcodes offen" value={pilot ? number(pilot.open) : '–'} />
        <Stat label="Offene Einladungen" value={stats.openInvites === null ? '–' : number(stats.openInvites)} hint="Nicht widerrufen, nicht abgelaufen, noch nicht ausgeschöpft" />
      </div>
    </Section>
  </div>;
}

export default function Admin() {
  const status = useGetAdminStatus({ query: { queryKey: getGetAdminStatusQueryKey(), staleTime: 5 * 60 * 1000, retry: false } });
  const isAdmin = status.data?.isPlatformAdmin === true;
  const stats = useQuery({
    queryKey: ['platform-admin', 'stats'],
    enabled: isAdmin,
    staleTime: 0,
    queryFn: ({ signal }) => fetchAdminStats(signal),
  });

  return <CoachLayout>
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin</h1>
      {status.isPending && <p role="status">Adminzugang wird geprüft …</p>}
      {status.isError && <p role="alert">Der Adminzugang konnte nicht geprüft werden.</p>}
      {status.data && !isAdmin && <p role="alert">Dieser Bereich ist Plattform-Admins vorbehalten.</p>}
      {isAdmin && <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Kennzahlen</TabsTrigger>
          <TabsTrigger value="users">Benutzer</TabsTrigger>
        </TabsList>
        <TabsContent value="stats" className="mt-5 space-y-4">
          {stats.isPending && <p role="status">Kennzahlen werden geladen …</p>}
          {stats.isError && <p role="alert">{stats.error.message} <Button variant="link" onClick={() => void stats.refetch()}>Erneut laden</Button></p>}
          {stats.data && <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Stand {new Date(stats.data.generatedAt).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <Button variant="outline" size="sm" disabled={stats.isFetching} onClick={() => void stats.refetch()}>{stats.isFetching ? 'Wird aktualisiert …' : 'Aktualisieren'}</Button>
            </div>
            {stats.data.unavailable.length > 0 && <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm">Nicht alle Bereiche konnten berechnet werden: {stats.data.unavailable.join(', ')}.</p>}
            <Overview stats={stats.data} />
          </>}
        </TabsContent>
        <TabsContent value="users" className="mt-5"><UserAdmin /></TabsContent>
      </Tabs>}
    </div>
  </CoachLayout>;
}
