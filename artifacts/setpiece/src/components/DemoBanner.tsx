import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-gradient-to-r from-primary/90 to-emerald-600/90 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium z-50 shrink-0">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="truncate">You're viewing a demo — data is read-only</span>
      <Link href="/register">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-semibold px-3 py-1 h-7 shrink-0"
        >
          Sign Up Free
        </Button>
      </Link>
    </div>
  );
}
