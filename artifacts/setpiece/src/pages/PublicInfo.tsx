import { PublicLayout } from '@/components/PublicLayout';
import { Link } from 'wouter';

export function Contact() {
  return <PublicLayout><section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
    <h1 className="font-display text-4xl font-semibold">Kontakt & Anbieter</h1>
    <p className="mt-6 text-lg leading-relaxed text-muted-foreground">SETPIECE wird von der PerformIQ GmbH angeboten.</p>
    <address className="mt-6 not-italic leading-relaxed">PerformIQ GmbH<br />Michael-Maggi-Strasse 8<br />8046 Zürich, Schweiz</address>
    <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Geschäftsführer: Vincenzo Zinna<br />UID: CHE-273.630.741</p>
    <p className="mt-6">Fragen zum Produkt, zu deinem Konto oder zu einem Tarif:<br /><a href="mailto:contact@performiq.ch" className="text-primary underline underline-offset-4">contact@performiq.ch</a></p>
    <a href="https://performiq.ch/impressum" className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4">Impressum auf der Unternehmenswebsite</a>
    <p className="mt-10 text-sm text-muted-foreground"><Link href="/datenschutz" className="underline underline-offset-4">Hinweise zum Datenschutz</Link></p>
  </section></PublicLayout>;
}

export function Privacy() {
  return <PublicLayout><section className="mx-auto max-w-3xl space-y-8 px-5 py-12 leading-relaxed sm:px-8">
    <div><h1 className="font-display text-4xl font-semibold">Datenschutz bei SETPIECE</h1><p className="mt-5 text-muted-foreground">Diese Produktinformationen erläutern den Ablauf. Eine vollständige Datenschutzerklärung mit Verantwortlichem, Dienstleistern, Speicherfristen und Betroffenenrechten ist noch ausstehend.</p></div>
    <div><h2 className="font-display text-2xl font-semibold">Konto und Team</h2><p className="mt-3 text-muted-foreground">Bei der Registrierung gibst du Name, E-Mail-Adresse und ein Passwort an. Trainer erfassen Teams, Spieler, Rollen und Standards. Trage nur Informationen ein, die du für die gemeinsame Vorbereitung benötigst.</p></div>
    <div><h2 className="font-display text-2xl font-semibold">Spielerzugang und Rückmeldung</h2><p className="mt-3 text-muted-foreground">Spieler öffnen einen geteilten Link oder QR-Code und wählen ihre Spielerrolle. Öffnungen und Quizantworten werden für die Trainer-Rückmeldung verwendet. Behandle den geteilten Zugang vertraulich und gib ihn nur an die vorgesehenen Spieler weiter.</p></div>
    <div><h2 className="font-display text-2xl font-semibold">Fiktive Demo</h2><p className="mt-3 text-muted-foreground">Das öffentliche Demoteam enthält frei erfundene Spieler. Antworten im interaktiven Produktbeispiel bleiben in der aktuellen Ansicht und werden nicht an den Server gesendet.</p></div>
    <div><h2 className="font-display text-2xl font-semibold">Fragen zu deinen Daten</h2><p className="mt-3 text-muted-foreground">Für Auskünfte oder Anliegen zu deinen Daten erreichst du die PerformIQ GmbH unter <a href="mailto:contact@performiq.ch" className="text-primary underline underline-offset-4">contact@performiq.ch</a>.</p><p className="mt-3 text-muted-foreground">Auf der <a href="https://performiq.ch/datenschutz" className="underline underline-offset-4">Unternehmenswebsite findest du die dortige Datenschutzerklärung</a>. Die dienstspezifischen Angaben für SETPIECE müssen noch ergänzt und bestätigt werden.</p></div>
  </section></PublicLayout>;
}
