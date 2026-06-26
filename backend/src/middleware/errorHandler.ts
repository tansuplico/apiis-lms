// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string; // PostgreSQL error code
}

// ── Helper: sanitize path for logging
const sanitizePath = (path: string): string => {
  return path.replace(/[^\w\s\-\/\.]/gi, "").substring(0, 200);
};

// ── Constants
const PRODUCTION_ERROR_MESSAGE =
  "An unexpected error occurred. Please try again later.";

// ── errorHandler middleware
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isDev = process.env.NODE_ENV === "development";
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle PostgreSQL specific errors
  if (err.code) {
    switch (err.code) {
      case "23505": // unique violation
        statusCode = 409;
        message = "A record with this data already exists.";
        break;
      case "23503": // foreign key violation
        statusCode = 400;
        message = "Referenced record does not exist.";
        break;
      case "23502": // not null violation
        statusCode = 400;
        message = "Required field is missing.";
        break;
      case "22P02": // invalid input syntax
        statusCode = 400;
        message = "Invalid input format.";
        break;
      default:
        message = isDev
          ? `Database error: ${err.code}`
          : PRODUCTION_ERROR_MESSAGE;
    }
  }

  // Hide internal messages in production
  if (!isDev && statusCode >= 500) {
    message = PRODUCTION_ERROR_MESSAGE;
  }

  // Log sanitized path
  const safePath = sanitizePath(req.path);
  console.error(`[${req.method}] ${safePath} → ${statusCode}: ${err.message}`);

  // Respond (stack only in dev)
  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && {
      stack: err.stack,
      originalMessage: err.message,
      code: err.code,
    }),
  });
};
