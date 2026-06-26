// src/routes/centerThumbnailRoutes.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { authenticate, authorize } from "../middleware/auth";

// ── Router setup
const router = Router();

// ── Multer configuration
const CENTER_THUMBNAILS_DIR = path.join(
  __dirname,
  "../../uploads/center-thumbnails",
);

if (!fs.existsSync(CENTER_THUMBNAILS_DIR)) {
  fs.mkdirSync(CENTER_THUMBNAILS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CENTER_THUMBNAILS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed."));
  },
});

// ── Upload (admin only)
router.post(
  "/",
  authenticate,
  authorize("admin"),
  upload.single("thumbnail"),
  async (req, res) => {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ success: false, message: "No file uploaded." });
        return;
      }
      res.status(201).json({
        success: true,
        data: {
          filename: file.filename,
          url: `/api/center-thumbnails/${file.filename}`,
        },
      });
    } catch (err) {
      console.error("uploadCenterThumbnail error:", err);
      res.status(500).json({ success: false, message: "Upload failed." });
    }
  },
);

// ── Serve file (public)
router.get("/:filename", async (req, res) => {
  try {
    const filename = req.params["filename"] as string;
    if (filename.includes("..") || filename.includes("/")) {
      res.status(400).json({ success: false, message: "Invalid filename." });
      return;
    }
    const filePath = path.join(CENTER_THUMBNAILS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: "Not found." });
      return;
    }
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to serve file." });
  }
});

export default router;
