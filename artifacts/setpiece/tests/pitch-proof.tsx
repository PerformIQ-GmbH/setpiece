// Manual proof fixture: served by Vite in development, excluded from production entrypoints.
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { EditorCanvas, type EditorCanvasHandle } from '../src/components/editor/EditorCanvas';
import { PlayerBoardViewer } from '../src/components/PlayerBoardViewer';
import { Pitch } from '../src/components/Pitch';
import { useEditorStore } from '../src/components/editor/editorStore';
import { renderSetPieceSteps } from '../src/utils/offscreenPitchRenderer';
import { recordBoardVideo } from '../src/components/editor/videoExport';

const steps = [{ id: 'proof-step', label: 'Referenzpositionen', sortOrder: 0 }];
const boardData = { annotations: [], entities: [], steps, stepPositions: {} };
function Proof() {
  const [category, setCategory] = useState('corner_offensive');
  const [image, setImage] = useState('');
  const [video, setVideo] = useState('');
  const [status, setStatus] = useState('');
  const [tap, setTap] = useState('');
  const canvas = useRef<EditorCanvasHandle>(null);
  const half = category !== 'throw_in';
  const roles = [
    { id: 'spot', name: 'Elfmeterpunkt', startPosition: { x: 50, y: 11 / (half ? 52.5 : 105) * 100 } },
    { id: 'post', name: 'Pfosten', startPosition: { x: (34 - 3.66) / 68 * 100, y: 0 } },
    { id: 'box', name: 'Strafraumkante', startPosition: { x: (34 + 20.16) / 68 * 100, y: 16.5 / (half ? 52.5 : 105) * 100 } },
  ];
  useEffect(() => { const s = useEditorStore.getState(); s.resetStore(); s.setSteps(steps); s.setPitchTheme('green'); setImage(''); setTap(''); }, [category]);
  return <main style={{ padding: 20, background: '#0a0e17', color: 'white', minHeight: '100vh' }}>
    <h1>Fiktive Spielfeld-Referenz</h1>
    <p>Dieselben gespeicherten Prozentpositionen in Editor, Spieleransicht, SVG und Druckbild.</p>
    <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>{[['corner_offensive', 'Ecke'], ['direct_free_kick_left', 'Freistoss'], ['throw_in', 'Ganzfeld']].map(([value, label]) => <button key={value} onClick={() => setCategory(value)} aria-pressed={category === value}>{label}</button>)}</nav>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
      <section style={{ overflow: 'hidden' }}><h2>Editor · 400 × 500</h2><div style={{ overflowX: 'auto' }}><EditorCanvas ref={canvas} width={400} height={500} roles={roles} assignments={[]} activeRoleId={null} category={category} onRoleClick={() => {}} onRoleDragEnd={(_, p) => setTap(JSON.stringify(p))} onPitchClick={p => setTap(JSON.stringify(p))} onLabelPrompt={() => {}} /></div></section>
      <section><h2>Spieleransicht</h2><PlayerBoardViewer roles={roles} assignments={[]} category={category} boardData={boardData} /></section>
      <section><h2>SVG / Eingabekoordinaten</h2><Pitch roles={roles} halfPitch={half} interactive onPitchClick={p => setTap(JSON.stringify(p))} /><output aria-live="polite">{tap}</output></section>
    </div>
    <div style={{ display: 'flex', gap: 20, padding: '20px 0' }}>
      <button onClick={() => { const images = renderSetPieceSteps({ boardData, roles, category }); setImage(images[0]?.dataUrl ?? ''); setStatus('Druckbild erzeugt'); }}>Druckbild erzeugen</button>
      <button onClick={async () => { try { setStatus('Video wird aufgenommen'); const stage = canvas.current?.getStage(); if (!stage) throw new Error('Canvas fehlt'); const result = await recordBoardVideo(stage); setVideo(URL.createObjectURL(result.blob)); setStatus(`Video erzeugt: ${result.blob.size} Bytes`); } catch (e) { setStatus(String(e)); } }}>Video prüfen</button>
    </div>
    <p role="status">{status}</p>
    {image && <img src={image} alt="Tatsächliches Druckbild aus dem PDF-Renderer" style={{ width: '100%', maxWidth: 1000 }} />}
    {video && <video src={video} controls style={{ width: '100%', maxWidth: 700 }} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Proof />);
