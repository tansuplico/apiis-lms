// src/routes/videoRoutes.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authenticate, authorize } from "../middleware/auth";
import { VIDEOS_DIR } from "../config/uploadPaths";
import {
  uploadModuleVideo,
  deleteModuleVideo,
  streamVideo,
  getVideoStreamToken,
} from "../controllers/videoController";

// ── Router setup
const router = Router();

// ── Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1.5 * 1024 * 1024 * 1024 }, // 1.5 GB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "video/mp4") cb(null, true);
    else cb(new Error("Only MP4 files are allowed."));
  },
});

// ── Multer error handler
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File too large. Maximum video size is 1.5GB.",
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// ── Routes

// Stream token — authenticated
router.get(
  "/:id/stream-token",
  authenticate,
  authorize("admin", "facilitator", "student"),
  getVideoStreamToken,
);

// Stream — token‑authenticated (no middleware, checked inside controller)
router.get("/:id/stream", streamVideo);

// Upload — admin / facilitator
router.post(
  "/modules/:moduleId/videos",
  authenticate,
  authorize("admin", "facilitator"),
  upload.single("video"),
  handleMulterError,
  uploadModuleVideo,
);

// Delete — admin / facilitator
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  deleteModuleVideo,
);

export default router;
