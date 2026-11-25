// Schneidet Szenen aus Quellvideos nach clips.json, setzt Titel-Einblendung und
// SETPIECE-Kennung, und schreibt Upload-Liste (CSV + Markdown) für den Kanal.
// Aufruf: node scripts/clips/schneiden.mjs --src pl-ten-of-the-best=/pfad/a.mp4 --src osman-top5=/pfad/b.mp4 [--out DIR] [--only 01,02]
// Braucht ffmpeg. Ton wird entfernt (Musikrechte); Quellvideos nie ins Repo legen.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const cfg = JSON.parse(readFileSync(path.join(here, "clips.json"), "utf8"));
const args = process.argv.slice(2);
const srcPaths = {};
let out = path.resolve("setpiece-videos");
let only = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--src") { const [k, v] = args[++i].split(/=(.*)/s); srcPaths[k] = v; }
  else if (args[i] === "--out") out = path.resolve(args[++i]);
  else if (args[i] === "--only") only = new Set(args[++i].split(","));
}
const FONT = process.env.FONT ?? "/usr/share/fonts/opentype/inter/Inter-Bold.otf";
const GREEN = "0x1CCA79"; // App-Primärfarbe hsl(152 76% 45%)

export function seconds(t) {
  const parts = String(t).split(":").map(Number);
  if (parts.some(Number.isNaN)) throw new Error(`Zeit unlesbar: ${t}`);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function filter(fmt, titleFile, sceneFile) {
  const txt = (file, size, color, y, until) =>
    `drawtext=fontfile=${FONT}:textfile=${file}:fontsize=${size}:fontcolor=${color}:x=48:y=${y}` + (until ? `:enable='lt(t,${until})'` : "");
  // Kompilation hat eigene Titelzeile oben: wegschneiden, nur Spielfeld behalten.
  const base = fmt === "portrait-compilation"
    ? "crop=360:360:0:152,scale=1080:1080:flags=lanczos"
    : "scale=1280:720:flags=lanczos";
  return [
    base,
    // Oben, weil Quellen unten eigene Namenseinblendungen haben.
    `drawbox=x=0:y=0:w=iw:h=130:color=black@0.65:t=fill:enable='lt(t,4.5)'`,
    txt(titleFile, 46, "white", "16", 4.5),
    txt(sceneFile, 28, GREEN, "80", 4.5),
    `drawtext=fontfile=${FONT}:text=SETPIECE:fontsize=26:fontcolor=white@0.85:x=w-tw-28:y=h-th-24`,
  ].join(",");
}

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
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(start), "-t", String(dur), "-i", input,
    "-vf", filter(src.format, titleFile, sceneFile), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
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
  rows.push({ ...c, file, ytTitle, description });
}

const csv = (v) => `"${String(v).replaceAll('"', '""')}"`;
writeFileSync(path.join(out, "upload-liste.csv"),
  ["id,datei,titel,beschreibung,playlist,sichtbarkeit,vorlage,start,ende,youtube_link"]
    .concat(rows.map((r) => [r.id, r.file, r.ytTitle, r.description, r.playlist, cfg.channel.visibility, r.template, r.start, r.end, ""].map(csv).join(",")))
    .join("\n") + "\n");
writeFileSync(path.join(out, "upload-liste.md"), rows.map((r) =>
  `## ${r.id} · ${r.file}\n\n- **Titel:** ${r.ytTitle}\n- **Playlist:** ${r.playlist}\n- **Sichtbarkeit:** Nicht gelistet\n- **Vorlage:** \`${r.template}\`\n\n**Beschreibung:**\n\n\`\`\`\n${r.description}\n\`\`\`\n`).join("\n"));
// Kanalentwurf, Browser-Prompt und Kanalgrafiken gehören zu jedem Paket.
const kanal = path.join(here, "../../docs/kanal");
for (const f of ["KANAL.md", "BROWSER-PROMPT.md"]) cpSync(path.join(kanal, f), path.join(out, f));
mkdirSync(path.join(out, "kanal"), { recursive: true });
for (const f of ["avatar.png", "banner.png"]) cpSync(path.join(kanal, f), path.join(out, "kanal", f));
console.log(`${rows.length} Clips in ${out}`);
