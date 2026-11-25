import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  X, ChevronRight, ChevronLeft, Sparkles, PenLine, MousePointerClick, Users, Film, Eye, Hand,
  Send, Printer, PartyPopper, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeCardPlacement, MARGIN, type Placement, type Rect, type Side } from './tourPlacement';

interface TourStep {
  title: string;
  icon: React.ElementType;
  /** Warum lohnt sich das? Eine Zeile, die den Nutzen nennt. */
  benefit: string;
  /** Was tue ich hier? Kurz und konkret. */
  body: string[];
  /** Erster sichtbarer Treffer gewinnt; leer = zentrierte Karte ohne Spotlight. */
  desktop?: string[];
  mobile?: string[];
  side?: Side;
  /** Abweichender Text für Handys. */
  mobileBody?: string[];
}

const STEPS: TourStep[] = [
  {
    title: 'Willkommen im Standards-Editor',
    icon: Sparkles,
    benefit: 'In 2 Minuten zum ersten Standard, den dein ganzes Team versteht.',
    body: [
      'Zeichne Laufwege statt lange zu erklären.',
      'Jeder Spieler sieht seine Rolle auf dem Handy.',
      'Gegner erkennen, Signal geben, richtig reagieren.',
    ],
  },
  {
    title: 'Das Spielfeld',
    icon: MousePointerClick,
    benefit: 'Hier entsteht dein Standard. Was du siehst, sehen später die Spieler.',
    body: ['Klicke aufs Feld, um Spieler zu setzen und Wege zu zeichnen.', 'Doppelklick oder Enter beendet einen Weg.'],
    mobileBody: ['Tippe aufs Feld, um Spieler zu setzen und Wege zu zeichnen.', 'Zwei Finger zoomen, ein Finger verschiebt.'],
    desktop: ['[data-tutorial="pitch"]'],
    mobile: ['[data-tutorial="pitch"]'],
    side: 'bottom',
  },
  {
    title: 'Werkzeuge',
    icon: PenLine,
    benefit: 'Gestrichelt = Laufweg, durchgezogen = Pass. So liest jeder es sofort.',
    body: ['Wähle Spieler, Gegner, Ball, Laufweg oder Pass.', 'Tipp: V, R, L, P wählen Werkzeuge per Tastatur.'],
    mobileBody: ['Öffne die Werkzeuge unten links.', 'Wähle Spieler, Gegner, Ball, Laufweg oder Pass.'],
    desktop: ['[data-tutorial="toolbar"]'],
    mobile: ['[data-tutorial="mobile-tools"]'],
    side: 'right',
  },
  {
    title: 'Rollen und Spieler',
    icon: Users,
    benefit: 'Die App schlägt vor, wer am besten passt, nach Grösse, Kopfball und Tempo.',
    body: ['Jede Rolle wird ein Marker auf dem Feld.', 'Weise Spieler zu und lege eine Ersatzperson fest.'],
    mobileBody: ['Tippe auf das Spieler-Symbol unten rechts.', 'Dort legst du Rollen an und weist Spieler zu.'],
    desktop: ['[data-tutorial="inspector"]'],
    mobile: ['[data-tutorial="mobile-roles"]'],
    side: 'left',
  },
  {
    title: 'Phasen und Ablauf',
    icon: Film,
    benefit: 'Zeige den Ablauf in Schritten: wenn das, dann das.',
    body: ['Mit + fügst du eine Phase hinzu.', 'Play spielt den Ablauf ab, ideal zum Durchsprechen in der Garderobe.'],
    desktop: ['[data-tutorial="bottombar"]'],
    mobile: ['[data-tutorial="bottombar"]'],
    side: 'top',
  },
  {
    title: 'Varianten: Gegner erkennen',
    icon: Eye,
    benefit: 'Gegen Raumdeckung anders als gegen Manndeckung, ohne neuen Standard.',
    body: ['Pro Variante notierst du, woran man den Gegner erkennt.', 'Und welches Teamsignal gilt, zum Beispiel «Arm hoch».'],
    desktop: ['[data-tutorial="variants"]'],
    mobile: ['[data-tutorial="variants"]'],
    side: 'bottom',
  },
  {
    title: 'Für Spieler veröffentlichen',
    icon: Hand,
    benefit: 'Danach sieht jeder Spieler seine Rolle, mit Quiz und Rückmeldung an dich.',
    body: ['Erst wenn du veröffentlichst, sehen es die Spieler.', 'Änderungen bleiben Entwurf, bis du erneut veröffentlichst.'],
    mobileBody: ['Im Menü oben rechts veröffentlichst du für die Spieler.', 'Änderungen bleiben Entwurf, bis du erneut veröffentlichst.'],
    desktop: ['[data-tutorial="publish"]', '[data-tutorial="header"]'],
    mobile: ['[data-tutorial="menu"]', '[data-tutorial="header"]'],
    side: 'bottom',
  },
  {
    title: 'Du bist bereit',
    icon: PartyPopper,
    benefit: 'So geht es weiter:',
    body: [],
  },
];

const CHECKLIST: Array<{ icon: React.ElementType; text: string }> = [
  { icon: PenLine, text: 'Standard zeichnen und Rollen zuweisen' },
  { icon: Eye, text: 'Variante mit Gegnererkennung und Signal anlegen' },
  { icon: Send, text: 'Für Spieler veröffentlichen' },
  { icon: Printer, text: 'Am Spieltag «Drucken → Garderobe» für den Aushang' },
];

// v2: neue Tour; wer die alte Version schon weggeklickt hat, sieht diese einmal.
const STORAGE_KEY = 'setpiece-tour-v2';

const isVisible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

function findTarget(selectors: string[] | undefined): Rect | null {
  for (const sel of selectors ?? []) {
    const el = document.querySelector(sel);
    if (el && isVisible(el)) {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
  }
  return null;
}

interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
  mobile?: boolean;
}

export function TutorialOverlay({ open, onClose, mobile = false }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<Rect | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const selectors = mobile ? current?.mobile : current?.desktop;
  const body = (mobile && current?.mobileBody) || current?.body || [];

  const measure = useCallback(() => {
    const found = findTarget(selectors);
    // Ziel (z. B. Feld, Seitenleiste) bei Bedarf in den sichtbaren Bereich holen.
    setTarget(found);
  }, [selectors]);

  useEffect(() => { if (open) setStep(0); }, [open]);

  // Messen nach dem Rendern und bei Grössenänderung; kurz verzögert, weil
  // Schubladen und Layout nach dem Öffnen noch einrasten.
  useEffect(() => {
    if (!open) return;
    measure();
    const timer = window.setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [open, step, measure]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    setPlacement(computeCardPlacement(target, { w: width, h: height }, { w: window.innerWidth, h: window.innerHeight }, current?.side));
  }, [open, step, target, current?.side]);

  const finish = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* private mode */ }
    onClose();
  }, [onClose]);

  const next = useCallback(() => (isLast ? finish() : setStep(s => s + 1)), [isLast, finish]);
  const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); finish(); }
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, next, prev, finish]);

  useEffect(() => { if (open) nextRef.current?.focus({ preventScroll: true }); }, [open, step]);

  if (!open || !current) return null;
  const Icon = current.icon;
  const PAD = 8;
  const cutout = target ? { x: target.x - PAD, y: target.y - PAD, w: target.width + PAD * 2, h: target.height + PAD * 2 } : null;
  // Vollbild-Ziele (Feld auf dem Handy) bekommen keinen Ring, nur die Karte.
  const hugeTarget = !!target && target.width * target.height > window.innerWidth * window.innerHeight * 0.55;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Fängt Taps ab; ein Tipp daneben beendet die Tour bewusst nicht. */}
      <div className="absolute inset-0" aria-hidden="true" />

      {cutout && !hugeTarget ? (
        <div
          aria-hidden="true"
          className="absolute rounded-2xl border-2 border-primary pointer-events-none transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{
            left: cutout.x, top: cutout.y, width: cutout.w, height: cutout.h,
            boxShadow: '0 0 0 9999px rgba(3,8,6,0.72), 0 0 0 6px rgba(16,185,129,0.18), 0 0 28px 4px rgba(16,185,129,0.35)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: hugeTarget ? 'rgba(3,8,6,0.45)' : 'rgba(3,8,6,0.72)' }} />
      )}

      {isLast && <Confetti />}

      <div
        ref={cardRef}
        key={step}
        style={{
          position: 'fixed',
          width: `min(${isLast || isFirst ? 400 : 340}px, calc(100vw - ${MARGIN * 2}px))`,
          left: placement?.left ?? MARGIN,
          top: placement?.top ?? MARGIN,
          visibility: placement ? 'visible' : 'hidden',
          maxHeight: `calc(100dvh - ${MARGIN * 2}px)`,
        }}
        className="z-[110] overflow-y-auto rounded-2xl border border-white/10 bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
      >
        <div className="relative px-4 pt-4 pb-3">
          <button
            onClick={finish}
            aria-label="Tour schliessen"
            className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 pr-9">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isLast || isFirst ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary')}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Schritt {step + 1} von {STEPS.length}
              </p>
              <h3 id="tour-title" className="font-display text-base font-bold leading-tight text-white">{current.title}</h3>
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-[13px] font-semibold leading-snug text-primary">{current.benefit}</p>

          {body.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {body.map(line => (
                <li key={line} className="flex gap-2"><span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />{line}</li>
              ))}
            </ul>
          )}

          {isLast && (
            <ul className="mt-3 space-y-2">
              {CHECKLIST.map(({ icon: ItemIcon, text }, i) => (
                <li key={text} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[13px] text-white">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
                  <ItemIcon className="h-4 w-4 shrink-0 text-primary" />
                  {text}
                </li>
              ))}
            </ul>
          )}
          {isLast && (
            <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5 shrink-0" /> Die Tour startest du jederzeit neu über das Menü.
            </p>
          )}
        </div>

        <div className="flex gap-1 px-4 pb-3" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= step ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border/50 px-3 py-2.5">
          <button onClick={finish} className="min-h-11 rounded-lg px-3 text-xs text-muted-foreground transition-colors hover:text-white">
            {isLast ? 'Schliessen' : 'Überspringen'}
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={prev} aria-label="Vorheriger Schritt" className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:border-muted-foreground hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              ref={nextRef}
              onClick={next}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              {isLast ? 'Los geht’s' : isFirst ? 'Tour starten' : 'Weiter'}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Dezentes Konfetti zum Abschluss; bei reduzierter Bewegung statisch aus. */
function Confetti() {
  const colors = ['#10b981', '#34d399', '#f59e0b', '#60a5fa', '#f472b6', '#ffffff'];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-[1px]"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animation: `tour-confetti ${2.2 + (i % 5) * 0.35}s ease-in ${(i % 7) * 0.12}s both`,
          }}
        />
      ))}
      <style>{`@keyframes tour-confetti{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0.9}}`}</style>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return false;
  }
}

export function resetTutorial(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
}
