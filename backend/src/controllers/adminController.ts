// src/controllers/adminController.ts
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

// ── Get All Admins
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, middle_name, last_name,
              profile_picture, cover_color, status, created_at
       FROM admins
       ORDER BY created_at DESC`,
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((a) => ({
        id: a.id,
        email: a.email,
        firstName: a.first_name,
        middleName: a.middle_name,
        lastName: a.last_name,
        profilePicture: a.profile_picture,
        coverColor: a.cover_color,
        status: a.status,
        createdAt: a.created_at,
      })),
    });
  } catch (err) {
    console.error("getAllAdmins error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Single Admin
export const getAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid admin ID." });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, first_name, middle_name, last_name,
              profile_picture, cover_color, status, created_at
       FROM admins WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Admin not found." });
      return;
    }

    const a = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: a.id,
        email: a.email,
        firstName: a.first_name,
        middleName: a.middle_name,
        lastName: a.last_name,
        profilePicture: a.profile_picture,
        coverColor: a.cover_color,
        status: a.status,
        createdAt: a.created_at,
      },
    });
  } catch (err) {
    console.error("getAdmin error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Create Admin
export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, middleName, lastName } = req.body;

    // validation
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: "Email, password, first name, and last name are required.",
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

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
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

    const existing = await pool.query(
      `SELECT id FROM admins WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    if (existing.rows.length > 0) {
      res
        .status(409)
        .json({ success: false, message: "This email is already registered." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO admins
        (email, password, first_name, middle_name, last_name, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, email, first_name, middle_name, last_name, status, created_at`,
      [
        email.trim().toLowerCase(),
        hashedPassword,
        firstName.trim(),
        middleName?.trim() || null,
        lastName.trim(),
      ],
    );

    const admin = result.rows[0];
    res.status(201).json({
      success: true,
      message: `Admin "${admin.first_name} ${admin.last_name}" created successfully.`,
      data: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        middleName: admin.middle_name,
        lastName: admin.last_name,
        status: admin.status,
        createdAt: admin.created_at,
      },
    });
  } catch (err) {
    console.error("createAdmin error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Admin
export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, password, firstName, middleName, lastName, status } =
      req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid admin ID." });
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

    if (password && password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
      return;
    }

    const existing = await pool.query(`SELECT id FROM admins WHERE id = $1`, [
      id,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Admin not found." });
      return;
    }

    if (email) {
      const duplicate = await pool.query(
        `SELECT id FROM admins WHERE email = $1 AND id != $2`,
        [email.trim().toLowerCase(), id],
      );
      if (duplicate.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "This email is already registered to another admin.",
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
    if (password) {
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      updates.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
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
      `UPDATE admins SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Admin updated successfully." });
  } catch (err) {
    console.error("updateAdmin error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Admin
export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user!.id;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid admin ID." });
      return;
    }

    if (Number(id) === currentAdminId) {
      res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
      return;
    }

    const existing = await pool.query(
      `SELECT id, first_name, last_name FROM admins WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Admin not found." });
      return;
    }

    const adminCount = await pool.query(
      `SELECT COUNT(*) FROM admins WHERE status = 'active'`,
    );

    if (parseInt(adminCount.rows[0].count) <= 1) {
      res.status(400).json({
        success: false,
        message: "Cannot delete the last active admin.",
      });
      return;
    }

    const admin = existing.rows[0];
    await pool.query(`DELETE FROM admins WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: `Admin "${admin.first_name} ${admin.last_name}" deleted successfully.`,
    });
  } catch (err) {
    console.error("deleteAdmin error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Admin Profile
export const updateAdminProfile = async (req: AuthRequest, res: Response) => {
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
      `UPDATE admins SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("updateAdminProfile error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
