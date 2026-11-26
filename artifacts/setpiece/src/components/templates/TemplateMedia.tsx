import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { SetPieceTemplate, VideoClip } from '@workspace/api-client-react';
import { SetPieceThumbnail } from '@/components/SetPieceThumbnail';

/** Autoplay only when the viewer allows motion and is not saving data. */
function motionAllowed(): boolean {
  try {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !saveData;
  } catch {
    return true;
  }
}

function useInView<T extends Element>(rootMargin = '150px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [inView, ref] as const;
}

/** Our own library files only (provider "file"); YouTube and Vimeo previews would contact third parties. */
export const firstFileClip = (t: Pick<SetPieceTemplate, 'media'>): VideoClip | undefined =>
  t.media?.find(c => c.provider === 'file');

/**
 * Silent looping preview of a clip, running only while it is on screen.
 * The first frame shows even when autoplay is off, so there is always a picture and a play mark.
 */
export function AutoplayClip({ clip, className = '' }: { clip: VideoClip; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [inView, boxRef] = useInView<HTMLDivElement>();
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [allowed] = useState(motionAllowed);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (inView && allowed) void v.play().catch(() => {});
    else v.pause();
  }, [inView, allowed]);

  if (failed) return null;
  return (
    <div ref={boxRef} className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      {/* Clips carry a title bar in their first seconds; zooming in from the bottom keeps it out of the card. */}
      <video
        ref={video}
        src={`${clip.url}#t=${clip.startSec || 0.1}`}
        muted
        loop
        playsInline
        preload={inView ? 'auto' : 'none'}
        aria-hidden="true"
        tabIndex={-1}
        className="h-full w-full origin-bottom scale-[1.24] object-cover"
        onLoadedMetadata={e => { if (e.currentTarget.currentTime < clip.startSec) e.currentTarget.currentTime = clip.startSec; }}
        onTimeUpdate={e => { const v = e.currentTarget; if (clip.endSec != null && v.currentTime >= clip.endSec) v.currentTime = clip.startSec; }}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      {!playing && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg"><Play className="ml-0.5 size-5 fill-current" /></span>
        </span>
      )}
    </div>
  );
}

/**
 * Picture area of a template card: the real scene playing in front, the drawing as a small inset,
 * or just the drawing for templates without a clip yet.
 */
export function TemplateMedia({ template }: { template: SetPieceTemplate }) {
  const clip = firstFileClip(template);
  const board = (cls: string) => (
    <SetPieceThumbnail boardData={template.boardData} category={template.category} roles={template.defaultRoles} imageUrl={template.previewImageUrl} className={cls} />
  );
  if (!clip) return <div className="flex h-full w-full items-center justify-center bg-[#102e28]">{board('h-full w-full')}</div>;
  return (
    <div className="relative h-full w-full">
      <AutoplayClip clip={clip} />
      <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
        <Play className="size-3 fill-current" /> Echte Szene
      </span>
      {clip.title && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-8 pr-[38%] text-[11px] font-medium leading-tight text-white">
          {clip.title}
        </span>
      )}
      <span className="pointer-events-none absolute bottom-2 right-2 w-[34%] overflow-hidden rounded-md ring-1 ring-white/40 shadow-lg" aria-hidden="true">
        {board('block w-full')}
      </span>
    </div>
  );
}
