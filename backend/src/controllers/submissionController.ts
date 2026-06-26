// src/controllers/submissionController.ts
import { Response } from "express";
import path from "path";
import fs from "fs";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const SUBMISSIONS_DIR = path.resolve(__dirname, "../../uploads/submissions");
const MAX_ALLOWED_FILES = 20;

// ── Helpers: facilitator/admin ownership of a module
async function canManageModule(
  req: AuthRequest,
  moduleId: number,
  res: Response,
): Promise<boolean> {
  if (req.user!.role === "admin") return true;

  const { rows } = await pool.query(
    `SELECT 1
     FROM course_modules cm
     JOIN center_courses cc ON cc.course_id = cm.course_id
     JOIN center_facilitators cf ON cf.center_id = cc.center_id
     WHERE cm.id = $1
       AND cf.facilitator_id = $2
     LIMIT 1`,
    [moduleId, req.user!.id],
  );

  if (rows.length === 0) {
    res.status(403).json({ success: false, message: "Access denied." });
    return false;
  }
  return true;
}

// ── Helpers: student has access to a module (currently enrolled in a center offering this course)
async function studentHasAccessToModule(
  studentId: number,
  moduleId: number,
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM course_modules cm
     JOIN center_courses cc ON cc.course_id = cm.course_id
     JOIN student_centers sc ON sc.center_id = cc.center_id
     WHERE cm.id = $1
       AND sc.student_id = $2
       AND sc.is_current = TRUE
     LIMIT 1`,
    [moduleId, studentId],
  );
  return rows.length > 0;
}

// ── Get Submission Settings (admin/facilitator)
export const getSubmissionSettings = async (
  req: AuthRequest,
  res: Response,
) => {
  const moduleId = parseInt(req.params.moduleId as string, 10);
  if (isNaN(moduleId) || moduleId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  const allowed = await canManageModule(req, moduleId, res);
  if (!allowed) return;

  try {
    const { rows } = await pool.query(
      `SELECT is_active, max_files FROM module_submission_settings WHERE module_id = $1`,
      [moduleId],
    );

    const settings = rows[0] ?? { is_active: false, max_files: 1 };

    return res.json({
      success: true,
      data: { isActive: settings.is_active, maxFiles: settings.max_files },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch settings." });
  }
};

// ── Upsert Submission Settings (admin/facilitator)
export const upsertSubmissionSettings = async (
  req: AuthRequest,
  res: Response,
) => {
  const moduleId = parseInt(req.params.moduleId as string, 10);
  if (isNaN(moduleId) || moduleId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  const { isActive, maxFiles } = req.body;

  if (typeof isActive !== "boolean") {
    return res
      .status(400)
      .json({ success: false, message: "isActive must be a boolean." });
  }

  const maxFilesNum = Number(maxFiles);
  if (
    !Number.isInteger(maxFilesNum) ||
    maxFilesNum < 1 ||
    maxFilesNum > MAX_ALLOWED_FILES
  ) {
    return res.status(400).json({
      success: false,
      message: `maxFiles must be a whole number between 1 and ${MAX_ALLOWED_FILES}.`,
    });
  }

  const moduleCheck = await pool.query(
    "SELECT id FROM course_modules WHERE id = $1",
    [moduleId],
  );
  if (moduleCheck.rows.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Module not found." });
  }

  const allowed = await canManageModule(req, moduleId, res);
  if (!allowed) return;

  try {
    const { rows } = await pool.query(
      `INSERT INTO module_submission_settings (module_id, is_active, max_files)
       VALUES ($1, $2, $3)
       ON CONFLICT (module_id)
       DO UPDATE SET is_active = $2, max_files = $3, updated_at = NOW()
       RETURNING is_active, max_files`,
      [moduleId, isActive, maxFilesNum],
    );

    return res.json({
      success: true,
      message: "Submission settings updated.",
      data: { isActive: rows[0].is_active, maxFiles: rows[0].max_files },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to update settings." });
  }
};

// ── List All Submissions for a Module (admin/facilitator)
export const listModuleSubmissions = async (
  req: AuthRequest,
  res: Response,
) => {
  const moduleId = parseInt(req.params.moduleId as string, 10);
  if (isNaN(moduleId) || moduleId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  const allowed = await canManageModule(req, moduleId, res);
  if (!allowed) return;

  try {
    const { rows } = await pool.query(
      `SELECT ss.id, ss.student_id, s.first_name, s.last_name,
              ss.original_filename, ss.mime_type, ss.file_size, ss.submitted_at
       FROM student_submissions ss
       JOIN students s ON s.id = ss.student_id
       WHERE ss.module_id = $1
       ORDER BY ss.submitted_at DESC`,
      [moduleId],
    );

    return res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: `${r.first_name} ${r.last_name}`,
        originalFilename: r.original_filename,
        mimeType: r.mime_type,
        fileSize: r.file_size,
        submittedAt: r.submitted_at,
      })),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch submissions." });
  }
};

// ── Get My Submissions (student)
export const getMySubmissions = async (req: AuthRequest, res: Response) => {
  const moduleId = parseInt(req.params.moduleId as string, 10);
  if (isNaN(moduleId) || moduleId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  const studentId = req.user!.id;

  const hasAccess = await studentHasAccessToModule(studentId, moduleId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  try {
    const settingsResult = await pool.query(
      `SELECT is_active, max_files FROM module_submission_settings WHERE module_id = $1`,
      [moduleId],
    );
    const settings = settingsResult.rows[0] ?? {
      is_active: false,
      max_files: 1,
    };

    const submissionsResult = await pool.query(
      `SELECT id, original_filename, mime_type, file_size, submitted_at
       FROM student_submissions
       WHERE module_id = $1 AND student_id = $2
       ORDER BY submitted_at DESC`,
      [moduleId, studentId],
    );

    return res.json({
      success: true,
      data: {
        isActive: settings.is_active,
        maxFiles: settings.max_files,
        submissions: submissionsResult.rows.map((r) => ({
          id: r.id,
          originalFilename: r.original_filename,
          mimeType: r.mime_type,
          fileSize: r.file_size,
          submittedAt: r.submitted_at,
        })),
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch submissions." });
  }
};

// ── Upload Submission (student)
export const uploadSubmission = async (req: AuthRequest, res: Response) => {
  const rawId = req.params.moduleId;
  if (Array.isArray(rawId)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  const moduleId = parseInt(rawId, 10);
  if (isNaN(moduleId) || moduleId <= 0) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  const file = req.file;
  if (!file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  }

  const studentId = req.user!.id;

  try {
    const hasAccess = await studentHasAccessToModule(studentId, moduleId);
    if (!hasAccess) {
      fs.unlinkSync(file.path);
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    const settingsResult = await pool.query(
      `SELECT is_active, max_files FROM module_submission_settings WHERE module_id = $1`,
      [moduleId],
    );

    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].is_active) {
      fs.unlinkSync(file.path);
      return res.status(403).json({
        success: false,
        message: "Submissions are not currently open for this module.",
      });
    }

    const { max_files } = settingsResult.rows[0];

    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM student_submissions WHERE module_id = $1 AND student_id = $2`,
      [moduleId, studentId],
    );

    const currentCount = parseInt(countResult.rows[0].count, 10);
    if (currentCount >= max_files) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum of ${max_files} submission(s) for this module.`,
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO student_submissions
         (student_id, module_id, filename, original_filename, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, original_filename, mime_type, file_size, submitted_at`,
      [
        studentId,
        moduleId,
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
      ],
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    fs.unlink(path.join(SUBMISSIONS_DIR, file.filename), () => {});
    return res.status(500).json({ success: false, message: "Upload failed." });
  }
};

// ── Delete Submission (admin/facilitator)
export const deleteSubmission = async (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  if (Array.isArray(rawId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid submission ID." });
  }

  const submissionId = parseInt(rawId, 10);
  if (isNaN(submissionId) || submissionId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid submission ID." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, module_id, filename FROM student_submissions WHERE id = $1`,
      [submissionId],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found." });
    }

    const { module_id, filename } = rows[0];

    const allowed = await canManageModule(req, module_id, res);
    if (!allowed) return;

    await pool.query("DELETE FROM student_submissions WHERE id = $1", [
      submissionId,
    ]);

    const filePath = path.resolve(SUBMISSIONS_DIR, filename);
    if (
      filePath.startsWith(SUBMISSIONS_DIR + path.sep) ||
      filePath === SUBMISSIONS_DIR
    ) {
      fs.unlink(filePath, () => {});
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Delete failed." });
  }
};

// ── Download Submission (admin/facilitator, or the owning student)
export const downloadSubmission = async (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  if (Array.isArray(rawId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid submission ID." });
  }

  const submissionId = parseInt(rawId, 10);
  if (isNaN(submissionId) || submissionId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid submission ID." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT student_id, module_id, filename, original_filename, mime_type
       FROM student_submissions WHERE id = $1`,
      [submissionId],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found." });
    }

    const { student_id, module_id, filename, original_filename, mime_type } =
      rows[0];

    if (req.user!.role === "student") {
      if (req.user!.id !== student_id) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied." });
      }
    } else {
      const allowed = await canManageModule(req, module_id, res);
      if (!allowed) return;
    }

    const filePath = path.resolve(SUBMISSIONS_DIR, filename);
    if (
      !filePath.startsWith(SUBMISSIONS_DIR + path.sep) &&
      filePath !== SUBMISSIONS_DIR
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid file path." });
    }

    const safeFilename = original_filename
      .replace(/["\r\n]/g, "_")
      .replace(/[^\x20-\x7E]/g, "_");

    res.setHeader("Content-Type", mime_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`,
    );

    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res
          .status(404)
          .json({ success: false, message: "File missing on server." });
      }
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Download failed." });
  }
};
