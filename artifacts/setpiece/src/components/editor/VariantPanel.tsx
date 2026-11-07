import { useId, useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';

type VariantPatch = { name?: string; recognitionCue?: string; teamSignal?: string };

export interface VariantPanelProps {
  variants: { id: string; name: string }[];
  activeVariant: { id: string; name: string; recognitionCue: string; teamSignal: string };
  defaultVariantId: string;
  onSelect: (id: string) => void;
  onDuplicate: () => void;
  onUpdate: (patch: VariantPatch) => void;
  onSetDefault: (id: string) => void;
  onDelete?: (id: string) => void;
  requiredVariantIds?: string[];
  onSetRequired?: (id: string, required: boolean) => void;
}

const inputClass = 'w-full min-w-0 rounded-lg border border-white/25 bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const buttonClass = 'min-h-10 rounded-lg border border-white/25 px-3 text-xs font-semibold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Keep each edit local until the field is left or Enter is pressed. */
function VariantField({ label, value, placeholder, maxLength, required, onCommit }: {
  label: string;
  value: string;
  placeholder?: string;
  maxLength: number;
  required?: boolean;
  onCommit: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);

  // Reflect undo or external changes when this field has no uncommitted edit.
  if (value !== committed && draft === committed) {
    setDraft(value);
    setCommitted(value);
  }

  const commit = () => {
    const next = draft.trim() || (required ? value : '');
    setDraft(next);
    if (next !== committed) {
      setCommitted(next);
      onCommit(next);
    }
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-foreground">{label}</label>
      <input
        id={id}
        className={inputClass}
        value={draft}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

export function VariantPanel({ variants, activeVariant, defaultVariantId, onSelect, onDuplicate, onUpdate, onSetDefault, onDelete, requiredVariantIds = variants.map((variant) => variant.id), onSetRequired }: VariantPanelProps) {
  const selectId = useId();
  const isDefault = activeVariant.id === defaultVariantId;
  const isRequired = requiredVariantIds.includes(activeVariant.id);
  const isLastRequired = isRequired && requiredVariantIds.length === 1;

  return (
    <section aria-label="Varianten" className="shrink-0 border-b border-white/15 bg-card px-3 py-2 text-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 basis-40 items-center gap-2 sm:max-w-72">
          <label htmlFor={selectId} className="text-xs font-semibold">Variante</label>
          <select
            id={selectId}
            className={`${inputClass} min-h-10`}
            value={activeVariant.id}
            onChange={(event) => onSelect(event.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}{variant.id === defaultVariantId ? ' · Spielerstart' : ''}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={onDuplicate} className={`${buttonClass} inline-flex items-center gap-1.5`}>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Alternative kopieren
        </button>
      </div>
      <details className="group">
        <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          Variante bearbeiten · Gegner erkennen → Teamsignal
        </summary>
        <div className="grid gap-2 pb-1 pt-1 sm:grid-cols-3">
          <VariantField label="Name der Variante" value={activeVariant.name} maxLength={80} required onCommit={(name) => onUpdate({ name })} />
          <VariantField label="Gegner erkennen" value={activeVariant.recognitionCue} placeholder="Z. B. der erste Pfosten ist frei" maxLength={240} onCommit={(recognitionCue) => onUpdate({ recognitionCue })} />
          <VariantField label="Teamsignal" value={activeVariant.teamSignal} placeholder="Z. B. eine Hand heben" maxLength={240} onCommit={(teamSignal) => onUpdate({ teamSignal })} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
          {onSetRequired && (
            <label className="inline-flex min-h-10 items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={isRequired}
                disabled={isLastRequired}
                onChange={(event) => onSetRequired(activeVariant.id, event.target.checked)}
                className="h-4 w-4 accent-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              />
              Für Spieler erforderlich
            </label>
          )}
          {!isDefault && (
            <button type="button" onClick={() => onSetDefault(activeVariant.id)} className={buttonClass}>
              Als Spielerstart festlegen
            </button>
          )}
          {variants.length > 1 && onDelete && (
            <button type="button" onClick={() => onDelete(activeVariant.id)} className="min-h-10 rounded-lg px-2 text-xs font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive">
              Variante entfernen
            </button>
          )}
        </div>
      </details>
    </section>
  );
}
