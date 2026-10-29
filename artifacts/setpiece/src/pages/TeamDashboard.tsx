import { CoachLayout } from '@/components/Layout';
import { useRoute, Link } from 'wouter';
import { useGetTeam, useListSetPieces, useListPlayers, useListMatchdays, useGetReadinessDashboard } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, Users, LayoutDashboard, Calendar, Activity, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SetPieceScoreboard } from '@/components/SetPieceScoreboard';
import { t } from '@/lib/i18n';

export default function TeamDashboard() {
  const [, params] = useRoute('/teams/:teamId');
  const teamId = params?.teamId || '';
  const { data: team, isLoading: teamLoading, isError: teamError } = useGetTeam(teamId);
  const { data: players, isLoading: playersLoading, isError: playersError } = useListPlayers(teamId);
  const { data: setPieces, isLoading: piecesLoading, isError: piecesError } = useListSetPieces(teamId);
  const { data: matchdays, isLoading: matchdaysLoading, isError: matchdaysError } = useListMatchdays(teamId);
  const { data: readiness } = useGetReadinessDashboard(teamId);

  const activePieces = setPieces?.filter(sp => sp.status === 'active_matchday' || sp.status === 'ready') || [];
  const totalPlayers = players?.length || 0;
  const totalSetPieces = setPieces?.length || 0;
  const totalMatchdays = matchdays?.length || 0;

  if (teamLoading || playersLoading || piecesLoading || matchdaysLoading) {
    return (
      <CoachLayout teamId={teamId}>
        <div className="space-y-6">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      </CoachLayout>
    );
  }

  if (teamError || playersError || piecesError || matchdaysError) {
    return <CoachLayout teamId={teamId}><div role="alert" className="py-12"><h1 className="font-display text-2xl font-semibold">Die Teamübersicht ist gerade nicht verfügbar.</h1><p className="mt-3 text-muted-foreground">Prüfe deine Verbindung und lade die Seite erneut.</p><Button className="mt-5" onClick={() => window.location.reload()}>Erneut laden</Button></div></CoachLayout>;
  }

  const needsSetup = totalPlayers === 0 || totalSetPieces === 0;

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">{team?.name}</h1>
            {team?.clubName && <p className="text-muted-foreground mt-1">{team.clubName}</p>}
          </div>
          <div className="flex gap-3">
            <Link href={`/teams/${teamId}/templates`}>
              <Button variant="outline" size="sm" className="border-border">
                <Plus className="h-4 w-4 mr-2" /> {t('New Set Piece')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {needsSetup ? <section className="mb-8 rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">Nächster Schritt: {totalSetPieces === 0 ? 'eine Variante vorbereiten' : 'die ersten Spieler hinzufügen'}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Öffne eine Vorlage, weise eure Rollen zu und teste den geteilten Zugang mit einem Spieler. Danach siehst du hier die Rückmeldungen.</p>
        <ol className="my-6 space-y-2 text-sm leading-relaxed"><li>1. Eine Beispielvariante öffnen und anpassen</li><li>2. Spieler hinzufügen und Rollen zuweisen</li><li>3. Den QR-Link öffnen und die Aufgabe testen</li></ol>
        <Link href={`/teams/${teamId}/${totalSetPieces === 0 ? 'templates' : 'players'}`}><Button>{totalSetPieces === 0 ? 'Vorlage auswählen' : 'Spieler hinzufügen'} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
      </section> : <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('Players'), value: totalPlayers, icon: Users, color: 'text-blue-400', href: `/teams/${teamId}/players` },
          { label: t('Set Pieces'), value: totalSetPieces, icon: LayoutDashboard, color: 'text-primary', href: `/teams/${teamId}/templates` },
          { label: t('Matchdays'), value: totalMatchdays, icon: Calendar, color: 'text-amber-400', href: `/teams/${teamId}/matchdays` },
          { label: 'Aufgaben verstanden', value: readiness?.summary?.passed || 0, icon: Activity, color: 'text-emerald-400', href: `/teams/${teamId}/readiness` },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={stat.href}>
              <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-3xl font-bold font-display text-white">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>}

      {!needsSetup && readiness?.summary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> {t('Readiness Overview')}
                </h2>
                <Link href={`/teams/${teamId}/readiness`}>
                  <Button variant="ghost" size="sm" className="text-primary text-xs">{t('View All')} <ArrowRight className="h-3 w-3 ml-1" /></Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: t('Not Opened'), value: readiness.summary.notOpened, icon: EyeOff, color: 'text-zinc-400' },
                  { label: t('Opened'), value: readiness.summary.opened, icon: Eye, color: 'text-blue-400' },
                  { label: t('Passed'), value: readiness.summary.passed, icon: CheckCircle2, color: 'text-emerald-400' },
                  { label: t('Needs Review'), value: readiness.summary.needsReview, icon: Activity, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-secondary/30">
                    <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!needsSetup && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <SetPieceScoreboard teamId={teamId} />
      </motion.div>}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">{t('Active Set Pieces')}</h2>
          <Link href={`/teams/${teamId}/templates`}>
            <Button variant="ghost" size="sm" className="text-primary text-xs">{t('View All')} <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </Link>
        </div>
        {activePieces.length === 0 ? (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="p-8 text-center">
              <LayoutDashboard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t('No active set pieces yet. Create one from the template library.')}</p>
              <Link href={`/teams/${teamId}/templates`}>
                <Button size="sm" className="mt-4"><Plus className="h-4 w-4 mr-2" /> {t('Browse Templates')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePieces.slice(0, 6).map((sp, idx) => (
              <motion.div key={sp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + idx * 0.05 }}>
                <Link href={`/teams/${teamId}/set-pieces/${sp.id}/editor`}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group overflow-hidden">
                    <div className="aspect-video bg-emerald-950/50 border-b border-border/50 relative flex items-center justify-center">
                      {sp.previewImageUrl ? (
                        <img src={sp.previewImageUrl} alt={sp.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-3 border border-white/20 rounded-sm">
                          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{sp.title}</h3>
                        <StatusBadge status={sp.status} />
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{sp.category.replace(/_/g, ' ')}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </CoachLayout>
  );
}
