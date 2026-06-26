// src/routes/facilitatorRoutes.ts
import { Router } from "express";
import {
  getAllFacilitators,
  getFacilitator,
  createFacilitator,
  updateFacilitator,
  deleteFacilitator,
  updateFacilitatorProfile,
} from "../controllers/facilitatorController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── Admin only — full CRUD
router.get("/", authenticate, authorize("admin"), getAllFacilitators);
router.post("/", authenticate, authorize("admin"), createFacilitator);
router.put("/:id", authenticate, authorize("admin"), updateFacilitator);
router.delete("/:id", authenticate, authorize("admin"), deleteFacilitator);

// ── Shared — view single facilitator
router.get(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  getFacilitator,
);

// ── Facilitator — own profile
router.patch(
  "/profile",
  authenticate,
  authorize("facilitator"),
  updateFacilitatorProfile,
);

export default router;
