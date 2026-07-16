// src/routes/studentRoutes.ts
import { Router } from "express";
import {
  getAllStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStudentProfile,
  resetStudentPassword,
  getStudentCenterLogs,
} from "../controllers/studentController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── Admin only routes
router.get(
  "/",
  authenticate,
  authorize("admin", "facilitator"),
  getAllStudents,
);
router.post(
  "/",
  authenticate,
  authorize("admin", "facilitator"),
  createStudent,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  updateStudent,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  deleteStudent,
);
router.post(
  "/:id/reset-password",
  authenticate,
  authorize("admin", "facilitator"),
  resetStudentPassword,
);
router.get(
  "/:id/center-logs",
  authenticate,
  authorize("admin", "facilitator"),
  getStudentCenterLogs,
);

// ── Shared routes (admin, facilitator, student)
router.get(
  "/:id",
  authenticate,
  authorize("admin", "student", "facilitator"),
  getStudent,
);

// ── Student profile (self)
router.patch(
  "/profile",
  authenticate,
  authorize("student"),
  updateStudentProfile,
);

export default router;
