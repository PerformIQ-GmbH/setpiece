// Curated template library. Each entry is keyed by a stable slug; the sync
// updates existing rows by slug and inserts new ones, so edits here reach the
// production library without duplicates. The category is part of the update, so a
// changed category (e.g. the Anstoss templates, now «kickoff») reaches existing rows too.
// Run only after the migrations lib/db/migrations/20261125_template_library_media.sql
// (and, for «kickoff», 20261127_kickoff_category.sql; without it the write fails):
//   pnpm --filter @workspace/scripts template-library            (dry run)
//   pnpm --filter @workspace/scripts template-library -- --apply (writes)
import { db, setPieceTemplatesTable } from "@workspace/db";
import { LIBRARY } from "./library-data";


async function sync(apply: boolean): Promise<void> {
  const slugs = new Set<string>();
  for (const e of LIBRARY) {
    if (slugs.has(e.slug)) throw new Error(`Duplicate slug ${e.slug}`);
    slugs.add(e.slug);
  }
  const rows = await db.select({ slug: setPieceTemplatesTable.slug, boardData: setPieceTemplatesTable.boardData }).from(setPieceTemplatesTable);
  const existing = new Set(rows.map((r) => r.slug));
  // Templates an admin saved from the editor are the source of truth; never overwrite them.
  const handEdited = new Set(rows.filter((r) => r.boardData && "editedByAdminAt" in r.boardData).map((r) => r.slug));
  for (const e of LIBRARY) {
    if (handEdited.has(e.slug)) { console.log(`skip   ${e.slug} – im Editor bearbeitet`); continue; }
    console.log(`${existing.has(e.slug) ? "update" : "insert"} ${e.slug} – ${e.title}`);
    if (!apply) continue;
    // Board and clips only overwrite when the library entry has them, so older entries keep their DB values.
    const { slug, boardData, media, ...text } = e;
    const set = { ...text, ...(boardData ? { boardData } : {}), ...(media ? { media } : {}) };
    await db.insert(setPieceTemplatesTable).values(e).onConflictDoUpdate({ target: setPieceTemplatesTable.slug, set });
  }
  console.log(apply ? "Library synced." : "Dry run. Re-run with --apply to write.");
}

sync(process.argv.includes("--apply")).then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
