// src/routes/questionBank.ts
import { Router } from "express";
import {
  getQuestionBank,
  getBankCategories,
  createBankQuestion,
  updateBankQuestion,
  deleteBankQuestion,
} from "../controllers/questionBankController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Shared org-wide library, same access as quiz editing itself
router.get(
  "/",
  authenticate,
  authorize("admin", "facilitator"),
  getQuestionBank,
);
// Must stay above any "/:id" GET so "categories" is never read as an id.
router.get(
  "/categories",
  authenticate,
  authorize("admin", "facilitator"),
  getBankCategories,
);
router.post(
  "/",
  authenticate,
  authorize("admin", "facilitator"),
  createBankQuestion,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  updateBankQuestion,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "facilitator"),
  deleteBankQuestion,
);

export default router;
