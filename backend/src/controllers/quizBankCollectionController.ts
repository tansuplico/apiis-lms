// src/controllers/quizBankCollectionController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── List all collections, with a question count for each
export const getCollections = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.created_by_id, c.created_by_role,
              c.created_at, c.updated_at,
              COUNT(qb.id)::int AS question_count
       FROM quiz_bank_collections c
       LEFT JOIN question_bank qb ON qb.collection_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`,
    );

    const data = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      questionCount: row.question_count,
      createdById: row.created_by_id,
      createdByRole: row.created_by_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.status(200).json({ success: true, message: "OK", data });
  } catch (err) {
    console.error("getCollections error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Create a collection
export const createCollection = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { name, description } = req.body;

    if (!name?.trim()) {
      res
        .status(400)
        .json({ success: false, message: "Collection name is required." });
      return;
    }

    const result = await pool.query(
      `INSERT INTO quiz_bank_collections (name, description, created_by_id, created_by_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, created_by_id, created_by_role, created_at, updated_at`,
      [
        name.trim(),
        description?.trim() || null,
        authReq.user!.id,
        authReq.user!.role,
      ],
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      message: "Collection created.",
      data: {
        id: row.id,
        name: row.name,
        description: row.description,
        questionCount: 0,
        createdById: row.created_by_id,
        createdByRole: row.created_by_role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error("createCollection error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Rename / update a collection's name or description
export const updateCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }
    if (!name?.trim()) {
      res
        .status(400)
        .json({ success: false, message: "Collection name is required." });
      return;
    }

    const result = await pool.query(
      `UPDATE quiz_bank_collections SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, description, created_by_id, created_by_role, created_at, updated_at`,
      [name.trim(), description?.trim() || null, id],
    );

    if (result.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Collection not found." });
      return;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM question_bank WHERE collection_id = $1`,
      [id],
    );

    const row = result.rows[0];
    res.status(200).json({
      success: true,
      message: "Collection updated.",
      data: {
        id: row.id,
        name: row.name,
        description: row.description,
        questionCount: countResult.rows[0].count,
        createdById: row.created_by_id,
        createdByRole: row.created_by_role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error("updateCollection error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Delete a collection. Cascades to its questions (ON DELETE CASCADE on
// question_bank.collection_id), which in turn cascades to quiz_bank_refs —
// so this can remove content from quizzes several steps removed. We report
// exactly how much is affected so the confirmation dialog can warn clearly.
export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    const impact = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM question_bank WHERE collection_id = $1) AS question_count,
        (SELECT COUNT(*)::int FROM quiz_bank_refs qbr
          JOIN question_bank qb ON qb.id = qbr.bank_question_id
          WHERE qb.collection_id = $1) AS quiz_ref_count`,
      [id],
    );

    const result = await pool.query(
      `DELETE FROM quiz_bank_collections WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Collection not found." });
      return;
    }

    const { question_count, quiz_ref_count } = impact.rows[0];
    res.status(200).json({
      success: true,
      message:
        question_count > 0
          ? `Deleted. ${question_count} question(s) and ${quiz_ref_count} quiz reference(s) were removed with it.`
          : "Deleted.",
      data: {
        id: Number(id),
        questionsDeleted: question_count,
        quizzesAffected: quiz_ref_count,
      },
    });
  } catch (err) {
    console.error("deleteCollection error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
