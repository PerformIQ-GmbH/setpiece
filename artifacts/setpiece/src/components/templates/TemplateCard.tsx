import { AlertTriangle, ArrowRight, Check, Loader2, Users } from 'lucide-react';
import type { SetPieceTemplate } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AGAINST_LABELS, LEVEL_LABELS, categoryLabel, type Level } from '@/lib/templateFilters';
import { TemplateMedia } from './TemplateMedia';

const LEVEL_STYLES: Record<Level, string> = {
  easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  hard: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${LEVEL_STYLES[level]}`}>{LEVEL_LABELS[level]}</span>;
}

export const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">{children}</span>
);

/** One template in the library: the scene plays on the card, the verdict (one pro, one con) is readable without opening it. */
export function TemplateCard({ template, onOpen, onUse, busy, selected, useLabel = 'Übernehmen' }: {
  template: SetPieceTemplate;
  onOpen: (t: SetPieceTemplate) => void;
  /** Without onUse the card selects instead (onboarding): the primary button is hidden and the card is a choice. */
  onUse?: (t: SetPieceTemplate) => void;
  busy?: boolean;
  selected?: boolean;
  useLabel?: string;
}) {
  const p = template.profile;
  const players = template.defaultRoles?.length ?? 0;
  return (
    <Card className={`flex h-full flex-col overflow-hidden bg-card transition-colors hover:border-primary/40 ${selected ? 'border-primary ring-2 ring-primary/40' : 'border-border'}`}>
      <button
        type="button"
        onClick={() => onOpen(template)}
        aria-label={`Details und Szene ansehen: ${template.title}`}
        className="relative block aspect-video w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <TemplateMedia template={template} />
        {selected && <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-black shadow"><Check className="size-3" /> Gewählt</span>}
      </button>
      <CardContent className="flex flex-1 flex-col p-4">
        <h3 className="break-words text-base font-bold leading-snug text-white">{template.title}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {categoryLabel(template.category)}
          {players > 0 && <><span aria-hidden="true">·</span><Users className="size-3" aria-hidden="true" />{players} Spieler</>}
        </p>
        {p && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <LevelBadge level={p.level} />
            {p.juniors && <Pill>Auch für Junioren</Pill>}
            {!p.needsHeader && !template.category.startsWith('defensive') && <Pill>Ohne Kopfballspieler</Pill>}
            {p.against.slice(0, 2).map(a => <Pill key={a}>gegen {AGAINST_LABELS[a]}</Pill>)}
          </div>
        )}
        {p ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex gap-2 text-foreground"><Check className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-label="Vorteil" /><span className="line-clamp-3">{p.pros[0]}</span></li>
            <li className="flex gap-2 text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-label="Nachteil" /><span className="line-clamp-3">{p.cons[0]}</span></li>
          </ul>
        ) : (
          template.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{template.description}</p>
        )}
        <div className={`mt-auto grid gap-2 pt-4 ${onUse ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpen(template)}>Details</Button>
          {onUse && (
            <Button type="button" className="min-h-11" onClick={() => onUse(template)} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <>{selected ? <><Check className="mr-1 size-4" /> Gewählt</> : <>{useLabel} <ArrowRight className="ml-1 size-4" /></>}</>}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
