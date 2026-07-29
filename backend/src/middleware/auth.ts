// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db";

// ── Types & Constants
const VALID_ROLES = ["student", "facilitator", "admin"] as const;
type Role = (typeof VALID_ROLES)[number];

const ROLE_TABLE_MAP: Record<Role, string> = {
  student: "students",
  facilitator: "facilitators",
  admin: "admins",
};

// Only bump session_last_active this often — avoids a DB write on every
// single authenticated request when a user is actively clicking around.
const ACTIVITY_UPDATE_THROTTLE_MS = 60 * 1000;

export interface AuthRequest extends Omit<Request, "file"> {
  user?: {
    id: number;
    role: Role;
  };
  file?: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  };
  files?: any;
}
// ── authenticate middleware
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("CRITICAL: JWT_SECRET is not defined.");
    res
      .status(500)
      .json({ success: false, message: "Server configuration error." });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token || token.split(".").length !== 3) {
    res.status(401).json({ success: false, message: "Invalid token format." });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      id: number;
      role: Role;
      sessionId?: string;
      exp: number;
    };

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      res.status(401).json({ success: false, message: "Token has expired." });
      return;
    }

    if (!decoded.id || isNaN(Number(decoded.id))) {
      res
        .status(401)
        .json({ success: false, message: "Invalid token payload." });
      return;
    }

    if (!VALID_ROLES.includes(decoded.role)) {
      res
        .status(401)
        .json({ success: false, message: "Invalid token payload." });
      return;
    }

    // Tokens issued before single-session enforcement shipped won't carry a
    // sessionId — treat those as invalid so everyone re-authenticates once.
    if (!decoded.sessionId) {
      res.status(401).json({ success: false, message: "Please log in again." });
      return;
    }

    const table = ROLE_TABLE_MAP[decoded.role];
    const sessionResult = await pool.query(
      `SELECT session_id, session_last_active FROM ${table} WHERE id = $1`,
      [decoded.id],
    );
    const sessionRow = sessionResult.rows[0];

    if (!sessionRow || sessionRow.session_id !== decoded.sessionId) {
      res.status(401).json({
        success: false,
        message:
          "You've been logged out because this account was signed in on another device.",
      });
      return;
    }

    const lastActiveMs = sessionRow.session_last_active
      ? new Date(sessionRow.session_last_active).getTime()
      : 0;

    if (Date.now() - lastActiveMs > ACTIVITY_UPDATE_THROTTLE_MS) {
      await pool.query(
        `UPDATE ${table} SET session_last_active = NOW() WHERE id = $1`,
        [decoded.id],
      );
    }

    req.user = {
      id: Number(decoded.id),
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: "Token has expired." });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: "Invalid token." });
      return;
    }
    console.error("authenticate error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── authorize middleware
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      console.warn(
        `Unauthorized access attempt: role=${req.user.role} tried to access route requiring [${roles.join(", ")}]`,
      );
      res.status(403).json({ success: false, message: "Access denied." });
      return;
    }

    next();
  };
};
