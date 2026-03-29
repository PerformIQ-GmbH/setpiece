import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateTeam, useCreatePlayer, useListTemplates, useCreateSetPiece, useCreateRole, useCreateShareLink, useUpsertAssignment } from '@workspace/api-client-react';
import type { SetPieceTemplate } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Users, Shirt, LayoutTemplate, UserCog, Trophy, ArrowRight, ArrowLeft, QrCode, ExternalLink, Plus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

const STEPS = [
  { id: 'team', title: 'Create Your Team', icon: Users },
  { id: 'players', title: 'Add Players', icon: Shirt },
  { id: 'template', title: 'Choose a Template', icon: LayoutTemplate },
  { id: 'roles', title: 'Assign Roles', icon: UserCog },
  { id: 'success', title: 'You\'re All Set!', icon: Trophy },
];

interface PlayerDraft {
  firstName: string;
  lastName: string;
  shirtNumber: string;
}

interface CreatedRole {
  id: string;
  name: string;
}

interface CreatedPlayer {
  id: string;
  firstName: string;
  lastName: string;
  shirtNumber?: number;
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const createTeam = useCreateTeam();
  const createPlayer = useCreatePlayer();
  const { data: templates } = useListTemplates();
  const createSetPiece = useCreateSetPiece();
  const createRole = useCreateRole();
  const createShareLink = useCreateShareLink();
  const upsertAssignment = useUpsertAssignment();

  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [playerDrafts, setPlayerDrafts] = useState<PlayerDraft[]>([
    { firstName: '', lastName: '', shirtNumber: '' },
    { firstName: '', lastName: '', shirtNumber: '' },
    { firstName: '', lastName: '', shirtNumber: '' },
  ]);
  const [createdPlayers, setCreatedPlayers] = useState<CreatedPlayer[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [setPieceId, setSetPieceId] = useState('');
  const [createdRoles, setCreatedRoles] = useState<CreatedRole[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  const [shareLink, setShareLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const canProceed = () => {
    if (step === 0) return teamName.trim().length >= 2;
    if (step === 1) return playerDrafts.some(p => p.firstName.trim() && p.lastName.trim());
    if (step === 2) return !!selectedTemplateId;
    return true;
  };

  const handleNext = async () => {
    setIsSubmitting(true);
    setStepError(null);
    try {
      if (step === 0 && !teamId) {
        const team = await createTeam.mutateAsync({ data: { name: teamName.trim() } });
        setTeamId(team.id);
      }

      if (step === 1 && teamId) {
        const validPlayers = playerDrafts.filter(p => p.firstName.trim() && p.lastName.trim());
        const created: CreatedPlayer[] = [];
        for (const p of validPlayers) {
          const res = await createPlayer.mutateAsync({
            teamId,
            data: {
              firstName: p.firstName.trim(),
              lastName: p.lastName.trim(),
              shirtNumber: p.shirtNumber ? parseInt(p.shirtNumber) : undefined,
            }
          });
          created.push({ id: res.id, firstName: p.firstName.trim(), lastName: p.lastName.trim(), shirtNumber: p.shirtNumber ? parseInt(p.shirtNumber) : undefined });
        }
        setCreatedPlayers(created);
      }

      if (step === 2 && teamId && selectedTemplateId) {
        const tmpl = templates?.find(t => t.id === selectedTemplateId);
        if (tmpl) {
          const sp = await createSetPiece.mutateAsync({
            teamId,
            data: { title: tmpl.title, category: tmpl.category, templateId: tmpl.id }
          });
          setSetPieceId(sp.id);

          const defaultRoles = tmpl.defaultRoles || [];
          const roles: CreatedRole[] = [];
          for (const roleItem of defaultRoles) {
            const roleName = roleItem.name || 'Role';
            const pos = roleItem.startPosition
              ? { x: roleItem.startPosition.x ?? 50, y: roleItem.startPosition.y ?? 50 }
              : { x: 30 + Math.random() * 40, y: 20 + Math.random() * 60 };
            const r = await createRole.mutateAsync({
              teamId, setPieceId: sp.id,
              data: { name: roleName, startPosition: pos }
            });
            roles.push({ id: r.id, name: roleName });
          }
          setCreatedRoles(roles);
        }
      }

      if (step === 3 && teamId && setPieceId) {
        for (const [roleId, playerId] of Object.entries(roleAssignments)) {
          if (playerId) {
            await upsertAssignment.mutateAsync({
              teamId, setPieceId,
              data: { roleId, playerId }
            });
          }
        }

        const link = await createShareLink.mutateAsync({
          teamId,
          data: {}
        });
        const url = `${window.location.origin}${import.meta.env.BASE_URL}p/${link.token}`;
        setShareLink(url);
      }

      setStep(s => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setStepError(message);
    }
    setIsSubmitting(false);
  };

  const addPlayerRow = () => {
    setPlayerDrafts(prev => [...prev, { firstName: '', lastName: '', shirtNumber: '' }]);
  };

  const updatePlayer = (idx: number, field: keyof PlayerDraft, value: string) => {
    setPlayerDrafts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePlayer = (idx: number) => {
    if (playerDrafts.length <= 1) return;
    setPlayerDrafts(prev => prev.filter((_, i) => i !== idx));
  };

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-center px-6 shrink-0">
        <h1 className="font-display font-bold text-lg text-white tracking-tight">SETPIECE</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary/20 text-primary border-2 border-primary' :
                  'bg-secondary text-muted-foreground border border-border'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <currentStep.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-display font-bold text-xl text-white">{currentStep.title}</h2>
                  </div>

                  {step === 0 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-4">What's your team called? You can change this anytime.</p>
                      <input
                        autoFocus
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="e.g. FC Lightning"
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary outline-none"
                      />
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">Add your key players. You can add more later from the roster page.</p>
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {playerDrafts.map((p, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input value={p.firstName} onChange={e => updatePlayer(idx, 'firstName', e.target.value)} placeholder="First" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                            <input value={p.lastName} onChange={e => updatePlayer(idx, 'lastName', e.target.value)} placeholder="Last" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
                            <input value={p.shirtNumber} onChange={e => updatePlayer(idx, 'shirtNumber', e.target.value.replace(/\D/g, ''))} placeholder="#" className="w-14 bg-background border border-border rounded-lg px-2 py-2 text-sm text-center focus:border-primary outline-none" />
                            {playerDrafts.length > 1 && (
                              <button onClick={() => removePlayer(idx)} className="text-muted-foreground hover:text-destructive text-lg leading-none">&times;</button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={addPlayerRow} className="w-full border-dashed text-xs">
                        <Users className="w-3.5 h-3.5 mr-2" /> Add Another
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">Pick a template to start with. This creates your first set piece.</p>
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {templates?.map((t: SetPieceTemplate) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTemplateId(t.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                              selectedTemplateId === t.id ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 border-border hover:border-muted-foreground'
                            }`}
                          >
                            <p className="font-semibold text-sm text-white">{t.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{t.category.replace(/_/g, ' ')}</p>
                            {t.defaultRoles && t.defaultRoles.length > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-1">{t.defaultRoles.length} roles: {t.defaultRoles.map(r => r.name).join(', ')}</p>
                            )}
                          </button>
                        ))}
                        {(!templates || templates.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-4">No templates available. You can create a blank set piece from the dashboard.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">Assign players to roles. You can change these later in the editor.</p>
                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                        {createdRoles.map(role => (
                          <div key={role.id} className="p-3 rounded-xl bg-secondary/30 border border-border">
                            <label className="text-xs font-bold text-primary uppercase tracking-wider mb-1 block">{role.name}</label>
                            <select
                              value={roleAssignments[role.id] || ''}
                              onChange={e => setRoleAssignments(prev => ({ ...prev, [role.id]: e.target.value }))}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                            >
                              <option value="">Unassigned</option>
                              {createdPlayers.map(p => (
                                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.shirtNumber ? `(#${p.shirtNumber})` : ''}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {createdRoles.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No roles to assign. You'll create roles in the editor.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6 text-center py-2">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                        <Trophy className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg mb-2">Your team is ready!</p>
                        <p className="text-muted-foreground text-sm">
                          <span className="text-white font-semibold">{teamName}</span> has been created
                          {createdPlayers.length > 0 && <> with {createdPlayers.length} player{createdPlayers.length !== 1 ? 's' : ''}</>}
                          {setPieceId && <> and your first set piece</>}.
                        </p>
                      </div>

                      {setPieceId && selectedTemplate && (
                        <div className="bg-secondary/50 border border-border rounded-xl p-4 text-left">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                              <LayoutTemplate className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white">{selectedTemplate.title}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{selectedTemplate.category.replace(/_/g, ' ')}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{createdRoles.length} roles</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{createdPlayers.filter(p => createdRoles.some(() => true)).length} assigned</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {shareLink && (
                        <div className="flex flex-col items-center">
                          <div className="bg-white p-3 rounded-xl mb-2">
                            <QRCodeSVG value={shareLink} size={120} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">Share this QR with your players</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {setPieceId && (
                          <Button variant="outline" onClick={() => navigate(`/teams/${teamId}/set-pieces/${setPieceId}/editor`)} className="border-border text-xs">
                            Open Editor
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => navigate(`/teams/${teamId}/templates`)} className="border-border text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Add Set Piece
                        </Button>
                        <Button variant="outline" onClick={() => navigate(`/teams/${teamId}/matchdays`)} className="border-border text-xs">
                          <Calendar className="w-3 h-3 mr-1" /> Go to Matchday
                        </Button>
                        <Button onClick={() => navigate(`/teams/${teamId}`)} className="col-span-2">
                          Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>

                      {shareLink && (
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => window.open(shareLink, '_blank')}>
                          <ExternalLink className="w-3 h-3 mr-1" /> Preview Player View
                        </Button>
                      )}
                    </div>
                  )}

                  {stepError && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                      {stepError}
                    </div>
                  )}

                  {step < 4 && (
                    <div className="flex justify-between mt-8 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        onClick={() => setStep(s => Math.max(s - 1, 0))}
                        disabled={step === 0}
                        className="text-muted-foreground"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button
                        onClick={handleNext}
                        disabled={!canProceed() || isSubmitting}
                      >
                        {isSubmitting ? 'Setting up...' : step === 3 ? 'Finish Setup' : 'Continue'}
                        {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
