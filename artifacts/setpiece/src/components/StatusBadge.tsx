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
      'px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border tracking-wider inline-flex items-center gap-1.5',
      style,
      className
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        status === 'ready' || status === 'active' || status === 'passed' ? 'bg-emerald-400' :
        status === 'draft' || status === 'not_opened' ? 'bg-zinc-400' :
        status === 'active_matchday' ? 'bg-primary' :
        status === 'injured' ? 'bg-red-400' :
        status === 'needs_review' || status === 'archived' || status === 'suspended' ? 'bg-amber-400' :
        status === 'opened' ? 'bg-blue-400' :
        'bg-muted-foreground'
      )} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
