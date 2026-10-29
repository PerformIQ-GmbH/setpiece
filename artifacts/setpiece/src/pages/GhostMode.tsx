import { useState } from 'react';
import { CoachLayout } from '@/components/Layout';
import { useRoute, Link } from 'wouter';
import { useGetTeam, useGetSetPiece, useListPlayers, usePreviewGhostSubstitution, useUpsertAssignment } from '@workspace/api-client-react';
import type {
  GhostSubstitutionResponse,
  GhostSubstitutionResponseAfterPositionsItem,
  GhostSubstitutionResponseUpdatedRoleMappingItem,
  GhostSubstitutionResponseSuitabilityHintsItem,
} from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pitch } from '@/components/Pitch';
import { pitchOrientationForCategory } from '@/utils/pitchGeometry';
import { ArrowLeft, UserMinus, UserPlus, ArrowRight, AlertTriangle, CheckCircle2, Info, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GhostMode() {
  const [, params] = useRoute('/teams/:teamId/ghost/:setPieceId');
  const teamId = params?.teamId || '';
  const setPieceId = params?.setPieceId || '';
  const { data: team } = useGetTeam(teamId);
  const { data: setPiece, isLoading } = useGetSetPiece(teamId, setPieceId);
  const { data: players } = useListPlayers(teamId);
  const ghostSub = usePreviewGhostSubstitution();
  const upsertAssignment = useUpsertAssignment();

  const [playerOut, setPlayerOut] = useState('');
  const [playerIn, setPlayerIn] = useState('');
  const [result, setResult] = useState<GhostSubstitutionResponse | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const assignedPlayerIds = setPiece?.assignments?.map(a => a.playerId) || [];
  const assignedPlayers = players?.filter(p => assignedPlayerIds.includes(p.id)) || [];
  const availableSubs = players?.filter(p => !assignedPlayerIds.includes(p.id) && p.status === 'active') || [];

  const handleGhost = async () => {
    if (!playerOut || !playerIn) return;
    const res = await ghostSub.mutateAsync({ teamId, setPieceId, data: { playerOutId: playerOut, playerInId: playerIn } });
    setResult(res);
  };

  const afterRoles = result?.afterPositions?.map((ap: GhostSubstitutionResponseAfterPositionsItem) => ({
    id: ap.roleId || '',
    name: ap.roleName || '',
    startPosition: ap.position,
    color: ap.isGhost ? '#3b82f6' : undefined,
  })) || [];

  if (isLoading) {
    return <CoachLayout teamId={teamId}><div className="animate-pulse h-64 bg-card rounded-2xl" /></CoachLayout>;
  }

  return (
    <CoachLayout teamId={teamId} teamName={team?.name}>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/teams/${teamId}/set-pieces/${setPieceId}/editor`}>
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Ghost Mode</h1>
          <p className="text-muted-foreground text-sm">{setPiece?.title} - Substitution Preview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card className="bg-card border-border mb-4">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                  <UserMinus className="h-3.5 w-3.5 text-red-400" /> Player Out
                </label>
                <select value={playerOut} onChange={e => { setPlayerOut(e.target.value); setResult(null); }} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
                  <option value="">Select player to remove...</option>
                  {assignedPlayers.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.shirtNumber ? `(#${p.shirtNumber})` : ''}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                  <UserPlus className="h-3.5 w-3.5 text-blue-400" /> Player In
                </label>
                <select value={playerIn} onChange={e => { setPlayerIn(e.target.value); setResult(null); }} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
                  <option value="">Select replacement...</option>
                  {availableSubs.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.shirtNumber ? `(#${p.shirtNumber})` : ''}</option>)}
                </select>
              </div>
              <Button onClick={handleGhost} disabled={!playerOut || !playerIn || ghostSub.isPending} className="w-full">
                Preview Substitution <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="bg-card border-border">
                  <CardContent className="p-5">
                    <h3 className="font-display font-bold text-base text-white mb-3">Substitution Result</h3>

                    {result.warnings.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {result.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300">{w}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.updatedRoleMapping.map((mapping: GhostSubstitutionResponseUpdatedRoleMappingItem) => (
                      <div key={mapping.roleId} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 mb-1.5">
                        <span className="text-sm font-medium text-white">{mapping.roleName}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-red-400">{players?.find(p => p.id === mapping.previousPlayerId)?.lastName || mapping.previousPlayerId}</span>
                          <ArrowRight className="h-3 w-3 text-blue-400" />
                          <span className="text-blue-400">{players?.find(p => p.id === mapping.newPlayerId)?.lastName || mapping.newPlayerId}</span>
                        </div>
                      </div>
                    ))}

                    {result.suitabilityHints.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {result.suitabilityHints.map((hint: GhostSubstitutionResponseSuitabilityHintsItem, i: number) => (
                          <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${hint.severity === 'critical' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : hint.severity === 'warning' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'}`}>
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{hint.roleName}: {hint.hint}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.warnings.length === 0 && result.suitabilityHints.length === 0 && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                        <CheckCircle2 className="h-4 w-4" /> Clean substitution - no issues detected
                      </div>
                    )}

                    {applyError && (
                      <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                        {applyError}
                      </div>
                    )}

                    {applied ? (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="h-4 w-4" /> Substitution applied successfully
                      </div>
                    ) : (
                      <div className="flex gap-3 mt-4 pt-3 border-t border-border">
                        <Button
                          className="flex-1"
                          disabled={applying}
                          onClick={async () => {
                            setApplying(true);
                            setApplyError(null);
                            try {
                              for (const mapping of result.updatedRoleMapping) {
                                if (mapping.roleId && mapping.newPlayerId) {
                                  await upsertAssignment.mutateAsync({
                                    teamId, setPieceId,
                                    data: { roleId: mapping.roleId, playerId: mapping.newPlayerId }
                                  });
                                }
                              }
                              setApplied(true);
                            } catch (err) {
                              setApplyError(err instanceof Error ? err.message : 'Failed to apply substitution. Some assignments may have been partially applied.');
                            } finally {
                              setApplying(false);
                            }
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" /> {applying ? 'Applying...' : 'Confirm Substitution'}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-border"
                          onClick={() => { setResult(null); setPlayerOut(''); setPlayerIn(''); }}
                        >
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          {result && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Before</h3>
              <Card className="bg-card border-border overflow-hidden opacity-60">
                <CardContent className="p-0">
                  <Pitch
                    roles={(setPiece?.roles || []).map(r => ({
                      id: r.id,
                      name: r.name,
                      startPosition: r.startPosition,
                      color: result.updatedRoleMapping.some(m => m.roleId === r.id) ? '#ef4444' : undefined,
                    }))}
                    halfPitch={pitchOrientationForCategory(setPiece?.category ?? '') === 'half'}
                  />
                </CardContent>
              </Card>
            </div>
          )}
          <div>
            {result && <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">After</h3>}
            <Card className={`bg-card border-border overflow-hidden ${result ? 'ring-1 ring-primary/40' : ''}`}>
              <CardContent className="p-0">
                <Pitch
                  roles={afterRoles.length > 0 ? afterRoles : (setPiece?.roles || [])}
                  halfPitch={pitchOrientationForCategory(setPiece?.category ?? '') === 'half'}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CoachLayout>
  );
}
