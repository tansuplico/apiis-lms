// src/routes/submissionRoutes.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authenticate, authorize } from "../middleware/auth";
import {
  getSubmissionSettings,
  upsertSubmissionSettings,
  listModuleSubmissions,
  getMySubmissions,
  uploadSubmission,
  deleteSubmission,
  downloadSubmission,
} from "../controllers/submissionController";

const router = Router();

// ── Multer configuration
const SUBMISSIONS_DIR = path.join(__dirname, "../../uploads/submissions");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SUBMISSIONS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    const allowedExts = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, JPEG, or PNG files are allowed."));
    }
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

// ── Settings (admin/facilitator)
router.get(
  "/modules/:moduleId/settings",
  authenticate,
  authorize("admin", "facilitator"),
  getSubmissionSettings,
);
router.put(
  "/modules/:moduleId/settings",
  authenticate,
  authorize("admin", "facilitator"),
  upsertSubmissionSettings,
);

// ── List all submissions for a module (admin/facilitator)
router.get(
  "/modules/:moduleId",
  authenticate,
  authorize("admin", "facilitator"),
  listModuleSubmissions,
);

// ── Student's own submissions (student)
router.get(
  "/modules/:moduleId/mine",
  authenticate,
  authorize("student"),
  getMySubmissions,
);

// ── Upload (student)
router.post(
  "/modules/:moduleId",
  authenticate,
  authorize("student"),
  upload.single("file"),
  handleMulterError,
  uploadSubmission,
);

// ── Delete (admin/facilitator)
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  deleteSubmission,
);

// ── Download (all roles — ownership enforced in controller)
router.get(
  "/:id/download",
  authenticate,
  authorize("admin", "facilitator", "student"),
  downloadSubmission,
);

export default router;
