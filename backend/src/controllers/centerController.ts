// src/controllers/centerController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const URL_REGEX = /^(https?:\/\/.+|\/api\/.+)$/;
const MAX_TITLE_LENGTH = 100;
const MAX_LOCATION_LENGTH = 200;
const MAX_FACILITATORS_PER_CENTER = 3;

// ── Helpers
async function userCanAccessCenter(
  req: AuthRequest,
  centerId: string,
  res: Response,
): Promise<boolean> {
  if (req.user?.role === "admin") return true;

  if (req.user?.role === "facilitator") {
    const result = await pool.query(
      `SELECT 1 FROM center_facilitators
       WHERE center_id = $1 AND facilitator_id = $2 LIMIT 1`,
      [centerId, req.user.id],
    );
    if (result.rows.length === 0) {
      res.status(403).json({ success: false, message: "Access denied." });
      return false;
    }
    return true;
  }

  if (req.user?.role === "student") {
    const result = await pool.query(
      `SELECT 1 FROM student_centers
       WHERE center_id = $1 AND student_id = $2 AND is_current = TRUE LIMIT 1`,
      [centerId, req.user.id],
    );
    if (result.rows.length === 0) {
      res.status(403).json({ success: false, message: "Access denied." });
      return false;
    }
    return true;
  }

  res.status(403).json({ success: false, message: "Access denied." });
  return false;
}

// ── Get All Centers
export const getAllCenters = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { role, id: userId } = authReq.user!;

    let whereClause = "";
    let queryParams: any[] = [];

    if (role === "facilitator") {
      whereClause = `WHERE EXISTS (
        SELECT 1 FROM center_facilitators cf2
        WHERE cf2.center_id = c.id AND cf2.facilitator_id = $1
      )`;
      queryParams = [userId];
    } else if (role === "student") {
      whereClause = `WHERE EXISTS (
        SELECT 1 FROM student_centers sc2
        WHERE sc2.center_id = c.id AND sc2.student_id = $1 AND sc2.is_current = TRUE
      )`;
      queryParams = [userId];
    }

    const result = await pool.query(
      `SELECT
        c.id, c.title, c.slug, c.location, c.cover_color,
        c.thumbnail_url, c.created_at,
        COALESCE(
          ARRAY_AGG(DISTINCT cf.facilitator_id) FILTER (WHERE cf.facilitator_id IS NOT NULL),
          '{}'
        ) AS facilitator_ids,
        COALESCE(
          ARRAY_AGG(DISTINCT sc.student_id) FILTER (WHERE sc.is_current = TRUE),
          '{}'
        ) AS students,
        COALESCE(
          ARRAY_AGG(DISTINCT cc.course_id) FILTER (WHERE cc.course_id IS NOT NULL),
          '{}'
        ) AS courses
       FROM centers c
       LEFT JOIN center_facilitators cf ON cf.center_id = c.id
       LEFT JOIN student_centers sc ON sc.center_id = c.id
       LEFT JOIN center_courses cc ON cc.center_id = c.id
       ${whereClause}
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      queryParams,
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        location: c.location,
        coverColor: c.cover_color,
        thumbnailUrl: c.thumbnail_url,
        facilitatorIds: (c.facilitator_ids ?? [])
          .filter((id: any) => id !== null)
          .map(Number),
        students: (c.students ?? [])
          .filter((id: any) => id !== null)
          .map(Number),
        courses: (c.courses ?? []).filter((id: any) => id !== null).map(Number),
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    console.error("getAllCenters error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Single Center
export const getCenter = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    const centerResult = await pool.query(
      `SELECT
        c.id, c.title, c.slug, c.location, c.cover_color,
        c.thumbnail_url, c.created_at
       FROM centers c
       WHERE c.id = $1`,
      [id],
    );

    if (centerResult.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    if (!(await userCanAccessCenter(authReq, id, res))) return;

    const c = centerResult.rows[0];

    const facilitatorsResult = await pool.query(
      `SELECT f.id, f.first_name, f.last_name, f.email
       FROM facilitators f
       INNER JOIN center_facilitators cf ON cf.facilitator_id = f.id
       WHERE cf.center_id = $1
       ORDER BY cf.assigned_at ASC`,
      [id],
    );

    const studentsResult = await pool.query(
      `SELECT s.id, s.id_number, s.first_name, s.middle_name, s.last_name,
              s.profile_picture, s.cover_color, s.status
       FROM students s
       INNER JOIN student_centers sc ON sc.student_id = s.id
       WHERE sc.center_id = $1 AND sc.is_current = TRUE
       ORDER BY s.first_name ASC`,
      [id],
    );

    const coursesResult = await pool.query(
      `SELECT co.id, co.title, co.category, co.level, co.level_color,
              co.bg_color, co.thumbnail_url, co.instructor
       FROM courses co
       INNER JOIN center_courses cc ON cc.course_id = co.id
       WHERE cc.center_id = $1
       ORDER BY co.title ASC`,
      [id],
    );

    res.status(200).json({
      success: true,
      data: {
        id: c.id,
        title: c.title,
        slug: c.slug,
        location: c.location,
        coverColor: c.cover_color,
        thumbnailUrl: c.thumbnail_url,
        facilitatorIds: facilitatorsResult.rows.map((f) => f.id),
        facilitators: facilitatorsResult.rows.map((f) => ({
          id: f.id,
          firstName: f.first_name,
          lastName: f.last_name,
          email: f.email,
        })),
        students: studentsResult.rows.map((s) => s.id),
        courses: coursesResult.rows.map((co) => co.id),
        createdAt: c.created_at,
      },
    });
  } catch (err) {
    console.error("getCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Create Center
export const createCenter = async (req: Request, res: Response) => {
  try {
    const { title, location, coverColor, thumbnailUrl, facilitatorIds } =
      req.body;

    if (!title?.trim()) {
      res
        .status(400)
        .json({ success: false, message: "Center title is required." });
      return;
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    if (location && location.trim().length > MAX_LOCATION_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Location cannot exceed ${MAX_LOCATION_LENGTH} characters.`,
      });
      return;
    }

    if (coverColor && !HEX_COLOR_REGEX.test(coverColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid color format." });
      return;
    }

    if (thumbnailUrl && !URL_REGEX.test(thumbnailUrl)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid thumbnail URL." });
      return;
    }

    if (facilitatorIds !== undefined && facilitatorIds !== null) {
      if (!Array.isArray(facilitatorIds)) {
        res.status(400).json({
          success: false,
          message: "facilitatorIds must be an array.",
        });
        return;
      }
      if (facilitatorIds.length > MAX_FACILITATORS_PER_CENTER) {
        res.status(400).json({
          success: false,
          message: `A center can have at most ${MAX_FACILITATORS_PER_CENTER} facilitators.`,
        });
        return;
      }
      for (const fid of facilitatorIds) {
        if (isNaN(Number(fid))) {
          res.status(400).json({
            success: false,
            message: "Invalid facilitator ID in list.",
          });
          return;
        }
      }
    }

    const slug = title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const existing = await pool.query(
      `SELECT id FROM centers WHERE slug = $1`,
      [slug],
    );
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "A center with this title already exists.",
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (facilitatorIds?.length > 0) {
        for (const fid of facilitatorIds) {
          const facilitator = await client.query(
            `SELECT id FROM facilitators WHERE id = $1`,
            [fid],
          );
          if (facilitator.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({
              success: false,
              message: `Facilitator ${fid} not found.`,
            });
            return;
          }
        }
      }

      const result = await client.query(
        `INSERT INTO centers
          (title, slug, location, cover_color, thumbnail_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, slug, location, cover_color, thumbnail_url, created_at`,
        [
          title.trim(),
          slug,
          location?.trim() || null,
          coverColor || "#3B82F6",
          thumbnailUrl || null,
        ],
      );

      const center = result.rows[0];

      if (facilitatorIds?.length > 0) {
        for (const fid of facilitatorIds) {
          await client.query(
            `INSERT INTO center_facilitators (center_id, facilitator_id) VALUES ($1, $2)`,
            [center.id, fid],
          );
        }
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `Center "${center.title}" created successfully.`,
        data: {
          id: center.id,
          title: center.title,
          slug: center.slug,
          location: center.location,
          coverColor: center.cover_color,
          thumbnailUrl: center.thumbnail_url,
          facilitatorIds: facilitatorIds ?? [],
          students: [],
          courses: [],
          createdAt: center.created_at,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("createCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Center
export const updateCenter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, location, coverColor, thumbnailUrl } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    if (title && title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    if (location && location.trim().length > MAX_LOCATION_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Location cannot exceed ${MAX_LOCATION_LENGTH} characters.`,
      });
      return;
    }

    if (coverColor && !HEX_COLOR_REGEX.test(coverColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid color format." });
      return;
    }

    if (thumbnailUrl && !URL_REGEX.test(thumbnailUrl)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid thumbnail URL." });
      return;
    }

    const existing = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      id,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const duplicate = await pool.query(
        `SELECT id FROM centers WHERE slug = $1 AND id != $2`,
        [slug, id],
      );
      if (duplicate.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "A center with this title already exists.",
        });
        return;
      }
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
      updates.push(`slug = $${paramCount++}`);
      values.push(slug);
    }

    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location?.trim() || null);
    }
    if (coverColor) {
      updates.push(`cover_color = $${paramCount++}`);
      values.push(coverColor);
    }
    if (thumbnailUrl !== undefined) {
      updates.push(`thumbnail_url = $${paramCount++}`);
      values.push(thumbnailUrl || null);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: "No fields to update." });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE centers SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Center updated successfully." });
  } catch (err) {
    console.error("updateCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Center
export const deleteCenter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }

    const existing = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      id,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    await pool.query(`DELETE FROM centers WHERE id = $1`, [id]);
    res
      .status(200)
      .json({ success: true, message: "Center deleted successfully." });
  } catch (err) {
    console.error("deleteCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Assign Facilitator to Center (admin only)
export const assignFacilitatorToCenter = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { facilitatorId } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }
    if (!facilitatorId || isNaN(Number(facilitatorId))) {
      res
        .status(400)
        .json({ success: false, message: "Valid facilitator ID is required." });
      return;
    }

    const center = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      id,
    ]);
    if (center.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    const facilitator = await pool.query(
      `SELECT id FROM facilitators WHERE id = $1`,
      [facilitatorId],
    );
    if (facilitator.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Facilitator not found." });
      return;
    }

    const currentCount = await pool.query(
      `SELECT COUNT(*) FROM center_facilitators WHERE center_id = $1`,
      [id],
    );
    if (parseInt(currentCount.rows[0].count) >= MAX_FACILITATORS_PER_CENTER) {
      res.status(409).json({
        success: false,
        message: `This center already has the maximum of ${MAX_FACILITATORS_PER_CENTER} facilitators.`,
      });
      return;
    }

    const alreadyAssigned = await pool.query(
      `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
      [id, facilitatorId],
    );
    if (alreadyAssigned.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Facilitator is already assigned to this center.",
      });
      return;
    }

    await pool.query(
      `INSERT INTO center_facilitators (center_id, facilitator_id) VALUES ($1, $2)`,
      [id, facilitatorId],
    );

    res.status(200).json({
      success: true,
      message: "Facilitator assigned to center successfully.",
    });
  } catch (err) {
    console.error("assignFacilitatorToCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Unassign Facilitator from Center (admin only)
export const unassignFacilitatorFromCenter = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id, facilitatorId } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }
    if (isNaN(Number(facilitatorId))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid facilitator ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
      [id, facilitatorId],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Facilitator is not assigned to this center.",
      });
      return;
    }

    await pool.query(
      `DELETE FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
      [id, facilitatorId],
    );

    res.status(200).json({
      success: true,
      message: "Facilitator unassigned from center successfully.",
    });
  } catch (err) {
    console.error("unassignFacilitatorFromCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Add Student to Center
export const addStudentToCenter = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }
    if (!studentId || isNaN(Number(studentId))) {
      res
        .status(400)
        .json({ success: false, message: "Valid student ID is required." });
      return;
    }

    const center = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      id,
    ]);
    if (center.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    const student = await pool.query(`SELECT id FROM students WHERE id = $1`, [
      studentId,
    ]);
    if (student.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    const alreadyIn = await pool.query(
      `SELECT id FROM student_centers WHERE student_id = $1 AND center_id = $2 AND is_current = TRUE`,
      [studentId, id],
    );
    if (alreadyIn.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Student is already in this center.",
      });
      return;
    }

    const otherCenter = await pool.query(
      `SELECT center_id FROM student_centers WHERE student_id = $1 AND is_current = TRUE`,
      [studentId],
    );
    if (otherCenter.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Student is already assigned to another center.",
      });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO student_centers (student_id, center_id, is_current)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (student_id, center_id)
         DO UPDATE SET is_current = TRUE, left_at = NULL, joined_at = NOW()`,
        [studentId, id],
      );

      await client.query(
        `INSERT INTO student_center_logs
           (student_id, center_id, action, performed_by_id, performed_by_role)
         VALUES ($1, $2, 'added', $3, $4)`,
        [studentId, id, req.user!.id, req.user!.role],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      message: "Student added to center successfully.",
    });
  } catch (err) {
    console.error("addStudentToCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Remove Student from Center
export const removeStudentFromCenter = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id, studentId } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }
    if (isNaN(Number(studentId))) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    const center = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      id,
    ]);
    if (center.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    const enrollment = await pool.query(
      `SELECT id FROM student_centers WHERE student_id = $1 AND center_id = $2 AND is_current = TRUE`,
      [studentId, id],
    );
    if (enrollment.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "Student is not in this center." });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE student_centers SET is_current = FALSE, left_at = NOW()
         WHERE student_id = $1 AND center_id = $2 AND is_current = TRUE`,
        [studentId, id],
      );

      await client.query(
        `INSERT INTO student_center_logs
           (student_id, center_id, action, performed_by_id, performed_by_role)
         VALUES ($1, $2, 'removed', $3, $4)`,
        [studentId, id, req.user!.id, req.user!.role],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      message: "Student removed from center successfully.",
    });
  } catch (err) {
    console.error("removeStudentFromCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Add Course to Center
export const addCourseToCenter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { courseId } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }
    if (!courseId || isNaN(Number(courseId))) {
      res
        .status(400)
        .json({ success: false, message: "Valid course ID is required." });
      return;
    }

    const center = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      id,
    ]);
    if (center.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    const course = await pool.query(`SELECT id FROM courses WHERE id = $1`, [
      courseId,
    ]);
    if (course.rows.length === 0) {
      res.status(404).json({ success: false, message: "Course not found." });
      return;
    }

    const alreadyAdded = await pool.query(
      `SELECT id FROM center_courses WHERE center_id = $1 AND course_id = $2`,
      [id, courseId],
    );
    if (alreadyAdded.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Course is already assigned to this center.",
      });
      return;
    }

    await pool.query(
      `INSERT INTO center_courses (center_id, course_id) VALUES ($1, $2)`,
      [id, courseId],
    );

    res
      .status(200)
      .json({ success: true, message: "Course added to center successfully." });
  } catch (err) {
    console.error("addCourseToCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Remove Course from Center
export const removeCourseFromCenter = async (req: Request, res: Response) => {
  try {
    const { id, courseId } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }
    if (isNaN(Number(courseId))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM center_courses WHERE center_id = $1 AND course_id = $2`,
      [id, courseId],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Course is not assigned to this center.",
      });
      return;
    }

    await pool.query(
      `DELETE FROM center_courses WHERE center_id = $1 AND course_id = $2`,
      [id, courseId],
    );

    res.status(200).json({
      success: true,
      message: "Course removed from center successfully.",
    });
  } catch (err) {
    console.error("removeCourseFromCenter error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
