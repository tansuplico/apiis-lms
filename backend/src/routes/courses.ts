// src/routes/courseRoutes.ts
import { Router } from "express";
import {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  deleteModule,
  addPart,
  updatePart,
  deletePart,
  updateQuizQuestions,
  reorderPart,
} from "../controllers/courseController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── View courses (all authenticated roles)
router.get(
  "/",
  authenticate,
  authorize("admin", "facilitator", "student"),
  getAllCourses,
);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "facilitator", "student"),
  getCourse,
);

// ── Course CRUD (admin only)
router.post("/", authenticate, authorize("admin"), createCourse);
router.put("/:id", authenticate, authorize("admin"), updateCourse);
router.delete("/:id", authenticate, authorize("admin"), deleteCourse);

// ── Module management (admin & facilitator)
router.post(
  "/:id/modules",
  authenticate,
  authorize("admin", "facilitator"),
  addModule,
);
router.put(
  "/:id/modules/:moduleId",
  authenticate,
  authorize("admin", "facilitator"),
  updateModule,
);
router.delete(
  "/:id/modules/:moduleId",
  authenticate,
  authorize("admin", "facilitator"),
  deleteModule,
);

// ── Part management (admin & facilitator)
router.post(
  "/:id/modules/:moduleId/parts",
  authenticate,
  authorize("admin", "facilitator"),
  addPart,
);
router.put(
  "/:id/modules/:moduleId/parts/:partId",
  authenticate,
  authorize("admin", "facilitator"),
  updatePart,
);
router.delete(
  "/:id/modules/:moduleId/parts/:partId",
  authenticate,
  authorize("admin", "facilitator"),
  deletePart,
);

// ── Quiz questions (admin & facilitator)
router.put(
  "/:id/modules/:moduleId/parts/:partId/quiz",
  authenticate,
  authorize("admin", "facilitator"),
  updateQuizQuestions,
);

// ── Reorder parts (admin & facilitator)
router.patch(
  "/:id/modules/:moduleId/parts/:partId/reorder",
  authenticate,
  authorize("admin", "facilitator"),
  reorderPart,
);

export default router;
