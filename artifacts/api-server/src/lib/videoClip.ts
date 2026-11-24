// Reference clips on set pieces and templates: a YouTube or Vimeo link plus a
// start/end window. Only these hosts are embeddable in the player view, so the
// server derives provider and id itself and never trusts client-sent ones.

import type { VideoClip } from "@workspace/db";

export const MAX_CLIPS = 5;
const MAX_SECONDS = 6 * 60 * 60;

type Parsed = Pick<VideoClip, "provider" | "videoId" | "hash"> & { t?: number };

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseVideoUrl(raw: string): Parsed | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const tParam = u.searchParams.get("t") ?? u.searchParams.get("start");
  const t = tParam && /^\d+s?$/.test(tParam) ? parseInt(tParam, 10) : undefined;

  let id: string | undefined;
  if (u.hostname === "youtu.be") id = parts[0];
  else if (YT_HOSTS.has(u.hostname)) {
    id = u.pathname === "/watch" ? u.searchParams.get("v") ?? undefined
      : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : undefined;
  }
  if (id !== undefined) return YT_ID.test(id) ? { provider: "youtube", videoId: id, t } : null;

  if (u.hostname === "vimeo.com" || u.hostname === "www.vimeo.com" || u.hostname === "player.vimeo.com") {
    const [vid, hash] = u.hostname === "player.vimeo.com" ? [parts[1], u.searchParams.get("h") ?? undefined] : [parts[0], parts[1]];
    if (u.hostname === "player.vimeo.com" && parts[0] !== "video") return null;
    if (!vid || !/^\d{1,12}$/.test(vid) || (hash && !/^[a-f0-9]{6,20}$/.test(hash))) return null;
    return { provider: "vimeo", videoId: vid, ...(hash ? { hash } : {}) };
  }
  return null;
}

const seconds = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return v === undefined ? undefined : null;
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_SECONDS ? v : NaN;
};

/** Validates client input and returns normalized clips, or an error message. */
export function normalizeMedia(input: unknown): { media: VideoClip[] } | { error: string } {
  if (!Array.isArray(input)) return { error: "media must be an array" };
  if (input.length > MAX_CLIPS) return { error: `At most ${MAX_CLIPS} clips` };
  const media: VideoClip[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { error: "Invalid clip" };
    const c = raw as Record<string, unknown>;
    if (typeof c.url !== "string" || c.url.length > 500) return { error: "Invalid clip URL" };
    const parsed = parseVideoUrl(c.url.trim());
    if (!parsed) return { error: "Only YouTube or Vimeo links are supported" };
    const start = seconds(c.startSec);
    const end = seconds(c.endSec);
    if (Number.isNaN(start) || Number.isNaN(end)) return { error: "Invalid clip time" };
    const startSec = start ?? parsed.t ?? 0;
    const endSec = end ?? null;
    if (endSec !== null && endSec <= startSec) return { error: "Clip end must be after start" };
    if (c.title !== undefined && c.title !== null && (typeof c.title !== "string" || c.title.length > 120)) return { error: "Invalid clip title" };
    const title = typeof c.title === "string" && c.title.trim() ? c.title.trim() : null;
    const { t: _t, ...ids } = parsed;
    media.push({ url: c.url.trim(), ...ids, startSec, endSec, title });
  }
  return { media };
}
