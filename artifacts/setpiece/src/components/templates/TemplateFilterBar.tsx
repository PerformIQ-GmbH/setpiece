import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { PlaybookSelect } from '@/components/PlaybookSelect';
import type { SetPieceTemplate } from '@workspace/api-client-react';
import {
  AGAINST_LABELS, KIND_LABELS, LEVEL_LABELS, NO_FILTERS, SIDE_LABELS, activeFilterCount, availableAgainst,
  type Against, type Kind, type Level, type Side, type TemplateFilters,
} from '@/lib/templateFilters';

const chip = (active: boolean) =>
  `min-h-10 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-white'
  }`;

function Group<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T | 'all';
  options: { value: T; label: string }[];
  onChange: (value: T | 'all') => void;
}) {
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={value === 'all'} className={chip(value === 'all')} onClick={() => onChange('all')}>Alle</button>
        {options.map(o => (
          <button key={o.value} type="button" aria-pressed={value === o.value} className={chip(value === o.value)} onClick={() => onChange(value === o.value ? 'all' : o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return <button type="button" aria-pressed={on} className={chip(on)} onClick={() => onChange(!on)}>{label}</button>;
}

/**
 * Filters of the template library. The kind (corner, free kick, throw-in) is always visible;
 * the rest sits behind «Filter» on small screens and is open on wide ones.
 */
export function TemplateFilterBar({ templates, filters, onChange, shown }: {
  templates: SetPieceTemplate[];
  filters: TemplateFilters;
  onChange: (f: TemplateFilters) => void;
  shown: number;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) => onChange({ ...filters, [key]: value });
  const extra = activeFilterCount({ ...filters, kind: 'all', query: '' });
  const total = activeFilterCount(filters);
  const against = availableAgainst(templates).map(a => ({ value: a as Against, label: AGAINST_LABELS[a] }));

  return (
    <div className="mb-5 space-y-3">
      <div className="flex gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Vorlagen durchsuchen</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search" value={filters.query} onChange={e => set('query', e.target.value)} placeholder="Suchen, z. B. kurze Ecke, Mauer, Einwurf"
            className="min-h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="button" aria-expanded={open} aria-controls="tpl-filters" onClick={() => setOpen(o => !o)}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-white md:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filter{extra > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{extra}</span>}
        </button>
      </div>

      <Group<Kind> label="Art" value={filters.kind} onChange={v => set('kind', v)}
        options={(Object.keys(KIND_LABELS) as Kind[]).map(k => ({ value: k, label: KIND_LABELS[k] }))} />

      <div id="tpl-filters" className={`${open ? 'block' : 'hidden'} space-y-3 md:block`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:max-w-3xl">
          <PlaybookSelect label="Seite" value={filters.side} onChange={v => set('side', v as Side | 'all')}
            options={[{ value: 'all', label: 'Alle' }, ...(Object.keys(SIDE_LABELS) as Side[]).map(k => ({ value: k, label: SIDE_LABELS[k] }))]} />
          <PlaybookSelect label="Niveau" value={filters.level} onChange={v => set('level', v as Level | 'all')}
            options={[{ value: 'all', label: 'Alle' }, ...(Object.keys(LEVEL_LABELS) as Level[]).map(k => ({ value: k, label: LEVEL_LABELS[k] }))]} />
          {against.length > 0 && (
            <div className="col-span-2 sm:col-span-1">
              <PlaybookSelect label="Passt gegen" value={filters.against} onChange={v => set('against', v as Against | 'all')}
                options={[{ value: 'all', label: 'Alle' }, ...against]} />
            </div>
          )}
        </div>
        <div role="group" aria-label="Weitere Filter" className="flex flex-wrap gap-1.5">
          <Toggle label="Mit Video" on={filters.withVideo} onChange={v => set('withVideo', v)} />
          <Toggle label="Auch für Junioren" on={filters.juniors} onChange={v => set('juniors', v)} />
          <Toggle label="Ohne Kopfballspieler" on={filters.noHeader} onChange={v => set('noHeader', v)} />
        </div>
      </div>

      <div className="flex min-h-8 flex-wrap items-center gap-x-3">
        <p role="status" className="text-sm text-muted-foreground">
          {shown === 0 ? 'Keine Vorlage passt zu diesen Filtern.' : `${shown} von ${templates.length} Vorlagen`}
        </p>
        {total > 0 && (
          <button type="button" onClick={() => onChange(NO_FILTERS)} className="flex min-h-8 items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <X className="size-3.5" aria-hidden="true" /> Filter zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
