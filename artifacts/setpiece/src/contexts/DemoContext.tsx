import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';

interface DemoContextType {
  isDemo: boolean;
  demoTeamId: string | null;
  demoTeam: any | null;
  loading: boolean;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  demoTeamId: null,
  demoTeam: null,
  loading: false,
});

export function useDemoMode() {
  return useContext(DemoContext);
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { data: demoTeam, isLoading } = useQuery({
    queryKey: ['demo', 'team'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/demo/team`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: Infinity,
  });

  return (
    <DemoContext.Provider
      value={{
        isDemo: true,
        demoTeamId: demoTeam?.id ?? null,
        demoTeam: demoTeam ?? null,
        loading: isLoading,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
