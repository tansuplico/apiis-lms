// src/routes/questionBank.ts
import { Router } from "express";
import {
  getQuestionBank,
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
