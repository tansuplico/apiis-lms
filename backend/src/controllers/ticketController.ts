// src/controllers/ticketController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const MAX_SUBJECT_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;
const VALID_SENDER_ROLES = ["student", "facilitator"] as const;
const VALID_STATUSES = ["Open", "In Progress", "Resolved"] as const;
const VALID_CATEGORIES = [
  "Technical Issue",
  "Account Problem",
  "Course Content",
  "Grading Concern",
  "General Inquiry",
  "Other",
] as const;

// ── getAllTickets
export const getAllTickets = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const role = req.query.role as string | undefined;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status && VALID_STATUSES.includes(status as any)) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (role && VALID_SENDER_ROLES.includes(role as any)) {
      conditions.push(`sender_role = $${paramCount++}`);
      values.push(role);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tickets ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count);

    const ticketsResult = await pool.query(
      `SELECT id, sender_id, sender_role, sender_name, category, subject,
              description, status, created_at, updated_at
       FROM tickets ${where}
       ORDER BY created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      [...values, limit, offset],
    );

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      success: true,
      data: ticketsResult.rows.map((t) => ({
        id: t.id,
        senderId: t.sender_id,
        senderRole: t.sender_role,
        senderName: t.sender_name,
        category: t.category,
        subject: t.subject,
        description: t.description,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllTickets error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── getMyTickets
export const getMyTickets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!VALID_SENDER_ROLES.includes(role as any)) {
      res.status(403).json({ success: false, message: "Forbidden." });
      return;
    }

    const result = await pool.query(
      `SELECT id, sender_id, sender_role, sender_name, category, subject,
              description, status, created_at, updated_at
       FROM tickets
       WHERE sender_id = $1 AND sender_role = $2
       ORDER BY created_at DESC`,
      [userId, role],
    );

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      success: true,
      data: result.rows.map((t) => ({
        id: t.id,
        senderId: t.sender_id,
        senderRole: t.sender_role,
        senderName: t.sender_name,
        category: t.category,
        subject: t.subject,
        description: t.description,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  } catch (err) {
    console.error("getMyTickets error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── createTicket
export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!VALID_SENDER_ROLES.includes(role as any)) {
      res.status(403).json({ success: false, message: "Forbidden." });
      return;
    }

    const { category, subject, description } = req.body;

    if (!category?.trim()) {
      res
        .status(400)
        .json({ success: false, message: "Category is required." });
      return;
    }
    if (!VALID_CATEGORIES.includes(category.trim() as any)) {
      res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
      return;
    }
    if (!subject?.trim()) {
      res.status(400).json({ success: false, message: "Subject is required." });
      return;
    }
    if (subject.trim().length > MAX_SUBJECT_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Subject cannot exceed ${MAX_SUBJECT_LENGTH} characters.`,
      });
      return;
    }
    if (!description?.trim()) {
      res
        .status(400)
        .json({ success: false, message: "Description is required." });
      return;
    }
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
      });
      return;
    }

    // Rate limit: max 5 per hour
    const recentCount = await pool.query(
      `SELECT COUNT(*) FROM tickets
       WHERE sender_id = $1
         AND sender_role = $2
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId, role],
    );
    if (parseInt(recentCount.rows[0].count) >= 5) {
      res.status(429).json({
        success: false,
        message:
          "You can only submit 5 tickets per hour. Please wait before submitting again.",
      });
      return;
    }

    // Cooldown: 2 minutes between tickets
    const lastTicket = await pool.query(
      `SELECT created_at FROM tickets
       WHERE sender_id = $1
         AND sender_role = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, role],
    );
    if (lastTicket.rows.length > 0) {
      const secondsSinceLast =
        (Date.now() - new Date(lastTicket.rows[0].created_at).getTime()) / 1000;
      if (secondsSinceLast < 120) {
        const secondsLeft = Math.ceil(120 - secondsSinceLast);
        res.status(429).json({
          success: false,
          message: `Please wait ${secondsLeft} second(s) before submitting another ticket.`,
        });
        return;
      }
    }

    let senderName = "";
    if (role === "student") {
      const result = await pool.query(
        `SELECT first_name, last_name FROM students WHERE id = $1`,
        [userId],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: "Sender not found." });
        return;
      }
      const s = result.rows[0];
      senderName = `${s.first_name} ${s.last_name}`;
    } else {
      const result = await pool.query(
        `SELECT first_name, last_name FROM facilitators WHERE id = $1`,
        [userId],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: "Sender not found." });
        return;
      }
      const f = result.rows[0];
      senderName = `${f.first_name} ${f.last_name}`;
    }

    const insertResult = await pool.query(
      `INSERT INTO tickets (sender_id, sender_role, sender_name, category, subject, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, sender_id, sender_role, sender_name, category, subject,
                 description, status, created_at`,
      [
        userId,
        role,
        senderName,
        category.trim(),
        subject.trim(),
        description.trim(),
      ],
    );

    const t = insertResult.rows[0];

    res.status(201).json({
      success: true,
      message: "Ticket submitted successfully.",
      data: {
        id: t.id,
        senderId: t.sender_id,
        senderRole: t.sender_role,
        senderName: t.sender_name,
        category: t.category,
        subject: t.subject,
        description: t.description,
        status: t.status,
        createdAt: t.created_at,
      },
    });
  } catch (err) {
    console.error("createTicket error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── updateTicketStatus
export const updateTicketStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid ticket ID." });
      return;
    }
    if (!status || !VALID_STATUSES.includes(status as any)) {
      res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
      return;
    }

    const existing = await pool.query(`SELECT id FROM tickets WHERE id = $1`, [
      id,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }

    await pool.query(
      `UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id],
    );

    res.status(200).json({ success: true, message: "Ticket status updated." });
  } catch (err) {
    console.error("updateTicketStatus error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── deleteTicket
export const deleteTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid ticket ID." });
      return;
    }

    const existing = await pool.query(`SELECT id FROM tickets WHERE id = $1`, [
      id,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Ticket not found." });
      return;
    }

    await pool.query(`DELETE FROM tickets WHERE id = $1`, [id]);

    res.status(200).json({ success: true, message: "Ticket deleted." });
  } catch (err) {
    console.error("deleteTicket error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
