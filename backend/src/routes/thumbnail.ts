// src/routes/thumbnail.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authenticate, authorize } from "../middleware/auth";
import {
  listThumbnails,
  serveThumbnail,
  uploadThumbnail,
  deleteThumbnail,
} from "../controllers/thumbnailController";

// ── Router setup
const router = Router();

// ── Multer configuration
const THUMBNAILS_DIR = path.join(__dirname, "../../uploads/thumbnails");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, THUMBNAILS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed."));
  },
});

// ── Public routes
router.get("/", listThumbnails);
router.get(
  "/:filename",
  (_req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    next();
  },
  serveThumbnail,
);

// ── Admin routes
router.post(
  "/",
  authenticate,
  authorize("admin"),
  upload.single("thumbnail"),
  uploadThumbnail,
);
router.delete("/:filename", authenticate, authorize("admin"), deleteThumbnail);

export default router;
