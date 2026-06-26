// src/controllers/fileController.ts
import { Response } from "express";
import path from "path";
import fs from "fs";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const FILES_DIR = path.resolve(__dirname, "../../uploads/files");
const MAX_TITLE_LENGTH = 200;

// ── Helpers
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

// ── uploadModuleFile
export const uploadModuleFile = async (req: AuthRequest, res: Response) => {
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

  const { title } = req.body;
  const file = req.file;

  if (!file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  }

  if (!title?.trim()) {
    fs.unlinkSync(file.path);
    return res
      .status(400)
      .json({ success: false, message: "Title is required." });
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    fs.unlinkSync(file.path);
    return res.status(400).json({
      success: false,
      message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    });
  }

  const { rows: moduleRows } = await pool.query(
    "SELECT id FROM course_modules WHERE id = $1",
    [moduleId],
  );

  if (moduleRows.length === 0) {
    fs.unlinkSync(file.path);
    return res
      .status(404)
      .json({ success: false, message: "Module not found." });
  }

  const allowed = await canManageModule(req, moduleId, res);
  if (!allowed) {
    fs.unlinkSync(file.path);
    return;
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT COALESCE(MAX(sort_order), 0) AS max FROM module_files WHERE module_id = $1",
      [moduleId],
    );
    const sortOrder = existing[0].max + 1;

    const { rows } = await pool.query(
      `INSERT INTO module_files
         (module_id, title, filename, original_filename, mime_type, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, module_id, title, filename, original_filename, mime_type, sort_order, created_at`,
      [
        moduleId,
        title.trim(),
        file.filename,
        file.originalname,
        file.mimetype,
        sortOrder,
      ],
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err: any) {
    fs.unlink(path.join(FILES_DIR, file.filename), () => {});
    return res.status(500).json({ success: false, message: "Upload failed." });
  }
};

// ── deleteModuleFile
export const deleteModuleFile = async (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  if (Array.isArray(rawId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid file ID." });
  }

  const fileId = parseInt(rawId, 10);
  if (isNaN(fileId) || fileId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid file ID." });
  }

  try {
    const { rows: fileRows } = await pool.query(
      "SELECT id, module_id, filename FROM module_files WHERE id = $1",
      [fileId],
    );
    if (fileRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "File not found." });
    }

    const { module_id, filename } = fileRows[0];

    const allowed = await canManageModule(req, module_id, res);
    if (!allowed) return;

    await pool.query("DELETE FROM module_files WHERE id = $1", [fileId]);

    const filePath = path.resolve(FILES_DIR, filename);
    if (filePath.startsWith(FILES_DIR + path.sep) || filePath === FILES_DIR) {
      fs.unlink(filePath, () => {});
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Delete failed." });
  }
};

// ── downloadFile
export const downloadFile = async (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  if (Array.isArray(rawId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid file ID." });
  }

  const fileId = parseInt(rawId, 10);
  if (isNaN(fileId) || fileId <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid file ID." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT filename, original_filename, mime_type FROM module_files WHERE id = $1",
      [fileId],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "File not found." });
    }

    const { filename, original_filename, mime_type } = rows[0];

    const filePath = path.resolve(FILES_DIR, filename);
    if (!filePath.startsWith(FILES_DIR + path.sep) && filePath !== FILES_DIR) {
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
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: "Download failed." });
  }
};
