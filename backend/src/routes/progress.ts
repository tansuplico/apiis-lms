// src/routes/progressRoutes.ts
import { Router } from "express";
import {
  getStudentProgress,
  getCourseProgress,
  completePart,
  updateLastVisited,
  saveQuizAnswers,
  purchaseAccessory,
  getStudentGradebook,
  getCenterGradebook,
} from "../controllers/progressController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── Student progress
router.get("/", authenticate, authorize("student"), getStudentProgress);
router.get(
  "/:studentId",
  authenticate,
  authorize("admin", "facilitator"),
  getStudentProgress,
);

// ── Course progress
router.get(
  "/course/:courseId",
  authenticate,
  authorize("student"),
  getCourseProgress,
);

// ── Part completion & last visited
router.post("/complete-part", authenticate, authorize("student"), completePart);
router.put(
  "/last-visited",
  authenticate,
  authorize("student"),
  updateLastVisited,
);

// ── Quiz answers + coins
router.post("/save-quiz", authenticate, authorize("student"), saveQuizAnswers);

// ── Shop purchase
router.post(
  "/purchase-accessory",
  authenticate,
  authorize("student"),
  purchaseAccessory,
);

// ── Gradebook (admin/facilitator)
router.get(
  "/:studentId/gradebook",
  authenticate,
  authorize("admin", "facilitator"),
  getStudentGradebook,
);

// ── Class-wide gradebook for an entire center (admin/facilitator)
router.get(
  "/center/:centerId/gradebook",
  authenticate,
  authorize("admin", "facilitator"),
  getCenterGradebook,
);

export default router;
