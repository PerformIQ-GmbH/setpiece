import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useDemoMode } from '@/contexts/DemoContext';

export default function DemoEntry() {
  const { demoTeamId, loading } = useDemoMode();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && demoTeamId) {
      setLocation(`/demo/teams/${demoTeamId}`);
    }
  }, [loading, demoTeamId, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading demo...</p>
        </div>
      </div>
    );
  }

  if (!demoTeamId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Demo data is not available yet.</p>
          <a href="/" className="text-primary hover:underline">Go back home</a>
        </div>
      </div>
    );
  }

  return null;
}
