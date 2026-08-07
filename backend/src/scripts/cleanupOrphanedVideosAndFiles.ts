import fs from "fs/promises";
import path from "path";
import pool from "../config/db";
import { VIDEOS_DIR, FILES_DIR } from "../config/uploadPaths";

// Deletes files in VIDEOS_DIR and FILES_DIR that no module_videos /
// module_files row references. Written after module_videos and module_files
// were found completely empty (see session 5 audit notes) — every file in
// these two directories is therefore currently unreferenced by definition,
// and already unreachable through the app (streamVideo/downloadFile both
// look the file up by its DB row first). This script re-checks the DB at
// run time rather than assuming it's still empty, so it stays correct if
// new uploads land before you run it.
//
// Run this ON RAILWAY (`railway run` or a one-off shell in the deployed
// container) — VIDEOS_DIR/FILES_DIR are local to that container's volume.
//
// Usage:
//   cross-env NODE_ENV=script tsx src/scripts/cleanupOrphanedVideosAndFiles.ts          (dry run, default)
//   cross-env NODE_ENV=script tsx src/scripts/cleanupOrphanedVideosAndFiles.ts --delete  (actually deletes)

const DRY_RUN = !process.argv.includes("--delete");

async function cleanupDir(
  label: string,
  dir: string,
  referencedFilenamesQuery: string,
): Promise<{ freedBytes: number; orphanCount: number }> {
  console.log(`\n=== ${label} (${dir}) ===`);

  const filesOnDisk = await fs.readdir(dir);
  console.log(`Found ${filesOnDisk.length} file(s) on disk.`);

  if (filesOnDisk.length === 0) {
    console.log("Nothing to do.");
    return { freedBytes: 0, orphanCount: 0 };
  }

  const { rows } = await pool.query(referencedFilenamesQuery);
  const referenced = new Set(rows.map((r: { filename: string }) => r.filename));
  console.log(`Found ${referenced.size} referenced filename(s) in DB.`);

  const orphans = filesOnDisk.filter((f) => !referenced.has(f));
  const kept = filesOnDisk.length - orphans.length;
  console.log(
    `${orphans.length} orphaned file(s), ${kept} still-referenced file(s).`,
  );

  let freedBytes = 0;
  for (const filename of orphans) {
    const filePath = path.join(dir, filename);
    const stat = await fs.stat(filePath);
    freedBytes += stat.size;

    if (DRY_RUN) {
      console.log(
        `[dry run] would delete ${filename} (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`,
      );
    } else {
      await fs.unlink(filePath);
      console.log(
        `deleted ${filename} (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`,
      );
    }
  }

  return { freedBytes, orphanCount: orphans.length };
}

const run = async () => {
  try {
    const videosResult = await cleanupDir(
      "Videos",
      VIDEOS_DIR,
      `SELECT filename FROM module_videos`,
    );
    const filesResult = await cleanupDir(
      "Files",
      FILES_DIR,
      `SELECT filename FROM module_files`,
    );

    const totalFreedMB =
      (videosResult.freedBytes + filesResult.freedBytes) / (1024 * 1024);
    const totalOrphans = videosResult.orphanCount + filesResult.orphanCount;

    console.log(`\n=== Summary ===`);
    console.log(`${totalOrphans} orphaned file(s) total.`);
    if (DRY_RUN) {
      console.log(
        `[dry run] would free ${totalFreedMB.toFixed(2)} MB. Re-run with --delete to actually remove these files.`,
      );
    } else {
      console.log(`Freed ${totalFreedMB.toFixed(2)} MB.`);
    }
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
