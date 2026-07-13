// Records the board animation into a shareable video file — the artifact
// coaches drop into the team's WhatsApp group.
//
// No dependencies: the live Konva stage is composited onto an offscreen
// canvas each frame and encoded with the browser's MediaRecorder. Safari
// yields MP4, Chrome/Firefox WebM; both share fine through the native
// share sheet on mobile.
import type Konva from 'konva';
import { useEditorStore } from './editorStore';

const FPS = 30;
/** Matches the tick in EditorCanvas: progress advances 0.2/s * speed. */
const SECONDS_PER_STEP = 5;

function pickMimeType(): string | null {
  const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

export function videoExportSupported(): boolean {
  return pickMimeType() !== null && !!HTMLCanvasElement.prototype.captureStream;
}

export interface RecordResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
}

/**
 * Plays the whole set piece (all steps) once and records it.
 * Resolves when the animation finished and the encoder flushed.
 */
export async function recordBoardVideo(stage: Konva.Stage): Promise<RecordResult> {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error('Video recording is not supported in this browser.');

  const store = useEditorStore.getState();
  const prevView = store.view;
  const prevStep = store.animation.activeStepIndex;
  const prevMode = store.animation.playMode;

  // Record the full, un-zoomed board from the first step.
  store.setView({ scale: 1, x: 0, y: 0 });
  store.setPlayMode('all');
  store.setActiveStepIndex(0);

  const w = stage.width();
  const h = stage.height();
  // Upscale small boards so the video stays crisp on phones.
  const scale = Math.min(2, 1280 / Math.max(w, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  const layerCanvases = stage.getLayers().map(
    (l) => (l.getCanvas() as unknown as { _canvas: HTMLCanvasElement })._canvas,
  );

  const watermark = 'SETPIECE';
  const drawFrame = () => {
    ctx.fillStyle = '#0c1a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const lc of layerCanvases) {
      ctx.drawImage(lc, 0, 0, canvas.width, canvas.height);
    }
    ctx.save();
    ctx.font = `600 ${Math.max(12, Math.round(canvas.width * 0.018))}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText(watermark, canvas.width - 14, canvas.height - 12);
    ctx.restore();
  };

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const stepCount = store.steps.length;
  const speed = store.animation.speed || 1;
  // Generous ceiling in case the play loop stalls.
  const maxMs = ((stepCount * SECONDS_PER_STEP) / speed) * 1000 + 4000;

  const result = new Promise<RecordResult>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Video encoding failed.'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        reject(new Error('Video encoding produced no data.'));
        return;
      }
      resolve({ blob, mimeType, extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' });
    };
  });

  let raf = 0;
  const startedAt = performance.now();
  let settleFrames = FPS; // keep filming ~1s after the final whistle
  const tick = () => {
    drawFrame();
    const s = useEditorStore.getState();
    const finished = !s.animation.playing && s.animation.progress >= 1
      && s.animation.activeStepIndex >= s.steps.length - 1;
    const timedOut = performance.now() - startedAt > maxMs;
    if ((finished && settleFrames-- <= 0) || timedOut) {
      recorder.stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  recorder.start(250);
  // Give React a beat to reset to step 0 before kickoff.
  await new Promise((r) => setTimeout(r, 150));
  useEditorStore.getState().setAnimationPlaying(true);
  raf = requestAnimationFrame(tick);

  try {
    return await result;
  } finally {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    const s = useEditorStore.getState();
    s.setAnimationPlaying(false);
    s.setAnimationProgress(0);
    s.setPlayMode(prevMode);
    s.setActiveStepIndex(prevStep);
    s.setView(prevView);
  }
}

/** Share via the native sheet (WhatsApp & co.) or fall back to a download. */
export async function shareOrDownloadVideo(res: RecordResult, title: string): Promise<'shared' | 'downloaded'> {
  const file = new File([res.blob], `${title.replace(/[^\wÀ-ſ -]+/g, '').trim() || 'setpiece'}.${res.extension}`, { type: res.mimeType });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      // User canceled the sheet — treat as done, don't force a download.
      if ((err as DOMException)?.name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(res.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
