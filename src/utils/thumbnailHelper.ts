// src/utils/thumbnailHelpers.ts
export function extractThumbnailFilename(
  url: string | null | undefined,
): string | null {
  if (!url || url.trim() === "") return null;
  if (url.startsWith("data:") || url.startsWith("blob:")) return null;
  if (url === "/module-thumbnail.png") return null;

  try {
    // Absolute URL — let URL() parse out just the path, then take the basename.
    if (url.startsWith("http")) {
      const pathname = new URL(url).pathname;
      return pathname.split("/").pop() || null;
    }

    // Relative path (e.g. /api/thumbnails/uuid.png) — take the basename.
    return url.split("/").pop() || null;
  } catch {
    return null;
  }
}
