import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetPlayerView, useMarkPlayerReady } from '@workspace/api-client-react';
import { Loader2, ShieldAlert, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Pitch } from '@/components/Pitch';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function PlayerPWA() {
  const [, params] = useRoute('/p/:shareToken');
  const shareToken = params?.shareToken || '';

  const { data, isLoading, error, refetch } = useGetPlayerView(shareToken);
  const markReady = useMarkPlayerReady();

  const [activeSetPieceId, setActiveSetPieceId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
        <p className="text-muted-foreground">This share link has expired, been revoked, or is invalid.</p>
      </div>
    );
  }

  const activeSetPiece = data.setPieces.find(sp => sp.id === activeSetPieceId);

  const handleMarkReady = async (spId: string, roleId: string | undefined, playerId: string | undefined) => {
    if (!roleId || !playerId) return;
    try {
      await markReady.mutateAsync({
        shareToken,
        data: { setPieceId: spId, roleId, playerId }
      });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-primary selection:text-black">
      {/* Mobile Wrapper */}
      <div className="max-w-md mx-auto min-h-screen bg-[#111111] shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <header className="px-6 pt-12 pb-6 bg-gradient-to-b from-[#1A1A1A] to-transparent sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
              {data.team.logoUrl ? (
                <img src={data.team.logoUrl} alt="Team" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-primary">{data.team.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-sm text-muted-foreground font-semibold tracking-wider uppercase">Matchday Pack</h1>
              <h2 className="text-xl font-display font-bold leading-tight">{data.team.name}</h2>
            </div>
          </div>
        </header>

        {/* List View */}
        <main className="flex-1 overflow-y-auto px-4 pb-24">
          <p className="text-sm text-muted-foreground mb-6 px-2">
            You have <strong className="text-white">{data.setPieces.length}</strong> set pieces assigned to you. Review your roles and mark as ready.
          </p>

          <div className="space-y-4">
            {data.setPieces.map((sp, idx) => {
              const isReady = sp.readiness?.status === 'ready';
              const passedQuiz = sp.readiness?.status === 'quiz_passed';
              const statusColor = isReady || passedQuiz ? "text-primary border-primary/30 bg-primary/5" : "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={sp.id} 
                  onClick={() => setActiveSetPieceId(sp.id)}
                  className={`p-5 rounded-2xl border bg-[#1A1A1A] active:scale-[0.98] transition-all cursor-pointer ${statusColor}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-black/40 border border-white/10">
                      {sp.category.replace('_', ' ')}
                    </span>
                    {isReady || passedQuiz ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-yellow-500" />}
                  </div>
                  
                  <h3 className="font-display font-bold text-lg mb-1">{sp.title}</h3>
                  <div className="flex items-center text-sm">
                    <span className="text-muted-foreground mr-2">Your Role:</span>
                    <span className="font-semibold text-white">{sp.playerRole?.name || 'Unassigned'}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </main>

        {/* Detail Bottom Sheet / Overlay */}
        <AnimatePresence>
          {activeSetPieceId && activeSetPiece && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="absolute inset-0 bg-[#111111] z-50 flex flex-col"
            >
              <header className="p-4 border-b border-white/10 flex items-center bg-[#1A1A1A] shrink-0 sticky top-0 z-20">
                <button 
                  onClick={() => setActiveSetPieceId(null)}
                  className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center active:bg-white/10"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <div className="ml-4 flex-1">
                  <h2 className="font-display font-bold text-lg leading-tight">{activeSetPiece.title}</h2>
                  <p className="text-xs text-primary font-semibold">Your Role: {activeSetPiece.playerRole?.name}</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto pb-32">
                <div className="p-4">
                  {/* Pitch View focused on their role */}
                  <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <Pitch 
                      roles={activeSetPiece.roles} 
                      activeRoleId={activeSetPiece.playerRole?.id}
                      halfPitch={activeSetPiece.category.includes('corner') || activeSetPiece.category.includes('freekick')}
                    />
                  </div>

                  <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/5 mb-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Coaching Notes</h3>
                    <p className="text-sm leading-relaxed text-white/90">
                      {activeSetPiece.playerRole?.coachingPoint || activeSetPiece.coachingNotes || "No specific notes provided for this routine."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent pb-8">
                {activeSetPiece.readiness?.status === 'ready' || activeSetPiece.readiness?.status === 'quiz_passed' ? (
                  <Button className="w-full py-6 text-lg rounded-2xl bg-primary/20 text-primary border border-primary pointer-events-none">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> You are ready
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 py-6 rounded-2xl border-white/20 hover:bg-white/5 bg-black/50 backdrop-blur"
                      onClick={() => handleMarkReady(activeSetPiece.id, activeSetPiece.playerRole?.id, activeSetPiece.readiness?.playerId)}
                    >
                      Acknowledge
                    </Button>
                    <Link href={`/p/${shareToken}/quiz?setPieceId=${activeSetPiece.id}&playerId=${activeSetPiece.readiness?.playerId || ''}&roleId=${activeSetPiece.playerRole?.id || ''}`} className="flex-1">
                      <Button className="w-full py-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        Take Quiz
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
