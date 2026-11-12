// src/controllers/questionBankController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";
import {
  validateQuestionShape,
  buildQuestionData,
  mapQuestionData,
  normalizeCategories,
} from "../utils/quizQuestions";

// Shared shape for a bank row → API response, used by all three handlers
// below so the response shape can't drift between them.
function mapBankRow(row: any) {
  return {
    ...mapQuestionData(row.id, row.question_data),
    // Category tags live in the question's JSON; older questions have none.
    categories: Array.isArray(row.question_data?.categories)
      ? row.question_data.categories
      : [],
    collectionId: row.collection_id,
    createdById: row.created_by_id,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Category tags in use across the whole library, grouped without regard to
// case ("fractions" and "Fractions" are one category). `name` is one of the
// spellings in use. When saving a question, pass its id as excludeQuestionId
// so the question's own current tags don't pin the spelling of the tags it is
// being changed to.
async function loadLibraryCategories(
  excludeQuestionId?: number,
): Promise<{ name: string; count: number }[]> {
  const result = await pool.query(
    `SELECT MIN(tag) AS name, COUNT(*)::int AS count
     FROM question_bank qb
     CROSS JOIN LATERAL jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(qb.question_data::jsonb -> 'categories') = 'array'
            THEN qb.question_data::jsonb -> 'categories'
            ELSE '[]'::jsonb END
     ) AS tag
     WHERE ($1::int IS NULL OR qb.id <> $1)
     GROUP BY LOWER(tag)
     ORDER BY LOWER(tag)`,
    [excludeQuestionId ?? null],
  );
  return result.rows;
}

// Reuse the spelling already in the library for a tag that differs only in
// case, so "fractions" typed later doesn't create a second "Fractions".
async function canonicalizeCategories(
  categories: string[],
  excludeQuestionId?: number,
): Promise<string[]> {
  if (categories.length === 0) return categories;
  const library = await loadLibraryCategories(excludeQuestionId);
  const spelling = new Map(library.map((c) => [c.name.toLowerCase(), c.name]));
  return categories.map((c) => spelling.get(c.toLowerCase()) ?? c);
}

// ── Category tags in use, with how many questions carry each (for the tag
// input's suggestions).
export const getBankCategories = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      message: "OK",
      data: await loadLibraryCategories(),
    });
  } catch (err) {
    console.error("getBankCategories error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── List bank questions. Optionally filtered to one collection via
// ?collectionId= (used by the quiz editor's picker, which browses one
// collection at a time); omit it to get the full library (used by the
// Quiz Bank management page).
export const getQuestionBank = async (req: Request, res: Response) => {
  try {
    const { collectionId } = req.query;
    const params: unknown[] = [];
    let where = "";
    if (collectionId !== undefined) {
      if (isNaN(Number(collectionId))) {
        res
          .status(400)
          .json({ success: false, message: "Invalid collection." });
        return;
      }
      params.push(Number(collectionId));
      where = `WHERE qb.collection_id = $1`;
    }

    const result = await pool.query(
      `SELECT qb.id, qb.question_data, qb.collection_id, qb.created_by_id,
              qb.created_by_role, qb.created_at, qb.updated_at
       FROM question_bank qb
       ${where}
       ORDER BY qb.created_at DESC`,
      params,
    );

    res.status(200).json({
      success: true,
      message: "OK",
      data: result.rows.map(mapBankRow),
    });
  } catch (err) {
    console.error("getQuestionBank error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Create a bank question
export const createBankQuestion = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const q = req.body;

    const error = validateQuestionShape(q, 0);
    if (error) {
      res.status(400).json({ success: false, message: error });
      return;
    }

    const collectionId = Number(q.collectionId);
    if (!q.collectionId || isNaN(collectionId)) {
      res
        .status(400)
        .json({ success: false, message: "A collection is required." });
      return;
    }

    const normalized = normalizeCategories(q.categories);
    if ("error" in normalized) {
      res.status(400).json({ success: false, message: normalized.error });
      return;
    }
    const categories = await canonicalizeCategories(normalized.categories);

    const result = await pool.query(
      `INSERT INTO question_bank (question_data, collection_id, created_by_id, created_by_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, question_data, collection_id, created_by_id, created_by_role, created_at, updated_at`,
      [
        JSON.stringify({ ...buildQuestionData(q), categories }),
        collectionId,
        authReq.user!.id,
        authReq.user!.role,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Question added to the bank.",
      data: mapBankRow(result.rows[0]),
    });
  } catch (err: any) {
    if (err.code === "23503") {
      // FK violation — collection_id doesn't exist (deleted since page load)
      res
        .status(400)
        .json({ success: false, message: "That collection no longer exists." });
      return;
    }
    console.error("createBankQuestion error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Update a bank question (edits apply everywhere it's referenced —
// this is the "shared, mutate everywhere" endpoint; the quiz editor itself
// only ever shows bank questions read-only, per the read-only-in-editor
// design decision, so this is only reachable from the Question Bank page).
export const updateBankQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const q = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    const error = validateQuestionShape(q, 0);
    if (error) {
      res.status(400).json({ success: false, message: error });
      return;
    }

    const collectionId = Number(q.collectionId);
    if (!q.collectionId || isNaN(collectionId)) {
      res
        .status(400)
        .json({ success: false, message: "A collection is required." });
      return;
    }

    const existing = await pool.query(
      `SELECT question_data FROM question_bank WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Bank question not found." });
      return;
    }

    // A request that doesn't mention categories (e.g. an older app version)
    // keeps the question's current tags instead of wiping them.
    let categories: string[];
    if (q.categories === undefined) {
      const stored = existing.rows[0].question_data?.categories;
      categories = Array.isArray(stored) ? stored : [];
    } else {
      const normalized = normalizeCategories(q.categories);
      if ("error" in normalized) {
        res.status(400).json({ success: false, message: normalized.error });
        return;
      }
      categories = await canonicalizeCategories(
        normalized.categories,
        Number(id),
      );
    }

    const result = await pool.query(
      `UPDATE question_bank SET question_data = $1, collection_id = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, question_data, collection_id, created_by_id, created_by_role, created_at, updated_at`,
      [
        JSON.stringify({ ...buildQuestionData(q), categories }),
        collectionId,
        id,
      ],
    );

    if (result.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Bank question not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Bank question updated.",
      data: mapBankRow(result.rows[0]),
    });
  } catch (err: any) {
    if (err.code === "23503") {
      res
        .status(400)
        .json({ success: false, message: "That collection no longer exists." });
      return;
    }
    console.error("updateBankQuestion error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Delete a bank question. Cascades to quiz_bank_refs (via ON DELETE
// CASCADE), so any quiz referencing it just loses that question — we warn
// the caller how many quizzes are affected so this isn't a silent surprise.
export const deleteBankQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    const refCount = await pool.query(
      `SELECT COUNT(*)::int AS count FROM quiz_bank_refs WHERE bank_question_id = $1`,
      [id],
    );

    const result = await pool.query(
      `DELETE FROM question_bank WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Bank question not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        refCount.rows[0].count > 0
          ? `Deleted. This question was removed from ${refCount.rows[0].count} quiz(zes) that referenced it.`
          : "Deleted.",
      data: { id: Number(id), quizzesAffected: refCount.rows[0].count },
    });
  } catch (err) {
    console.error("deleteBankQuestion error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
