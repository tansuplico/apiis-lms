// src/controllers/shopController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const URL_REGEX = /^(https?:\/\/.+|data:image\/(png|jpe?g|webp|gif);base64,.+)/;
const VALID_CATEGORIES = ["Cover Photo Color", "Profile Avatar"] as const;
const MAX_NAME_LENGTH = 255;

// ── Get All Shop Items
export const getAllShopItems = async (req: AuthRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;

    if (category !== undefined && !VALID_CATEGORIES.includes(category as any)) {
      res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
      return;
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (category && VALID_CATEGORIES.includes(category as any)) {
      conditions.push(`category = $${paramCount++}`);
      values.push(category);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT id, name, category, price, color, avatar_url, target_role, created_at, updated_at
 FROM shop_items ${where}
 ORDER BY category ASC, price ASC, id ASC`,
      values,
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        color: item.color ?? null,
        avatarUrl: item.avatar_url ?? null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        targetRole: item.target_role ?? null,
      })),
    });
  } catch (err) {
    console.error("getAllShopItems error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Create Shop Item (admin)
export const createShopItem = async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, price, color, avatarUrl, targetRole } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Name is required." });
      return;
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Name cannot exceed ${MAX_NAME_LENGTH} characters.`,
      });
      return;
    }
    if (!category || !VALID_CATEGORIES.includes(category as any)) {
      res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
      return;
    }

    if (
      price === undefined ||
      price === null ||
      isNaN(Number(price)) ||
      !Number.isInteger(Number(price)) ||
      Number(price) < 0
    ) {
      res.status(400).json({
        success: false,
        message: "Price must be a non-negative integer.",
      });
      return;
    }

    // after category validation:
    if (
      targetRole !== undefined &&
      targetRole !== null &&
      !["student", "facilitator", "admin"].includes(targetRole)
    ) {
      res.status(400).json({ success: false, message: "Invalid targetRole." });
      return;
    }
    const resolvedTargetRole =
      category === "Profile Avatar" ? (targetRole ?? null) : null;

    if (category === "Cover Photo Color") {
      if (!color?.trim()) {
        res.status(400).json({
          success: false,
          message: "Color is required for Cover Photo Color items.",
        });
        return;
      }
      if (!HEX_COLOR_REGEX.test(color.trim())) {
        res
          .status(400)
          .json({ success: false, message: "Invalid hex color format." });
        return;
      }
    }
    if (category === "Profile Avatar") {
      if (!avatarUrl?.trim()) {
        res.status(400).json({
          success: false,
          message: "Avatar URL is required for Profile Avatar items.",
        });
        return;
      }
      if (!URL_REGEX.test(avatarUrl.trim())) {
        res
          .status(400)
          .json({ success: false, message: "Invalid avatar URL." });
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO shop_items (name, category, price, color, avatar_url, target_role)
 VALUES ($1, $2, $3, $4, $5, $6)
 RETURNING id, name, category, price, color, avatar_url, target_role, created_at, updated_at`,
      [
        name.trim(),
        category,
        Number(price),
        category === "Cover Photo Color" ? color.trim() : null,
        category === "Profile Avatar" ? avatarUrl.trim() : null,
        resolvedTargetRole,
      ],
    );

    const item = result.rows[0];

    res.status(201).json({
      success: true,
      message: "Shop item created.",
      data: {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        color: item.color ?? null,
        avatarUrl: item.avatar_url ?? null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        targetRole: item.target_role ?? null,
      },
    });
  } catch (err) {
    console.error("createShopItem error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Shop Item (admin)
export const updateShopItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, color, avatarUrl, targetRole } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid item ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id, category FROM shop_items WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Shop item not found." });
      return;
    }

    const category = existing.rows[0].category;

    if (name !== undefined) {
      if (!name?.trim()) {
        res
          .status(400)
          .json({ success: false, message: "Name cannot be empty." });
        return;
      }
      if (name.trim().length > MAX_NAME_LENGTH) {
        res.status(400).json({
          success: false,
          message: `Name cannot exceed ${MAX_NAME_LENGTH} characters.`,
        });
        return;
      }
    }
    if (price !== undefined) {
      if (
        isNaN(Number(price)) ||
        !Number.isInteger(Number(price)) ||
        Number(price) < 0
      ) {
        res.status(400).json({
          success: false,
          message: "Price must be a non-negative integer.",
        });
        return;
      }
    }
    if (color !== undefined && category === "Cover Photo Color") {
      if (!HEX_COLOR_REGEX.test(color.trim())) {
        res
          .status(400)
          .json({ success: false, message: "Invalid hex color format." });
        return;
      }
    }
    if (avatarUrl !== undefined && category === "Profile Avatar") {
      if (!URL_REGEX.test(avatarUrl.trim())) {
        res
          .status(400)
          .json({ success: false, message: "Invalid avatar URL." });
        return;
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(Number(price));
    }
    if (color !== undefined && category === "Cover Photo Color") {
      updates.push(`color = $${paramCount++}`);
      values.push(color.trim());
    }
    if (avatarUrl !== undefined && category === "Profile Avatar") {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatarUrl.trim());
    }
    if (targetRole !== undefined && category === "Profile Avatar") {
      updates.push(`target_role = $${paramCount++}`);
      values.push(targetRole ?? null);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: "No fields to update." });
      return;
    }

    const ignoredFields: string[] = [];
    if (avatarUrl !== undefined && category === "Cover Photo Color") {
      ignoredFields.push("avatarUrl");
    }
    if (color !== undefined && category === "Profile Avatar") {
      ignoredFields.push("color");
    }

    values.push(id);
    await pool.query(
      `UPDATE shop_items SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res.status(200).json({
      success: true,
      message: "Shop item updated.",
      ...(ignoredFields.length > 0 && {
        warning: `The following fields were ignored because they do not apply to this category: ${ignoredFields.join(", ")}`,
      }),
    });
  } catch (err) {
    console.error("updateShopItem error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Shop Item (admin)
export const deleteShopItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid item ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id, name FROM shop_items WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Shop item not found." });
      return;
    }

    await pool.query(`DELETE FROM shop_items WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: `"${existing.rows[0].name}" deleted from shop.`,
    });
  } catch (err) {
    console.error("deleteShopItem error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get My Shop Items (student)
export const getMyShopItems = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.id;

    const result = await pool.query(
      `SELECT s.id, s.name, s.category, s.price, s.color, s.avatar_url
       FROM student_accessories sa
       INNER JOIN shop_items s ON s.id = sa.accessory_id
       WHERE sa.student_id = $1
       ORDER BY s.id ASC`,
      [studentId],
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        color: item.color ?? null,
        avatarUrl: item.avatar_url ?? null,
      })),
    });
  } catch (err) {
    console.error("getMyShopItems error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
