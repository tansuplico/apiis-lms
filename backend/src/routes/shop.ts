import { Router } from "express";
import {
  getAllShopItems,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  purchaseShopItem,
  getMyShopItems,
} from "../controllers/shopController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// ── All authenticated users: browse shop items (optional ?category= filter)
router.get(
  "/",
  authenticate,
  authorize("admin", "facilitator", "student"),
  getAllShopItems,
);

// ── Student: get owned items
router.get("/my-items", authenticate, authorize("student"), getMyShopItems);

// ── Admin: create shop item
router.post("/", authenticate, authorize("admin"), createShopItem);

// ── Admin: update shop item
router.put("/:id", authenticate, authorize("admin"), updateShopItem);

// ── Admin: delete shop item
router.delete("/:id", authenticate, authorize("admin"), deleteShopItem);

// ── Student: purchase an item
router.post(
  "/:id/purchase",
  authenticate,
  authorize("student"),
  purchaseShopItem,
);

export default router;
