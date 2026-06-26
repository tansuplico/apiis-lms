// src/routes/authRoutes.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  studentLogin,
  facilitatorLogin,
  adminLogin,
  changePassword,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

// ── Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

// ── Rate limiter for password changes
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password change attempts. Please try again later.",
  },
});

// ── Public routes
router.post("/student/login", loginLimiter, studentLogin);
router.post("/facilitator/login", loginLimiter, facilitatorLogin);
router.post("/admin/login", loginLimiter, adminLogin);

// ── Protected routes
router.post(
  "/change-password",
  authenticate,
  passwordChangeLimiter,
  changePassword,
);

export default router;
