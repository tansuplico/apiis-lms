// src/controllers/thumbnailController.ts
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import path from "path";
import fs from "fs";
import { THUMBNAILS_DIR } from "../config/uploadPaths";

// ── List Thumbnails
export async function listThumbnails(req: AuthRequest, res: Response) {
  try {
    const files = fs
      .readdirSync(THUMBNAILS_DIR)
      .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

    const data = files.map((filename) => ({
      filename,
      url: `/api/thumbnails/${filename}`,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to list thumbnails." });
  }
}

// ── Serve Thumbnail
export async function serveThumbnail(req: AuthRequest, res: Response) {
  try {
    const rawFilename = req.params["filename"];
    if (Array.isArray(rawFilename)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename." });
    }

    const filePath = path.resolve(THUMBNAILS_DIR, rawFilename);
    if (!filePath.startsWith(THUMBNAILS_DIR + path.sep)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename." });
    }

    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res
          .status(404)
          .json({ success: false, message: "Thumbnail not found." });
      }
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to serve thumbnail." });
  }
}

// ── Upload Thumbnail (admin only)
export async function uploadThumbnail(req: AuthRequest, res: Response) {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded." });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        filename: file.filename,
        url: `/api/thumbnails/${file.filename}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed." });
  }
}

// ── Delete Thumbnail (admin only)
export async function deleteThumbnail(req: AuthRequest, res: Response) {
  try {
    const rawFilename = req.params["filename"];
    if (Array.isArray(rawFilename)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename." });
    }

    const filePath = path.resolve(THUMBNAILS_DIR, rawFilename);
    if (!filePath.startsWith(THUMBNAILS_DIR + path.sep)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename." });
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          return res
            .status(404)
            .json({ success: false, message: "Thumbnail not found." });
        }
        return res
          .status(500)
          .json({ success: false, message: "Delete failed." });
      }
      res.json({ success: true, data: { filename: rawFilename } });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed." });
  }
}
