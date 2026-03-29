import React from 'react';
import { Link, useLocation } from 'wouter';
import { useGetCurrentAuthUser } from '@workspace/api-client-react';
import { Home, Users, Move, Calendar, Share2, Activity, LogOut, Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function CoachLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: auth, isLoading } = useGetCurrentAuthUser();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const isCurrent = (path: string) => location.startsWith(path);

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
  ];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!auth?.user) {
    window.location.href = '/api/login';
    return null;
  }

  const NavLinks = () => (
    <div className="flex flex-col gap-2">
      {navItems.map((item) => {
        const active = isCurrent(item.path);
        return (
          <Link key={item.path} href={item.path} className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            active 
              ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Move className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">SETPIECE</span>
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

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] border-r border-border bg-card/30 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Move className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight text-white leading-none">SETPIECE</h1>
            <p className="text-[10px] text-primary font-semibold tracking-widest uppercase">By PerformIQ</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 mt-6">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={auth.user.profileImageUrl || `https://ui-avatars.com/api/?name=${auth.user.firstName}+${auth.user.lastName}&background=random`} alt="Avatar" className="w-10 h-10 rounded-full border border-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{auth.user.firstName} {auth.user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{auth.user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive/30" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
