import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { CoachLayout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { useGetPricingData, useGetCurrentAuthUser, useListTeams } from '@workspace/api-client-react';
import type { PricingDataTiersItem } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

const features: Record<string, string> = {
  '1 team': '1 Team', 'Multiple teams': 'Mehrere Teams',
  'Up to 15 players': 'Bis zu 15 Spieler', 'Up to 30 players': 'Bis zu 30 Spieler', 'Up to 100 players': 'Bis zu 100 Spieler',
  '3 set pieces': '3 Standards', '20 set pieces': '20 Standards', '100 set pieces': '100 Standards',
  '2 matchdays': '2 Spieltage', '20 matchdays': '20 Spieltage', '100 matchdays': '100 Spieltage',
  'Basic templates': 'Basisvorlagen', 'All templates': 'Alle Vorlagen',
  'QR sharing (3 links)': '3 QR-Links', 'QR sharing (20 links)': '20 QR-Links', 'QR sharing (100 links)': '100 QR-Links',
  'Player quiz': 'Spielerquiz', 'Readiness dashboard': 'Rückmeldung zum Aufgabenverständnis', 'Ghost mode': 'Wechselvorschau',
  'Match pack PDF export': 'Spieltagspaket als PDF', 'Matchday management': 'Spieltagverwaltung',
  'Assistant coach access': 'Zugang für Co-Trainer', 'Team branding': 'Teamgestaltung', 'Priority support': 'Priorisierter Support', 'Audit trail': 'Änderungsprotokoll',
};

function PlanGrid({ onSelect, currentTier, loadingTier, member = false }: {
  onSelect?: (tier: PricingDataTiersItem) => void; currentTier?: string; loadingTier?: string | null; member?: boolean;
}) {
  const { data, isLoading, isError, refetch } = useGetPricingData();
  if (isLoading) return <p role="status" className="py-10 text-muted-foreground">Preise werden geladen …</p>;
  if (isError || !data?.tiers?.length) return <div role="alert" className="py-10"><p>Die Preise konnten nicht geladen werden.</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Erneut versuchen</Button></div>;
  return <div className="grid gap-6 md:grid-cols-3">
    {data.tiers.map(tier => <article key={tier.id} className={`flex flex-col rounded-xl border p-6 ${tier.highlighted ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <h2 className="font-display text-2xl font-semibold">{tier.name === 'Free' ? 'Kostenlos' : tier.name}</h2>
      <p className="mt-2 min-h-10 text-sm text-muted-foreground">{tier.id === 'free' ? 'Zum Kennenlernen' : tier.id === 'solo_coach' ? 'Für einen Trainer mit einem Team' : 'Für mehrere Teams und den Trainerstab'}</p>
      <p className="my-6 flex flex-wrap items-baseline gap-2"><span className="font-display text-4xl font-semibold">CHF {tier.price}</span><span className="text-sm text-muted-foreground">/ Monat</span></p>
      <ul className="mb-8 flex-1 space-y-3 text-sm leading-relaxed">{tier.features?.map(feature => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{features[feature] || feature}</span></li>)}</ul>
      {!member ? <Link href="/register"><Button className="w-full" variant={tier.highlighted ? 'default' : 'outline'}>Kostenloses Konto erstellen</Button></Link> : currentTier === tier.id ? <Button disabled variant="outline">Aktueller Tarif</Button> : tier.id === 'free' ? <Link href="/settings"><Button variant="outline" className="w-full">Abo verwalten</Button></Link> : <Button onClick={() => onSelect?.(tier)} disabled={loadingTier != null || !tier.stripePriceId} variant={tier.highlighted ? 'default' : 'outline'}>{loadingTier === tier.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checkout wird geöffnet …</> : !tier.stripePriceId ? 'Derzeit nicht buchbar' : 'Tarif wählen'}</Button>}
    </article>)}
  </div>;
}

function MemberPricing() {
  const { data: teams } = useListTeams();
  const team = teams?.[0];
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState('');
  const search = useSearch();
  const params = new URLSearchParams(search);
  const handleUpgrade = async (tier: PricingDataTiersItem) => {
    if (!team || tier.id === 'free' || !tier.stripePriceId) return;
    setError('');
    setLoadingTier(tier.id!);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/billing/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ priceId: tier.stripePriceId, tierId: tier.id, teamId: team.id }) });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(response.status === 409 ? 'Es gibt bereits ein Abo oder einen offenen Checkout für dieses Team. Verwalte es in den Einstellungen.' : 'Der Checkout konnte nicht geöffnet werden. Versuche es erneut oder kontaktiere uns.');
      }
      if (typeof result.url !== 'string' || !result.url.startsWith('https://checkout.stripe.com/')) throw new Error('Der Zahlungslink ist nicht verfügbar. Bitte versuche es erneut.');
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen. Bitte versuche es erneut.');
      setLoadingTier(null);
    }
  };
  return <CoachLayout><div className="mx-auto max-w-6xl">
    <h1 className="font-display text-3xl font-semibold">Dein Tarif</h1>
    <p className="mb-8 mt-3 text-muted-foreground">{team ? `Abo für: ${team.name}` : 'Erstelle zuerst ein Team, um einen kostenpflichtigen Tarif zu wählen.'}</p>
    {params.get('success') === 'true' && <p role="status" className="mb-6 rounded-lg bg-primary/10 p-4 text-sm">Du bist vom Checkout zurück. Dein Tarif wird nach Bestätigung der Zahlung aktualisiert. <Link href="/settings" className="underline">Abo ansehen</Link></p>}
    {params.get('canceled') === 'true' && <p role="status" className="mb-6 rounded-lg bg-secondary p-4 text-sm">Der Checkout wurde abgebrochen. Du kannst später einen Tarif wählen.</p>}
    {error && <p role="alert" className="mb-6 rounded-lg border border-destructive p-4 text-sm">{error} <Link href="/settings" className="underline">Einstellungen öffnen</Link></p>}
    <PlanGrid member currentTier={team?.tier} onSelect={handleUpgrade} loadingTier={loadingTier ?? (!team ? 'team-loading' : null)} />
    <p className="mt-6 text-sm leading-relaxed text-muted-foreground">Kostenpflichtige Tarife werden monatlich abgerechnet. Massgeblich sind die Angaben im Checkout. Dein bestehendes Abo verwaltest du in den Einstellungen.</p>
    <p className="mt-4 text-sm"><Link href="/kontakt" className="text-primary underline">Fragen zum Tarif?</Link></p>
  </div></CoachLayout>;
}

export default function Pricing() {
  const { data: auth } = useGetCurrentAuthUser();
  if (auth?.user) return <MemberPricing />;
  return <PublicLayout><section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
    <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Der passende Plan für dein Team.</h1>
    <p className="mb-10 mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">Starte kostenlos mit 3 Standards. Für Spielerquiz, Rückmeldungen und mehr Varianten wählst du nach der Registrierung den passenden Tarif.</p>
    <PlanGrid />
    <p className="mt-6 text-sm leading-relaxed text-muted-foreground">Kostenpflichtige Tarife werden monatlich abgerechnet. Die Registrierung selbst löst keine Zahlung aus. Die endgültigen Zahlungsangaben siehst du vor dem Abschluss im Checkout.</p>
    <p className="mt-4 text-sm"><Link href="/demo" className="text-primary underline underline-offset-4">Zuerst das fiktive Demoteam ansehen</Link></p>
  </section></PublicLayout>;
}
