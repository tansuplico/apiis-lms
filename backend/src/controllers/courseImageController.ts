import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import path from "path";

const CONTENT_IMAGES_DIR = path.join(__dirname, "../../uploads/content-images");

export async function uploadContentImage(req: AuthRequest, res: Response) {
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
        url: `/api/content-images/${file.filename}`,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Upload failed." });
  }
}

export async function serveContentImage(req: AuthRequest, res: Response) {
  try {
    const rawFilename = req.params["filename"];
    if (Array.isArray(rawFilename)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename." });
    }
    const filePath = path.resolve(CONTENT_IMAGES_DIR, rawFilename);
    if (!filePath.startsWith(CONTENT_IMAGES_DIR + path.sep)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid filename." });
    }
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, message: "Image not found." });
      }
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to serve image." });
  }
}
