// src/routes/centerRoutes.ts
import { Router } from "express";
import {
  getAllCenters,
  getCenter,
  createCenter,
  updateCenter,
  deleteCenter,
  addStudentToCenter,
  removeStudentFromCenter,
  addCourseToCenter,
  removeCourseFromCenter,
  assignFacilitatorToCenter,
  unassignFacilitatorFromCenter,
} from "../controllers/centerController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── View centers (all authenticated roles)
router.get(
  "/",
  authenticate,
  authorize("admin", "facilitator", "student"),
  getAllCenters,
);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "facilitator", "student"),
  getCenter,
);

// ── Center management (admin only)
router.post("/", authenticate, authorize("admin"), createCenter);
router.put("/:id", authenticate, authorize("admin"), updateCenter);
router.delete("/:id", authenticate, authorize("admin"), deleteCenter);

// ── Course management (admin & facilitator)
router.post(
  "/:id/courses",
  authenticate,
  authorize("admin", "facilitator"),
  addCourseToCenter,
);
router.delete(
  "/:id/courses/:courseId",
  authenticate,
  authorize("admin", "facilitator"),
  removeCourseFromCenter,
);

// ── Student management (admin & facilitator)
router.post(
  "/:id/students",
  authenticate,
  authorize("admin", "facilitator"),
  addStudentToCenter,
);
router.delete(
  "/:id/students/:studentId",
  authenticate,
  authorize("admin", "facilitator"),
  removeStudentFromCenter,
);

// ── Facilitator assignment (admin only)
router.post(
  "/:id/facilitators",
  authenticate,
  authorize("admin"),
  assignFacilitatorToCenter,
);
router.delete(
  "/:id/facilitators/:facilitatorId",
  authenticate,
  authorize("admin"),
  unassignFacilitatorFromCenter,
);

export default router;
