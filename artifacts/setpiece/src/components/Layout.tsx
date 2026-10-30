import React from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { useGetCurrentAuthUser } from '@workspace/api-client-react';
import { 
  Home, Users, LayoutDashboard, Calendar, Activity, Settings, 
  LogOut, Loader2, Menu, Move, CreditCard, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { clearClientSession } from '@/lib/session-cleanup';
import { useEditorStore } from '@/components/editor/editorStore';
import BrandLogo from '@/components/BrandLogo';

interface CoachLayoutProps {
  children: React.ReactNode;
  teamId?: string;
  teamName?: string;
}

export function CoachLayout({ children, teamId, teamName }: CoachLayoutProps) {
  const [location] = useLocation();
  const { data: auth, isLoading } = useGetCurrentAuthUser();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    useEditorStore.getState().resetStore();
    try {
      await clearClientSession(queryClient);
    } finally {
      window.location.replace(`${import.meta.env.BASE_URL}api/logout`);
    }
  };

  const isCurrent = (path: string) => location === path || location.startsWith(path + '/');

  const globalNav = [
    { icon: Home, label: t('Dashboard'), path: '/dashboard' },
    { icon: CreditCard, label: t('Pricing'), path: '/pricing' },
    { icon: Settings, label: t('Settings'), path: '/settings' },
  ];

  const teamNav = teamId ? [
    { icon: LayoutDashboard, label: t('Overview'), path: `/teams/${teamId}` },
    { icon: Users, label: t('Players'), path: `/teams/${teamId}/players` },
    { icon: LayoutDashboard, label: t('Set Pieces'), path: `/teams/${teamId}/templates` },
    { icon: Calendar, label: t('Matchdays'), path: `/teams/${teamId}/matchdays` },
    { icon: Activity, label: t('Readiness'), path: `/teams/${teamId}/readiness` },
  ] : [];

  if (isLoading || signingOut) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!auth?.user) {
    window.location.href = `${import.meta.env.BASE_URL}login`;
    return null;
  }

  const NavLinks = () => (
    <div className="flex flex-col gap-1">
      {teamId && (
        <>
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ChevronLeft className="h-3 w-3" /> {t('All Teams')}
          </Link>
          {teamName && (
            <div className="px-4 mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('Team')}</p>
              <p className="font-display text-sm font-bold text-white truncate">{teamName}</p>
            </div>
          )}
          {teamNav.map((item) => {
            const active = item.path === `/teams/${teamId}` ? location === item.path : isCurrent(item.path);
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
          <div className="my-3 h-px bg-border" />
        </>
      )}
      {globalNav.map((item) => {
        const active = isCurrent(item.path);
        return (
          <Link key={item.path} href={item.path} className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm",
            active && !teamId
              ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" aria-label="Teamübersicht"><BrandLogo /></Link>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menü öffnen"><Menu className="h-6 w-6" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r-border w-[280px]">
            <div className="py-6 flex flex-col h-full">
              <div className="flex-1 mt-8">
                <NavLinks />
              </div>
              <Button variant="ghost" className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
                <LogOut className="h-5 w-5 mr-3" /> {t('Logout')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden md:flex flex-col w-[260px] border-r border-white/[0.06] bg-card/30 backdrop-blur-xl h-screen sticky top-0">
        <Link href="/dashboard" aria-label="Teamübersicht" className="p-5"><BrandLogo /></Link>
        
        <nav className="flex-1 px-3 mt-4 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3 px-1">
            {auth.user.profileImageUrl ? <img
              src={auth.user.profileImageUrl}
              alt="Avatar" 
              className="w-9 h-9 rounded-xl border border-white/10" 
            /> : <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-primary">{auth.user.firstName?.[0]}{auth.user.lastName?.[0]}</span>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{auth.user.firstName} {auth.user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{auth.user.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive/30 text-xs rounded-xl" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5 mr-2" /> {t('Sign Out')}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
