import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  active_matchday: 'bg-primary/10 text-primary border-primary/30',
  archived: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  injured: 'bg-red-500/10 text-red-400 border-red-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  not_opened: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  opened: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  passed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  needs_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status] || 'bg-secondary text-muted-foreground border-border';
  return (
    <span className={cn(
      'px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border tracking-wide inline-block',
      style,
      className
    )}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
