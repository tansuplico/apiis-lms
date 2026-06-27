// src/controllers/videoController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../middleware/auth";
import jwt from "jsonwebtoken";
import { VIDEOS_DIR } from "../config/uploadPaths";

// ── Constants
// Ensure upload dir exists on startup
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// ── getVideoStreamToken — generate short‑lived stream token
export async function getVideoStreamToken(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID." });
      return;
    }

    const videoCheck = await pool.query(
      `SELECT id FROM module_videos WHERE id = $1`,
      [id],
    );
    if (videoCheck.rows.length === 0) {
      res.status(404).json({ success: false, message: "Video not found." });
      return;
    }

    const streamToken = jwt.sign(
      {
        userId: authReq.user!.id,
        role: authReq.user!.role,
        videoId: id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" },
    );

    res.status(200).json({ success: true, token: streamToken });
  } catch (err) {
    console.error("getVideoStreamToken error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ── uploadModuleVideo — admin/facilitator uploads a video to a module
export async function uploadModuleVideo(req: Request, res: Response) {
  try {
    const moduleId = parseInt(req.params.moduleId as string);
    const { title, sort_order } = req.body;
    const file = (req as any).file;

    if (isNaN(moduleId)) {
      res.status(400).json({ success: false, message: "Invalid module ID." });
      return;
    }

    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded." });
      return;
    }

    if (!title?.trim()) {
      res.status(400).json({ success: false, message: "Title is required." });
      return;
    }

    // Verify module exists
    const moduleCheck = await pool.query(
      `SELECT id FROM course_modules WHERE id = $1`,
      [moduleId],
    );
    if (moduleCheck.rows.length === 0) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(404).json({ success: false, message: "Module not found." });
      return;
    }

    const authReq = req as AuthRequest;
    if (authReq.user?.role === "facilitator") {
      const ownership = await pool.query(
        `SELECT 1
     FROM center_facilitators cf
     JOIN center_courses cc ON cc.center_id = cf.center_id
     JOIN course_modules cm ON cm.course_id = cc.course_id
     WHERE cm.id = $1 AND cf.facilitator_id = $2
     LIMIT 1`,
        [moduleId, authReq.user.id],
      );
      if (ownership.rows.length === 0) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(403).json({ success: false, message: "Access denied." });
        return;
      }
    }

    // Auto sort_order if not provided
    let sortOrder = 0;
    if (sort_order != null && !isNaN(parseInt(sort_order))) {
      sortOrder = parseInt(sort_order);
    } else {
      const maxRes = await pool.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
         FROM module_videos WHERE module_id = $1`,
        [moduleId],
      );
      sortOrder = maxRes.rows[0].next;
    }

    const result = await pool.query(
      `INSERT INTO module_videos (module_id, title, filename, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, module_id, title, filename, duration_seconds, sort_order`,
      [moduleId, title.trim(), file.filename, sortOrder],
    );

    const v = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: v.id,
        module_id: v.module_id,
        title: v.title,
        filename: v.filename,
        duration_seconds: v.duration_seconds,
        sort_order: v.sort_order,
      },
    });
  } catch (err) {
    console.error("uploadModuleVideo error:", err);
    res.status(500).json({ success: false, message: "Upload failed." });
  }
}

// ── deleteModuleVideo — admin/facilitator deletes a video
export async function deleteModuleVideo(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID." });
      return;
    }

    const authReq = req as AuthRequest;
    if (authReq.user?.role === "facilitator") {
      const ownership = await pool.query(
        `SELECT 1
     FROM center_facilitators cf
     JOIN center_courses cc ON cc.center_id = cf.center_id
     JOIN course_modules cm ON cm.course_id = cc.course_id
     JOIN module_videos mv ON mv.module_id = cm.id
     WHERE mv.id = $1 AND cf.facilitator_id = $2
     LIMIT 1`,
        [id, authReq.user.id],
      );
      if (ownership.rows.length === 0) {
        res.status(403).json({ success: false, message: "Access denied." });
        return;
      }
    }

    const result = await pool.query(
      `DELETE FROM module_videos WHERE id = $1
       RETURNING id, filename`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Video not found." });
      return;
    }

    // Delete file from disk
    const filePath = path.join(VIDEOS_DIR, result.rows[0].filename);

    if (!filePath.startsWith(VIDEOS_DIR + path.sep)) {
      res.status(400).json({ success: false, message: "Invalid file path." });
      return;
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error("deleteModuleVideo error:", err);
    res.status(500).json({ success: false, message: "Delete failed." });
  }
}

// ── streamVideo — range‑request streaming with JWT auth
export async function streamVideo(req: Request, res: Response) {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Range",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      });
      res.end();
      return;
    }

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid video ID." });
      return;
    }

    // Verify stream token from query param
    const token = req.query.token as string;
    if (!token) {
      res
        .status(401)
        .json({ success: false, message: "Stream token required." });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      res
        .status(401)
        .json({ success: false, message: "Invalid or expired stream token." });
      return;
    }

    // Token must be scoped to this exact video
    if (payload.videoId !== id) {
      res
        .status(403)
        .json({ success: false, message: "Token not valid for this video." });
      return;
    }

    const result = await pool.query(
      `SELECT id, filename, title FROM module_videos WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Video not found." });
      return;
    }

    const filePath = path.join(VIDEOS_DIR, result.rows[0].filename);

    // Path traversal guard
    if (!filePath.startsWith(VIDEOS_DIR + path.sep)) {
      res.status(400).json({ success: false, message: "Invalid file path." });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res
        .status(404)
        .json({ success: false, message: "File not found on disk." });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Range validation
      if (
        isNaN(start) ||
        isNaN(end) ||
        start < 0 ||
        end >= fileSize ||
        start > end
      ) {
        res
          .status(416)
          .json({ success: false, message: "Range not satisfiable." });
        return;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error("streamVideo error:", err);
    res.status(500).json({ success: false, message: "Stream failed." });
  }
}
