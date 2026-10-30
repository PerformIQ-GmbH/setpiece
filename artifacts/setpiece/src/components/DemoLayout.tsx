import React from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home, Users, LayoutDashboard, Calendar, Activity,
  Menu, Move, ChevronLeft, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { DemoBanner } from './DemoBanner';
import { useDemoMode } from '@/contexts/DemoContext';
import BrandLogo from '@/components/BrandLogo';

interface DemoLayoutProps {
  children: React.ReactNode;
  teamName?: string;
}

export function DemoLayout({ children, teamName }: DemoLayoutProps) {
  const [location] = useLocation();
  const { demoTeamId, loading } = useDemoMode();
  const teamId = demoTeamId;

  const isCurrent = (path: string) => location === path || location.startsWith(path + '/');

  const teamNav = teamId ? [
    { icon: LayoutDashboard, label: 'Übersicht', path: `/demo/teams/${teamId}` },
    { icon: Users, label: 'Spieler', path: `/demo/teams/${teamId}/players` },
    { icon: LayoutDashboard, label: 'Standards', path: `/demo/teams/${teamId}/templates` },
    { icon: Calendar, label: 'Spieltage', path: `/demo/teams/${teamId}/matchdays` },
    { icon: Activity, label: 'Aufgabenverständnis', path: `/demo/teams/${teamId}/readiness` },
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const NavLinks = () => (
    <div className="flex flex-col gap-1">
      {teamId && (
        <>
          <Link href="/" className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ChevronLeft className="h-3 w-3" /> Zur Startseite
          </Link>
          {teamName && (
            <div className="px-4 mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fiktives Demoteam</p>
              <p className="font-display text-sm font-bold text-white truncate">{teamName}</p>
            </div>
          )}
          {teamNav.map((item) => {
            const active = item.path === `/demo/teams/${teamId}` ? location === item.path : isCurrent(item.path);
            return (
              <Link key={item.path} href={item.path} className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DemoBanner />
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Zur Startseite"><BrandLogo /></Link>
            <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Demo</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Demomenü öffnen"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-card border-r-border w-[280px]">
              <div className="py-6 flex flex-col h-full">
                <div className="flex-1 mt-8">
                  <NavLinks />
                </div>
                <Link href="/register">
                  <Button className="w-full">Kostenlos starten</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <aside className="hidden md:flex flex-col w-[260px] border-r border-border bg-card/30 backdrop-blur-xl h-[calc(100vh-40px)] sticky top-[40px]">
          <Link href="/" aria-label="Zur Startseite" className="p-5"><BrandLogo /></Link>

          <nav className="flex-1 px-3 mt-4 overflow-y-auto">
            <NavLinks />
          </nav>

          <div className="p-3 border-t border-border/50">
            <Link href="/register">
              <Button className="w-full font-semibold">Kostenlos starten</Button>
            </Link>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-[calc(100vh-40px)] relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
