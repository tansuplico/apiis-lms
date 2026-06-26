// src/routes/attendanceRoutes.ts
import { Router } from "express";
import {
  getAttendanceByCenter,
  getAttendanceByStudent,
  getAttendanceByFacilitator,
  submitAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
} from "../controllers/attendanceController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── Submit / Update / Delete
router.post("/", authenticate, authorize("facilitator"), submitAttendance);
router.put(
  "/:attendanceId",
  authenticate,
  authorize("facilitator"),
  updateAttendance,
);
router.delete(
  "/:attendanceId",
  authenticate,
  authorize("facilitator", "admin"),
  deleteAttendance,
);

// ── Center attendance (admin / facilitator)
router.get(
  "/center/:centerId",
  authenticate,
  authorize("admin", "facilitator"),
  getAttendanceByCenter,
);
router.get(
  "/center/:centerId/summary",
  authenticate,
  authorize("admin", "facilitator"),
  getAttendanceSummary,
);

// ── Facilitator attendance
router.get(
  "/facilitator/me",
  authenticate,
  authorize("facilitator"),
  getAttendanceByFacilitator,
);
router.get(
  "/facilitator/:facilitatorId",
  authenticate,
  authorize("admin"),
  getAttendanceByFacilitator,
);

// ── Student attendance
router.get(
  "/student/me",
  authenticate,
  authorize("student"),
  getAttendanceByStudent,
);
router.get(
  "/student/:studentId",
  authenticate,
  authorize("admin", "facilitator"),
  getAttendanceByStudent,
);

export default router;
