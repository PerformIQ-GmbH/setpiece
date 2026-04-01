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

interface CoachLayoutProps {
  children: React.ReactNode;
  teamId?: string;
  teamName?: string;
}

export function CoachLayout({ children, teamId, teamName }: CoachLayoutProps) {
  const [location] = useLocation();
  const { data: auth, isLoading } = useGetCurrentAuthUser();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const isCurrent = (path: string) => location === path || location.startsWith(path + '/');

  const globalNav = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: CreditCard, label: 'Pricing', path: '/pricing' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const teamNav = teamId ? [
    { icon: LayoutDashboard, label: 'Overview', path: `/teams/${teamId}` },
    { icon: Users, label: 'Players', path: `/teams/${teamId}/players` },
    { icon: LayoutDashboard, label: 'Set Pieces', path: `/teams/${teamId}/templates` },
    { icon: Calendar, label: 'Matchdays', path: `/teams/${teamId}/matchdays` },
    { icon: Activity, label: 'Readiness', path: `/teams/${teamId}/readiness` },
  ] : [];

  if (isLoading) {
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
            <ChevronLeft className="h-3 w-3" /> All Teams
          </Link>
          {teamName && (
            <div className="px-4 mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Team</p>
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
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Move className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">SETPIECE</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r-border w-[280px]">
            <div className="py-6 flex flex-col h-full">
              <div className="flex-1 mt-8">
                <NavLinks />
              </div>
              <Button variant="ghost" className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
                <LogOut className="h-5 w-5 mr-3" /> Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden md:flex flex-col w-[260px] border-r border-border bg-card/30 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Move className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight text-white leading-none">SETPIECE</h1>
            <p className="text-[9px] text-primary font-semibold tracking-widest uppercase">By PerformIQ</p>
          </div>
        </div>
        
        <nav className="flex-1 px-3 mt-4 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <img 
              src={auth.user.profileImageUrl || `https://ui-avatars.com/api/?name=${auth.user.firstName}+${auth.user.lastName}&background=1a1a2e&color=10b981&size=40`} 
              alt="Avatar" 
              className="w-9 h-9 rounded-full border border-border" 
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{auth.user.firstName} {auth.user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{auth.user.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive/30 text-xs" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
