import { useState, useEffect, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetPlayerView, useGetPlayerSpecificView, useMarkPlayerReady } from '@workspace/api-client-react';
import type { PlayerViewDataPlayersItem, PlayerSpecificViewDataSetPiecesItem } from '@workspace/api-client-react';
import { Loader2, ShieldAlert, ChevronRight, CheckCircle2, Circle, Search, ArrowLeft } from 'lucide-react';
import { PlayerBoardViewer } from '@/components/PlayerBoardViewer';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
        <p className="text-muted-foreground">This share link has expired, been revoked, or is invalid.</p>
      </div>
    );
  }

  if (screen === 'identify') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
        <div className="max-w-md mx-auto min-h-screen bg-[#111111] flex flex-col">
          <header className="px-6 pt-12 pb-6 bg-gradient-to-b from-[#1A1A1A] to-transparent shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                {teamData.team.logoUrl ? (
                  <img src={teamData.team.logoUrl} alt="Team" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-primary">{teamData.team.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h1 className="text-sm text-muted-foreground font-semibold tracking-wider uppercase">Matchday Pack</h1>
                <h2 className="text-xl font-display font-bold leading-tight">{teamData.team.name}</h2>
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Who are you?</h3>
            <p className="text-sm text-muted-foreground">Select your name to see your set piece roles.</p>
          </header>

          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or shirt number..."
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="space-y-2">
              {filteredPlayers.map((player: PlayerViewDataPlayersItem, idx: number) => (
                <motion.button
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleSelectPlayer(player.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#1A1A1A] border border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    {player.shirtNumber ? (
                      <span className="font-bold text-primary text-sm">{player.shirtNumber}</span>
                    ) : (
                      <span className="font-bold text-primary text-xs">{player.firstName[0]}{player.lastName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{player.firstName} {player.lastName}</p>
                    {player.shirtNumber && <p className="text-xs text-muted-foreground">#{player.shirtNumber}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.button>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">No players found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (playerError) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Player Not Found</h1>
        <p className="text-muted-foreground mb-6">We couldn't load your data. Please try selecting your name again.</p>
        <Button variant="outline" className="border-white/20" onClick={handleSwitchPlayer}>
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

  if (screen === 'detail' && activeSetPiece) {
    const readinessStatus = activeSetPiece.readiness?.status;
    const isReady = readinessStatus === 'opened' || readinessStatus === 'passed';

    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
        <div className="max-w-md mx-auto min-h-screen bg-[#111111] flex flex-col">
          <header className="p-4 border-b border-white/10 flex items-center bg-[#1A1A1A] shrink-0 sticky top-0 z-20">
            <button
              onClick={() => { setScreen('overview'); setActiveSetPieceId(null); }}
              className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center active:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="ml-4 flex-1">
              <h2 className="font-display font-bold text-lg leading-tight">{activeSetPiece.title}</h2>
              {activeSetPiece.playerRole && (
                <p className="text-xs text-primary font-semibold">Your Role: {activeSetPiece.playerRole.name}</p>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-32">
            <div className="p-4">
              <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <PlayerBoardViewer
                  roles={activeSetPiece.roles || []}
                  assignments={activeSetPiece.assignments || []}
                  boardData={activeSetPiece.boardData as any}
                  category={activeSetPiece.category}
                  activePlayerId={selectedPlayerId || undefined}
                  activeRoleId={activeSetPiece.playerRole?.id}
                />
              </div>

              {activeSetPiece.playerRole?.description && (
                <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 mb-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Your Instructions</h3>
                  <p className="text-sm leading-relaxed text-white/90">{activeSetPiece.playerRole.description}</p>
                </div>
              )}

              {(() => {
                const myAssignment = (activeSetPiece.assignments || []).find(
                  (a: { roleId: string; playerId: string; notes?: string | null }) =>
                    a.roleId === activeSetPiece.playerRole?.id && a.playerId === selectedPlayerId
                );
                return myAssignment?.notes ? (
                  <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-primary/20 mb-4">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-2">Coach's Note for You</h3>
                    <p className="text-sm leading-relaxed text-white/90">{myAssignment.notes}</p>
                  </div>
                ) : null;
              })()}

              {(activeSetPiece.playerRole?.coachingPoint || activeSetPiece.coachingNotes) && (
                <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 mb-6">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Coaching Notes</h3>
                  <p className="text-sm leading-relaxed text-white/90">
                    {activeSetPiece.playerRole?.coachingPoint || activeSetPiece.coachingNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent pb-8 max-w-md mx-auto">
            {isReady ? (
              <Button className="w-full py-6 text-lg rounded-2xl bg-primary/20 text-primary border border-primary pointer-events-none">
                <CheckCircle2 className="w-5 h-5 mr-2" /> You are ready
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 py-6 rounded-2xl border-white/20 hover:bg-white/5 bg-black/50 backdrop-blur"
                  onClick={() => handleMarkReady(activeSetPiece.id, activeSetPiece.playerRole?.id)}
                  disabled={markReady.isPending}
                >
                  {markReady.isPending ? 'Saving...' : 'Acknowledge'}
                </Button>
                <Link href={`/p/${shareToken}/quiz?setPieceId=${activeSetPiece.id}&playerId=${selectedPlayerId || ''}&roleId=${activeSetPiece.playerRole?.id || ''}`} className="flex-1">
                  <Button className="w-full py-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    Take Quiz
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-primary selection:text-black">
      <div className="max-w-md mx-auto min-h-screen bg-[#111111] shadow-2xl relative overflow-hidden flex flex-col">
        <header className="px-6 pt-12 pb-6 bg-gradient-to-b from-[#1A1A1A] to-transparent sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
              {teamData.team.logoUrl ? (
                <img src={teamData.team.logoUrl} alt="Team" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-primary">{teamData.team.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-sm text-muted-foreground font-semibold tracking-wider uppercase">Matchday Pack</h1>
              <h2 className="text-xl font-display font-bold leading-tight">{teamData.team.name}</h2>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-muted-foreground">
              <span className="text-white font-semibold">{playerData.player.firstName} {playerData.player.lastName}</span>
              {playerData.player.shirtNumber && <span className="text-primary ml-1">#{playerData.player.shirtNumber}</span>}
            </p>
            <button onClick={handleSwitchPlayer} className="text-xs text-primary hover:underline">
              Not you?
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24">
          <p className="text-sm text-muted-foreground mb-6 px-2">
            You have <strong className="text-white">{playerData.setPieces.length}</strong> set piece{playerData.setPieces.length !== 1 && 's'} to review.
          </p>

          <div className="space-y-4">
            {playerData.setPieces.map((sp: PlayerSpecificViewDataSetPiecesItem, idx: number) => {
              const readinessStatus = sp.readiness?.status;
              const isReady = readinessStatus === 'opened' || readinessStatus === 'passed';
              const statusColor = isReady ? "text-primary border-primary/30 bg-primary/5" : "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={sp.id}
                  onClick={() => { setActiveSetPieceId(sp.id); setScreen('detail'); }}
                  className={`p-5 rounded-2xl border bg-[#1A1A1A] active:scale-[0.98] transition-all cursor-pointer ${statusColor}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-black/40 border border-white/10">
                      {sp.category.replace(/_/g, ' ')}
                    </span>
                    {isReady ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-yellow-500" />}
                  </div>

                  <h3 className="font-display font-bold text-lg mb-1">{sp.title}</h3>
                  <div className="flex items-center text-sm">
                    <span className="text-muted-foreground mr-2">Your Role:</span>
                    <span className="font-semibold text-white">{sp.playerRole?.name || 'Team Overview'}</span>
                  </div>
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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}
