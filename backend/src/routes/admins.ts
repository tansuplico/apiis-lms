// src/routes/adminRoutes.ts
import { Router } from "express";
import {
  getAllAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminProfile,
} from "../controllers/adminController";
import { authenticate, authorize } from "../middleware/auth";

// ── Router setup
const router = Router();

// ── Admin management routes (admin only)
router.get("/", authenticate, authorize("admin"), getAllAdmins);
router.get("/:id", authenticate, authorize("admin"), getAdmin);
router.post("/", authenticate, authorize("admin"), createAdmin);
router.put("/:id", authenticate, authorize("admin"), updateAdmin);
router.delete("/:id", authenticate, authorize("admin"), deleteAdmin);

// ── Profile route (admin self-update)
router.patch("/profile", authenticate, authorize("admin"), updateAdminProfile);

export default router;
