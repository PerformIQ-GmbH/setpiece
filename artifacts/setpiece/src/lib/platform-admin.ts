import { useQuery } from '@tanstack/react-query';

export const platformAdminEndpoint = `${import.meta.env.BASE_URL}api/platform-admin`;

export function usePlatformAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ['platform-admin', 'access', userId],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await fetch(`${platformAdminEndpoint}/access`, { signal, cache: 'no-store' });
      if (response.status === 401 || response.status === 403) return false;
      if (!response.ok) throw new Error('Adminzugang konnte nicht geprüft werden.');
      return true;
    },
  });
}
