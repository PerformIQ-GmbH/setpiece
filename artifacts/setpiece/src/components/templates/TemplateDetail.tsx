import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Lightbulb, Loader2 } from 'lucide-react';
import type { SetPieceTemplate } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SetPieceThumbnail } from '@/components/SetPieceThumbnail';
import { VideoClipList } from '@/components/VideoClips';
import { AGAINST_LABELS, categoryLabel } from '@/lib/templateFilters';
import { LevelBadge, Pill } from './TemplateCard';

/** Step names of the first variant, for the step buttons under the drawing. */
function stepLabels(boardData: SetPieceTemplate['boardData']): string[] {
  const variants = (boardData as { variants?: { steps?: { label?: string; sortOrder?: number }[] }[] } | null | undefined)?.variants;
  return [...(variants?.[0]?.steps ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((s, i) => s.label || `Schritt ${i + 1}`);
}

const segment = (active: boolean) =>
  `min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-white">{children}</dd>
    </div>
  );
}

/** Everything a coach needs to decide: the real scene, the drawing step by step, pros and cons, who it suits. */
export function TemplateDetail({ template, onClose, onUse, busy, useLabel = 'Für mein Team übernehmen' }: {
  template: SetPieceTemplate | null;
  onClose: () => void;
  onUse: (t: SetPieceTemplate) => void;
  busy?: boolean;
  useLabel?: string;
}) {
  const hasClip = !!template?.media?.length;
  const [view, setView] = useState<'video' | 'board'>('video');
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => { setView(template?.media?.length ? 'video' : 'board'); setStep(null); }, [template?.id]);

  const p = template?.profile;
  const steps = template ? stepLabels(template.boardData) : [];
  return (
    <Dialog open={!!template} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0 sm:p-0">
        {template && (
          <>
            <DialogHeader className="space-y-1 p-5 pr-14 text-left">
              <DialogTitle className="text-xl font-bold leading-snug">{template.title}</DialogTitle>
              <DialogDescription>{categoryLabel(template.category)} · {template.defaultRoles?.length ?? 0} Spieler</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-5 pb-5">
              {hasClip && (
                <div role="tablist" aria-label="Ansicht" className="flex gap-1 rounded-xl bg-white/[0.05] p-1">
                  <button type="button" role="tab" aria-selected={view === 'video'} className={segment(view === 'video')} onClick={() => setView('video')}>Echte Szene</button>
                  <button type="button" role="tab" aria-selected={view === 'board'} className={segment(view === 'board')} onClick={() => setView('board')}>Zeichnung</button>
                </div>
              )}

              {view === 'video' && hasClip
                ? <VideoClipList clips={template.media!} />
                : (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#102e28]">
                      <SetPieceThumbnail
                        boardData={template.boardData} category={template.category} roles={template.defaultRoles} imageUrl={template.previewImageUrl}
                        stepIndex={step} className="block aspect-[4/3] w-full"
                        label={`Zeichnung: ${template.title}${step !== null ? `, ${steps[step]}` : ''}`}
                      />
                    </div>
                    {steps.length > 1 && (
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Schritt der Zeichnung">
                        <button type="button" aria-pressed={step === null} onClick={() => setStep(null)} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${step === null ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>Überblick</button>
                        {steps.map((label, i) => (
                          <button key={i} type="button" aria-pressed={step === i} onClick={() => setStep(i)} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${step === i ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>
                            {i + 1}. {label}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Grün: Läufe. Weiss: Weg des Balls. Rot: Gegner. Die Zeichnung ist eine Vorlage, du passt sie im Editor an dein Team an.</p>
                  </div>
                )}

              {p && (
                <>
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Fact label="Niveau"><LevelBadge level={p.level} /></Fact>
                    <Fact label="Aufwand">{p.effort}</Fact>
                    <Fact label="Junioren">{p.juniors ? 'Gut geeignet' : 'Eher für Erwachsene'}</Fact>
                    <Fact label="Kopfball">{p.needsHeader ? 'Wird gebraucht' : 'Nicht nötig'}</Fact>
                    <Fact label="Passt gegen">{p.against.length ? <span className="flex flex-wrap gap-1">{p.against.map(a => <Pill key={a}>{AGAINST_LABELS[a]}</Pill>)}</span> : 'Kein bestimmter Gegner'}</Fact>
                    <Fact label="Spieler">{template.defaultRoles?.length ?? 0} Rollen</Fact>
                  </dl>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <section aria-labelledby="tpl-pros" className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                      <h3 id="tpl-pros" className="mb-2 text-sm font-bold text-emerald-300">Vorteile</h3>
                      <ul className="space-y-2 text-sm text-foreground">
                        {p.pros.map((line, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden="true" />{line}</li>)}
                      </ul>
                    </section>
                    <section aria-labelledby="tpl-cons" className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                      <h3 id="tpl-cons" className="mb-2 text-sm font-bold text-amber-300">Nachteile und Voraussetzungen</h3>
                      <ul className="space-y-2 text-sm text-foreground">
                        {p.cons.map((line, i) => <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />{line}</li>)}
                      </ul>
                    </section>
                  </div>

                  <p className="flex gap-2 rounded-xl border border-primary/25 bg-primary/[0.07] p-4 text-sm text-foreground">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span><strong className="text-primary">Wichtigster Hinweis: </strong>{p.tip}</span>
                  </p>
                </>
              )}

              {template.description && (
                <section aria-labelledby="tpl-how">
                  <h3 id="tpl-how" className="mb-1 text-sm font-bold text-white">So funktioniert es</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{template.description}</p>
                </section>
              )}

              {template.coachingNote && (
                <section aria-labelledby="tpl-coach">
                  <h3 id="tpl-coach" className="mb-1 text-sm font-bold text-white">Coaching-Hinweis</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{template.coachingNote}</p>
                </section>
              )}

              {!!template.defaultRoles?.length && (
                <details className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-bold text-white">Rollen ({template.defaultRoles.length})</summary>
                  <ul className="space-y-2 px-4 pb-4 text-sm">
                    {template.defaultRoles.map((r, i) => (
                      <li key={r.id ?? i}>
                        <span className="font-semibold text-white">{r.name}</span>
                        {r.description && <span className="text-muted-foreground">: {r.description}</span>}
                        {r.coachingPoint && <span className="block text-xs text-muted-foreground">Tipp: {r.coachingPoint}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {p && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {p.basis === 'research'
                    ? 'Teile dieser Einschätzung stützen sich auf die Quellen unten, der Rest ist Einordnung von SETPIECE (KI-gestützt). Profiliga-Beispiele sind keine Erfolgsgarantie für dein Team.'
                    : 'Einschätzung von SETPIECE, KI-gestützt aus der Videoszene und der Trainingslehre. Sie ersetzt keine Trainerentscheidung und verspricht keine Tore.'}
                  {!!p.sources?.length && (
                    <span className="mt-1 block">Quellen: {p.sources.map((s, i) => (
                      <span key={s.url}>{i > 0 && ', '}<a href={s.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 hover:text-white">{s.label}</a></span>
                    ))}</span>
                  )}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-white/[0.08] bg-card/95 p-4 backdrop-blur">
              <Button type="button" className="min-h-12 w-full text-base" onClick={() => onUse(template)} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <>{useLabel} <ArrowRight className="ml-2 size-4" /></>}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
