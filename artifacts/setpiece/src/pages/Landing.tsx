import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PublicLayout } from '@/components/PublicLayout';
import { ProductWalkthrough } from '@/components/ProductWalkthrough';

export default function Landing() {
  return <PublicLayout>
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_0.95fr] lg:gap-16 lg:pb-24">
      <div>
        <h1 className="font-display text-[clamp(2.4rem,5vw,4.9rem)] font-bold leading-[1.04] tracking-[-0.03em]">Standards planen.<br /><span className="text-primary">Rollen verstehen.</span></h1>
        <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">Bereite eure Standards vor, teile die Aufgaben per QR-Code und sieh vor dem Spiel, wer seine Rolle verstanden hat.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register"><Button size="lg" className="min-h-12 rounded-lg px-6 text-base">Kostenlos starten <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          <Link href="/demo"><Button size="lg" variant="outline" className="min-h-12 rounded-lg px-6 text-base">Demo öffnen</Button></Link>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Für Amateurtrainer und Junioren-Spitzenfussball.<br />Kostenlos mit bis zu 15 Spielern und 3 Standards starten.</p>
        <div className="mt-10 border-t border-border pt-6 text-sm leading-relaxed">
          <p className="font-semibold">Auf dem Platz zählt eine gemeinsame Idee.</p>
          <p className="mt-2 max-w-md text-muted-foreground">SETPIECE verbindet Taktiktafel, Spieleraufgaben und Rückmeldung. Spieler öffnen ihren Link im Browser, ohne eine App installieren zu müssen.</p>
        </div>
      </div>
      <ProductWalkthrough />
    </section>
    <section className="border-y border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <div><h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Ein Ablauf bis zum Spieltag.</h2><p className="mt-5 max-w-md leading-relaxed text-muted-foreground">Amateurteam oder Junioren-Spitzenfussball: Alle sollen wissen, wo sie stehen und was als Nächstes passiert.</p></div>
        <ol className="space-y-7">
          <li><h3 className="text-lg font-semibold">1. Variante vorbereiten</h3><p className="mt-2 leading-relaxed text-muted-foreground">Starte mit einer Vorlage. Passe Positionen und Laufwege an und ordne jedem Spieler seine Rolle zu.</p></li>
          <li><h3 className="text-lg font-semibold">2. Mit den Spielern teilen</h3><p className="mt-2 leading-relaxed text-muted-foreground">Teile den QR-Code oder Link. Die Spieler sehen die Variante und ihre Aufgaben auf dem Smartphone.</p></li>
          <li><h3 className="text-lg font-semibold">3. Verständnis prüfen</h3><p className="mt-2 leading-relaxed text-muted-foreground">Nutze die Quizantworten als Gesprächsgrundlage. Geh offene Aufgaben vor dem Training oder Spiel nochmals gemeinsam durch.</p></li>
        </ol>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6"><div><h2 className="font-display text-3xl font-semibold sm:text-4xl">Klein anfangen. Im Team nutzen.</h2><p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">Der kostenlose Einstieg zum Kennenlernen. Solo Coach mit Quiz und Rückmeldung ab CHF 8 pro Monat, Team ab CHF 19 pro Monat.</p></div><Link href="/pricing"><Button variant="outline">Alle Leistungen und Preise</Button></Link></div>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div><h3 className="text-lg font-semibold">Brauchen Spieler ein eigenes Konto?</h3><p className="mt-3 leading-relaxed text-muted-foreground">Spieler öffnen den vom Trainer geteilten Zugang per Link oder QR-Code im Browser. Eine Installation ist dafür nicht nötig.</p></div>
        <div><h3 className="text-lg font-semibold">Kann ich es ohne Teamdaten ausprobieren?</h3><p className="mt-3 leading-relaxed text-muted-foreground">Ja. Die öffentliche Demo enthält ein fiktives Team mit einer vorbereiteten Ecke. Du kannst dich ohne Registrierung umsehen.</p><Link href="/demo" className="mt-3 inline-block text-primary underline underline-offset-4">Fiktives Demoteam öffnen</Link></div>
      </div>
    </section>
  </PublicLayout>;
}
