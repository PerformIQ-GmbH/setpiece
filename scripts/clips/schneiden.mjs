// Schneidet Szenen aus Quellvideos nach clips.json, setzt Titel-Einblendung und
// SETPIECE-Kennung, und schreibt Upload-Liste (CSV + Markdown) für den Kanal.
// Aufruf: node scripts/clips/schneiden.mjs --src pl-ten-of-the-best=/pfad/a.mp4 --src osman-top5=/pfad/b.mp4
//          [--out DIR] [--only 01,02] [--upload gs://setpiece-mediathek/clips] [--logo /pfad/symbol-weiss-512.png]
// Mit --upload landen die Clips in Google Cloud Storage (gcloud muss angemeldet sein) und
// media.json enthält die fertigen Einträge pro Vorlage für scripts/src/template-library.ts.
// Mit --logo steht statt des Schriftzugs das Logo halbtransparent unten rechts.
// Braucht ffmpeg (Pfad über FFMPEG, sonst aus PATH), zum Hochladen gcloud (Pfad über GCLOUD, sonst aus PATH). Ton wird entfernt; Quellvideos nie ins Repo legen.
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath statt .pathname: sonst bricht der Pfad unter Windows und bei Leerzeichen.
const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(path.join(here, "clips.json"), "utf8"));
const args = process.argv.slice(2);
const srcPaths = {};
let out = path.resolve("setpiece-videos");
let only = null;
let upload = null;
let logo = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--src") { const [k, v] = args[++i].split(/=(.*)/s); srcPaths[k] = v; }
  else if (args[i] === "--out") out = path.resolve(args[++i]);
  else if (args[i] === "--only") only = new Set(args[++i].split(","));
  else if (args[i] === "--upload") upload = args[++i].replace(/\/+$/, "");
  else if (args[i] === "--logo") logo = path.resolve(args[++i]);
}
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
// gcloud ist unter Windows eine .cmd-Datei: nur über die Shell startbar, Argumente selbst in Anführungszeichen.
const GCLOUD = process.env.GCLOUD ?? (process.platform === "win32" ? "gcloud.cmd" : "gcloud");
function gcloud(args, opts) {
  if (process.platform !== "win32") return execFileSync(GCLOUD, args, opts);
  return execSync([GCLOUD, ...args].map((a) => `"${a}"`).join(" "), opts);
}
const DEFAULT_FONT = process.platform === "win32" ? "C:/Windows/Fonts/arialbd.ttf" : "/usr/share/fonts/opentype/inter/Inter-Bold.otf";
const GREEN = "0x1CCA79"; // App-Primärfarbe hsl(152 76% 45%)

/** Pfad für ffmpeg-Filteroptionen: Schrägstriche, Doppelpunkt und Apostroph maskiert (Windows-Laufwerk C:). */
export function filterPath(p) {
  return String(p).replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
const FONT = filterPath(process.env.FONT ?? DEFAULT_FONT);

export function seconds(t) {
  const parts = String(t).split(":").map(Number);
  if (parts.some(Number.isNaN)) throw new Error(`Zeit unlesbar: ${t}`);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Schriftgrösse des Titels: 38 px, bei langen Titeln kleiner, damit die Zeile ins Bild passt. */
export function titleSize(fmt, title) {
  const width = fmt === "portrait-compilation" ? 720 : 960;
  return Math.max(22, Math.min(38, Math.floor((width - 64) / (String(title).length * 0.6))));
}

/** Filtergraph: Video in [0:v]; mit Logo zusätzlich [1:v], Ausgabe [out]. */
export function filterGraph(fmt, titleFile, sceneFile, withLogo, size = 38) {
  const chain = filter(fmt, titleFile, sceneFile, withLogo, size);
  if (!withLogo) return `[0:v]${chain}[out]`;
  // Logo auf 11 % der Bildbreite, 55 % Deckkraft, unten rechts mit Rand: sichtbar, aber unaufdringlich.
  return `[0:v]${chain}[v];[1:v]format=rgba,colorchannelmixer=aa=0.55[l0];[l0][v]scale2ref=w=main_w*0.11:h=ow/mdar[l][v2];[v2][l]overlay=x=W-w-20:y=H-h-18[out]`;
}

function filter(fmt, titleFile, sceneFile, withLogo = false, size = 38) {
  const txt = (file, size, color, y, until) =>
    `drawtext=fontfile='${FONT}':textfile='${filterPath(file)}':fontsize=${size}:fontcolor=${color}:x=32:y=${y}` + (until ? `:enable='lt(t,${until})'` : "");
  // Kompilation hat eigene Titelzeile oben: wegschneiden, nur Spielfeld behalten.
  const base = fmt === "portrait-compilation"
    ? "crop=360:360:0:152,scale=720:720:flags=lanczos"
    : "scale=960:540:flags=lanczos";
  return [
    base,
    // Oben, weil Quellen unten eigene Namenseinblendungen haben.
    `drawbox=x=0:y=0:w=iw:h=104:color=black@0.65:t=fill:enable='lt(t,4.5)'`,
    txt(titleFile, size, "white", "14", 4.5),
    txt(sceneFile, 24, GREEN, "66", 4.5),
    ...(withLogo ? [] : [`drawtext=fontfile='${FONT}':text=SETPIECE:fontsize=22:fontcolor=white@0.85:x=w-tw-20:y=h-th-18`]),
  ].join(",");
}

if (upload && !/^gs:\/\/[a-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(upload)) throw new Error(`--upload unlesbar: ${upload}`);
mkdirSync(path.join(out, "clips"), { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), "clips-"));
const rows = [];
for (const c of cfg.clips) {
  if (only && !only.has(c.id)) continue;
  const src = cfg.sources[c.source];
  const input = srcPaths[c.source];
  if (!src || !input) throw new Error(`Quelle fehlt für ${c.id}: --src ${c.source}=…`);
  const start = seconds(c.start), dur = seconds(c.end) - start;
  if (dur <= 0) throw new Error(`Ende vor Start bei ${c.id}`);
  const titleFile = path.join(tmp, `${c.id}-t.txt`), sceneFile = path.join(tmp, `${c.id}-s.txt`);
  writeFileSync(titleFile, c.title); writeFileSync(sceneFile, c.scene);
  const file = `${c.id}-${c.template}.mp4`;
  execFileSync(FFMPEG, ["-loglevel", "error", "-y", "-ss", String(start), "-t", String(dur), "-i", input,
    ...(logo ? ["-i", logo] : []),
    "-filter_complex", filterGraph(src.format, titleFile, sceneFile, Boolean(logo), titleSize(src.format, c.title)), "-map", "[out]",
    "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "28",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(out, "clips", file)], { stdio: "inherit" });
  const ytTitle = `${c.title} | ${c.scene.split(" · ")[0]} | SETPIECE`.slice(0, 100);
  const description = [
    c.summary,
    "",
    `Als Vorlage in SETPIECE: «${c.title}». Rollen, Laufwege und Aufgaben für jeden Spieler, per QR-Code aufs Handy.`,
    cfg.channel.appUrl,
    "",
    `Szene: ${c.scene}. Quelle: ${src.label}.`,
  ].join("\n");
  let url = null;
  if (upload) {
    // Inhalts-Hash im Namen: unveränderliche Datei, darf ewig im Cache liegen.
    const local = path.join(out, "clips", file);
    const hash = createHash("sha256").update(readFileSync(local)).digest("hex").slice(0, 10);
    const dest = `${upload}/${c.id}-${c.template}-${hash}.mp4`;
    // Die Cloud-Umgebung setzt einen eigenen Token, der die Dienstkonto-Anmeldung überschreibt und 401 liefert.
    const { CLOUDSDK_AUTH_ACCESS_TOKEN: _token, ...env } = process.env;
    // --no-clobber: vorhandene Dateien im Bucket nie überschreiben.
    gcloud(["storage", "cp", "--no-clobber", local, dest, "--content-type=video/mp4",
      "--cache-control=public, max-age=31536000, immutable"], { stdio: "inherit", env });
    url = dest.replace(/^gs:\/\//, "https://storage.googleapis.com/");
  }
  rows.push({ ...c, file, ytTitle, description, url });
}

const csv = (v) => `"${String(v).replaceAll('"', '""')}"`;
writeFileSync(path.join(out, "upload-liste.csv"),
  ["id,datei,titel,beschreibung,playlist,sichtbarkeit,vorlage,start,ende,youtube_link"]
    .concat(rows.map((r) => [r.id, r.file, r.ytTitle, r.description, r.playlist, cfg.channel.visibility, r.template, r.start, r.end, ""].map(csv).join(",")))
    .join("\n") + "\n");
writeFileSync(path.join(out, "upload-liste.md"), rows.map((r) =>
  `## ${r.id} · ${r.file}\n\n- **Titel:** ${r.ytTitle}\n- **Playlist:** ${r.playlist}\n- **Sichtbarkeit:** Nicht gelistet\n- **Vorlage:** \`${r.template}\`\n\n**Beschreibung:**\n\n\`\`\`\n${r.description}\n\`\`\`\n`).join("\n"));
if (upload) {
  const media = {};
  for (const r of rows) (media[r.template] ??= []).push({ url: r.url, provider: "file", videoId: r.url.split("/").slice(4).join("/"), startSec: 0, endSec: null, title: r.scene });
  writeFileSync(path.join(out, "media.json"), JSON.stringify(media, null, 2) + "\n");
}
// Kanalentwurf, Browser-Prompt und Kanalgrafiken gehören zu jedem Paket.
const kanal = path.join(here, "../../docs/kanal");
for (const f of ["KANAL.md", "BROWSER-PROMPT.md"]) cpSync(path.join(kanal, f), path.join(out, f));
mkdirSync(path.join(out, "kanal"), { recursive: true });
for (const f of ["avatar.png", "banner.png"]) cpSync(path.join(kanal, f), path.join(out, "kanal", f));
console.log(`${rows.length} Clips in ${out}`);
