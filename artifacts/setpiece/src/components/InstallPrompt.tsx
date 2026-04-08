import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallPrompt() {
  const { canInstall, triggerInstall, bannerDismissed, dismissBanner } = useInstallPrompt();

  if (!canInstall || bannerDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
      >
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">Install SETPIECE</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access</p>
            </div>
            <button onClick={dismissBanner} className="text-muted-foreground hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" className="w-full mt-3" onClick={triggerInstall}>
            Install App
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
