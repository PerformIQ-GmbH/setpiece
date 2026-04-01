import { useQuery } from '@tanstack/react-query';

const BASE = import.meta.env.BASE_URL;

async function demoFetch(path: string) {
  const res = await fetch(`${BASE}api/demo${path}`);
  if (!res.ok) throw new Error(`Demo API error: ${res.status}`);
  return res.json();
}

export function useDemoTeam() {
  return useQuery({
    queryKey: ['demo', 'team'],
    queryFn: () => demoFetch('/team'),
  });
}

export function useDemoPlayers(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'players', teamId],
    queryFn: () => demoFetch(`/teams/${teamId}/players`),
    enabled: !!teamId,
  });
}

export function useDemoSetPieces(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'set-pieces', teamId],
    queryFn: () => demoFetch(`/teams/${teamId}/set-pieces`),
    enabled: !!teamId,
  });
}

export function useDemoSetPiece(teamId: string, setPieceId: string) {
  return useQuery({
    queryKey: ['demo', 'set-piece', teamId, setPieceId],
    queryFn: () => demoFetch(`/teams/${teamId}/set-pieces/${setPieceId}`),
    enabled: !!teamId && !!setPieceId,
  });
}

export function useDemoMatchdays(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'matchdays', teamId],
    queryFn: () => demoFetch(`/teams/${teamId}/matchdays`),
    enabled: !!teamId,
  });
}

export function useDemoMatchday(teamId: string, matchdayId: string) {
  return useQuery({
    queryKey: ['demo', 'matchday', teamId, matchdayId],
    queryFn: () => demoFetch(`/teams/${teamId}/matchdays/${matchdayId}`),
    enabled: !!teamId && !!matchdayId,
  });
}

export function useDemoReadiness(teamId: string) {
  return useQuery({
    queryKey: ['demo', 'readiness', teamId],
    queryFn: () => demoFetch(`/teams/${teamId}/readiness`),
    enabled: !!teamId,
  });
}
