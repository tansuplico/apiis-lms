// src/controllers/attendanceController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["present", "absent"] as const;
const MAX_ATTENDANCE_RECORDS = 500;

// ── Helpers
const isValidDate = (dateStr: string): boolean => {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

const isFutureDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const nowManila = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
  nowManila.setHours(23, 59, 59, 999);
  return date > nowManila;
};

// ── Get Attendance by Center
export const getAttendanceByCenter = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { centerId } = req.params;
    const { date, startDate, endDate } = req.query;

    if (isNaN(Number(centerId))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    if (date && !isValidDate(String(date))) {
      res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (startDate && !isValidDate(String(startDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid start date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (endDate && !isValidDate(String(endDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid end date format. Use YYYY-MM-DD.",
      });
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(String(startDate)) > new Date(String(endDate))
    ) {
      res.status(400).json({
        success: false,
        message: "Start date must be before end date.",
      });
      return;
    }

    if (startDate && endDate) {
      const diffMs =
        new Date(String(endDate)).getTime() -
        new Date(String(startDate)).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 366) {
        res.status(400).json({
          success: false,
          message: "Date range cannot exceed 366 days.",
        });
        return;
      }
    }

    const center = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      centerId,
    ]);
    if (center.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    if (req.user!.role === "facilitator") {
      const assigned = await pool.query(
        `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
        [centerId, req.user!.id],
      );
      if (assigned.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this center.",
        });
        return;
      }
    }

    let dateFilter = "";
    const values: any[] = [centerId];
    let paramCount = 2;

    if (date) {
      dateFilter = `AND a.date = $${paramCount++}`;
      values.push(String(date));
    } else if (startDate && endDate) {
      dateFilter = `AND a.date BETWEEN $${paramCount++} AND $${paramCount++}`;
      values.push(String(startDate), String(endDate));
    }

    const result = await pool.query(
      `SELECT
        a.id, a.student_id, a.center_id, a.facilitator_id,
        a.date, a.status, a.submitted_at,
        s.first_name, s.last_name, s.id_number, s.profile_picture,
        f.first_name AS facilitator_first_name,
        f.last_name AS facilitator_last_name
       FROM attendance a
       INNER JOIN students s ON s.id = a.student_id
       LEFT JOIN facilitators f ON f.id = a.facilitator_id
       WHERE a.center_id = $1 ${dateFilter}
       ORDER BY a.date DESC, s.last_name ASC`,
      values,
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((a) => ({
        id: a.id,
        studentId: a.student_id,
        centerId: a.center_id,
        facilitatorId: a.facilitator_id,
        date: a.date,
        status: a.status,
        submittedAt: a.submitted_at,
        student: {
          firstName: a.first_name,
          lastName: a.last_name,
          idNumber: a.id_number,
          profilePicture: a.profile_picture,
        },
        facilitator: a.facilitator_first_name
          ? {
              firstName: a.facilitator_first_name,
              lastName: a.facilitator_last_name,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error("getAttendanceByCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Attendance by Student
export const getAttendanceByStudent = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const studentId =
      req.user!.role === "student" ? req.user!.id : req.params.studentId;
    const { startDate, endDate } = req.query;

    if (isNaN(Number(studentId))) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    if (startDate && !isValidDate(String(startDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid start date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (endDate && !isValidDate(String(endDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid end date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (
      startDate &&
      endDate &&
      new Date(String(startDate)) > new Date(String(endDate))
    ) {
      res.status(400).json({
        success: false,
        message: "Start date must be before end date.",
      });
      return;
    }

    const student = await pool.query(`SELECT id FROM students WHERE id = $1`, [
      studentId,
    ]);
    if (student.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    if (req.user!.role === "facilitator") {
      const owned = await pool.query(
        `SELECT 1
     FROM student_centers sc
     JOIN center_facilitators cf ON cf.center_id = sc.center_id
     WHERE sc.student_id = $1
       AND sc.is_current = TRUE
       AND cf.facilitator_id = $2
     LIMIT 1`,
        [studentId, req.user!.id],
      );
      if (owned.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You do not have access to this student's attendance.",
        });
        return;
      }
    }

    const values: any[] = [studentId];
    let dateFilter = "";
    let paramCount = 2;

    if (startDate && endDate) {
      dateFilter = `AND a.date BETWEEN $${paramCount++} AND $${paramCount++}`;
      values.push(String(startDate), String(endDate));
    }

    const result = await pool.query(
      `SELECT
        a.id, a.student_id, a.center_id, a.date, a.status, a.submitted_at,
        c.title AS center_title
       FROM attendance a
       INNER JOIN centers c ON c.id = a.center_id
       WHERE a.student_id = $1 ${dateFilter}
       ORDER BY a.date DESC`,
      values,
    );

    const total = result.rows.length;
    const present = result.rows.filter((a) => a.status === "present").length;
    const absent = result.rows.filter((a) => a.status === "absent").length;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          present,
          absent,
          attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        },
        records: result.rows.map((a) => ({
          id: a.id,
          studentId: a.student_id,
          centerId: a.center_id,
          centerTitle: a.center_title,
          date: a.date,
          status: a.status,
          submittedAt: a.submitted_at,
        })),
      },
    });
  } catch (err) {
    console.error("getAttendanceByStudent error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Submit Attendance
export const submitAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const facilitatorId = req.user!.id;
    const { centerId, date, records } = req.body;

    if (!centerId || !date || !Array.isArray(records) || records.length === 0) {
      res.status(400).json({
        success: false,
        message: "centerId, date, and records are required.",
      });
      return;
    }

    if (isNaN(Number(centerId))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    if (!isValidDate(date)) {
      res.status(400).json({
        success: false,
        message: "Date must be in format: YYYY-MM-DD",
      });
      return;
    }

    if (isFutureDate(date)) {
      res.status(400).json({
        success: false,
        message: "Cannot submit attendance for future dates.",
      });
      return;
    }

    if (records.length > MAX_ATTENDANCE_RECORDS) {
      res.status(400).json({
        success: false,
        message: `Cannot submit more than ${MAX_ATTENDANCE_RECORDS} records at once.`,
      });
      return;
    }

    const center = await pool.query(
      `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
      [centerId, facilitatorId],
    );
    if (center.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: "You are not assigned to this center.",
      });
      return;
    }

    for (const record of records) {
      if (!record.studentId || !record.status) {
        res.status(400).json({
          success: false,
          message: "Each record must have studentId and status.",
        });
        return;
      }
      if (isNaN(Number(record.studentId))) {
        res
          .status(400)
          .json({ success: false, message: "Invalid student ID in records." });
        return;
      }
      if (!VALID_STATUSES.includes(record.status)) {
        res.status(400).json({
          success: false,
          message: "Status must be either 'present' or 'absent'.",
        });
        return;
      }
    }

    const studentIds = [...new Set(records.map((r) => Number(r.studentId)))];
    const studentCheck = await pool.query(
      `SELECT student_id FROM student_centers
       WHERE center_id = $1 AND is_current = TRUE AND student_id = ANY($2)`,
      [centerId, studentIds],
    );
    if (studentCheck.rows.length !== studentIds.length) {
      res.status(400).json({
        success: false,
        message: "Some students do not belong to this center.",
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const inserted = [];
      for (const record of records) {
        const result = await client.query(
          `INSERT INTO attendance
            (student_id, center_id, facilitator_id, date, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (student_id, center_id, date)
           DO UPDATE SET
             status = $5,
             facilitator_id = $3,
             submitted_at = NOW()
           RETURNING id, student_id, center_id, facilitator_id, date, status, submitted_at`,
          [
            Number(record.studentId),
            centerId,
            facilitatorId,
            date,
            record.status,
          ],
        );
        inserted.push(result.rows[0]);
      }

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        message: `Attendance submitted for ${inserted.length} student(s).`,
        data: inserted.map((a) => ({
          id: a.id,
          studentId: a.student_id,
          centerId: a.center_id,
          facilitatorId: a.facilitator_id,
          date: a.date,
          status: a.status,
          submittedAt: a.submitted_at,
        })),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("submitAttendance error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Attendance
export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const facilitatorId = req.user!.id;
    const { attendanceId } = req.params;
    const { status } = req.body;

    if (isNaN(Number(attendanceId))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid attendance ID." });
      return;
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be either 'present' or 'absent'.",
      });
      return;
    }

    const existing = await pool.query(
      `SELECT a.id, a.center_id FROM attendance a WHERE a.id = $1`,
      [attendanceId],
    );
    if (existing.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Attendance record not found." });
      return;
    }

    const center = await pool.query(
      `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
      [existing.rows[0].center_id, facilitatorId],
    );
    if (center.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: "You are not assigned to this center.",
      });
      return;
    }

    await pool.query(
      `UPDATE attendance SET status = $1, submitted_at = NOW() WHERE id = $2`,
      [status, attendanceId],
    );

    res
      .status(200)
      .json({ success: true, message: "Attendance record updated." });
  } catch (err) {
    console.error("updateAttendance error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Attendance Summary
export const getAttendanceSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { centerId } = req.params;
    const { startDate, endDate } = req.query;

    if (isNaN(Number(centerId))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    if (startDate && !isValidDate(String(startDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid start date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (endDate && !isValidDate(String(endDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid end date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (
      startDate &&
      endDate &&
      new Date(String(startDate)) > new Date(String(endDate))
    ) {
      res.status(400).json({
        success: false,
        message: "Start date must be before end date.",
      });
      return;
    }

    const center = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      centerId,
    ]);
    if (center.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    if (req.user!.role === "facilitator") {
      const assigned = await pool.query(
        `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
        [centerId, req.user!.id],
      );
      if (assigned.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this center.",
        });
        return;
      }
    }

    const values: any[] = [centerId];
    let dateFilter = "";
    let paramCount = 2;

    if (startDate && endDate) {
      dateFilter = `AND a.date BETWEEN $${paramCount++} AND $${paramCount++}`;
      values.push(String(startDate), String(endDate));
    }

    const result = await pool.query(
      `SELECT
        s.id AS student_id, s.first_name, s.last_name, s.id_number,
        COUNT(*) AS total_days,
        COUNT(*) FILTER (WHERE a.status = 'present') AS present_days,
        COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_days
       FROM attendance a
       INNER JOIN students s ON s.id = a.student_id
       WHERE a.center_id = $1 ${dateFilter}
       GROUP BY s.id, s.first_name, s.last_name, s.id_number
       ORDER BY s.last_name ASC`,
      values,
    );

    const overallResult = await pool.query(
      `SELECT
        COUNT(*) AS total_records,
        COUNT(*) FILTER (WHERE status = 'present') AS total_present,
        COUNT(*) FILTER (WHERE status = 'absent') AS total_absent,
        COUNT(DISTINCT date) AS total_days,
        COUNT(DISTINCT student_id) AS total_students
       FROM attendance
       WHERE center_id = $1 ${dateFilter}`,
      values,
    );

    const overall = overallResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        overall: {
          totalRecords: parseInt(overall.total_records),
          totalPresent: parseInt(overall.total_present),
          totalAbsent: parseInt(overall.total_absent),
          totalDays: parseInt(overall.total_days),
          totalStudents: parseInt(overall.total_students),
          attendanceRate:
            overall.total_records > 0
              ? Math.round(
                  (overall.total_present / overall.total_records) * 100,
                )
              : 0,
        },
        students: result.rows.map((s) => ({
          studentId: s.student_id,
          firstName: s.first_name,
          lastName: s.last_name,
          idNumber: s.id_number,
          totalDays: parseInt(s.total_days),
          presentDays: parseInt(s.present_days),
          absentDays: parseInt(s.absent_days),
          attendanceRate:
            s.total_days > 0
              ? Math.round((s.present_days / s.total_days) * 100)
              : 0,
        })),
      },
    });
  } catch (err) {
    console.error("getAttendanceSummary error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Attendance
export const deleteAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id: userId, role } = req.user!;
    const { attendanceId } = req.params;

    if (isNaN(Number(attendanceId))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid attendance ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT a.id, a.center_id FROM attendance a WHERE a.id = $1`,
      [attendanceId],
    );
    if (existing.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Attendance record not found." });
      return;
    }

    if (role !== "admin") {
      const center = await pool.query(
        `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
        [existing.rows[0].center_id, userId],
      );
      if (center.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this center.",
        });
        return;
      }
    }

    await pool.query(`DELETE FROM attendance WHERE id = $1`, [attendanceId]);

    res
      .status(200)
      .json({ success: true, message: "Attendance record deleted." });
  } catch (err) {
    console.error("deleteAttendance error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Attendance by Facilitator
export const getAttendanceByFacilitator = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const facilitatorId =
      req.user!.role === "facilitator"
        ? req.user!.id
        : req.params.facilitatorId;

    if (isNaN(Number(facilitatorId))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid facilitator ID." });
      return;
    }

    const { startDate, endDate } = req.query;

    if (startDate && !isValidDate(String(startDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid start date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (endDate && !isValidDate(String(endDate))) {
      res.status(400).json({
        success: false,
        message: "Invalid end date format. Use YYYY-MM-DD.",
      });
      return;
    }
    if (
      startDate &&
      endDate &&
      new Date(String(startDate)) > new Date(String(endDate))
    ) {
      res.status(400).json({
        success: false,
        message: "Start date must be before end date.",
      });
      return;
    }

    const values: any[] = [facilitatorId];
    let dateFilter = "";
    let paramCount = 2;

    if (startDate && endDate) {
      dateFilter = `AND a.date BETWEEN $${paramCount++} AND $${paramCount++}`;
      values.push(String(startDate), String(endDate));
    }

    const result = await pool.query(
      `SELECT
        a.id, a.student_id, a.center_id, a.facilitator_id,
        a.date, a.status, a.submitted_at,
        s.first_name, s.last_name, s.id_number, s.profile_picture,
        c.title AS center_title
       FROM attendance a
       INNER JOIN students s ON s.id = a.student_id
       INNER JOIN centers c ON c.id = a.center_id
       WHERE a.facilitator_id = $1 ${dateFilter}
       ORDER BY a.date DESC, s.last_name ASC`,
      values,
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((a) => ({
        id: a.id,
        studentId: a.student_id,
        centerId: a.center_id,
        facilitatorId: a.facilitator_id,
        date: a.date,
        status: a.status,
        submittedAt: a.submitted_at,
        centerTitle: a.center_title,
        student: {
          firstName: a.first_name,
          lastName: a.last_name,
          idNumber: a.id_number,
          profilePicture: a.profile_picture,
        },
      })),
    });
  } catch (err) {
    console.error("getAttendanceByFacilitator error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
