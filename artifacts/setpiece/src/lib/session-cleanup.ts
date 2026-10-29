import type { QueryClient } from '@tanstack/react-query';

export async function clearClientSession(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.cancelQueries();
  } catch {
    // Continue clearing even if an in-flight request cannot be cancelled.
  }
  queryClient.clear();
  // Earlier releases persisted authenticated API responses in Cache Storage.
  if ('caches' in globalThis) {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith('setpiece-')).map((name) => caches.delete(name)));
    } catch {
      // Browser restrictions must not prevent clearing the remaining local data.
    }
  }
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = globalThis[name];
      for (const key of Object.keys(storage)) {
        if (key.startsWith('sp_player_')) storage.removeItem(key);
      }
    } catch {
      // Storage can be disabled by the browser; this never blocks server logout.
    }
  }
}
