export type Side = 'right' | 'left' | 'bottom' | 'top';

export interface Rect { x: number; y: number; width: number; height: number }
export interface Placement { left: number; top: number; docked: boolean }

export const MARGIN = 12;
const GAP = 16;

/**
 * Position der Karte: bevorzugte Seite, sonst die Seite mit dem meisten Platz;
 * immer vollständig im Fenster. Auf schmalen Fenstern oder wenn das Ziel fast
 * den ganzen Bildschirm füllt, dockt die Karte oben oder unten an.
 */
export function computeCardPlacement(
  target: Rect | null,
  card: { w: number; h: number },
  vp: { w: number; h: number },
  preferred: Side = 'bottom',
): Placement {
  const clampX = (x: number) => Math.min(Math.max(MARGIN, x), Math.max(MARGIN, vp.w - card.w - MARGIN));
  const clampY = (y: number) => Math.min(Math.max(MARGIN, y), Math.max(MARGIN, vp.h - card.h - MARGIN));
  if (!target) return { left: clampX((vp.w - card.w) / 2), top: clampY((vp.h - card.h) / 2), docked: false };

  const narrow = vp.w < 640;
  const space = {
    top: target.y - MARGIN,
    bottom: vp.h - (target.y + target.height) - MARGIN,
    left: target.x - MARGIN,
    right: vp.w - (target.x + target.width) - MARGIN,
  };
  const fits: Record<Side, boolean> = {
    top: space.top >= card.h + GAP,
    bottom: space.bottom >= card.h + GAP,
    left: space.left >= card.w + GAP,
    right: space.right >= card.w + GAP,
  };
  const dock = (): Placement => {
    // Gegenüber vom Ziel andocken, damit das Spotlight sichtbar bleibt.
    const targetCenter = target.y + target.height / 2;
    const top = targetCenter > vp.h / 2 ? MARGIN : vp.h - card.h - MARGIN;
    return { left: clampX((vp.w - card.w) / 2), top: clampY(top), docked: true };
  };
  if (narrow) return fits.top || fits.bottom ? place(preferred === 'top' ? 'top' : 'bottom') : dock();

  const order: Side[] = [preferred, ...(['bottom', 'top', 'right', 'left'] as Side[]).filter(s => s !== preferred)];
  const best = order.find(s => fits[s]);
  return best ? place(best) : dock();

  function place(side: Side): Placement {
    let s = side;
    if (!fits[s]) s = fits.bottom ? 'bottom' : 'top';
    const cx = target!.x + target!.width / 2;
    const cy = target!.y + target!.height / 2;
    if (s === 'bottom') return { left: clampX(cx - card.w / 2), top: clampY(target!.y + target!.height + GAP), docked: false };
    if (s === 'top') return { left: clampX(cx - card.w / 2), top: clampY(target!.y - card.h - GAP), docked: false };
    if (s === 'right') return { left: clampX(target!.x + target!.width + GAP), top: clampY(cy - card.h / 2), docked: false };
    return { left: clampX(target!.x - card.w - GAP), top: clampY(cy - card.h / 2), docked: false };
  }
}
