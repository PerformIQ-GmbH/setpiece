import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';

export function PublicFooter() {
  return <footer className="mx-auto mt-16 flex w-full max-w-7xl flex-wrap items-center justify-between gap-5 border-t border-border px-5 py-8 text-sm text-muted-foreground sm:px-8">
    <p>SETPIECE by PerformIQ</p>
    <nav aria-label="Informationen" className="flex flex-wrap gap-x-6 gap-y-3">
      <Link href="/pricing" className="hover:text-foreground">Preise</Link>
      <Link href="/kontakt" className="hover:text-foreground">Kontakt & Anbieter</Link>
      <Link href="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
    </nav>
  </footer>;
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-primary focus:p-3 focus:text-primary-foreground">Zum Inhalt</a>
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8 sm:py-7">
      <Link href="/" aria-label="SETPIECE Startseite"><BrandLogo className="h-10" /></Link>
      <nav aria-label="Hauptnavigation" className="flex items-center gap-4 sm:gap-6">
        <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Preise</Link>
        <Link href="/login"><Button variant="outline" size="sm">Anmelden</Button></Link>
      </nav>
    </header>
    <main id="main-content">{children}</main>
    <PublicFooter />
  </div>;
}
