// src/controllers/studentController.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;
const VALID_STATUSES = ["active", "inactive", "banned"] as const;
const MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const STUDENT_ID_REGEX = /^\d{2}-\d{4}-\d{2}$/;

// ── Get All Students
export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const requesterId = req.user!.id;

    const fetchAll = req.query.limit === "all";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = fetchAll
      ? null
      : Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = fetchAll ? 0 : (page - 1) * limit!;

    let result;
    let countResult;

    if (role === "facilitator") {
      result = await pool.query(
        fetchAll
          ? `SELECT
              s.id, s.id_number, s.first_name, s.middle_name, s.last_name,
              s.profile_picture, s.cover_color, s.coins, s.status,
              s.must_change_password, s.created_at,
              sc.center_id AS current_center
             FROM students s
             LEFT JOIN student_centers sc
               ON sc.student_id = s.id AND sc.is_current = TRUE
             INNER JOIN center_facilitators cf
               ON cf.center_id = sc.center_id
             WHERE cf.facilitator_id = $1
             ORDER BY s.created_at DESC`
          : `SELECT
              s.id, s.id_number, s.first_name, s.middle_name, s.last_name,
              s.profile_picture, s.cover_color, s.coins, s.status,
              s.must_change_password, s.created_at,
              sc.center_id AS current_center
             FROM students s
             LEFT JOIN student_centers sc
               ON sc.student_id = s.id AND sc.is_current = TRUE
             INNER JOIN center_facilitators cf
               ON cf.center_id = sc.center_id
             WHERE cf.facilitator_id = $1
             ORDER BY s.created_at DESC
             LIMIT $2 OFFSET $3`,
        fetchAll ? [requesterId] : [requesterId, limit, offset],
      );

      countResult = await pool.query(
        `SELECT COUNT(DISTINCT s.id)
         FROM students s
         LEFT JOIN student_centers sc
           ON sc.student_id = s.id AND sc.is_current = TRUE
         INNER JOIN center_facilitators cf
           ON cf.center_id = sc.center_id
         WHERE cf.facilitator_id = $1`,
        [requesterId],
      );
    } else {
      result = await pool.query(
        fetchAll
          ? `SELECT
              s.id, s.id_number, s.first_name, s.middle_name, s.last_name,
              s.profile_picture, s.cover_color, s.coins, s.status,
              s.must_change_password, s.created_at,
              sc.center_id AS current_center
             FROM students s
             LEFT JOIN student_centers sc
               ON sc.student_id = s.id AND sc.is_current = TRUE
             ORDER BY s.created_at DESC`
          : `SELECT
              s.id, s.id_number, s.first_name, s.middle_name, s.last_name,
              s.profile_picture, s.cover_color, s.coins, s.status,
              s.must_change_password, s.created_at,
              sc.center_id AS current_center
             FROM students s
             LEFT JOIN student_centers sc
               ON sc.student_id = s.id AND sc.is_current = TRUE
             ORDER BY s.created_at DESC
             LIMIT $1 OFFSET $2`,
        fetchAll ? [] : [limit, offset],
      );

      countResult = await pool.query(`SELECT COUNT(*) FROM students`);
    }

    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: result.rows.map((s) => ({
        id: s.id,
        idNumber: s.id_number,
        firstName: s.first_name,
        middleName: s.middle_name,
        lastName: s.last_name,
        profilePicture: s.profile_picture,
        coverColor: s.cover_color,
        coins: s.coins,
        status: s.status,
        mustChangePassword: s.must_change_password,
        currentCenter: s.current_center ?? null,
        createdAt: s.created_at,
      })),
      pagination: {
        page: fetchAll ? 1 : page,
        limit: fetchAll ? total : limit,
        total,
        totalPages: fetchAll ? 1 : Math.ceil(total / limit!),
      },
    });
  } catch (err) {
    console.error("getAllStudents error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Single Student
export const getStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { id: requesterId, role } = req.user!;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    if (role === "student" && Number(id) !== requesterId) {
      res.status(403).json({
        success: false,
        message: "You can only access your own profile.",
      });
      return;
    }

    if (role === "facilitator") {
      const inCenter = await pool.query(
        `SELECT sc.student_id
     FROM student_centers sc
     INNER JOIN center_facilitators cf ON cf.center_id = sc.center_id
     WHERE cf.facilitator_id = $1 AND sc.student_id = $2 AND sc.is_current = TRUE`,
        [requesterId, id],
      );
      if (inCenter.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You can only view students in your assigned centers.",
        });
        return;
      }
    }

    const result = await pool.query(
      `SELECT 
        s.id, s.id_number, s.first_name, s.middle_name, s.last_name,
        s.profile_picture, s.cover_color, s.coins, s.status,
        s.must_change_password, s.created_at,
        sc.center_id AS current_center
       FROM students s
       LEFT JOIN student_centers sc 
         ON sc.student_id = s.id AND sc.is_current = TRUE
       WHERE s.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    const s = result.rows[0];

    const prevCenters = await pool.query(
      `SELECT center_id FROM student_centers
       WHERE student_id = $1 AND is_current = FALSE
       ORDER BY left_at DESC`,
      [id],
    );

    const accessories = await pool.query(
      `SELECT accessory_id FROM student_accessories WHERE student_id = $1`,
      [id],
    );

    res.status(200).json({
      success: true,
      data: {
        id: s.id,
        idNumber: s.id_number,
        firstName: s.first_name,
        middleName: s.middle_name,
        lastName: s.last_name,
        profilePicture: s.profile_picture,
        coverColor: s.cover_color,
        coins: s.coins,
        status: s.status,
        mustChangePassword: s.must_change_password,
        currentCenter: s.current_center ?? null,
        previousCenters: prevCenters.rows.map((r) => r.center_id),
        accessoriesOwned: accessories.rows.map((r) => r.accessory_id),
        createdAt: s.created_at,
      },
    });
  } catch (err) {
    console.error("getStudent error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Create Student
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      idNumber,
      password,
      firstName,
      middleName,
      lastName,
      currentCenter,
      profilePicture,
    } = req.body;

    const role = req.user!.role;
    const requesterId = req.user!.id;

    if (!idNumber || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: "ID Number, password, first name, and last name are required.",
      });
      return;
    }

    if (!STUDENT_ID_REGEX.test(idNumber.trim())) {
      res.status(400).json({
        success: false,
        message: "ID Number must be in format: 00-0000-00",
      });
      return;
    }

    if (!/^\d{5}$/.test(password)) {
      res.status(400).json({
        success: false,
        message: "Student login code must be exactly 5 digits.",
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
      currentCenter !== undefined &&
      currentCenter !== null &&
      isNaN(Number(currentCenter))
    ) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    // facilitators can only assign students to their own centers
    if (role === "facilitator") {
      if (!currentCenter) {
        res.status(400).json({
          success: false,
          message: "Facilitators must assign the student to a center.",
        });
        return;
      }
      const assigned = await pool.query(
        `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
        [currentCenter, requesterId],
      );
      if (assigned.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You can only add students to your assigned centers.",
        });
        return;
      }
    }

    if (profilePicture && profilePicture.length > MAX_PROFILE_PICTURE_SIZE) {
      res
        .status(400)
        .json({ success: false, message: "Profile picture is too large." });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM students WHERE id_number = $1`,
      [idNumber.trim()],
    );

    if (existing.rows.length > 0) {
      res
        .status(409)
        .json({ success: false, message: "ID Number already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const studentResult = await client.query(
        `INSERT INTO students
          (id_number, password, first_name, middle_name, last_name, 
           profile_picture, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id, id_number, first_name, middle_name, last_name,
                   profile_picture, coins, status, must_change_password`,
        [
          idNumber.trim(),
          hashedPassword,
          firstName.trim(),
          middleName?.trim() || null,
          lastName.trim(),
          profilePicture ?? null,
        ],
      );

      const student = studentResult.rows[0];

      if (currentCenter) {
        const centerCheck = await client.query(
          `SELECT id FROM centers WHERE id = $1`,
          [currentCenter],
        );
        if (centerCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          res
            .status(404)
            .json({ success: false, message: "Center not found." });
          return;
        }

        await client.query(
          `INSERT INTO student_centers (student_id, center_id, is_current)
           VALUES ($1, $2, TRUE)`,
          [student.id, currentCenter],
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `Student "${student.first_name} ${student.last_name}" created successfully.`,
        data: {
          id: student.id,
          idNumber: student.id_number,
          firstName: student.first_name,
          middleName: student.middle_name,
          lastName: student.last_name,
          profilePicture: student.profile_picture,
          coins: student.coins,
          status: student.status,
          mustChangePassword: student.must_change_password,
          currentCenter: currentCenter ?? null,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("createStudent error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Student
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      idNumber,
      password,
      status,
      currentCenter,
    } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    if (status && !VALID_STATUSES.includes(status)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
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

    if (idNumber && !STUDENT_ID_REGEX.test(idNumber.trim())) {
      res.status(400).json({
        success: false,
        message: "ID Number must be in format: 00-0000-00",
      });
      return;
    }

    if (password && !/^\d{5}$/.test(password)) {
      res.status(400).json({
        success: false,
        message: "Student login code must be exactly 5 digits.",
      });
      return;
    }

    const existing = await pool.query(`SELECT id FROM students WHERE id = $1`, [
      id,
    ]);

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    if (idNumber) {
      const duplicate = await pool.query(
        `SELECT id FROM students WHERE id_number = $1 AND id != $2`,
        [idNumber.trim(), id],
      );
      if (duplicate.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "ID Number already exists for another student.",
        });
        return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

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
      if (idNumber) {
        updates.push(`id_number = $${paramCount++}`);
        values.push(idNumber.trim());
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        updates.push(`password = $${paramCount++}`);
        values.push(hashedPassword);
        // reset must_change_password when admin sets new password
        updates.push(`must_change_password = $${paramCount++}`);
        values.push(true);
      }
      if (status) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (updates.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE students SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
          values,
        );
      }

      const previousCenter = await client.query(
        `SELECT center_id FROM student_centers WHERE student_id = $1 AND is_current = TRUE`,
        [id],
      );

      const previousCenterId = previousCenter.rows[0]?.center_id ?? null;

      if (currentCenter !== previousCenterId) {
        if (previousCenterId !== null) {
          await client.query(
            `UPDATE student_centers SET is_current = FALSE, left_at = NOW()
             WHERE student_id = $1 AND is_current = TRUE`,
            [id],
          );
        }

        if (currentCenter !== null && currentCenter !== undefined) {
          const centerCheck = await client.query(
            `SELECT id FROM centers WHERE id = $1`,
            [currentCenter],
          );
          if (centerCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            res
              .status(404)
              .json({ success: false, message: "Center not found." });
            return;
          }

          await client.query(
            `INSERT INTO student_centers (student_id, center_id, is_current)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (student_id, center_id, is_current)
             DO UPDATE SET is_current = TRUE, left_at = NULL`,
            [id, currentCenter],
          );
        }
      }

      await client.query("COMMIT");

      res
        .status(200)
        .json({ success: true, message: "Student updated successfully." });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("updateStudent error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Student
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id, first_name, last_name FROM students WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    const student = existing.rows[0];
    await pool.query(`DELETE FROM students WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: `Student "${student.first_name} ${student.last_name}" deleted successfully.`,
    });
  } catch (err) {
    console.error("deleteStudent error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Student Profile (self)
export const updateStudentProfile = async (req: AuthRequest, res: Response) => {
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
      `UPDATE students SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("updateStudentProfile error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Reset Student Password
export const resetStudentPassword = async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id as string;
    const studentId = parseInt(idParam);
    if (isNaN(studentId)) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    const { id: requesterId, role } = req.user!;

    const existing = await pool.query(
      `SELECT id, first_name, last_name FROM students WHERE id = $1`,
      [studentId],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    if (role === "facilitator") {
      const inCenter = await pool.query(
        `SELECT sc.student_id
         FROM student_centers sc
         INNER JOIN center_facilitators cf ON cf.center_id = sc.center_id
         WHERE cf.facilitator_id = $1 AND sc.student_id = $2 AND sc.is_current = TRUE`,
        [requesterId, studentId],
      );
      if (inCenter.rows.length === 0) {
        res.status(403).json({
          success: false,
          message:
            "You can only reset passwords for students in your assigned centers.",
        });
        return;
      }
    }

    const newPin = Math.floor(10000 + Math.random() * 90000).toString();
    const hashedPassword = await bcrypt.hash(newPin, BCRYPT_ROUNDS);

    await pool.query(
      `UPDATE students SET password = $1, must_change_password = TRUE WHERE id = $2`,
      [hashedPassword, studentId],
    );

    res.status(200).json({
      success: true,
      data: { temporaryPassword: newPin },
      message: "Password reset successfully.",
    });
  } catch (err) {
    console.error("resetStudentPassword error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Student Center Transfer Logs
export const getStudentCenterLogs = async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id as string;
    const studentId = parseInt(idParam);
    if (isNaN(studentId)) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    const { id: requesterId, role } = req.user!;

    const existing = await pool.query(`SELECT id FROM students WHERE id = $1`, [
      studentId,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    if (role === "facilitator") {
      const inCenter = await pool.query(
        `SELECT sc.student_id
         FROM student_centers sc
         INNER JOIN center_facilitators cf ON cf.center_id = sc.center_id
         WHERE cf.facilitator_id = $1 AND sc.student_id = $2 AND sc.is_current = TRUE`,
        [requesterId, studentId],
      );
      if (inCenter.rows.length === 0) {
        res.status(403).json({
          success: false,
          message:
            "You can only view logs for students in your assigned centers.",
        });
        return;
      }
    }

    const logs = await pool.query(
      `SELECT
         scl.id, scl.action, scl.created_at, scl.performed_by_role,
         c.title AS center_title,
         CASE
           WHEN scl.performed_by_role = 'admin' THEN
             (SELECT first_name || ' ' || last_name FROM admins WHERE id = scl.performed_by_id)
           WHEN scl.performed_by_role = 'facilitator' THEN
             (SELECT first_name || ' ' || last_name FROM facilitators WHERE id = scl.performed_by_id)
         END AS performed_by_name
       FROM student_center_logs scl
       JOIN centers c ON c.id = scl.center_id
       WHERE scl.student_id = $1
       ORDER BY scl.created_at DESC`,
      [studentId],
    );

    res.status(200).json({
      success: true,
      data: logs.rows.map((row) => ({
        id: row.id,
        action: row.action,
        centerTitle: row.center_title,
        performedByName: row.performed_by_name ?? "Unknown user",
        performedByRole: row.performed_by_role,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error("getStudentCenterLogs error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
