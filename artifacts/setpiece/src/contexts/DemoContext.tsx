import React, { createContext, useContext } from 'react';
import { demoTeam } from '@/lib/demo-fixture';

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
  return (
    <DemoContext.Provider
      value={{
        isDemo: true,
        demoTeamId: demoTeam.id,
        demoTeam,
        loading: false,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
