// src/routes/quizBankCollections.ts
import { Router } from "express";
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from "../controllers/quizBankCollectionController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("admin", "facilitator"),
  getCollections,
);
router.post(
  "/",
  authenticate,
  authorize("admin", "facilitator"),
  createCollection,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  updateCollection,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  deleteCollection,
);

export default router;
