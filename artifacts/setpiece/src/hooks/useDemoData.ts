import { useQuery } from '@tanstack/react-query';

import { demoTeam, demoPlayers, demoSetPiece, demoMatchday, demoReadiness } from '@/lib/demo-fixture';

export function useDemoTeam() {
  return useQuery({
    queryKey: ['demo', 'team'],
    queryFn: () => demoTeam,
  });
}

export function useDemoPlayers(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'players', teamId],
    queryFn: () => teamId === demoTeam.id ? demoPlayers : [],
    enabled: !!teamId,
  });
}

export function useDemoSetPieces(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'set-pieces', teamId],
    queryFn: () => teamId === demoTeam.id ? [demoSetPiece] : [],
    enabled: !!teamId,
  });
}

export function useDemoSetPiece(teamId: string, setPieceId: string) {
  return useQuery({
    queryKey: ['demo', 'set-piece', teamId, setPieceId],
    queryFn: () => teamId === demoTeam.id && setPieceId === demoSetPiece.id ? demoSetPiece : null,
    enabled: !!teamId && !!setPieceId,
  });
}

export function useDemoMatchdays(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'matchdays', teamId],
    queryFn: () => teamId === demoTeam.id ? [demoMatchday] : [],
    enabled: !!teamId,
  });
}

export function useDemoMatchday(teamId: string, matchdayId: string) {
  return useQuery({
    queryKey: ['demo', 'matchday', teamId, matchdayId],
    queryFn: () => teamId === demoTeam.id && matchdayId === demoMatchday.id ? demoMatchday : null,
    enabled: !!teamId && !!matchdayId,
  });
}

export function useDemoReadiness(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'readiness', teamId],
    queryFn: () => teamId === demoTeam.id ? demoReadiness : null,
    enabled: !!teamId,
  });
}
