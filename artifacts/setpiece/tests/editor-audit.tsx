// Development-only entry: mounts the unmodified editor with an in-memory API.
// No production accounts, database, credentials, or external API requests.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { ConfirmProvider } from '../src/hooks/use-confirm';
import { Toaster } from '../src/components/ui/toaster';
import SetPieceEditor from '../src/pages/SetPieceEditor';
import { demoTeam, demoPlayers, demoSetPiece } from '../src/lib/demo-fixture';
import { useEditorStore } from '../src/components/editor/editorStore';
import '../src/index.css';

const piece = structuredClone(demoSetPiece) as any;
piece.status = 'draft';
piece.boardData.entities = [
  { id: 'audit-defender', type: 'opponent', position: { x: 53, y: 33 }, shirtNumber: 4 },
  { id: 'audit-gk', type: 'goalkeeper', position: { x: 50, y: 5 }, shirtNumber: 1 },
  { id: 'audit-ball', type: 'ball', position: { x: 92, y: 10 } },
];
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin);
  if (!url.pathname.startsWith('/api/')) return originalFetch(input, init);
  if (url.origin !== location.origin) throw new Error('External API disabled in audit');
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
  const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
  if (url.pathname.endsWith('/players')) return reply(demoPlayers);
  if (url.pathname === '/api/teams/demo-team') return reply(demoTeam);
  const base = '/api/teams/demo-team/set-pieces/demo-corner';
  if (url.pathname === base + '/role-suggestions') return reply({ roles: [] });
  if (url.pathname === base) {
    if (method === 'PATCH') Object.assign(piece, body);
    return reply(piece);
  }
  if (url.pathname.startsWith(base + '/roles')) {
    const id = url.pathname.split('/')[7];
    if (method === 'POST') { const role = { id: `audit-role-${piece.roles.length}`, ...body }; piece.roles.push(role); return reply(role, 201); }
    const role = piece.roles.find((r: any) => r.id === id);
    if (method === 'PATCH' && role) Object.assign(role, body);
    if (method === 'DELETE') piece.roles = piece.roles.filter((r: any) => r.id !== id);
    return reply(role ?? {});
  }
  return reply({ error: `Unimplemented audit endpoint: ${method} ${url.pathname}` }, 501);
};

function AuditState() {
  const annotations = useEditorStore(s => s.annotations);
  const entities = useEditorStore(s => s.entities);
  const selected = useEditorStore(s => s.selectedAnnotationId);
  const drawing = useEditorStore(s => s.drawingPoints);
  return <details style={{position:'fixed',right:8,bottom:8,zIndex:100,background:'#101b21',color:'white',fontSize:11,maxWidth:310}}>
    <summary>Lokaler Audit · nur fiktive Daten</summary>
    <pre style={{maxHeight:220,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify({selected,drawing,annotations,entities}, null, 1)}</pre>
  </details>;
}
const path = '/teams/demo-team/set-pieces/demo-corner/editor';
const hook = (): [string, (to: string) => void] => [path, () => {}];
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}})}>
    <TooltipProvider><ConfirmProvider><Router hook={hook}><SetPieceEditor /><AuditState /><Toaster /></Router></ConfirmProvider></TooltipProvider>
  </QueryClientProvider>
);
