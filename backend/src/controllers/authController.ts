// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db";

// ── Constants
const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const ROLE_TABLE_MAP: Record<string, string> = {
  student: "students",
  facilitator: "facilitators",
  admin: "admins",
};

// ── Helpers
const generateToken = (id: number, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined.");
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign({ id, role }, secret, { expiresIn });
};

const checkLockout = (user: any, res: Response): boolean => {
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 60000,
    );
    res.status(429).json({
      success: false,
      message: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
    });
    return true;
  }
  return false;
};

const recordFailedAttempt = async (
  table: string,
  id: number,
  currentAttempts: number,
) => {
  const attempts = currentAttempts + 1;
  const lockUntil =
    attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS)
      : null;
  await pool.query(
    `UPDATE ${table} SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
    [attempts, lockUntil, id],
  );
};

const resetFailedAttempts = async (table: string, id: number) => {
  await pool.query(
    `UPDATE ${table} SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [id],
  );
};

// ── Student Login
export const studentLogin = async (req: Request, res: Response) => {
  try {
    const { idNumber, password } = req.body;

    if (!idNumber || !password) {
      res.status(400).json({
        success: false,
        message: "ID Number and password are required.",
      });
      return;
    }

    if (!/^\d{2}-\d{4}-\d{2}$/.test(idNumber.trim())) {
      res
        .status(401)
        .json({ success: false, message: "Invalid ID or password." });
      return;
    }

    const result = await pool.query(
      `SELECT id, id_number, password, first_name, middle_name, last_name,
              profile_picture, cover_color, coins, status, must_change_password,
              failed_login_attempts, locked_until
       FROM students WHERE id_number = $1`,
      [idNumber.trim()],
    );

    const student = result.rows[0];

    if (student && checkLockout(student, res)) return;

    const dummyHash = "$2b$10$invalidhashfortimingattackprevention1234567890";
    const passwordMatch = student
      ? await bcrypt.compare(password.trim(), student.password)
      : await bcrypt.compare(password.trim(), dummyHash);

    if (!student || !passwordMatch) {
      if (student) {
        await recordFailedAttempt(
          "students",
          student.id,
          student.failed_login_attempts ?? 0,
        );
      }
      res
        .status(401)
        .json({ success: false, message: "Invalid ID or password." });
      return;
    }

    if (student.status === "banned") {
      res.status(403).json({
        success: false,
        message:
          "Your account has been banned. Please contact the administrator.",
      });
      return;
    }

    if (student.status === "inactive") {
      res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact the administrator.",
      });
      return;
    }

    await resetFailedAttempts("students", student.id);

    const centerResult = await pool.query(
      `SELECT center_id FROM student_centers WHERE student_id = $1 AND is_current = TRUE LIMIT 1`,
      [student.id],
    );

    const token = generateToken(student.id, "student");

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: student.id,
        idNumber: student.id_number,
        firstName: student.first_name,
        middleName: student.middle_name,
        lastName: student.last_name,
        profilePicture: student.profile_picture,
        coverColor: student.cover_color,
        coins: student.coins,
        status: student.status,
        mustChangePassword: student.must_change_password,
        currentCenter: centerResult.rows[0]?.center_id ?? null,
      },
    });
  } catch (err) {
    console.error("studentLogin error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Facilitator Login
export const facilitatorLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, password, first_name, middle_name, last_name,
              profile_picture, cover_color, status, must_change_password,
              failed_login_attempts, locked_until
       FROM facilitators WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    const facilitator = result.rows[0];

    if (facilitator && checkLockout(facilitator, res)) return;

    const dummyHash = "$2b$10$invalidhashfortimingattackprevention1234567890";
    const passwordMatch = facilitator
      ? await bcrypt.compare(password.trim(), facilitator.password)
      : await bcrypt.compare(password.trim(), dummyHash);

    if (!facilitator || !passwordMatch) {
      if (facilitator) {
        await recordFailedAttempt(
          "facilitators",
          facilitator.id,
          facilitator.failed_login_attempts ?? 0,
        );
      }
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }

    if (facilitator.status === "banned") {
      res.status(403).json({
        success: false,
        message:
          "Your account has been banned. Please contact the administrator.",
      });
      return;
    }

    if (facilitator.status === "inactive") {
      res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact the administrator.",
      });
      return;
    }

    await resetFailedAttempts("facilitators", facilitator.id);

    const centerResult = await pool.query(
      `SELECT center_id FROM center_facilitators WHERE facilitator_id = $1`,
      [facilitator.id],
    );

    const token = generateToken(facilitator.id, "facilitator");

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: facilitator.id,
        email: facilitator.email,
        firstName: facilitator.first_name,
        middleName: facilitator.middle_name,
        lastName: facilitator.last_name,
        profilePicture: facilitator.profile_picture,
        coverColor: facilitator.cover_color,
        status: facilitator.status,
        mustChangePassword: facilitator.must_change_password,
        assignedCenterIds: centerResult.rows.map((r) => r.center_id),
      },
    });
  } catch (err) {
    console.error("facilitatorLogin error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Admin Login
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }

    const result = await pool.query(
      `SELECT id, email, password, first_name, middle_name, last_name,
              profile_picture, cover_color, status,
              failed_login_attempts, locked_until
       FROM admins WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    const admin = result.rows[0];

    if (admin && checkLockout(admin, res)) return;

    const dummyHash = "$2b$10$invalidhashfortimingattackprevention1234567890";
    const passwordMatch = admin
      ? await bcrypt.compare(password.trim(), admin.password)
      : await bcrypt.compare(password.trim(), dummyHash);

    if (!admin || !passwordMatch) {
      if (admin) {
        await recordFailedAttempt(
          "admins",
          admin.id,
          admin.failed_login_attempts ?? 0,
        );
      }
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }

    if (admin.status === "banned") {
      res.status(403).json({
        success: false,
        message: "Your account has been banned.",
      });
      return;
    }

    await resetFailedAttempts("admins", admin.id);

    const token = generateToken(admin.id, "admin");

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        middleName: admin.middle_name,
        lastName: admin.last_name,
        profilePicture: admin.profile_picture,
        coverColor: admin.cover_color,
        status: admin.status,
      },
    });
  } catch (err) {
    console.error("adminLogin error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Change Password (all roles)
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { id, role } = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    const table = ROLE_TABLE_MAP[role];
    if (!table) {
      res.status(403).json({ success: false, message: "Invalid role." });
      return;
    }

    if (!newPassword) {
      res
        .status(400)
        .json({ success: false, message: "New password is required." });
      return;
    }

    if (role === "student") {
      if (!/^\d{5}$/.test(newPassword)) {
        res.status(400).json({
          success: false,
          message: "Student login code must be exactly 5 digits.",
        });
        return;
      }
    } else {
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters.",
        });
        return;
      }

      const COMMON_PASSWORDS = [
        "12345678",
        "password",
        "password1",
        "11111111",
        "aaaaaaaa",
        "qwerty123",
        "abc12345",
        "iloveyou1",
        "admin123",
        "letmein1",
        "00000000",
        "99999999",
      ];
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);

      if (COMMON_PASSWORDS.includes(newPassword.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: "Password is too common. Please choose a stronger password.",
        });
        return;
      }
      if (!hasUppercase || !hasLowercase || !hasNumber) {
        res.status(400).json({
          success: false,
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
        });
        return;
      }
    }

    const isForcedRole = role === "student" || role === "facilitator";
    const result = await pool.query(
      `SELECT password${isForcedRole ? ", must_change_password" : ""} FROM ${table} WHERE id = $1`,
      [id],
    );

    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    const isForcedChange = isForcedRole && user.must_change_password;

    if (!isForcedChange) {
      if (!currentPassword) {
        res.status(400).json({
          success: false,
          message: "Current password is required.",
        });
        return;
      }

      const passwordMatch = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          message: "Current password is incorrect.",
        });
        return;
      }

      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        res.status(400).json({
          success: false,
          message: "New password must be different from current password.",
        });
        return;
      }
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    if (isForcedRole) {
      await pool.query(
        `UPDATE ${table} SET password = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2`,
        [hashedNewPassword, id],
      );
    } else {
      await pool.query(
        `UPDATE ${table} SET password = $1, updated_at = NOW() WHERE id = $2`,
        [hashedNewPassword, id],
      );
    }

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
