import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-primary text-primary-foreground px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 text-sm font-medium z-50 shrink-0">
      <Eye className="h-4 w-4 shrink-0" />
      <span>Fiktives Demoteam · keine Änderungen an Teamdaten</span>
      <Link href="/register">
        <Button
          size="sm"
          variant="secondary"
          className="text-xs font-semibold px-3 py-1 h-8 shrink-0"
        >
          Kostenlos starten
        </Button>
      </Link>
    </div>
  );
}
