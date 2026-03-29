import React, { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute } from 'wouter';
import { 
  useGetTeam, useListPlayers, useCreatePlayer, useDeletePlayer,
  useListSetPieces, useCreateSetPiece, useListTemplates,
  useListMatchdays, useCreateMatchday
} from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, LayoutDashboard, Calendar, Share2, Activity, UserPlus, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function TeamDetail() {
  const [, params] = useRoute('/teams/:teamId');
  const teamId = params?.teamId || '';
  
  const { data: team, isLoading: teamLoading } = useGetTeam(teamId);
  
  if (teamLoading) {
    return <CoachLayout><div className="animate-pulse h-8 w-48 bg-card rounded mb-8" /></CoachLayout>;
  }

  return (
    <CoachLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">{team?.name}</h1>
        <p className="text-muted-foreground mt-1">Manage everything for this team in one place.</p>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="bg-card border border-border p-1 mb-6 rounded-xl flex overflow-x-auto hide-scrollbar w-full sm:w-auto">
          <TabsTrigger value="players" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 text-sm font-semibold flex-1 sm:flex-none">
            <Users className="w-4 h-4 mr-2" /> Players
          </TabsTrigger>
          <TabsTrigger value="setpieces" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 text-sm font-semibold flex-1 sm:flex-none">
            <LayoutDashboard className="w-4 h-4 mr-2" /> Set Pieces
          </TabsTrigger>
          <TabsTrigger value="matchdays" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 text-sm font-semibold flex-1 sm:flex-none">
            <Calendar className="w-4 h-4 mr-2" /> Matchdays
          </TabsTrigger>
          <TabsTrigger value="readiness" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 text-sm font-semibold flex-1 sm:flex-none">
            <Activity className="w-4 h-4 mr-2" /> Readiness
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="outline-none">
          <PlayersTab teamId={teamId} />
        </TabsContent>
        
        <TabsContent value="setpieces" className="outline-none">
          <SetPiecesTab teamId={teamId} />
        </TabsContent>

        <TabsContent value="matchdays" className="outline-none">
          <MatchdaysTab teamId={teamId} />
        </TabsContent>
        
        <TabsContent value="readiness" className="outline-none">
          <div className="glass-panel p-8 text-center rounded-2xl">
            <Activity className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Readiness Dashboard</h2>
            <p className="text-muted-foreground mb-4">View player completion of tactical quizzes.</p>
            {/* Real implementation would fetch /readiness endpoint */}
            <p className="text-sm text-yellow-500">Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </CoachLayout>
  );
}

// --- TAB COMPONENTS ---

function PlayersTab({ teamId }: { teamId: string }) {
  const { data: players, refetch } = useListPlayers(teamId);
  const createPlayer = useCreatePlayer();
  const deletePlayer = useDeletePlayer();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', shirtNumber: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return;
    await createPlayer.mutateAsync({ 
      teamId, 
      data: { ...form, shirtNumber: parseInt(form.shirtNumber) || undefined } 
    });
    setOpen(false);
    setForm({ firstName: '', lastName: '', shirtNumber: '' });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display font-bold">Roster ({players?.length || 0})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border">
              <UserPlus className="h-4 w-4 mr-2" /> Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Add Player to Squad</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">First Name</label>
                  <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Last Name</label>
                  <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Shirt No. (Optional)</label>
                <input type="number" value={form.shirtNumber} onChange={e => setForm({...form, shirtNumber: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <Button type="submit" className="w-full" disabled={createPlayer.isPending}>Add Player</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">No.</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {players?.map(p => (
              <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-primary">{p.shirtNumber || '-'}</td>
                <td className="px-6 py-4 font-semibold text-white">{p.firstName} {p.lastName}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium">
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                    onClick={async () => {
                      if(confirm('Remove player?')) {
                        await deletePlayer.mutateAsync({ teamId, playerId: p.id });
                        refetch();
                      }
                    }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {players?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No players yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SetPiecesTab({ teamId }: { teamId: string }) {
  const { data: setPieces } = useListSetPieces(teamId);
  const { data: templates } = useListTemplates();
  const createSP = useCreateSetPiece();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'offensive_corner_left', templateId: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    await createSP.mutateAsync({ 
      teamId, 
      data: { title: form.title, category: form.category, templateId: form.templateId || undefined } 
    });
    setOpen(false);
    // In real app, might want to redirect to the editor immediately
    window.location.reload(); 
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display font-bold">Tactical Playbook</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Routine</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Create Set Piece</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Title</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                  <option value="offensive_corner_left">Offensive Corner Left</option>
                  <option value="offensive_corner_right">Offensive Corner Right</option>
                  <option value="defensive_corner_left">Defensive Corner Left</option>
                  <option value="defensive_corner_right">Defensive Corner Right</option>
                  <option value="direct_free_kick_central">Direct Free Kick Central</option>
                  <option value="indirect_free_kick_wide">Indirect Free Kick Wide</option>
                  <option value="attacking_throw_in">Attacking Throw In</option>
                  <option value="defensive_throw_in">Defensive Throw In</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Start from Template (Optional)</label>
                <select value={form.templateId} onChange={e => setForm({...form, templateId: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
                  <option value="">Blank Canvas</option>
                  {templates?.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={createSP.isPending}>Create Routine</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {setPieces?.map(sp => (
          <Link key={sp.id} href={`/teams/${teamId}/set-pieces/${sp.id}/editor`}>
            <div className="group bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/10 flex flex-col h-full">
              <div className="aspect-video bg-emerald-950 border-b border-border/50 relative p-4 flex items-center justify-center">
                 {/* Visual placeholder for pitch thumbnail */}
                 <div className="absolute inset-2 border-2 border-white/20 rounded-sm">
                   <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2" />
                   <div className="absolute top-1/2 left-1/2 w-8 h-8 rounded-full border-2 border-white/20 -translate-x-1/2 -translate-y-1/2" />
                 </div>
                 <div className="z-10 bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-xs font-semibold">
                   View Editor
                 </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{sp.title}</h3>
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border",
                    sp.status === 'active_matchday' ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"
                  )}>{sp.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize mb-4">{sp.category.replace('_', ' ')}</p>
                <div className="mt-auto pt-4 border-t border-border flex items-center text-sm font-semibold text-primary">
                  Open Tactical Board <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MatchdaysTab({ teamId }: { teamId: string }) {
  const { data: matchdays, refetch } = useListMatchdays(teamId);
  const createMatchday = useCreateMatchday();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', opponent: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.title) return;
    await createMatchday.mutateAsync({ teamId, data: form });
    setOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display font-bold">Matchdays</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Matchday</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Create Matchday</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Match Title</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. Final vs City" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Opponent</label>
                <input value={form.opponent} onChange={e => setForm({...form, opponent: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <Button type="submit" className="w-full" disabled={createMatchday.isPending}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchdays?.map(m => (
          <div key={m.id} className="p-5 rounded-2xl bg-secondary/50 border border-border flex justify-between items-center hover:bg-secondary transition-colors">
            <div>
              <h3 className="font-bold text-lg text-white">{m.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">vs {m.opponent || 'TBD'}</p>
            </div>
            <Button variant="outline" size="sm" className="bg-card">Manage Pack</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
