import { useState } from 'react';
import { PlayerBoardViewer } from '@/components/PlayerBoardViewer';
import { demoPlayers, demoSetPiece } from '@/lib/demo-fixture';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export function ProductWalkthrough({ onAnswer }: { onAnswer?: (correct: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<'correct' | 'retry' | null>(null);
  const labels = ['Variante planen', 'Spieleraufgabe', 'Rückmeldung'];
  return <section aria-label="Interaktives Produktbeispiel" className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
      <h2 className="text-sm font-semibold">Ecke · Erster Pfosten</h2>
      <span className="text-xs text-muted-foreground">Fiktives Beispiel</span>
    </div>
    <div role="tablist" aria-label="Beispielablauf" className="grid grid-cols-3 border-b border-border">
      {labels.map((label, index) => <button key={label} id={`example-tab-${index}`} type="button" role="tab" tabIndex={step === index ? 0 : -1} aria-selected={step === index} aria-controls={`example-panel-${index}`} onClick={() => setStep(index)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % labels.length : event.key === 'ArrowLeft' ? (index + labels.length - 1) % labels.length : event.key === 'Home' ? 0 : event.key === 'End' ? labels.length - 1 : null;
        if (next == null) return;
        event.preventDefault();
        setStep(next);
        document.getElementById(`example-tab-${next}`)?.focus();
      }} className={`min-h-12 px-2 py-3 text-xs sm:text-sm ${step === index ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`example-panel-${step}`} aria-labelledby={`example-tab-${step}`} className="p-4 sm:p-5">
      {step === 0 && <>
        <div className="mx-auto max-w-[340px]" aria-label="Taktiktafel: Spieler 9 läuft zum ersten Pfosten, Spieler 6 sichert den Rückraum.">
          <PlayerBoardViewer roles={demoSetPiece.roles} assignments={demoSetPiece.assignments} players={demoPlayers} boardData={demoSetPiece.boardData} category={demoSetPiece.category} activeRoleId="role-9" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Spieler 9 startet zum ersten Pfosten. Spieler 6 hält den Rückraum. Jede Rolle bekommt eine klare Aufgabe.</p>
        <Button variant="outline" className="mt-4 w-full" onClick={() => setStep(1)}>Spieleraufgabe ausprobieren <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </>}
      {step === 1 && <div className="flex min-h-[400px] flex-col justify-center gap-5">
        <div><p className="text-sm text-primary">Deine Rolle: Spieler 9</p><h3 className="mt-2 font-display text-2xl font-semibold">Wohin startest du mit dem Anlauf des Schützen?</h3></div>
        <Button variant="outline" className="h-auto min-h-12 justify-start whitespace-normal text-left" onClick={() => { setAnswer('correct'); onAnswer?.(true); }}>Zum ersten Pfosten</Button>
        <Button variant="outline" className="h-auto min-h-12 justify-start whitespace-normal text-left" onClick={() => { setAnswer('retry'); onAnswer?.(false); }}>Im Rückraum bleiben</Button>
        <p aria-live="polite" className="min-h-12 text-sm leading-relaxed">{answer === 'correct' ? 'Richtig. Du startest zum ersten Pfosten. Die Absicherung übernimmt Spieler 6.' : answer === 'retry' ? 'Schau dir deine Rolle nochmals an: Den Rückraum sichert Spieler 6.' : 'Wähle eine Antwort. Dieses vereinfachte Beispiel wird nicht gespeichert.'}</p>
        {answer === 'correct' && <Button onClick={() => setStep(2)}>Rückmeldung des Trainers ansehen</Button>}
      </div>}
      {step === 2 && <div className="flex min-h-[400px] flex-col justify-center gap-5">
        <h3 className="font-display text-2xl font-semibold">Vom Plan zur Rückmeldung.</h3>
        <div className="flex items-start gap-3 border-y border-border py-5"><CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${answer === 'correct' ? 'text-primary' : 'text-muted-foreground'}`} /><div><p className="font-semibold">Spieler 9 · Erster Pfosten</p><p className="mt-1 text-sm text-muted-foreground">{answer === 'correct' ? 'Aufgabe im Beispiel richtig beantwortet.' : 'Beispielaufgabe noch nicht richtig beantwortet.'}</p></div></div>
        <p className="text-sm leading-relaxed text-muted-foreground">In deinem Team siehst du, wer seine Aufgabe geöffnet hat und wer sie nochmals durchgehen sollte. Ein bestandenes Quiz ersetzt die Ausführung im Training nicht.</p>
        <button type="button" className="self-start text-sm text-primary underline underline-offset-4" onClick={() => setStep(1)}>Zur Spieleraufgabe</button>
      </div>}
    </div>
  </section>;
}
