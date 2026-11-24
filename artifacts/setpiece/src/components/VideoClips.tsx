import { useState } from 'react';
import type { VideoClip } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Trash2, Plus } from 'lucide-react';
import { t } from '@/lib/i18n';

export function clipEmbedUrl(clip: VideoClip): string {
  if (clip.provider === 'vimeo') {
    // Vimeo's embed has no end parameter; the clip plays on past endSec.
    return `https://player.vimeo.com/video/${clip.videoId}?${clip.hash ? `h=${clip.hash}&` : ''}dnt=1#t=${clip.startSec}s`;
  }
  const end = clip.endSec != null ? `&end=${clip.endSec}` : '';
  return `https://www.youtube-nocookie.com/embed/${clip.videoId}?start=${clip.startSec}${end}&rel=0&playsinline=1`;
}

export function formatClipTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** "1:05", "65" or "" → seconds; undefined when unreadable. */
export function parseClipTime(text: string): number | null | undefined {
  const v = text.trim();
  if (!v) return null;
  const m = /^(?:(\d+):)?(\d+)$/.exec(v);
  if (!m) return undefined;
  return (m[1] ? parseInt(m[1], 10) * 60 : 0) + parseInt(m[2], 10);
}

function ClipPlayer({ clip }: { clip: VideoClip }) {
  const [round, setRound] = useState(0);
  const label = clip.title || t('Video clip');
  return (
    <figure className="space-y-1.5">
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/[0.06] bg-black">
        <iframe
          key={round}
          src={clipEmbedUrl(clip)}
          title={label}
          className="h-full w-full"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <figcaption className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {label} · {formatClipTime(clip.startSec)}{clip.endSec != null ? `–${formatClipTime(clip.endSec)}` : ''}
        </span>
        <button type="button" onClick={() => setRound(r => r + 1)} className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 hover:text-white">
          <RotateCcw className="h-3 w-3" /> {t('Replay')}
        </button>
      </figcaption>
    </figure>
  );
}

export function VideoClipList({ clips }: { clips: VideoClip[] }) {
  return <div className="space-y-4">{clips.map((clip, i) => <ClipPlayer key={`${clip.videoId}-${clip.startSec}-${i}`} clip={clip} />)}</div>;
}

type ClipInput = { url: string; title: string | null; startSec: number | null; endSec: number | null };

export function VideoClipEditor({ clips, onSave }: { clips: VideoClip[]; onSave: (media: ClipInput[]) => Promise<void> }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const current: ClipInput[] = clips.map(c => ({ url: c.url, title: c.title, startSec: c.startSec, endSec: c.endSec }));

  const save = async (next: ClipInput[]) => {
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      return true;
    } catch (err) {
      const data = (err as { data?: { error?: unknown } })?.data;
      setError(typeof data?.error === 'string' ? t(data.error) : t('Could not save the clip.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const startSec = parseClipTime(start);
    const endSec = parseClipTime(end);
    if (startSec === undefined || endSec === undefined) { setError(t('Enter times as 1:05 or 65.')); return; }
    if (await save([...current, { url: url.trim(), title: title.trim() || null, startSec, endSec }])) {
      setUrl(''); setTitle(''); setStart(''); setEnd('');
    }
  };

  return (
    <div className="space-y-4">
      {clips.length > 0 && (
        <ul className="space-y-4">
          {clips.map((clip, i) => (
            <li key={`${clip.videoId}-${clip.startSec}-${i}`} className="space-y-1">
              <VideoClipList clips={[clip]} />
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" disabled={saving} onClick={() => save(current.filter((_, j) => j !== i))}>
                <Trash2 className="mr-1 h-3 w-3" /> {t('Remove clip')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {clips.length < 5 && (
        <form onSubmit={add} className="space-y-2 rounded-xl border border-white/[0.06] p-3">
          <label className="block text-xs font-medium text-white" htmlFor="clip-url">{t('YouTube or Vimeo link')}</label>
          <Input id="clip-url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtu.be/…" inputMode="url" />
          <label className="block text-xs font-medium text-white" htmlFor="clip-title">{t('Title (optional)')}</label>
          <Input id="clip-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder={t('e.g. Reference, our training')} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-white" htmlFor="clip-start">{t('Start')}</label>
              <Input id="clip-start" value={start} onChange={e => setStart(e.target.value)} placeholder="0:42" inputMode="numeric" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white" htmlFor="clip-end">{t('End')}</label>
              <Input id="clip-end" value={end} onChange={e => setEnd(e.target.value)} placeholder="0:55" inputMode="numeric" />
            </div>
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />} {t('Add clip')}
          </Button>
        </form>
      )}
    </div>
  );
}
