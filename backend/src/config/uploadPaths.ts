// src/config/uploadPaths.ts
import path from "path";

export const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT || path.join(__dirname, "../../uploads");

export const SUBMISSIONS_DIR = path.join(UPLOAD_ROOT, "submissions");
export const CONTENT_IMAGES_DIR = path.join(UPLOAD_ROOT, "content-images");
export const THUMBNAILS_DIR = path.join(UPLOAD_ROOT, "thumbnails");
export const FILES_DIR = path.join(UPLOAD_ROOT, "files");
export const VIDEOS_DIR = path.join(UPLOAD_ROOT, "videos");
export const CENTER_THUMBNAILS_DIR = path.join(
  UPLOAD_ROOT,
  "center-thumbnails",
);
