import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateTeam, useCreatePlayer } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Users, Shirt, Target, Trophy, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 'welcome', title: 'Welcome to SETPIECE', icon: Sparkles },
  { id: 'team', title: 'Create Your Team', icon: Users },
  { id: 'players', title: 'Add Players', icon: Shirt },
  { id: 'goal', title: 'Your Coaching Goal', icon: Target },
  { id: 'success', title: 'You\'re All Set!', icon: Trophy },
];

interface PlayerDraft {
  firstName: string;
  lastName: string;
  shirtNumber: string;
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const createTeam = useCreateTeam();
  const createPlayer = useCreatePlayer();

  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [playerDrafts, setPlayerDrafts] = useState<PlayerDraft[]>([
    { firstName: '', lastName: '', shirtNumber: '' },
  ]);
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed = () => {
    if (step === 1) return teamName.trim().length >= 2;
    if (step === 2) return playerDrafts.some(p => p.firstName.trim() && p.lastName.trim());
    return true;
  };

  const handleNext = async () => {
    if (step === 1 && !teamId) {
      setIsSubmitting(true);
      try {
        const team = await createTeam.mutateAsync({ data: { name: teamName.trim() } });
        setTeamId(team.id);
      } catch {
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }

    if (step === 2 && teamId) {
      setIsSubmitting(true);
      const validPlayers = playerDrafts.filter(p => p.firstName.trim() && p.lastName.trim());
      for (const p of validPlayers) {
        try {
          await createPlayer.mutateAsync({
            teamId,
            data: {
              firstName: p.firstName.trim(),
              lastName: p.lastName.trim(),
              shirtNumber: p.shirtNumber ? parseInt(p.shirtNumber) : undefined,
            }
          });
        } catch { /* skip duplicates */ }
      }
      setIsSubmitting(false);
    }

    setStep(s => Math.min(s + 1, STEPS.length - 1));
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
                {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
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
                      <p className="text-muted-foreground leading-relaxed">
                        SETPIECE helps you design, share, and drill set piece routines with your squad. Let's get you set up in under a minute.
                      </p>
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        {[
                          { icon: '📋', label: 'Design routines' },
                          { icon: '📱', label: 'Share via QR' },
                          { icon: '✅', label: 'Track readiness' },
                        ].map(f => (
                          <div key={f.label} className="text-center p-3 rounded-xl bg-secondary/30 border border-border">
                            <p className="text-2xl mb-1">{f.icon}</p>
                            <p className="text-xs text-muted-foreground">{f.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-4">What's your team called? You can always change this later.</p>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Team Name</label>
                        <input
                          autoFocus
                          value={teamName}
                          onChange={e => setTeamName(e.target.value)}
                          placeholder="e.g. FC Lightning"
                          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">Add a few players to get started. You can add more later.</p>
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {playerDrafts.map((p, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              value={p.firstName}
                              onChange={e => updatePlayer(idx, 'firstName', e.target.value)}
                              placeholder="First name"
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                            />
                            <input
                              value={p.lastName}
                              onChange={e => updatePlayer(idx, 'lastName', e.target.value)}
                              placeholder="Last name"
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                            />
                            <input
                              value={p.shirtNumber}
                              onChange={e => updatePlayer(idx, 'shirtNumber', e.target.value.replace(/\D/g, ''))}
                              placeholder="#"
                              className="w-14 bg-background border border-border rounded-lg px-2 py-2 text-sm text-center focus:border-primary outline-none"
                            />
                            {playerDrafts.length > 1 && (
                              <button onClick={() => removePlayer(idx)} className="text-muted-foreground hover:text-destructive text-xs">×</button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={addPlayerRow} className="w-full border-dashed">
                        <Users className="w-3.5 h-3.5 mr-2" /> Add Another Player
                      </Button>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-4">What's your primary goal? This helps us personalize your experience.</p>
                      <div className="space-y-2">
                        {[
                          { id: 'corners', label: 'Corner Kick Mastery', desc: 'Score more from corners' },
                          { id: 'freekicks', label: 'Free Kick Routines', desc: 'Create dangerous free kicks' },
                          { id: 'all', label: 'All Set Pieces', desc: 'Comprehensive set piece system' },
                          { id: 'defense', label: 'Defensive Organization', desc: 'Defend set pieces better' },
                        ].map(g => (
                          <button
                            key={g.id}
                            onClick={() => setGoal(g.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                              goal === g.id ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 border-border hover:border-muted-foreground'
                            }`}
                          >
                            <p className="font-semibold text-sm text-white">{g.label}</p>
                            <p className="text-xs text-muted-foreground">{g.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6 text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                        <Trophy className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg mb-2">Your team is ready!</p>
                        <p className="text-muted-foreground text-sm">
                          <span className="text-white font-semibold">{teamName}</span> has been created
                          {playerDrafts.filter(p => p.firstName.trim()).length > 0 && (
                            <> with {playerDrafts.filter(p => p.firstName.trim()).length} player{playerDrafts.filter(p => p.firstName.trim()).length !== 1 ? 's' : ''}</>
                          )}. Head to your dashboard to start building set pieces.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={() => navigate(`/teams/${teamId}/templates`)} className="border-border">
                          Browse Templates
                        </Button>
                        <Button onClick={() => navigate(`/teams/${teamId}`)}>
                          Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
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
