// src/routes/fileRoutes.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { authenticate, authorize } from "../middleware/auth";
import { FILES_DIR } from "../config/uploadPaths";
import {
  uploadModuleFile,
  deleteModuleFile,
  downloadFile,
} from "../controllers/fileController";

const router = Router();

// ── Multer configuration
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, DOCX, and PPTX files are allowed."));
  },
});

// ── Multer error handler
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File too large. Maximum size is 50MB.",
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
// Download (authenticated)
router.get(
  "/:id/download",
  authenticate,
  authorize("admin", "facilitator", "student"),
  downloadFile,
);

// Upload (admin/facilitator)
router.post(
  "/modules/:moduleId/files",
  authenticate,
  authorize("admin", "facilitator"),
  upload.single("file"),
  handleMulterError,
  uploadModuleFile,
);

// Delete (admin/facilitator)
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  deleteModuleFile,
);

export default router;
