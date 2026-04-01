import { useState, useEffect } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useListTeams, useUpdateTeam, useGetCurrentAuthUser } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Palette, User, CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const BASE = import.meta.env.BASE_URL || '/';

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  solo_coach: 'Solo Coach',
  team: 'Team',
};

export default function Settings() {
  const { data: auth } = useGetCurrentAuthUser();
  const { data: teams, refetch } = useListTeams();
  const updateTeam = useUpdateTeam();
  const team = teams?.[0];
  const [portalLoading, setPortalLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', clubName: '', coachName: '', logoUrl: '',
    primaryColor: '#10b981', secondaryColor: '#1e293b'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (team) {
      setForm({
        name: team.name || '', clubName: team.clubName || '', coachName: team.coachName || '',
        logoUrl: team.logoUrl || '',
        primaryColor: team.teamColors?.primary || '#10b981',
        secondaryColor: team.teamColors?.secondary || '#1e293b'
      });
    }
  }, [team]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    await updateTeam.mutateAsync({
      teamId: team.id,
      data: {
        name: form.name, clubName: form.clubName || undefined, coachName: form.coachName || undefined,
        logoUrl: form.logoUrl || undefined,
        teamColors: { primary: form.primaryColor, secondary: form.secondaryColor }
      }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refetch();
  };

  return (
    <CoachLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" /> Settings
          </h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-border mb-6">
            <CardContent className="p-6">
              <h2 className="font-display font-bold text-base text-white flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-primary" /> Account
              </h2>
              <div className="flex items-center gap-4">
                <img src={auth?.user?.profileImageUrl || `https://ui-avatars.com/api/?name=${auth?.user?.firstName}&background=1a1a2e&color=10b981`} alt="" className="w-14 h-14 rounded-full border border-border" />
                <div>
                  <p className="font-semibold text-white">{auth?.user?.firstName} {auth?.user?.lastName}</p>
                  <p className="text-sm text-muted-foreground">{auth?.user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {team && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border mb-6">
              <CardContent className="p-6">
                <h2 className="font-display font-bold text-base text-white flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4 text-primary" /> Subscription
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-lg font-bold text-white">{TIER_LABELS[team.tier] || team.tier}</p>
                  </div>
                  {team.tier !== 'free' && team.stripeCustomerId ? (
                    <Button
                      variant="outline"
                      disabled={portalLoading}
                      onClick={async () => {
                        setPortalLoading(true);
                        try {
                          const res = await fetch('/api/billing/portal', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ teamId: team.id }),
                          });
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                        } finally {
                          setPortalLoading(false);
                        }
                      }}
                    >
                      {portalLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                      Manage Subscription
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => { window.location.href = `${BASE}pricing`; }}>
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {team && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h2 className="font-display font-bold text-base text-white flex items-center gap-2 mb-4">
                  <Palette className="h-4 w-4 text-primary" /> Team Branding
                </h2>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Team Name</label>
                      <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Club Name</label>
                      <input value={form.clubName} onChange={e => setForm({...form, clubName: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Coach Name</label>
                      <input value={form.coachName} onChange={e => setForm({...form, coachName: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Logo URL</label>
                      <input value={form.logoUrl} onChange={e => setForm({...form, logoUrl: e.target.value})} placeholder="https://..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Primary Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={form.primaryColor} onChange={e => setForm({...form, primaryColor: e.target.value})} className="w-10 h-10 rounded border border-border cursor-pointer" />
                        <input value={form.primaryColor} onChange={e => setForm({...form, primaryColor: e.target.value})} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Secondary Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={form.secondaryColor} onChange={e => setForm({...form, secondaryColor: e.target.value})} className="w-10 h-10 rounded border border-border cursor-pointer" />
                        <input value={form.secondaryColor} onChange={e => setForm({...form, secondaryColor: e.target.value})} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none font-mono" />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={updateTeam.isPending}>
                    {saved ? 'Saved!' : updateTeam.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </CoachLayout>
  );
}
