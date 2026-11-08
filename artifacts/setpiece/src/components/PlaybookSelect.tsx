import { useId } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PlaybookSelect({ label, value, onChange, options, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="h-10 gap-3 rounded-xl border-border bg-card focus-visible:ring-2 focus-visible:ring-primary/50 [&>svg]:shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)] rounded-xl border-border bg-card shadow-xl shadow-black/40">
          {options.map(option => (
            <SelectItem key={option.value} value={option.value} className="min-h-9 rounded-lg whitespace-normal break-words focus:bg-primary/10 focus:text-foreground focus-visible:ring-0 [&[data-state=checked]]:font-medium [&[data-state=checked]>span:first-child]:text-primary">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
