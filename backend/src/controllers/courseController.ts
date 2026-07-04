// src/controllers/courseController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants & regex
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const URL_REGEX = /^(https?:\/\/.+|\/api\/.+)/;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const VALID_LEVELS = ["Easy", "Moderate", "Hard", "All Levels"];
const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_SIZE = 500 * 1024;
const MAX_QUIZ_QUESTIONS = 50;
const MAX_QUIZ_OPTIONS = 6;

// ── Helpers
async function facilitatorOwnsCourse(
  req: AuthRequest,
  courseId: string | string[] | number,
  res: Response,
): Promise<boolean> {
  if (req.user?.role === "admin") return true;

  const result = await pool.query(
    `SELECT 1
     FROM center_facilitators cf
     JOIN center_courses cc ON cc.center_id = cf.center_id
     WHERE cf.facilitator_id = $1
       AND cc.course_id = $2
     LIMIT 1`,
    [req.user?.id, courseId],
  );

  if (result.rows.length === 0) {
    res.status(403).json({
      success: false,
      message: "You do not have permission to modify this course.",
    });
    return false;
  }

  return true;
}

// ── Get All Courses
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    // ── Determine which courses this facilitator can manage
    let managedCourseIds: Set<number> | null = null;
    if (authReq.user?.role === "facilitator") {
      const managedResult = await pool.query(
        `SELECT DISTINCT cc.course_id
         FROM center_courses cc
         JOIN center_facilitators cf ON cf.center_id = cc.center_id
         WHERE cf.facilitator_id = $1`,
        [authReq.user.id],
      );
      managedCourseIds = new Set(managedResult.rows.map((r) => r.course_id));
    }

    function resolveCanManage(courseId: number): boolean | undefined {
      if (authReq.user?.role === "admin") return true;
      if (authReq.user?.role === "facilitator") {
        return managedCourseIds!.has(courseId);
      }
      return undefined;
    }

    let coursesResult;

    if (authReq.user?.role === "student") {
      coursesResult = await pool.query(
        `SELECT c.id, c.title, c.subtitle, c.description, c.instructor, c.level,
          c.level_color, c.category, c.bg_color, c.thumbnail_url, c.created_at
   FROM courses c
   JOIN center_courses cc ON cc.course_id = c.id
   JOIN centers ce ON ce.id = cc.center_id
   JOIN student_centers sc ON sc.center_id = ce.id
   WHERE sc.student_id = $1 AND sc.is_current = TRUE
   ORDER BY c.created_at DESC`,
        [authReq.user.id],
      );
    } else {
      coursesResult = await pool.query(
        `SELECT id, title, subtitle, description, instructor, level,
                level_color, category, bg_color, thumbnail_url, created_at
         FROM courses ORDER BY created_at DESC`,
      );
    }

    if (coursesResult.rows.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const courseIds = coursesResult.rows.map((c) => c.id);

    // Batch: modules, parts, quiz questions, videos, files
    const modulesResult = await pool.query(
      `SELECT id, course_id, number, title, weight
       FROM course_modules
       WHERE course_id = ANY($1)
       ORDER BY course_id, number ASC`,
      [courseIds],
    );

    if (modulesResult.rows.length === 0) {
      res.status(200).json({
        success: true,
        data: coursesResult.rows.map((c) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          description: c.description,
          instructor: c.instructor,
          level: c.level,
          levelColor: c.level_color,
          category: c.category,
          bgColor: c.bg_color,
          thumbnailUrl: c.thumbnail_url,
          modules: [],
          createdAt: c.created_at,
          canManage: resolveCanManage(c.id),
        })),
      });
      return;
    }

    const moduleIds = modulesResult.rows.map((m) => m.id);

    const partsResult = await pool.query(
      `SELECT id, module_id, slug, name, cover_color, content, order_index
       FROM course_parts
       WHERE module_id = ANY($1)
       ORDER BY module_id, order_index ASC`,
      [moduleIds],
    );

    const partIds = partsResult.rows.map((p) => p.id);
    let quizResult = { rows: [] as any[] };
    if (partIds.length > 0) {
      quizResult = await pool.query(
        `SELECT id, part_id, question_data
         FROM quiz_questions
         WHERE part_id = ANY($1)`,
        [partIds],
      );
    }

    const videosResult = await pool.query(
      `SELECT id, module_id, title, filename, duration_seconds, sort_order
       FROM module_videos
       WHERE module_id = ANY($1)
       ORDER BY module_id, sort_order ASC`,
      [moduleIds],
    );

    const filesResult = await pool.query(
      `SELECT id, module_id, title, original_filename, mime_type, sort_order
       FROM module_files
       WHERE module_id = ANY($1)
       ORDER BY module_id, sort_order ASC`,
      [moduleIds],
    );

    // Assemble courses
    const courses = coursesResult.rows.map((c) => {
      const modules = modulesResult.rows
        .filter((m) => m.course_id === c.id)
        .map((m) => {
          const parts = partsResult.rows
            .filter((p) => p.module_id === m.id)
            .map((p) => {
              const quizQuestions = quizResult.rows
                .filter((q) => q.part_id === p.id)
                .map((q) => ({
                  id: q.id,
                  type: q.question_data.type ?? "multiple_choice",
                  question: q.question_data.question,
                  options: q.question_data.options,
                  correctOptionIndex: q.question_data.correctOptionIndex,
                  correctAnswer: q.question_data.correctAnswer,
                  explanation: q.question_data.explanation,
                }));

              return {
                id: p.id,
                slug: p.slug,
                name: p.name,
                coverColor: p.cover_color,
                content: p.content,
                order: p.order_index,
                ...(quizQuestions.length > 0 && { quizQuestions }),
              };
            });

          const videos = videosResult.rows
            .filter((v) => v.module_id === m.id)
            .map((v) => ({
              id: v.id,
              moduleId: v.module_id,
              title: v.title,
              filename: v.filename,
              durationSeconds: v.duration_seconds,
              sortOrder: v.sort_order,
            }));

          const files = filesResult.rows
            .filter((f) => f.module_id === m.id)
            .map((f) => ({
              id: f.id,
              moduleId: f.module_id,
              title: f.title,
              originalFilename: f.original_filename,
              mimeType: f.mime_type,
              sortOrder: f.sort_order,
            }));

          return {
            id: m.id,
            number: m.number,
            title: m.title,
            weight: m.weight ?? null,
            parts,
            videos,
            files,
          };
        });

      return {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        instructor: c.instructor,
        level: c.level,
        levelColor: c.level_color,
        category: c.category,
        bgColor: c.bg_color,
        thumbnailUrl: c.thumbnail_url,
        modules,
        createdAt: c.created_at,
        canManage: resolveCanManage(c.id),
      };
    });

    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    console.error("getAllCourses error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Single Course
export const getCourse = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }

    let courseResult;

    if (authReq.user?.role === "student") {
      courseResult = await pool.query(
        `SELECT c.id, c.title, c.subtitle, c.description, c.instructor, c.level,
          c.level_color, c.category, c.bg_color, c.thumbnail_url,
          c.created_at, c.updated_at
   FROM courses c
   JOIN center_courses cc ON cc.course_id = c.id
   JOIN centers ce ON ce.id = cc.center_id
   JOIN student_centers sc ON sc.center_id = ce.id
   WHERE c.id = $1 AND sc.student_id = $2 AND sc.is_current = TRUE`,
        [id, authReq.user.id],
      );
    } else {
      courseResult = await pool.query(
        `SELECT id, title, subtitle, description, instructor, level,
                level_color, category, bg_color, thumbnail_url, created_at, updated_at
         FROM courses WHERE id = $1`,
        [id],
      );
    }

    if (courseResult.rows.length === 0) {
      res.status(404).json({ success: false, message: "Course not found." });
      return;
    }
    const c = courseResult.rows[0];

    // Batch: modules, parts, quizzes, videos, files
    const modulesResult = await pool.query(
      `SELECT id, number, title, weight FROM course_modules
       WHERE course_id = $1 ORDER BY number ASC`,
      [c.id],
    );

    const moduleIds = modulesResult.rows.map((m) => m.id);

    let partsResult = { rows: [] as any[] };
    if (moduleIds.length > 0) {
      partsResult = await pool.query(
        `SELECT id, module_id, slug, name, cover_color, content, order_index
         FROM course_parts WHERE module_id = ANY($1) ORDER BY order_index ASC`,
        [moduleIds],
      );
    }

    const partIds = partsResult.rows.map((p) => p.id);
    let quizResult = { rows: [] as any[] };
    if (partIds.length > 0) {
      quizResult = await pool.query(
        `SELECT id, part_id, question_data FROM quiz_questions
         WHERE part_id = ANY($1)`,
        [partIds],
      );
    }

    let videosResult = { rows: [] as any[] };
    if (moduleIds.length > 0) {
      videosResult = await pool.query(
        `SELECT id, module_id, title, filename, duration_seconds, sort_order
         FROM module_videos WHERE module_id = ANY($1) ORDER BY sort_order ASC`,
        [moduleIds],
      );
    }

    let filesResult = { rows: [] as any[] };
    if (moduleIds.length > 0) {
      filesResult = await pool.query(
        `SELECT id, module_id, title, original_filename, mime_type, sort_order
         FROM module_files WHERE module_id = ANY($1) ORDER BY sort_order ASC`,
        [moduleIds],
      );
    }

    // Assemble course
    const modules = modulesResult.rows.map((m) => {
      const parts = partsResult.rows
        .filter((p) => p.module_id === m.id)
        .map((p) => {
          const quizQuestions = quizResult.rows
            .filter((q) => q.part_id === p.id)
            .map((q) => ({
              id: q.id,
              type: q.question_data.type ?? "multiple_choice",
              question: q.question_data.question,
              options: q.question_data.options,
              correctOptionIndex: q.question_data.correctOptionIndex,
              correctAnswer: q.question_data.correctAnswer,
              explanation: q.question_data.explanation,
            }));

          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            coverColor: p.cover_color,
            content: p.content,
            order: p.order_index,
            ...(quizQuestions.length > 0 && { quizQuestions }),
          };
        });

      const videos = videosResult.rows
        .filter((v) => v.module_id === m.id)
        .map((v) => ({
          id: v.id,
          moduleId: v.module_id,
          title: v.title,
          filename: v.filename,
          durationSeconds: v.duration_seconds,
          sortOrder: v.sort_order,
        }));

      const files = filesResult.rows
        .filter((f) => f.module_id === m.id)
        .map((f) => ({
          id: f.id,
          moduleId: f.module_id,
          title: f.title,
          originalFilename: f.original_filename,
          mimeType: f.mime_type,
          sortOrder: f.sort_order,
        }));

      return {
        id: m.id,
        number: m.number,
        title: m.title,
        weight: m.weight ?? null,
        parts,
        videos,
        files,
      };
    });

    let canManage: boolean | undefined;
    if (authReq.user?.role === "admin") {
      canManage = true;
    } else if (authReq.user?.role === "facilitator") {
      const managedCheck = await pool.query(
        `SELECT 1
     FROM center_courses cc
     JOIN center_facilitators cf ON cf.center_id = cc.center_id
     WHERE cc.course_id = $1 AND cf.facilitator_id = $2
     LIMIT 1`,
        [c.id, authReq.user.id],
      );
      canManage = managedCheck.rows.length > 0;
    }

    res.status(200).json({
      success: true,
      data: {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        instructor: c.instructor,
        level: c.level,
        levelColor: c.level_color,
        category: c.category,
        bgColor: c.bg_color,
        thumbnailUrl: c.thumbnail_url,
        modules,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        canManage,
      },
    });
  } catch (err) {
    console.error("getCourse error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Create Course (admin only)
export const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      description,
      instructor,
      level,
      levelColor,
      category,
      bgColor,
      thumbnailUrl,
    } = req.body;

    if (!title?.trim()) {
      res
        .status(400)
        .json({ success: false, message: "Course title is required." });
      return;
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    if (level && !VALID_LEVELS.includes(level)) {
      res.status(400).json({
        success: false,
        message: `Level must be one of: ${VALID_LEVELS.join(", ")}`,
      });
      return;
    }

    if (levelColor && !HEX_COLOR_REGEX.test(levelColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid level color format." });
      return;
    }
    if (bgColor && !HEX_COLOR_REGEX.test(bgColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid background color format." });
      return;
    }

    if (thumbnailUrl && !URL_REGEX.test(thumbnailUrl)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid thumbnail URL." });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const courseResult = await client.query(
        `INSERT INTO courses
          (title, subtitle, description, instructor, level, level_color,
           category, bg_color, thumbnail_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, title, subtitle, description, instructor, level,
                   level_color, category, bg_color, thumbnail_url, created_at`,
        [
          title.trim(),
          subtitle?.trim() || null,
          description?.trim() || "No description provided.",
          instructor?.trim() || "TBD",
          level || "Easy",
          levelColor || "#2FE12F",
          category || "General",
          bgColor || "#A056FF",
          thumbnailUrl || null,
        ],
      );

      const course = courseResult.rows[0];

      // Default module + parts
      const moduleResult = await client.query(
        `INSERT INTO course_modules (course_id, number, title)
         VALUES ($1, 1, 'Module 1')
         RETURNING id, number, title`,
        [course.id],
      );

      const module = moduleResult.rows[0];

      const defaultParts = [
        {
          slug: "introduction",
          name: "Introduction",
          coverColor: "#007FFF",
          content:
            "<h2>Welcome!</h2><p>Start editing your introduction here...</p>",
          order: 1,
        },
        {
          slug: "lessons",
          name: "Lessons",
          coverColor: "#8A2BE2",
          content: "<p>Key takeaways from this module. Edit me.</p>",
          order: 2,
        },
        {
          slug: "quiz",
          name: "Quiz",
          coverColor: "#03C03C",
          content: "Answer the questions below to test your understanding.",
          order: 3,
        },
        {
          slug: "activities",
          name: "Activities",
          coverColor: "#FE5A1D",
          content:
            "<p>Try these hands-on activities. Edit instructions here.</p>",
          order: 4,
        },
      ];

      const parts = [];
      for (const part of defaultParts) {
        const partResult = await client.query(
          `INSERT INTO course_parts (module_id, slug, name, cover_color, content, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, slug, name, cover_color, content, order_index`,
          [
            module.id,
            part.slug,
            part.name,
            part.coverColor,
            part.content,
            part.order,
          ],
        );
        parts.push(partResult.rows[0]);
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `Course "${course.title}" created successfully.`,
        data: {
          id: course.id,
          title: course.title,
          subtitle: course.subtitle,
          description: course.description,
          instructor: course.instructor,
          level: course.level,
          levelColor: course.level_color,
          category: course.category,
          bgColor: course.bg_color,
          thumbnailUrl: course.thumbnail_url,
          modules: [
            {
              id: module.id,
              number: module.number,
              title: module.title,
              parts: parts.map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                coverColor: p.cover_color,
                content: p.content,
                order: p.order_index,
              })),
            },
          ],
          createdAt: course.created_at,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("createCourse error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Course
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      instructor,
      level,
      levelColor,
      category,
      bgColor,
      thumbnailUrl,
    } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }

    if (title && title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    if (level && !VALID_LEVELS.includes(level)) {
      res.status(400).json({
        success: false,
        message: `Level must be one of: ${VALID_LEVELS.join(", ")}`,
      });
      return;
    }

    if (levelColor && !HEX_COLOR_REGEX.test(levelColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid level color format." });
      return;
    }
    if (bgColor && !HEX_COLOR_REGEX.test(bgColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid background color format." });
      return;
    }

    if (thumbnailUrl && !URL_REGEX.test(thumbnailUrl)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid thumbnail URL." });
      return;
    }

    if (category && category.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Category cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    const existing = await pool.query(`SELECT id FROM courses WHERE id = $1`, [
      id,
    ]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Course not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title) {
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }
    if (subtitle !== undefined) {
      updates.push(`subtitle = $${paramCount++}`);
      values.push(subtitle?.trim() || null);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description?.trim() || null);
    }
    if (instructor !== undefined) {
      updates.push(`instructor = $${paramCount++}`);
      values.push(instructor?.trim() || null);
    }
    if (level) {
      updates.push(`level = $${paramCount++}`);
      values.push(level);
    }
    if (levelColor) {
      updates.push(`level_color = $${paramCount++}`);
      values.push(levelColor);
    }
    if (category) {
      updates.push(`category = $${paramCount++}`);
      values.push(category.trim());
    }
    if (bgColor) {
      updates.push(`bg_color = $${paramCount++}`);
      values.push(bgColor);
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
      `UPDATE courses SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Course updated successfully." });
  } catch (err) {
    console.error("updateCourse error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Course
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id, title FROM courses WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Course not found." });
      return;
    }

    await pool.query(`DELETE FROM courses WHERE id = $1`, [id]);

    res.status(200).json({
      success: true,
      message: `Course "${existing.rows[0].title}" deleted successfully.`,
    });
  } catch (err) {
    console.error("deleteCourse error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Add Module
export const addModule = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { title } = req.body;

    if (isNaN(Number(id))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }

    if (title && title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    const course = await pool.query(`SELECT id FROM courses WHERE id = $1`, [
      id,
    ]);
    if (course.rows.length === 0) {
      res.status(404).json({ success: false, message: "Course not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const lastModule = await pool.query(
      `SELECT MAX(number) AS max_number FROM course_modules WHERE course_id = $1`,
      [id],
    );

    const nextNumber = (lastModule.rows[0].max_number ?? 0) + 1;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const moduleResult = await client.query(
        `INSERT INTO course_modules (course_id, number, title)
         VALUES ($1, $2, $3)
         RETURNING id, number, title`,
        [id, nextNumber, title?.trim() || `Module ${nextNumber}`],
      );

      const module = moduleResult.rows[0];

      const defaultParts = [
        {
          slug: "introduction",
          name: "Introduction",
          coverColor: "#007FFF",
          content: "",
          order: 1,
        },
        {
          slug: "lessons",
          name: "Lessons",
          coverColor: "#8A2BE2",
          content: "",
          order: 2,
        },
        {
          slug: "quiz",
          name: "Quiz",
          coverColor: "#03C03C",
          content: "",
          order: 3,
        },
        {
          slug: "activities",
          name: "Activities",
          coverColor: "#FE5A1D",
          content: "",
          order: 4,
        },
      ];

      const parts = [];
      for (const part of defaultParts) {
        const partResult = await client.query(
          `INSERT INTO course_parts (module_id, slug, name, cover_color, content, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, slug, name, cover_color, content, order_index`,
          [
            module.id,
            part.slug,
            part.name,
            part.coverColor,
            part.content,
            part.order,
          ],
        );
        parts.push(partResult.rows[0]);
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: "Module added successfully.",
        data: {
          id: module.id,
          number: module.number,
          title: module.title,
          parts: parts.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            coverColor: p.cover_color,
            content: p.content,
            order: p.order_index,
          })),
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("addModule error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Module
export const updateModule = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id, moduleId } = req.params;
    const { title, weight } = req.body;

    if (isNaN(Number(id)) || isNaN(Number(moduleId))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    if (title !== undefined && !title?.trim()) {
      res
        .status(400)
        .json({ success: false, message: "Module title cannot be empty." });
      return;
    }

    if (title && title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    if (weight !== undefined && weight !== null) {
      const weightNum = Number(weight);
      if (isNaN(weightNum) || weightNum < 0 || weightNum > 100) {
        res.status(400).json({
          success: false,
          message: "Weight must be a number between 0 and 100.",
        });
        return;
      }
    }

    const existing = await pool.query(
      `SELECT id FROM course_modules WHERE id = $1 AND course_id = $2`,
      [moduleId, id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Module not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }
    if (weight !== undefined) {
      updates.push(`weight = $${paramCount++}`);
      values.push(weight === null ? null : Number(weight));
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: "No fields to update." });
      return;
    }

    values.push(moduleId);
    await pool.query(
      `UPDATE course_modules SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Module updated successfully." });
  } catch (err) {
    console.error("updateModule error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Module
export const deleteModule = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id, moduleId } = req.params;

    if (isNaN(Number(id)) || isNaN(Number(moduleId))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT id FROM course_modules WHERE id = $1 AND course_id = $2`,
      [moduleId, id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Module not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`DELETE FROM course_modules WHERE id = $1`, [
        moduleId,
      ]);

      await client.query(
        `WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY number) AS new_number
          FROM course_modules WHERE course_id = $1
        )
        UPDATE course_modules SET number = numbered.new_number
        FROM numbered WHERE course_modules.id = numbered.id`,
        [id],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res
      .status(200)
      .json({ success: true, message: "Module deleted successfully." });
  } catch (err) {
    console.error("deleteModule error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Add Part
export const addPart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id, moduleId } = req.params;
    const { slug, name, coverColor, content } = req.body;

    if (isNaN(Number(id)) || isNaN(Number(moduleId))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    if (!slug || !name) {
      res
        .status(400)
        .json({ success: false, message: "Slug and name are required." });
      return;
    }

    if (!SLUG_REGEX.test(slug)) {
      res.status(400).json({
        success: false,
        message:
          "Slug can only contain lowercase letters, numbers, and hyphens.",
      });
      return;
    }

    if (name.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Name cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    if (coverColor && !HEX_COLOR_REGEX.test(coverColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid color format." });
      return;
    }

    if (content !== undefined) {
      const contentSize = Buffer.byteLength(content, "utf8");
      if (contentSize > MAX_CONTENT_SIZE) {
        const hasBlobImages = /<img[^>]+src="data:/i.test(content);
        res.status(400).json({
          success: false,
          message: hasBlobImages
            ? "Content contains embedded images. Please upload images separately."
            : "Content is too large.",
        });
        return;
      }
    }

    const module = await pool.query(
      `SELECT id FROM course_modules WHERE id = $1 AND course_id = $2`,
      [moduleId, id],
    );

    if (module.rows.length === 0) {
      res.status(404).json({ success: false, message: "Module not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const existing = await pool.query(
      `SELECT id FROM course_parts WHERE module_id = $1 AND slug = $2`,
      [moduleId, slug],
    );

    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "A part with this slug already exists in this module.",
      });
      return;
    }

    const lastPart = await pool.query(
      `SELECT MAX(order_index) AS max_order FROM course_parts WHERE module_id = $1`,
      [moduleId],
    );

    const nextOrder = (lastPart.rows[0].max_order ?? 0) + 1;

    const result = await pool.query(
      `INSERT INTO course_parts (module_id, slug, name, cover_color, content, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, slug, name, cover_color, content, order_index`,
      [
        moduleId,
        slug,
        name.trim(),
        coverColor || "#6B7280",
        content || "",
        nextOrder,
      ],
    );

    const part = result.rows[0];

    res.status(201).json({
      success: true,
      message: "Part added successfully.",
      data: {
        id: part.id,
        slug: part.slug,
        name: part.name,
        coverColor: part.cover_color,
        content: part.content,
        order: part.order_index,
      },
    });
  } catch (err) {
    console.error("addPart error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Part
export const updatePart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id, moduleId, partId } = req.params;
    const { name, coverColor, content } = req.body;

    if (isNaN(Number(id)) || isNaN(Number(moduleId)) || isNaN(Number(partId))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    if (name && name.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Name cannot exceed ${MAX_TITLE_LENGTH} characters.`,
      });
      return;
    }

    if (coverColor && !HEX_COLOR_REGEX.test(coverColor)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid color format." });
      return;
    }

    if (content !== undefined) {
      const contentSize = Buffer.byteLength(content, "utf8");
      if (contentSize > MAX_CONTENT_SIZE) {
        const hasBlobImages = /<img[^>]+src="data:/i.test(content);
        res.status(400).json({
          success: false,
          message: hasBlobImages
            ? "Content contains embedded images. Please upload images separately."
            : "Content is too large.",
        });
        return;
      }
    }

    const existing = await pool.query(
      `SELECT p.id FROM course_parts p
       INNER JOIN course_modules m ON m.id = p.module_id
       WHERE p.id = $1 AND m.id = $2 AND m.course_id = $3`,
      [partId, moduleId, id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Part not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (coverColor) {
      updates.push(`cover_color = $${paramCount++}`);
      values.push(coverColor);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(content);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: "No fields to update." });
      return;
    }

    values.push(partId);
    await pool.query(
      `UPDATE course_parts SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramCount}`,
      values,
    );

    res
      .status(200)
      .json({ success: true, message: "Part updated successfully." });
  } catch (err) {
    console.error("updatePart error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Delete Part
export const deletePart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id, moduleId, partId } = req.params;

    if (isNaN(Number(id)) || isNaN(Number(moduleId)) || isNaN(Number(partId))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    const existing = await pool.query(
      `SELECT p.id, p.slug, m.number AS module_number
       FROM course_parts p
       INNER JOIN course_modules m ON m.id = p.module_id
       WHERE p.id = $1 AND m.id = $2 AND m.course_id = $3`,
      [partId, moduleId, id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Part not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const { slug, module_number } = existing.rows[0];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `DELETE FROM student_completed_parts
         WHERE course_id = $1
           AND module_number = $2
           AND part_slug = $3`,
        [id, module_number, slug],
      );

      await client.query(`DELETE FROM course_parts WHERE id = $1`, [partId]);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res
      .status(200)
      .json({ success: true, message: "Part deleted successfully." });
  } catch (err) {
    console.error("deletePart error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Quiz Questions
export const updateQuizQuestions = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id, moduleId, partId } = req.params;
    const { questions } = req.body;

    if (isNaN(Number(id)) || isNaN(Number(moduleId)) || isNaN(Number(partId))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    if (!Array.isArray(questions)) {
      res
        .status(400)
        .json({ success: false, message: "Questions must be an array." });
      return;
    }

    if (questions.length > MAX_QUIZ_QUESTIONS) {
      res.status(400).json({
        success: false,
        message: `Cannot have more than ${MAX_QUIZ_QUESTIONS} questions.`,
      });
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const type = q.type ?? "multiple_choice";

      if (
        !["multiple_choice", "identification", "fill_in_the_blank"].includes(
          type,
        )
      ) {
        res.status(400).json({
          success: false,
          message: `Question ${i + 1} has an invalid type.`,
        });
        return;
      }

      if (!q.question?.trim()) {
        res.status(400).json({
          success: false,
          message: `Question ${i + 1} is missing question text.`,
        });
        return;
      }

      if (type === "multiple_choice") {
        if (
          !Array.isArray(q.options) ||
          q.options.length < 2 ||
          q.options.length > MAX_QUIZ_OPTIONS
        ) {
          res.status(400).json({
            success: false,
            message: `Question ${i + 1} must have between 2 and ${MAX_QUIZ_OPTIONS} options.`,
          });
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j]?.trim()) {
            res.status(400).json({
              success: false,
              message: `Question ${i + 1}, option ${j + 1} cannot be empty.`,
            });
            return;
          }
        }
        if (
          typeof q.correctOptionIndex !== "number" ||
          q.correctOptionIndex < 0 ||
          q.correctOptionIndex >= q.options.length
        ) {
          res.status(400).json({
            success: false,
            message: `Question ${i + 1} has an invalid correct option index.`,
          });
          return;
        }
      } else {
        if (!q.correctAnswer?.trim()) {
          res.status(400).json({
            success: false,
            message: `Question ${i + 1} is missing a correct answer.`,
          });
          return;
        }
        if (type === "fill_in_the_blank" && !q.question.includes("___")) {
          res.status(400).json({
            success: false,
            message: `Question ${i + 1} must contain ___ to mark the blank.`,
          });
          return;
        }
      }
    }

    const existing = await pool.query(
      `SELECT p.id FROM course_parts p
       INNER JOIN course_modules m ON m.id = p.module_id
       WHERE p.id = $1 AND m.id = $2 AND m.course_id = $3`,
      [partId, moduleId, id],
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: "Part not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`DELETE FROM quiz_questions WHERE part_id = $1`, [
        partId,
      ]);

      for (const q of questions) {
        const type = q.type ?? "multiple_choice";
        await client.query(
          `INSERT INTO quiz_questions (part_id, question_data) VALUES ($1, $2)`,
          [
            partId,
            JSON.stringify({
              type,
              question: q.question.trim(),
              ...(type === "multiple_choice"
                ? {
                    options: q.options.map((o: string) => o.trim()),
                    correctOptionIndex: q.correctOptionIndex,
                  }
                : {
                    correctAnswer: q.correctAnswer.trim(),
                  }),
              explanation: q.explanation?.trim() || null,
            }),
          ],
        );
      }
      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        message: "Quiz questions updated successfully.",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("updateQuizQuestions error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Reorder Part
export const reorderPart = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id, moduleId, partId } = req.params;
    const { direction } = req.body;

    if (isNaN(Number(id)) || isNaN(Number(moduleId)) || isNaN(Number(partId))) {
      res.status(400).json({ success: false, message: "Invalid ID." });
      return;
    }

    if (!["up", "down"].includes(direction)) {
      res
        .status(400)
        .json({ success: false, message: "Direction must be 'up' or 'down'." });
      return;
    }

    const currentPart = await pool.query(
      `SELECT cp.id, cp.order_index
       FROM course_parts cp
       INNER JOIN course_modules cm ON cm.id = cp.module_id
       WHERE cp.id = $1 AND cm.id = $2 AND cm.course_id = $3`,
      [partId, moduleId, id],
    );

    if (currentPart.rows.length === 0) {
      res.status(404).json({ success: false, message: "Part not found." });
      return;
    }

    if (!(await facilitatorOwnsCourse(authReq, id, res))) return;

    const currentOrder = currentPart.rows[0].order_index;

    const adjacentPart = await pool.query(
      `SELECT id, order_index FROM course_parts
       WHERE module_id = $1 AND order_index = $2`,
      [moduleId, direction === "up" ? currentOrder - 1 : currentOrder + 1],
    );

    if (adjacentPart.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: `Cannot move part ${direction} — already at the limit.`,
      });
      return;
    }

    const adjacentOrder = adjacentPart.rows[0].order_index;
    const adjacentId = adjacentPart.rows[0].id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE course_parts SET order_index = $1 WHERE id = $2`,
        [adjacentOrder, partId],
      );
      await client.query(
        `UPDATE course_parts SET order_index = $1 WHERE id = $2`,
        [currentOrder, adjacentId],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res
      .status(200)
      .json({ success: true, message: "Part reordered successfully." });
  } catch (err) {
    console.error("reorderPart error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
