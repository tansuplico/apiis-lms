import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authenticate, authorize } from "../middleware/auth";
import {
  uploadContentImage,
  serveContentImage,
} from "../controllers/courseImageController";

const CONTENT_IMAGES_DIR = path.join(__dirname, "../../uploads/content-images");
if (!fs.existsSync(CONTENT_IMAGES_DIR)) {
  fs.mkdirSync(CONTENT_IMAGES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CONTENT_IMAGES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."));
    }
  },
});

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin", "facilitator"),
  upload.single("image"),
  uploadContentImage,
);

router.get("/:filename", serveContentImage);

export default router;
