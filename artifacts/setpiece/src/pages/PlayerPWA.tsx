import { useState, useEffect, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetPlayerView, useGetPlayerSpecificView, useMarkPlayerReady } from '@workspace/api-client-react';
import type { PlayerViewDataPlayersItem, PlayerSpecificViewDataSetPiecesItem } from '@workspace/api-client-react';
import { Loader2, ShieldAlert, ChevronRight, CheckCircle2, Circle, Search, ArrowLeft, Trophy, Eye } from 'lucide-react';
import { PlayerBoardViewer } from '@/components/PlayerBoardViewer';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type Screen = 'identify' | 'overview' | 'detail';

export default function PlayerPWA() {
  const [, params] = useRoute('/p/:shareToken');
  const shareToken = params?.shareToken || '';

  const storageKey = `sp_player_${shareToken}`;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(storageKey) || null;
  });
  const [screen, setScreen] = useState<Screen>(() => selectedPlayerId ? 'overview' : 'identify');
  const [activeSetPieceId, setActiveSetPieceId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: teamData, isLoading: teamLoading, error: teamError } = useGetPlayerView(shareToken);

  const { data: playerData, isLoading: playerLoading, error: playerError, refetch: refetchPlayer } = useGetPlayerSpecificView(
    shareToken,
    selectedPlayerId || '',
    { query: { enabled: !!selectedPlayerId } },
  );

  const markReady = useMarkPlayerReady();

  useEffect(() => {
    if (selectedPlayerId) {
      localStorage.setItem(storageKey, selectedPlayerId);
    }
  }, [selectedPlayerId, storageKey]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setScreen('overview');
  };

  const handleSwitchPlayer = () => {
    localStorage.removeItem(storageKey);
    setSelectedPlayerId(null);
    setScreen('identify');
  };

  const filteredPlayers = useMemo(() => {
    const players = teamData?.players || [];
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter((p: PlayerViewDataPlayersItem) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      const num = String(p.shirtNumber ?? '');
      return name.includes(q) || num.includes(q);
    });
  }, [teamData?.players, search]);

  if (teamLoading) {
    return <LoadingScreen />;
  }

  if (teamError || !teamData) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-3">Invalid Link</h1>
        <p className="text-muted-foreground text-sm max-w-xs">This share link has expired, been revoked, or is invalid.</p>
      </div>
    );
  }

  if (screen === 'identify') {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-white font-sans">
        <div className="max-w-md mx-auto min-h-screen bg-[var(--surface-1)] flex flex-col">
          <header className="px-6 pt-safe-top pb-6 shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 3rem)' }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/10">
                {teamData.team.logoUrl ? (
                  <img src={teamData.team.logoUrl} alt="Team" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-primary text-sm">{teamData.team.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="section-label mb-0.5">Matchday Pack</p>
                <h2 className="text-xl font-display font-bold leading-tight">{teamData.team.name}</h2>
              </div>
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Who are you?</h3>
            <p className="text-sm text-muted-foreground">Select your name to see your set piece roles.</p>
          </header>

          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or number..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <div className="space-y-2">
              {filteredPlayers.map((player: PlayerViewDataPlayersItem, idx: number) => (
                <motion.button
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleSelectPlayer(player.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/25 active:scale-[0.98] transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    {player.shirtNumber ? (
                      <span className="font-bold text-primary text-base">{player.shirtNumber}</span>
                    ) : (
                      <span className="font-bold text-primary text-xs">{player.firstName[0]}{player.lastName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-[15px]">{player.firstName} {player.lastName}</p>
                    {player.shirtNumber && <p className="text-xs text-muted-foreground mt-0.5">#{player.shirtNumber}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary/60 shrink-0 transition-colors" />
                </motion.button>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-12">No players found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (playerError) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-3">Player Not Found</h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-xs">We couldn't load your data. Please try selecting your name again.</p>
        <Button variant="outline" onClick={handleSwitchPlayer}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Choose Player
        </Button>
      </div>
    );
  }

  if (playerLoading || !playerData) {
    return <LoadingScreen />;
  }

  const activeSetPiece = playerData.setPieces.find((sp: PlayerSpecificViewDataSetPiecesItem) => sp.id === activeSetPieceId);

  const handleMarkReady = async (spId: string, roleId: string | undefined) => {
    if (!roleId || !selectedPlayerId) return;
    try {
      await markReady.mutateAsync({
        shareToken,
        data: { setPieceId: spId, roleId, playerId: selectedPlayerId },
      });
      refetchPlayer();
    } catch (e) {
      console.error(e);
    }
  };

  const readyCount = playerData.setPieces.filter((sp: PlayerSpecificViewDataSetPiecesItem) => {
    const s = sp.readiness?.status;
    return s === 'opened' || s === 'passed';
  }).length;
  const totalCount = playerData.setPieces.length;
  const progressPct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  if (screen === 'detail' && activeSetPiece) {
    const readinessStatus = activeSetPiece.readiness?.status;
    const isReady = readinessStatus === 'opened' || readinessStatus === 'passed';

    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-white font-sans">
        <div className="max-w-md mx-auto min-h-screen bg-[var(--surface-1)] flex flex-col relative">
          <header className="p-4 border-b border-white/[0.06] flex items-center bg-[var(--surface-2)] shrink-0 sticky top-0 z-20 backdrop-blur-xl">
            <button
              onClick={() => { setScreen('overview'); setActiveSetPieceId(null); }}
              className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center active:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="ml-4 flex-1 min-w-0">
              <h2 className="font-display font-bold text-lg leading-tight truncate">{activeSetPiece.title}</h2>
              {activeSetPiece.playerRole && (
                <p className="text-xs text-primary font-semibold mt-0.5">Your Role: {activeSetPiece.playerRole.name}</p>
              )}
            </div>
            {isReady && (
              <div className="ml-3 shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto pb-36">
            <div className="p-4">
              <div className="mb-6">
                <PlayerBoardViewer
                  roles={activeSetPiece.roles || []}
                  assignments={activeSetPiece.assignments || []}
                  boardData={activeSetPiece.boardData ?? undefined}
                  category={activeSetPiece.category}
                  activePlayerId={selectedPlayerId || undefined}
                  activeRoleId={activeSetPiece.playerRole?.id}
                  players={teamData?.players || []}
                />
              </div>

              {activeSetPiece.playerRole && (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="section-label">Your Role</p>
                      <p className="font-semibold text-white text-sm">{activeSetPiece.playerRole.name}</p>
                    </div>
                  </div>
                  {activeSetPiece.playerRole.description && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <p className="section-label mb-1.5">Task</p>
                      <p className="text-sm leading-relaxed text-white/80">{activeSetPiece.playerRole.description}</p>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const myAssignment = (activeSetPiece.assignments || []).find(
                  (a: { roleId: string; playerId: string; notes?: string | null }) =>
                    a.roleId === activeSetPiece.playerRole?.id && a.playerId === selectedPlayerId
                );
                return myAssignment?.notes ? (
                  <div className="bg-primary/[0.06] p-5 rounded-2xl border border-primary/20 mb-4">
                    <p className="section-label text-primary mb-2">Coach's Note for You</p>
                    <p className="text-sm leading-relaxed text-white/80">{myAssignment.notes}</p>
                  </div>
                ) : null;
              })()}

              {activeSetPiece.playerRole?.coachingPoint && (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] mb-4">
                  <p className="section-label mb-2">Coaching Point</p>
                  <p className="text-sm leading-relaxed text-white/80">{activeSetPiece.playerRole.coachingPoint}</p>
                </div>
              )}

              {activeSetPiece.coachingNotes && (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] mb-4">
                  <p className="section-label mb-2">Coaching Notes</p>
                  <p className="text-sm leading-relaxed text-white/80">{activeSetPiece.coachingNotes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full max-w-md mx-auto z-30">
            <div className="p-5 pb-8" style={{ background: 'linear-gradient(to top, var(--surface-0) 60%, transparent)' }}>
              {isReady ? (
                <div className="w-full py-4 rounded-2xl bg-primary/10 border border-primary/25 text-primary font-semibold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> You are ready
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 py-5 rounded-2xl bg-white/[0.03] backdrop-blur"
                    onClick={() => handleMarkReady(activeSetPiece.id, activeSetPiece.playerRole?.id)}
                    disabled={markReady.isPending}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {markReady.isPending ? 'Saving...' : 'Acknowledge'}
                  </Button>
                  <Link href={`/p/${shareToken}/quiz?setPieceId=${activeSetPiece.id}&playerId=${selectedPlayerId || ''}&roleId=${activeSetPiece.playerRole?.id || ''}`} className="flex-1">
                    <Button className="w-full py-5 rounded-2xl premium-glow">
                      Take Quiz
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-white font-sans selection:bg-primary selection:text-black">
      <div className="max-w-md mx-auto min-h-screen bg-[var(--surface-1)] shadow-2xl relative overflow-hidden flex flex-col">
        <header className="px-6 pb-5 sticky top-0 z-10 shrink-0 bg-[var(--surface-2)] border-b border-white/[0.06]" style={{ paddingTop: 'max(env(safe-area-inset-top), 3rem)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/10">
              {teamData.team.logoUrl ? (
                <img src={teamData.team.logoUrl} alt="Team" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-primary text-sm">{teamData.team.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="section-label mb-0.5">Matchday Pack</p>
              <h2 className="text-xl font-display font-bold leading-tight truncate">{teamData.team.name}</h2>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="text-white font-semibold">{playerData.player.firstName} {playerData.player.lastName}</span>
              {playerData.player.shirtNumber && <span className="text-primary ml-1.5 font-semibold">#{playerData.player.shirtNumber}</span>}
            </p>
            <button onClick={handleSwitchPlayer} className="text-xs text-primary font-semibold hover:underline">
              Not you?
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-24">
          <div className="my-5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Your Progress</p>
              <p className="text-sm font-bold text-primary">{readyCount}/{totalCount}</p>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {readyCount === totalCount
                ? "All set pieces reviewed — you're match ready!"
                : `${totalCount - readyCount} set piece${totalCount - readyCount !== 1 ? 's' : ''} remaining`}
            </p>
          </div>

          <p className="section-label mb-3 px-1">
            Set Pieces ({totalCount})
          </p>

          <div className="space-y-3">
            {playerData.setPieces.map((sp: PlayerSpecificViewDataSetPiecesItem, idx: number) => {
              const readinessStatus = sp.readiness?.status;
              const isReady = readinessStatus === 'opened' || readinessStatus === 'passed';

              return (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  key={sp.id}
                  onClick={() => { setActiveSetPieceId(sp.id); setScreen('detail'); }}
                  className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] active:scale-[0.98] transition-all cursor-pointer hover:border-white/[0.12] group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="section-label px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      {sp.category.replace(/_/g, ' ')}
                    </span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isReady ? 'bg-primary/15' : 'bg-amber-500/10'}`}>
                      {isReady ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-amber-500" />}
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-[17px] mb-2 text-white group-hover:text-primary/90 transition-colors">{sp.title}</h3>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Your Role:</span>
                    <span className="text-xs font-semibold text-white bg-white/[0.06] px-2.5 py-1 rounded-lg">{sp.playerRole?.name || 'Team Overview'}</span>
                  </div>

                  {sp.playerRole?.description && (
                    <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">{sp.playerRole.description}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground">Loading your match pack...</p>
    </div>
  );
}
