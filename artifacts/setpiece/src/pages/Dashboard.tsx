import React, { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useListTeams, useCreateTeam } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, ShieldAlert, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { PilotStatus } from '@/components/PilotAccessPanel';

export default function Dashboard() {
  const { data: teams, isLoading, isError, refetch } = useListTeams();
  const createTeam = useCreateTeam();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [createError, setCreateError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreateError('');
    try {
      const newTeam = await createTeam.mutateAsync({ data: { name: teamName.trim() } });
      setOpen(false);
      refetch();
      setLocation(`/teams/${newTeam.id}`);
    } catch {
      setCreateError('Das Team konnte nicht erstellt werden. Bitte versuche es erneut.');
    }
  };

  return (
    <CoachLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Meine Teams</h1>
          <p className="text-muted-foreground mt-1">Bereite mit deinem Team die nächsten Standards vor.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-semibold shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5 mr-2" /> Team erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Neues Team erstellen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="team-name" className="text-sm font-medium text-muted-foreground">Teamname</label>
                <input 
                  id="team-name"
                  type="text" 
                  autoFocus
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="z. B. FC Beispiel U19"
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                />
              </div>
              {createError && <p role="alert" className="text-sm text-foreground">{createError}</p>}
              <Button type="submit" className="w-full py-6 text-lg" disabled={createTeam.isPending || !teamName.trim()}>
                {createTeam.isPending ? 'Wird erstellt …' : 'Team erstellen'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isError ? <div role="alert" className="py-12"><p>Deine Teams konnten nicht geladen werden.</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Erneut versuchen</Button></div> : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : teams?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-border rounded-3xl bg-card/30">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">Dein erster Standard beginnt mit deinem Team.</h2>
          <p className="text-muted-foreground max-w-md mb-6">Erstelle ein Team, öffne eine Vorlage und weise die ersten Rollen zu. Anschliessend kannst du den Zugang mit einem Spieler testen.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/onboarding">
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <ArrowRight className="h-5 w-5 mr-2" /> Team Schritt für Schritt einrichten
              </Button>
            </Link>
            <Button onClick={() => setOpen(true)} size="lg" variant="outline" className="border-border">
              Team direkt erstellen
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams?.map((team, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={team.id}
            >
              <Link href={`/teams/${team.id}`}>
                <div className="group block bg-card rounded-2xl p-6 border border-border hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 h-full relative overflow-hidden cursor-pointer">
                  {/* Decorative background glow */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all duration-500" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center border border-border">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground border border-border">
                      {team.effectiveTier === 'solo_coach' && team.tier === 'free' ? 'Solo Coach · Pilot' : team.tier === 'free' ? 'Kostenlos' : team.tier === 'solo_coach' ? 'Solo Coach' : 'Team'}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold font-display text-white mb-1 group-hover:text-primary transition-colors">{team.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">Spieler, Standards und Spieltage vorbereiten</p>
                  <PilotStatus team={team} />
                  
                  <div className="flex items-center text-primary text-sm font-semibold mt-auto pt-4 border-t border-border/50">
                    Team öffnen <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </CoachLayout>
  );
}
