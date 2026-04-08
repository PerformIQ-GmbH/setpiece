import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'setpiece-install-dismissed';

let sharedPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    sharedPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    sharedPrompt = null;
    notifyListeners();
  });
}

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

export function useInstallPrompt() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const [isStandalone, setIsStandalone] = useState(getIsStandalone);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem(DISMISS_KEY) === '1'
      : false
  );

  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setIsStandalone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const canInstall = sharedPrompt !== null && !isStandalone;
  const isInstalled = isStandalone;

  const triggerInstall = useCallback(async () => {
    if (!sharedPrompt) return false;
    await sharedPrompt.prompt();
    const { outcome } = await sharedPrompt.userChoice;
    if (outcome === 'accepted') {
      sharedPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  }, []);

  const isSafari =
    typeof navigator !== 'undefined' &&
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|CriOS|Edg/i.test(navigator.userAgent);

  return {
    canInstall,
    isInstalled,
    triggerInstall,
    bannerDismissed,
    dismissBanner,
    isSafari,
  };
}
