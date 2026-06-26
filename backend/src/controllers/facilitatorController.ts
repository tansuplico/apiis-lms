// src/controllers/facilitatorController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;
const VALID_STATUSES = ["active", "inactive", "banned"] as const;
const MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helpers
const generateTempPassword = (): string => {
  const charset =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  return Array.from({ length: 12 }, () =>
    charset.charAt(Math.floor(Math.random() * charset.length)),
  ).join("");
};

// ── Get All Facilitators
export const getAllFacilitators = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
        f.id, f.email, f.first_name, f.middle_name, f.last_name,
        f.profile_picture, f.cover_color, f.status, f.created_at,
        f.must_change_password,
        COALESCE(
          ARRAY_AGG(DISTINCT cf.center_id) FILTER (WHERE cf.center_id IS NOT NULL),
          '{}'
        ) AS assigned_center_ids
       FROM facilitators f
       LEFT JOIN center_facilitators cf ON cf.facilitator_id = f.id
       GROUP BY f.id
       ORDER BY f.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countResult = await pool.query(`SELECT COUNT(*) FROM facilitators`);

    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: result.rows.map((f) => ({
        id: f.id,
        email: f.email,
        firstName: f.first_name,
        middleName: f.middle_name,
        lastName: f.last_name,
        profilePicture: f.profile_picture,
        coverColor: f.cover_color,
        status: f.status,
        mustChangePassword: f.must_change_password,
        assignedCenterIds: (f.assigned_center_ids ?? [])
          .filter((id: any) => id !== null)
          .map(Number),
        createdAt: f.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllFacilitators error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Single Facilitator
export const getFacilitator = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid facilitator ID." });
      return;
    }

    const result = await pool.query(
      `SELECT
        f.id, f.email, f.first_name, f.middle_name, f.last_name,
        f.profile_picture, f.cover_color, f.status, f.created_at,
        f.must_change_password,
        COALESCE(
          ARRAY_AGG(DISTINCT cf.center_id) FILTER (WHERE cf.center_id IS NOT NULL),
          '{}'
        ) AS assigned_center_ids
       FROM facilitators f
       LEFT JOIN center_facilitators cf ON cf.facilitator_id = f.id
       WHERE f.id = $1
       GROUP BY f.id`,
      [id],
    );

    if (result.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Facilitator not found." });
      return;
    }

    const f = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: f.id,
        email: f.email,
        firstName: f.first_name,
        middleName: f.middle_name,
        lastName: f.last_name,
        profilePicture: f.profile_picture,
        coverColor: f.cover_color,
        status: f.status,
        mustChangePassword: f.must_change_password,
        assignedCenterIds: (f.assigned_center_ids ?? [])
          .filter((id: any) => id !== null)
          .map(Number),
        createdAt: f.created_at,
      },
    });
  } catch (err) {
    console.error("getFacilitator error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Create Facilitator (admin only — auto-generates temp password)
export const createFacilitator = async (req: Request, res: Response) => {
  try {
    const {
      email,
      firstName,
      middleName,
      lastName,
      assignedCenterId,
      profilePicture,
    } = req.body;

    if (!email || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: "Email, first name, and last name are required.",
      });
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (firstName.trim().length > 50 || lastName.trim().length > 50) {
      res.status(400).json({
        success: false,
        message: "Names cannot exceed 50 characters.",
      });
      return;
    }

    if (
      assignedCenterId !== undefined &&
      assignedCenterId !== null &&
      isNaN(Number(assignedCenterId))
    ) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    if (profilePicture && profilePicture.length > MAX_PROFILE_PICTURE_SIZE) {
      res
        .status(400)
        .json({ success: false, message: "Profile picture is too large." });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM facilitators WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
      return;
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO facilitators
          (email, password, first_name, middle_name, last_name, profile_picture,
           status, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', TRUE)
         RETURNING id, email, first_name, middle_name, last_name,
                   profile_picture, cover_color, status, must_change_password`,
        [
          email.trim().toLowerCase(),
          hashedPassword,
          firstName.trim(),
          middleName?.trim() || null,
          lastName.trim(),
          profilePicture ?? null,
        ],
      );

      const facilitator = result.rows[0];

      if (assignedCenterId) {
        const center = await client.query(
          `SELECT id FROM centers WHERE id = $1`,
          [assignedCenterId],
        );

        if (center.rows.length === 0) {
          await client.query("ROLLBACK");
          res.status(404).json({
            success: false,
            message: "Assigned center not found.",
          });
          return;
        }

        const currentCount = await client.query(
          `SELECT COUNT(*) FROM center_facilitators WHERE center_id = $1`,
          [assignedCenterId],
        );
        if (parseInt(currentCount.rows[0].count) >= 3) {
          await client.query("ROLLBACK");
          res.status(409).json({
            success: false,
            message: "This center already has the maximum of 3 facilitators.",
          });
          return;
        }

        await client.query(
          `INSERT INTO center_facilitators (center_id, facilitator_id) VALUES ($1, $2)`,
          [assignedCenterId, facilitator.id],
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `Facilitator "${facilitator.first_name} ${facilitator.last_name}" created successfully.`,
        data: {
          id: facilitator.id,
          email: facilitator.email,
          firstName: facilitator.first_name,
          middleName: facilitator.middle_name,
          lastName: facilitator.last_name,
          profilePicture: facilitator.profile_picture,
          coverColor: facilitator.cover_color ?? "#3B82F6",
          status: facilitator.status,
          mustChangePassword: facilitator.must_change_password,
          assignedCenterIds: assignedCenterId ? [Number(assignedCenterId)] : [],
          temporaryPassword: tempPassword,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("createFacilitator error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Facilitator
export const updateFacilitator = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, middleName, lastName, status } = req.body;

    if (isNaN(Number(id))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid facilitator ID." });
      return;
    }

    if (status && !VALID_STATUSES.includes(status)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
      return;
    }

    if (email && !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (firstName && firstName.trim().length > 50) {
      res.status(400).json({
        success: false,
        message: "First name cannot exceed 50 characters.",
      });
      return;
    }
    if (lastName && lastName.trim().length > 50) {
      res.status(400).json({
        success: false,
        message: "Last name cannot exceed 50 characters.",
      });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM facilitators WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Facilitator not found." });
      return;
    }

    if (email) {
      const duplicate = await pool.query(
        `SELECT id FROM facilitators WHERE email = $1 AND id != $2`,
        [email.trim().toLowerCase(), id],
      );
      if (duplicate.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "This email is already registered to another facilitator.",
        });
        return;
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email.trim().toLowerCase());
    }
    if (firstName) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName.trim());
    }
    if (middleName !== undefined) {
      updates.push(`middle_name = $${paramCount++}`);
      values.push(middleName?.trim() || null);
    }
    if (lastName) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName.trim());
    }
    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: "No fields to update." });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE facilitators SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Facilitator updated successfully." });
  } catch (err) {
    console.error("updateFacilitator error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Facilitator
export const deleteFacilitator = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid facilitator ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id, first_name, last_name FROM facilitators WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Facilitator not found." });
      return;
    }

    const facilitator = existing.rows[0];

    await pool.query(`DELETE FROM facilitators WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: `Facilitator "${facilitator.first_name} ${facilitator.last_name}" deleted successfully.`,
    });
  } catch (err) {
    console.error("deleteFacilitator error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Facilitator Profile (self)
export const updateFacilitatorProfile = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.user!;
    const { firstName, lastName, coverColor, profilePicture } = req.body;

    if (firstName && firstName.trim().length > 50) {
      res.status(400).json({
        success: false,
        message: "First name cannot exceed 50 characters.",
      });
      return;
    }
    if (lastName && lastName.trim().length > 50) {
      res.status(400).json({
        success: false,
        message: "Last name cannot exceed 50 characters.",
      });
      return;
    }

    if (coverColor && !HEX_COLOR_REGEX.test(coverColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid color format." });
      return;
    }

    if (profilePicture && profilePicture.length > MAX_PROFILE_PICTURE_SIZE) {
      res
        .status(400)
        .json({ success: false, message: "Profile picture is too large." });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (firstName) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName.trim());
    }
    if (lastName) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName.trim());
    }
    if (coverColor) {
      updates.push(`cover_color = $${paramCount++}`);
      values.push(coverColor);
    }
    if (profilePicture !== undefined) {
      updates.push(`profile_picture = $${paramCount++}`);
      values.push(profilePicture);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: "No fields to update." });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE facilitators SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("updateFacilitatorProfile error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
